import { arrayToObjectAsArray, decodeRequestPath, encodeRequestPath, formatTime, isEmptyObject, objectAsArrayToArray, sortArray, sortObjectAsArray } from "./util.ts";
import { assertEquals } from "jsr:@std/assert@^1.0.16";

Deno.test("test encodeRequestPath", async () => {
    let result = encodeRequestPath("C:\\Program Files (x86)\\SamsungPrinterLiveUpdate");

    assertEquals(result, "C:|Program Files (x86)|SamsungPrinterLiveUpdate");

    result = encodeRequestPath("C:\\Program Files (x86)\\SamsungPrinterLiveUpdate\\");
    assertEquals(result, "C:|Program Files (x86)|SamsungPrinterLiveUpdate|");

    result = encodeRequestPath("\\Unraid\\Videos");
    assertEquals(result, "|Unraid|Videos");
});

Deno.test("test decodeRequestPath", () => {
    assertEquals(decodeRequestPath("C:|Program Files (x86)|SamsungPrinterLiveUpdate"), "C:\\Program Files (x86)\\SamsungPrinterLiveUpdate");
    assertEquals(decodeRequestPath("C:|Program Files (x86)|SamsungPrinterLiveUpdate|"), "C:\\Program Files (x86)\\SamsungPrinterLiveUpdate\\");
    assertEquals(decodeRequestPath("|Unraid|Videos"), "\\Unraid\\Videos");
    assertEquals(decodeRequestPath("path/**with**stars"), "path//with/stars");
});

Deno.test("test isEmptyObject", () => {
    assertEquals(isEmptyObject({}), true);
    assertEquals(isEmptyObject({ a: 1 }), false);
    assertEquals(isEmptyObject({ a: 1, b: 2 }), false);
});

Deno.test("test formatTime", () => {
    assertEquals(formatTime(0), "0:00");
    assertEquals(formatTime(59), "0:59");
    assertEquals(formatTime(60), "1:00");
    assertEquals(formatTime(3661), "1:01:01");
    assertEquals(formatTime(3600), "1:00:00");
    assertEquals(formatTime(90), "1:30");
});

Deno.test("test arrayToObjectAsArray", () => {
    const arr = [{ id: "a", val: 1 }, { id: "b", val: 2 }];
    const result = arrayToObjectAsArray(arr, (item) => item.id);
    assertEquals(result, { a: { id: "a", val: 1 }, b: { id: "b", val: 2 } });
});

Deno.test("test objectAsArrayToArray", () => {
    const obj = { a: 1, b: 2, c: 3 };
    const result = objectAsArrayToArray(obj);
    assertEquals(result, [1, 2, 3]);
});

Deno.test("test sortArray by name asc", () => {
    const items = [
        { name: "c", isDirectory: false, isFile: true, absolutePath: "", done: false, size: 0, dateAccessed: "", extraInfo: {} },
        { name: "a", isDirectory: false, isFile: true, absolutePath: "", done: false, size: 0, dateAccessed: "", extraInfo: {} },
        { name: "b", isDirectory: false, isFile: true, absolutePath: "", done: false, size: 0, dateAccessed: "", extraInfo: {} },
    ];
    const result = sortArray(items, { sort: "name", order: "asc", view: "list", itemSize: "medium" });
    assertEquals(result.map((e) => e.name), ["a", "b", "c"]);
});

Deno.test("test sortArray by name desc", () => {
    const items = [
        { name: "c", isDirectory: false, isFile: true, absolutePath: "", done: false, size: 0, dateAccessed: "", extraInfo: {} },
        { name: "a", isDirectory: false, isFile: true, absolutePath: "", done: false, size: 0, dateAccessed: "", extraInfo: {} },
        { name: "b", isDirectory: false, isFile: true, absolutePath: "", done: false, size: 0, dateAccessed: "", extraInfo: {} },
    ];
    const result = sortArray(items, { sort: "name", order: "desc", view: "list", itemSize: "medium" });
    assertEquals(result.map((e) => e.name), ["c", "b", "a"]);
});

Deno.test("test sortArray by dateAccessed", () => {
    const items = [
        { name: "b", isDirectory: false, isFile: true, absolutePath: "", done: false, size: 0, dateAccessed: "2024-01-02T00:00:00Z", extraInfo: {} },
        { name: "a", isDirectory: false, isFile: true, absolutePath: "", done: false, size: 0, dateAccessed: "2024-01-01T00:00:00Z", extraInfo: {} },
    ];
    const result = sortArray(items, { sort: "dateAccessed", order: "asc", view: "list", itemSize: "medium" });
    assertEquals(result.map((e) => e.name), ["a", "b"]);
});

Deno.test("test sortObjectAsArray", () => {
    const obj = {
        c: { name: "c", isDirectory: false, isFile: true, absolutePath: "", done: false, size: 0, dateAccessed: "", extraInfo: {} },
        a: { name: "a", isDirectory: false, isFile: true, absolutePath: "", done: false, size: 0, dateAccessed: "", extraInfo: {} },
        b: { name: "b", isDirectory: false, isFile: true, absolutePath: "", done: false, size: 0, dateAccessed: "", extraInfo: {} },
    };
    const result = sortObjectAsArray(obj, { sort: "name", order: "asc", view: "list", itemSize: "medium" });
    assertEquals(Object.keys(result), ["a", "b", "c"]);
});
