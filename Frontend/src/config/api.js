import { environment } from "./environment.js";

export const BASE_API = environment.api_path

export function buildApiUrl(pathSegments = [], queryParams = {}) {
    const url = new URL(BASE_API);

    const cleanSegments = pathSegments
        .filter((seg) => seg !== undefined && seg !== null && seg !== '')
        .map((seg) => encodeURIComponent(String(seg)));

    const existingPath = url.pathname.replace(/\/+$/, '');
    url.pathname = [existingPath, ...cleanSegments].filter(Boolean).join('/');

    Object.entries(queryParams).forEach(([key, value]) => {
        if (value === undefined || value === null) return;
        url.searchParams.append(key, String(value));
    });

    return url.toString();
}
