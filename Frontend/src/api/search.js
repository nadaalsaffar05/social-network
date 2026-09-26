import { request } from "./client.js";

export async function globalSearch({ query, types = [], groupID = "" } = {}) {
  const queryParams = { q: query };
  if (types.length > 0) {
    queryParams.types = types.join(",");
  }
  if (groupID) {
    queryParams.group_id = groupID;
  }
  return request(["api", "search"], {
    queryParams,
  });
}
