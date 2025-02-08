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
    }

    // If expired, remove it from the cache
    await cache.delete(request);
  }

  // If no cache or expired, fetch from network
  try {
    const response = await fetch(request);
    if (response.ok) {
      // Clone the response before caching because the response body can only be used once
      const clonedResponse = response.clone();
      const headers = new Headers(response.headers);
      headers.set('cache-time', Date.now().toString());

      // Store the response in cache with current timestamp
      const cacheResponse = new Response(await clonedResponse.blob(), {
        headers: headers,
        status: response.status,
        statusText: response.statusText,
      });

      await cache.put(request, cacheResponse);
    }
    return response;
  } catch (error) {
    // If offline and no valid cache, return error response
    return new Response(JSON.stringify({ error: 'Network request failed' }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
