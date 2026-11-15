import { NextResponse } from "next/server";

export const runtime = "nodejs";

function tileBBox(z: number, x: number, y: number) {
  const n = 2 ** z;
  const lonMin = (x / n) * 360 - 180;
  const lonMax = ((x + 1) / n) * 360 - 180;
  const latMax = (Math.atan(Math.sinh(Math.PI * (1 - (2 * y) / n))) * 180) / Math.PI;
  const latMin = (Math.atan(Math.sinh(Math.PI * (1 - (2 * (y + 1)) / n))) * 180) / Math.PI;
  return { lonMin, latMin, lonMax, latMax };
}

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ z: string; x: string; y: string }> },
) {
  const { z, x, y } = await ctx.params;
  const zi = Number(z);
  const xi = Number(x);
  const yi = Number(String(y).replace(/\.png$/i, ""));
  if (![zi, xi, yi].every(Number.isFinite)) {
    return new NextResponse("bad tile", { status: 400 });
  }
  const { lonMin, latMin, lonMax, latMax } = tileBBox(zi, xi, yi);
  const wms = new URL("http://gis.ktimanet.gr/wms/wmsopen/wmsserver.aspx");
  wms.searchParams.set("SERVICE", "WMS");
  wms.searchParams.set("VERSION", "1.1.1");
  wms.searchParams.set("REQUEST", "GetMap");
  wms.searchParams.set("LAYERS", "BASEMAP");
  wms.searchParams.set("STYLES", "");
  wms.searchParams.set("SRS", "EPSG:4326");
  wms.searchParams.set("BBOX", `${lonMin},${latMin},${lonMax},${latMax}`);
  wms.searchParams.set("WIDTH", "256");
  wms.searchParams.set("HEIGHT", "256");
  wms.searchParams.set("FORMAT", "image/jpeg");
  try {
    const res = await fetch(wms, {
      headers: { "User-Agent": "myField-demo/0.1" },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) {
      return new NextResponse(null, { status: 204 });
    }
    const buf = await res.arrayBuffer();
    return new NextResponse(buf, {
      headers: {
        "Content-Type": res.headers.get("Content-Type") ?? "image/jpeg",
        "Cache-Control": "public, max-age=86400",
      },
    });
  } catch {
    return new NextResponse(null, { status: 204 });
  }
}
