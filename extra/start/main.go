// Command start opens a file, folder, or URL with its default handler and
// forces the resulting window into the foreground.
//
// Windows only lets the foreground process change the foreground, so any
// player launched from a background process (like AkaiGrid) opens in the
// background and cannot steal focus by itself. This tool launches the target
// with ShellExecuteEx and then uses AttachThreadInput + SetForegroundWindow
// to bring the newly created window to the front.
package main

import (
	"fmt"
	"os"
	"syscall"
	"time"
	"unsafe"
)

const (
	swShowNormal   = 1
	swRestore      = 9
	gwlExStyle     = -20
	wsExToolWindow = 0x00000080
	vkMenu         = 0x12
	keyEventfKeyUp = 0x0002
)

var (
	shell32  = syscall.NewLazyDLL("shell32.dll")
	user32   = syscall.NewLazyDLL("user32.dll")
	kernel32 = syscall.NewLazyDLL("kernel32.dll")

	procShellExecuteExW      = shell32.NewProc("ShellExecuteExW")
	procEnumWindows          = user32.NewProc("EnumWindows")
	procIsWindowVisible      = user32.NewProc("IsWindowVisible")
	procIsIconic             = user32.NewProc("IsIconic")
	procGetForegroundWindow  = user32.NewProc("GetForegroundWindow")
	procGetWindowThreadPid   = user32.NewProc("GetWindowThreadProcessId")
	procGetCurrentThreadId   = kernel32.NewProc("GetCurrentThreadId")
	procAttachThreadInput    = user32.NewProc("AttachThreadInput")
	procSetForegroundWindow  = user32.NewProc("SetForegroundWindow")
	procBringWindowToTop     = user32.NewProc("BringWindowToTop")
	procShowWindowAsync      = user32.NewProc("ShowWindowAsync")
	procGetWindowLongW       = user32.NewProc("GetWindowLongW")
	procGetWindowTextLengthW = user32.NewProc("GetWindowTextLengthW")
	procGetWindowTextW       = user32.NewProc("GetWindowTextW")
	procGetClassNameW        = user32.NewProc("GetClassNameW")
	procKeybdEvent           = user32.NewProc("keybd_event")
)

// SHELLEXECUTEINFOW, x64 layout.
type shellExecuteInfo struct {
	cbSize       uint32
	fMask        uint32
	hwnd         uintptr
	lpVerb       *uint16
	lpFile       *uint16
	lpParameters *uint16
	lpDirectory  *uint16
	nShow        int32
	hInstApp     uintptr
	lpIDList     uintptr
	lpClass      *uint16
	hkeyClass    uintptr
	dwHotKey     uintptr
	hIcon        uintptr
	hProcess     uintptr
}

func utf16Ptr(s string) *uint16 {
	p, err := syscall.UTF16PtrFromString(s)
	if err != nil {
		return nil
	}
	return p
}

type window struct {
	hwnd uintptr
	pid  uint32
}

// isDesktopWindow excludes the desktop, taskbar, and their hidden helper windows.
func isDesktopWindow(hwnd uintptr) bool {
	var buf [32]uint16
	r, _, _ := procGetClassNameW.Call(hwnd, uintptr(unsafe.Pointer(&buf[0])), uintptr(len(buf)))
	if r == 0 {
		return false
	}
	switch syscall.UTF16ToString(buf[:r]) {
	case "Progman", "WorkerW", "Shell_TrayWnd", "Shell_SecondaryTrayWnd":
		return true
	}
	return false
}

// isRealWindow returns true for visible, non-tool top-level windows with a title.
func isRealWindow(hwnd uintptr) bool {
	r, _, _ := procIsWindowVisible.Call(hwnd)
	if r == 0 {
		return false
	}
	if isDesktopWindow(hwnd) {
		return false
	}
	styleIndex := int32(gwlExStyle)
	style, _, _ := procGetWindowLongW.Call(hwnd, uintptr(styleIndex))
	if style&wsExToolWindow != 0 {
		return false
	}
	len, _, _ := procGetWindowTextLengthW.Call(hwnd)
	return len > 0
}

