import { buildApiUrl } from "../config/api";

const SERVER_UNAVAILABLE_MESSAGE =
  "Couldn’t reach the server. Make sure the backend is running, then try again.";

export async function request(pathSegments, options = {}) {
  const {
    method = "GET",
    queryParams = {},
    body,
    headers,
    ...fetchOptions
  } = options;

  const isFormData = body instanceof FormData;
  const hasBody = body != null;

  let response;

  try {
    response = await fetch(buildApiUrl(pathSegments, queryParams), {
      ...fetchOptions,
      method,
      credentials: "include",
      headers: {
        ...(hasBody && !isFormData
          ? { "Content-Type": "application/json" }
          : {}),
        ...headers,
      },
      body: hasBody && !isFormData ? JSON.stringify(body) : body,
    });
  } catch (error) {
    if (error instanceof TypeError) {
      throw new Error(SERVER_UNAVAILABLE_MESSAGE, { cause: error });
    }

    throw error;
  }

  const responseText = await response.text();
  const isJSON = response.headers
    .get("content-type")
    ?.includes("application/json");
  let data = null;

  if (responseText && isJSON) {
    try {
      data = JSON.parse(responseText);
    } catch {
      throw new Error("Invalid JSON response received from server");
    }
  }

  if (!response.ok) {
    throw new Error(
      data?.error ||
        data?.message ||
        responseText ||
        response.statusText ||
        "Request failed",
    );
  }

  return data;
}
