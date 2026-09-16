import { environment } from "./environment";

export const BASE_API = environment.api_path;

export function buildApiUrl(pathSegments = [], queryParams = {}) {
  const url = new URL(BASE_API);

  const cleanSegments = pathSegments
    .filter(
      (segment) => segment !== undefined && segment !== null && segment !== "",
    )
    .map((segment) => encodeURIComponent(String(segment)));

  const existingPath = url.pathname.replace(/\/+$/, "");
  url.pathname = [existingPath, ...cleanSegments].filter(Boolean).join("/");

  Object.entries(queryParams).forEach(([key, value]) => {
    if (value !== undefined && value !== null)
      url.searchParams.append(key, String(value));
  });

  return url.toString();
}
