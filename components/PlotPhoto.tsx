import { imageryFor } from "@/lib/assess";
import type { Polygon } from "geojson";

/**
 * The plot on its Cadastre aerial photo. The sharp copy has no outline in its pixels, so the outline
 * is drawn here as a vector from the plot's coordinates and the photo's bounds. The older copy
 * already carries its outline, so nothing is drawn over it.
 */
export function PlotPhoto({ id, geometry, alt = "", className }: { id: string; geometry: Polygon; alt?: string; className?: string }) {
  const imagery = imageryFor(id);
  const photo = imagery?.orthoHd ?? imagery?.ortho;
  if (!photo) return <span className={className} aria-hidden="true" />;
  const [west, south, east, north] = photo.bounds;
  const points = geometry.coordinates[0]
    .map(([x, y]) => `${(((x - west) / (east - west)) * 100).toFixed(3)},${(((north - y) / (north - south)) * 100).toFixed(3)}`)
    .join(" ");
  return (
    <span className={`plot-photo ${className ?? ""}`}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={photo.src} alt={alt} loading="lazy" />
      {imagery?.orthoHd ? (
        <svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
          <polygon points={points} className="plot-photo-edge" />
          <polygon points={points} className="plot-photo-line" />
        </svg>
      ) : null}
    </span>
  );
}
