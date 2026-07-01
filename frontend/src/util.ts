import { notify } from "@kyvg/vue3-notification";

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

export function notifySuccess(title: string, group?: string) {
    notify({ title, type: "success", group });
}

export function notifyError(title: string | Error | unknown, group?: string) {
    const msg = title instanceof Error ? title.message : typeof title === "string" ? title : "Unknown error";
    notify({ title: msg, type: "error", group });
}
