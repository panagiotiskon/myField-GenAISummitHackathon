const WMS = "https://gis.ktimanet.gr/wms/wmsopen/wmsserver.aspx";
const BBOX = /^-?\d+(\.\d+)?,-?\d+(\.\d+)?,-?\d+(\.\d+)?,-?\d+(\.\d+)?$/;
const R = 6378137;

function mercatorToLonLat(x: number, y: number): [number, number] {
  const lon = (x / R) * (180 / Math.PI);
  const lat = Math.atan(Math.sinh(y / R)) * (180 / Math.PI);
  return [lon, lat];
}

export async function GET(request: Request) {
  const bbox = new URL(request.url).searchParams.get("bbox") ?? "";
  if (!BBOX.test(bbox)) {
    return new Response("invalid bbox", { status: 400 });
  }
  const [minx, miny, maxx, maxy] = bbox.split(",").map(Number);
  const [minLon, minLat] = mercatorToLonLat(minx, miny);
  const [maxLon, maxLat] = mercatorToLonLat(maxx, maxy);

  const upstream = new URL(WMS);
  upstream.searchParams.set("SERVICE", "WMS");
  upstream.searchParams.set("VERSION", "1.1.1");
  upstream.searchParams.set("REQUEST", "GetMap");
  upstream.searchParams.set("LAYERS", "BASEMAP");
  upstream.searchParams.set("STYLES", "");
  upstream.searchParams.set("FORMAT", "image/jpeg");
  upstream.searchParams.set("TRANSPARENT", "false");
  upstream.searchParams.set("SRS", "EPSG:4326");
  upstream.searchParams.set("BBOX", `${minLon},${minLat},${maxLon},${maxLat}`);
  upstream.searchParams.set("WIDTH", "256");
  upstream.searchParams.set("HEIGHT", "256");

  const response = await fetch(upstream);
  if (!response.ok) {
    return new Response("upstream wms error", { status: 502 });
  }
  return new Response(response.body, {
    headers: {
      "content-type": response.headers.get("content-type") ?? "image/jpeg",
      "cache-control": "public, max-age=86400",
    },
  });
}
