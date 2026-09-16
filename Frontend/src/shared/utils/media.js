import { BASE_API } from "../../config/api";

export function getMediaUrl(path) {
  if (!path) return null;
  if (/^[a-z][a-z\d+.-]*:/i.test(path)) return path;

  return new URL(`/${String(path).replace(/^\/+/, "")}`, BASE_API).toString();
}
