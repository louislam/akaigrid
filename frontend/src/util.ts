import { arrayToObjectAsArray, DirConfig, EntryDisplayObject, ObjectAsArray, objectAsArrayToArray } from "../../common/util.ts";

/**
 * Get the base URL
 * Mainly used for dev, because the backend and the frontend are in different ports.
 * @returns Base URL
 */
function getBaseURL(): string {
    const env = process.env.NODE_ENV;
    if (env === "development") {
        return location.protocol + "//" + location.hostname + ":60001";
    } else {
        return "";
    }
}

export const baseURL = getBaseURL();
