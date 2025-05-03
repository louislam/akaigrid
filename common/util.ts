import { z } from "zod";
import * as naturalOrderBy from "natural-orderby";

export type ObjectAsArray<T> = {
    [index: string]: T;
};

export function arrayToObjectAsArray<T>(arr: T[], keyGetter: (item: T) => string): ObjectAsArray<T> {
    const obj: ObjectAsArray<T> = {};
    let key: string;
    for (const item of arr) {
        key = keyGetter(item);
        obj[key] = item;
    }
    return obj;
}

export function objectAsArrayToArray<T>(obj: ObjectAsArray<T>): T[] {
    const arr: T[] = [];
    for (const key in obj) {
        if (Object.hasOwn(obj, key)) {
            arr.push(obj[key]);
        }
    }
    return arr;
}

// Dir Config (sort, order, view, item size)
export const DirConfigSchema = z.object({
    sort: z.enum(["name", "size", "dateModified"]).default("name"),
    order: z.enum(["asc", "desc"]).default("asc"),
    view: z.enum(["list", "grid"]).default("list"),
    itemSize: z.enum(["small", "medium", "large"]).default("medium"),
});
export type DirConfig = z.infer<typeof DirConfigSchema>;

export const VideoInfoSchema = z.object({
    duration: z.number(),
    width: z.number(),
    height: z.number(),
    codecName: z.string(),
});
export type VideoInfo = z.infer<typeof VideoInfoSchema>;

export const EntryDisplayObjectSchema = z.object({
    name: z.string(),
    isDirectory: z.boolean(),
    isFile: z.boolean(),
    absolutePath: z.string(),
    done: z.boolean(),
    size: z.number(),
    dateModified: z.string(),
    extraInfo: z.object({
        lastPosition: z.number().optional(),
        videoInfo: VideoInfoSchema.optional(),
    }),
});
export type EntryDisplayObject = z.infer<typeof EntryDisplayObjectSchema>;

/**
 * Convert \ to |
 * @param windowsPath
 */
export function encodeRequestPath(windowsPath: string) {
    return windowsPath.replace(/\\/g, "|");
}

/**
 * Convert | to \
 * @param requestPath
 */
export function decodeRequestPath(requestPath: string) {
    return requestPath.replace(/\|/g, "\\");
}

export function isEmptyObject(obj: object) {
    for (const prop in obj) {
        if (Object.hasOwn(obj, prop)) {
            return false;
        }
    }

    return true;
}

/**
 * From: https://stackoverflow.com/a/40350003/1097815
 * @param seconds
 */
export function formatTime(seconds: number) {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.round(seconds % 60);
    const t = [h, m > 9 ? m : h ? "0" + m : m || "0", s > 9 ? s : "0" + s]
        .filter(Boolean)
        .join(":");
    return seconds < 0 && seconds ? `-${t}` : t;
}

export function sortObjectAsArray(input: ObjectAsArray<EntryDisplayObject>, dirConfig: DirConfig): ObjectAsArray<EntryDisplayObject> {
    let inputArray = objectAsArrayToArray(input);
    inputArray = sortArray(inputArray, dirConfig);
    return arrayToObjectAsArray(inputArray, (entry) => entry.name);
}

export function sortArray(inputArray: EntryDisplayObject[], dirConfig: DirConfig): EntryDisplayObject[] {
    let list: EntryDisplayObject[] = [];

    // Sorting
    const sort = dirConfig.sort;
    const order = dirConfig.order;

    if (sort === "name") {
        if (order === "asc") {
            list = naturalOrderBy.orderBy(inputArray, (entry) => entry.name);
        } else {
            list = naturalOrderBy.orderBy(inputArray, (entry) => entry.name, "desc");
        }
    } else if (sort === "dateModified") {
        const pairList = [];
        for (const entry of inputArray) {
            pairList.push({
                entry,
                dateModified: entry.dateModified,
            });
        }

        pairList.sort((a, b) => {
            if (!a.dateModified) {
                return 1;
            }

            if (!b.dateModified) {
                return -1;
            }

            if (order === "asc") {
                return new Date(a.dateModified).getTime() - new Date(b.dateModified).getTime();
            } else {
                return new Date(b.dateModified).getTime() - new Date(a.dateModified).getTime();
            }
        });

        // Rebuild the list
        list = [];
        for (const pair of pairList) {
            list.push(pair.entry);
        }
    } else {
        console.log("Unknown sort type: " + sort);
    }

    return list;
}

export function sleep(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}
