import type { CSSProperties } from "react";
import { NDVI_GREEN, NDVI_LOW } from "@/lib/assess";
import { copy, t } from "@/lib/i18n";

const SCALE_MAX = 0.8;
const share = (v: number) => Math.max(0, Math.min(1, v / SCALE_MAX)) * 100;
const pos = (v: number) => `${share(v)}%`;

/** NDVI before and after on the rule's own scale: below 0.20 reads bare, 0.30 and up reads green. */
export function NdviScale({ before, after, pixels, lang }: { before: number; after: number; pixels: number; lang: "el" | "en" }) {
  const delta = after - before;
  return (
    // --shift: how far the later reading sits from the earlier one, in percent of the track
    <div className="ndvi" style={{ "--shift": share(before) - share(after) } as CSSProperties}>
      <div className="ndvi-top">
        <span className="ndvi-label">{t(lang, copy.ndvi)}</span>
        <span className="ndvi-nums">
          <strong>{before.toFixed(2)}</strong>
          <span className="ndvi-later">
            <span aria-hidden="true">→</span>
            <strong>{after.toFixed(2)}</strong>
            <em className={delta < 0 ? "down" : "up"}>
              {delta < 0 ? "−" : "+"}
              {Math.abs(delta).toFixed(2)}
            </em>
          </span>
        </span>
      </div>
      <div className="ndvi-track" aria-hidden="true">
        <i className="band band-low" style={{ width: pos(NDVI_LOW) }} />
        <i className="band band-green" style={{ left: pos(NDVI_GREEN), right: 0 }} />
        <i className="ndvi-span" style={{ left: pos(Math.min(before, after)), width: pos(Math.abs(delta)) }} />
        <b className="ndvi-dot was" style={{ left: pos(before) }} />
        <b className="ndvi-dot now" style={{ left: pos(after) }} />
      </div>
      <p className="ndvi-foot">
        <span>{t(lang, copy.ndviScale)}</span>
        <span>
          {pixels} {t(lang, copy.pixels)}
        </span>
      </p>
    </div>
  );
}
