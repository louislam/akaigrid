import { getRFEHash } from "./util.ts";
import { ObjectAsArray } from "../common/util.ts";

export async function getAllMPCHCMediaHistory(): Promise<ObjectAsArray<number>> {
    const key = "HKEY_CURRENT_USER\\Software\\MPC-HC\\MPC-HC\\MediaHistory";
    const command = new Deno.Command("reg.exe", {
        args: [
            "query",
            key,
            "/s",
            "/v",
            "FilePosition",
        ],
    });

    let { code, stdout, stderr } = await command.output();

    if (code !== 0) {
        console.error("Error executing command:", code, stderr);
        return {};
    }

    const allMediaHistoryString = new TextDecoder().decode(stdout);
    const list: ObjectAsArray<number> = {};
    const prefix = "HKEY_CURRENT_USER\\Software\\MPC-HC\\MPC-HC\\MediaHistory\\";

    // Scan line by line, if the line contains the rfeHash, return the next line
    /* Sample output:
    HKEY_CURRENT_USER\Software\MPC-HC\MPC-HC\MediaHistory\B0UIHYuw0TP9
    FilePosition    REG_DWORD    0x0
     */
    const lines = allMediaHistoryString.split("\r\n");
    let i = 0;

    while (i < lines.length) {
        const line = lines[i];
        if (line.includes(prefix)) {
            const splitLine = line.split("\\");
            const rfeHash = splitLine[splitLine.length - 1];
            const nextLine = lines[i + 1];
            if (nextLine) {
                const array = nextLine.split(" ").filter((item) => item !== "");

                const filePos = parseInt(array[2], 16) / 1000;

                // Exclude 0 to save some space, not much difference between 0 and -1 in my opinion
                if (filePos > 0) {
                    list[rfeHash] = filePos;
                }
            }
            i += 2;
        } else {
            i++;
        }
    }

    return list;
}

/**
 * Get the last position of a file in MPC-HC's MediaHistory
 * @returns Seconds (-1 if not found)
 */
export function getMPCHCMediaHistory(allMediaHistory: ObjectAsArray<number>, path: string) {
    const rfeHash = getRFEHash(path);
    if (rfeHash in allMediaHistory) {
        return allMediaHistory[rfeHash];
    } else {
        return -1;
    }
}
