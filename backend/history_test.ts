import { getAllMPCHCMediaHistory, getMPCHCMediaHistory } from "./history.ts";

const allMediaHistory = await getAllMPCHCMediaHistory();

Deno.test.ignore("test getAllMPCHCMediaHistory", async () => {
    console.log(await getAllMPCHCMediaHistory());
});

Deno.test.ignore("test getMPCHCMediaHistory", async () => {
    let result = await getMPCHCMediaHistory(allMediaHistory, "\\\\UNRAID\\Videos\\Every Little Thing - fragile.webm");
    console.log(result);
});
