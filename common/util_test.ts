import { encodeRequestPath } from "./util.ts";
import { assertEquals } from "jsr:@std/assert";

Deno.test("test", async () => {
    let result = encodeRequestPath("C:\\Program Files (x86)\\SamsungPrinterLiveUpdate");

    assertEquals(result, "C:|Program Files (x86)|SamsungPrinterLiveUpdate");

    result = encodeRequestPath("C:\\Program Files (x86)\\SamsungPrinterLiveUpdate\\");
    assertEquals(result, "C:|Program Files (x86)|SamsungPrinterLiveUpdate|");

    result = encodeRequestPath("\\Unraid\\Videos");
    assertEquals(result, "|Unraid|Videos");
});
