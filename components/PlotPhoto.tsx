import { imageryFor } from "@/lib/assess";
import type { Polygon } from "geojson";

/**
 * The plot on its Cadastre aerial photo. The sharp copy has no outline in its pixels, so the outline
 * is drawn here as a vector from the plot's coordinates and the photo's bounds. The older copy
 * already carries its outline, so nothing is drawn over it.
 */
export function PlotPhoto({
  id,
  geometry,
  alt = "",
  className,
  small = false,
}: {
  id: string;
  geometry: Polygon;
  alt?: string;
  className?: string;
  /** Use the 320 px copy: for lists and thumbnails. */
  small?: boolean;
}) {
  const imagery = imageryFor(id);
  const thumb = small ? imagery?.thumb : undefined;
  const photo = thumb ?? imagery?.orthoHd ?? imagery?.ortho;
  const drawOutline = thumb ? !thumb.outlined : Boolean(imagery?.orthoHd);
  if (!photo) return <span className={className} aria-hidden="true" />;
  const [west, south, east, north] = photo.bounds;
  const points = geometry.coordinates[0]
    .map(([x, y]) => `${(((x - west) / (east - west)) * 100).toFixed(3)},${(((north - y) / (north - south)) * 100).toFixed(3)}`)
    .join(" ");
  return (
    <span className={`plot-photo ${className ?? ""}`}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={photo.src} alt={alt} loading="lazy" decoding="async" />
      {drawOutline ? (
        <svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
          <polygon points={points} className="plot-photo-edge" />
          <polygon points={points} className="plot-photo-line" />
        </svg>
      ) : null}
    </span>
  );
}
