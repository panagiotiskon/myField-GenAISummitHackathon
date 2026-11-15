// The landing film's satellite tiles, fetched into memory once and shared with the map.
// Kept free of the map engine so the landing page can start downloading tiles at once,
// in parallel with the engine itself, instead of after it.

export const tileStore = new Map<string, ArrayBuffer>();
const inflight = new Map<string, Promise<ArrayBuffer | null>>();

export function fetchTile(key: string, signal?: AbortSignal): Promise<ArrayBuffer | null> {
  const hit = tileStore.get(key);
  if (hit) return Promise.resolve(hit);
  const pending = inflight.get(key);
  if (pending) return pending;
  const job = fetch(`/flight/s2/${key}.jpg`, { signal })
    .then(async (response) => {
      if (!response.ok) return null;
      const data = await response.arrayBuffer();
      tileStore.set(key, data);
      return data;
    })
    .catch(() => null)
    .finally(() => inflight.delete(key));
  inflight.set(key, job);
  return job;
}

/** Fetch keys with a few workers; resolves when all are in (or failed). */
export async function fetchTiles(keys: string[], signal?: AbortSignal, workers = 8): Promise<void> {
  let next = 0;
  const worker = async () => {
    while (next < keys.length && !signal?.aborted) {
      const key = keys[next];
      next += 1;
      await fetchTile(key, signal);
    }
  };
  await Promise.all(Array.from({ length: workers }, worker));
}

/** Every tile at zoom 0 to 3: what the opening orbit needs, whatever the screen size. */
export const ORBIT_TILES: string[] = (() => {
  const keys: string[] = [];
  for (let z = 0; z <= 3; z += 1) {
    const n = 2 ** z;
    for (let y = 0; y < n; y += 1) for (let x = 0; x < n; x += 1) keys.push(`${z}/${x}/${y}`);
  }
  return keys;
})();

let warmed: Promise<void> | null = null;
/** Start the orbit tiles downloading. Safe to call more than once. */
export function warmOrbitTiles(): Promise<void> {
  warmed ??= fetchTiles(ORBIT_TILES);
  return warmed;
}
