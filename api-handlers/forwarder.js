// api-handlers/forwarder.js

// Retrieve the origin server URL from environment settings
// Default is a placeholder; configure it in Netlify dashboard
const ORIGIN_SERVER = Netlify.env.get("ORIGIN_SERVER") || "https://your-origin-service.com";

export default async function processRequest(request, context) {
  const responseHeaders = new Headers();
  
  try {
    const url = new URL(request.url);
    
    // Construct the full target URL for the origin service
    const targetUrl = new URL(url.pathname + url.search, ORIGIN_SERVER).toString();
    
    // Create headers for the origin request, excluding specific ones
    const headers = new Headers(request.headers);
    headers.delete("host");
    headers.delete("x-forwarded-proto");
    headers.delete("x-forwarded-host");
    
    // Prepare the request to the origin service
    const originRequest = new Request(targetUrl, {
      method: request.method,
      headers: headers,
      body: request.body,
      redirect: "manual",
    });
    
    // Execute the fetch to origin
    const originResponse = await fetch(originRequest);
    
    // Filter and set response headers, skipping transport-specific ones
    for (const [key, value] of originResponse.headers.entries()) {
      const lowerKey = key.toLowerCase();
      if (!["transfer-encoding", "connection", "keep-alive"].includes(lowerKey)) {
        responseHeaders.set(key, value);
      }
    }
    
    // Stream back the origin response
    return new Response(originResponse.body, {
      status: originResponse.status,
      statusText: originResponse.statusText,
      headers: responseHeaders,
    });
    
  } catch (error) {
    console.error("Routing error:", error);
    return new Response(`Routing Error: ${error.message}`, { status: 502 });
  }
}
