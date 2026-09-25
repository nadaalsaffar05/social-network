import { request } from "./client.js";

export async function globalSearch({ query, types = [] } = {}) {
  const queryParams = { q: query };
  if (types && types.length > 0) {
    queryParams.types = types.join(",");
  }
  return request(["api", "search"], {
    queryParams,
  });
}