func getPid(hwnd uintptr) uint32 {
	var pid uint32
	procGetWindowThreadPid.Call(hwnd, uintptr(unsafe.Pointer(&pid)))
	return pid
}

func enumTopWindows() []window {
	var windows []window
	procEnumWindows.Call(syscall.NewCallback(func(hwnd, _ uintptr) uintptr {
		windows = append(windows, window{hwnd: hwnd, pid: getPid(hwnd)})
		return 1
	}), 0)
	return windows
}

func focusWindow(hwnd uintptr) {
	// If minimized, restore it first.
	iconic, _, _ := procIsIconic.Call(hwnd)
	if iconic != 0 {
		procShowWindowAsync.Call(hwnd, uintptr(swRestore))
	}

	selfThread, _, _ := procGetCurrentThreadId.Call()
	fgHwnd, _, _ := procGetForegroundWindow.Call()
	if fgHwnd == hwnd {
		return
	}
	fgThread, _, _ := procGetWindowThreadPid.Call(fgHwnd, 0)

	// Windows only lets a thread of the foreground process change the
	// foreground. Attaching our input queue to the foreground thread makes the
	// system treat this process as part of it, so SetForegroundWindow is
	// allowed (reference: https://stackoverflow.com/a/10265395/1097815).
	attached := false
	if fgThread != 0 && fgThread != selfThread {
		r, _, _ := procAttachThreadInput.Call(selfThread, fgThread, 1)
		attached = r != 0
	}

	// A synthesized ALT press drops the foreground lock; combine it with a few
	// SetForegroundWindow attempts.
	for i := 0; i < 3; i++ {
		procKeybdEvent.Call(vkMenu, 0, 0, 0)
		r, _, _ := procSetForegroundWindow.Call(hwnd)
		procKeybdEvent.Call(vkMenu, 0, keyEventfKeyUp, 0)
		if r != 0 {
			break
		}
		time.Sleep(30 * time.Millisecond)
	}
	procBringWindowToTop.Call(hwnd)

	if attached {
		procAttachThreadInput.Call(selfThread, fgThread, 0)
	}
}

func openInForeground(target string) error {
	sei := shellExecuteInfo{
		cbSize: uint32(unsafe.Sizeof(shellExecuteInfo{})),
		fMask:  0x00000400, // SEE_MASK_FLAG_NO_UI: don't show error dialogs
		lpVerb: utf16Ptr("open"),
		lpFile: utf16Ptr(target),
		nShow:  swShowNormal,
	}
	r, _, err := procShellExecuteExW.Call(uintptr(unsafe.Pointer(&sei)))
	if r == 0 {
		return fmt.Errorf("ShellExecuteExW failed: %v", err)
	}
	return nil
}

func main() {
	if len(os.Args) < 2 {
		return
	}
	target := os.Args[1]

	// Snapshot the existing windows before launching, so the player's window
	// can be told apart from windows that were already there.
	before := make(map[uintptr]bool)
	beforePids := make(map[uint32]bool)
	for _, w := range enumTopWindows() {
		if isRealWindow(w.hwnd) {
			before[w.hwnd] = true
			beforePids[w.pid] = true
		}
	}

	if err := openInForeground(target); err != nil {
		fmt.Fprintln(os.Stderr, err)
		os.Exit(1)
	}

	// Wait for a fresh window to show up, then steal the focus.
	deadline := time.Now().Add(5 * time.Second)
	for time.Now().Before(deadline) {
		for _, w := range enumTopWindows() {
			if !isRealWindow(w.hwnd) {
				continue
			}
			if before[w.hwnd] || beforePids[w.pid] {
				continue
			}
			focusWindow(w.hwnd)
			return
		}
		time.Sleep(50 * time.Millisecond)
	}
}
