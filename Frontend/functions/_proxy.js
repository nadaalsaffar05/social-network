const backendOriginVariable = "BACKEND_ORIGIN";

export async function proxyToBackend(context) {
  const backendOrigin = context.env[backendOriginVariable];
  if (!backendOrigin) {
    return new Response("Backend proxy is not configured", { status: 500 });
  }

  let targetURL;
  try {
    const incomingURL = new URL(context.request.url);
    targetURL = new URL(
      `${incomingURL.pathname}${incomingURL.search}`,
      backendOrigin,
    );
  } catch {
    return new Response("Backend proxy is not configured", { status: 500 });
  }

  try {
    // Reusing the incoming Request preserves its method, body, content type,
    // authorization, cookie, and WebSocket upgrade headers while changing only
    // the destination origin.
    return await fetch(new Request(targetURL, context.request));
  } catch {
    return new Response("Backend is unavailable", { status: 502 });
  }
}
