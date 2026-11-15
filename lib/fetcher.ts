// Fetch each static file once. Concurrent callers share one promise, and the
// bytes stay in memory for the page's life. Failed or aborted: forgotten, so
// the next caller retries.
const bytes = new Map<string, Promise<ArrayBuffer>>();

export function fetchOnce(url: string, signal?: AbortSignal): Promise<ArrayBuffer> {
  const hit = bytes.get(url);
  if (hit) return hit;
  const request = fetch(url, { signal }).then((res) => {
    if (!res.ok) throw new Error(`${url}: ${res.status}`);
    return res.arrayBuffer();
  });
  bytes.set(url, request);
  request.catch(() => bytes.delete(url));
  return request;
}
