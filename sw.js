const CACHE_NAME = 'github-issues-cache-v1';
const CACHE_EXPIRATION = 60 * 60 * 1000; // 1 hour in milliseconds

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE_NAME));
});

self.addEventListener('fetch', (event) => {
  // Only cache GitHub API requests
  if (event.request.url.includes('api.github.com')) {
    event.respondWith(handleApiRequest(event.request));
  }
});

async function handleApiRequest(request) {
  const cache = await caches.open(CACHE_NAME);
  let staleResponse;

  // Try to find a cached response
  const cachedResponse = await cache.match(request);
  if (cachedResponse) {
    // Check if the cached response has expired
    const cachedData = await cachedResponse.json();
    const cacheTime = cachedResponse.headers.get('cache-time');

    if (cacheTime && Date.now() - Number(cacheTime) < CACHE_EXPIRATION) {
      return new Response(JSON.stringify(cachedData), {
        headers: cachedResponse.headers,
        status: 200,
        statusText: 'OK',
      });
    } else {
      // Save the stale response in case network request fails
      staleResponse = new Response(JSON.stringify(cachedData), {
        headers: cachedResponse.headers,
        status: 200,
        statusText: 'OK',
      });
      // Keep expired response in cache for fallback
    }
  }

  // If no cache or expired, fetch from network
  try {
    const response = await fetch(request);
    
    if (response.ok) {
      // Only cache successful responses
      const responseData = await response.clone().json();
      const headers = new Headers(response.headers);
      headers.set('cache-time', Date.now().toString());

      // Store the response in cache with current timestamp
      const cacheResponse = new Response(JSON.stringify(responseData), {
        headers: headers,
        status: response.status,
        statusText: response.statusText,
      });

      await cache.put(request, cacheResponse);
      return response;
    } else {
      // For error responses, use stale cache if available
      return staleResponse || response;
    }
  } catch (error) {
    // If offline or request fails, return stale cache if available
    if (staleResponse) {
      return staleResponse;
    }
    return new Response(JSON.stringify({ error: 'Network request failed' }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
