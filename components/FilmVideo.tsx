"use client";

import { useEffect, useRef, useState } from "react";
import type { FilmClock } from "@/components/FilmClock";
import { useFilmQuality, whenBuffered } from "@/components/FilmQuality";
import { FILM_DIR, FILM_END, FILM_NARROW, type FilmShape } from "@/lib/film";

// The film's picture as one recorded video of the original MapLibre flight
// (AV1 and HEVC per layout; first and last frames as WebP stills).
// The video sets the pace: the clock may never run ahead of the frame on screen,
// so a slow connection holds the words back exactly as the picture stalls.

const DIR = FILM_DIR;
const DRIFT_MS = 250; // a jump in the clock larger than this is a seek, not playback

export function FilmVideo({ clock, onState }: { clock: FilmClock; onState: (state: "ready" | "failed") => void }) {
  const ref = useRef<HTMLVideoElement>(null);
  const endRef = useRef<HTMLImageElement>(null);
  const holdRef = useRef<HTMLCanvasElement>(null);
  const { subscribe, time, setLimit, playing, reduced, skip } = clock;
  // the last frame is held on screen, so it is shown as a full-quality still instead
  const [wantEnd, setWantEnd] = useState(false);
  const onStateRef = useRef(onState);
  onStateRef.current = onState;
  const [shape, setShape] = useState<FilmShape | null>(null);
  const reducedRef = useRef(reduced);
  reducedRef.current = reduced;
  const shouldPlay = useRef(false);
  shouldPlay.current = playing && !reduced;
  const { quality, switching, restart } = useFilmQuality(ref, holdRef, shape, shouldPlay);

  // Pick the recording made for this layout and connection; swap if the layout changes.
  useEffect(() => {
    const narrow = window.matchMedia(FILM_NARROW);
    const sync = () => {
      const next: FilmShape = narrow.matches ? "mobile" : "desktop";
      restart(next);
      setShape(next);
    };
    sync();
    narrow.addEventListener("change", sync);
    return () => narrow.removeEventListener("change", sync);
  }, [restart]);

  // The poster is up at once; the picture can fade in over it.
  useEffect(() => {
    if (shape) onStateRef.current("ready");
  }, [shape]);

  // Clock → video: cuts, chapter jumps and replays move the video to the clock's time.
  useEffect(() => {
    const video = ref.current;
    if (!video) return;
    const follow = (t: number) => {
      if (switching.current != null) {
        switching.current = t; // resume the light recording wherever the clock is sent
        return;
      }
      if (Math.abs(video.currentTime * 1000 - t) <= DRIFT_MS) return;
      if (video.readyState === 0) {
        // stills mode: the end still is already the poster; load only to show another chapter
        if (reducedRef.current && t >= FILM_END) return;
        video.preload = "auto";
      }
      video.currentTime = t / 1000;
    };
    const hold = (t: number) => {
      const end = t >= FILM_END;
      if (endRef.current) endRef.current.style.visibility = end ? "visible" : "hidden";
      if (t > FILM_END - 2000) setWantEnd(true);
    };
    const both = (t: number) => {
      follow(t);
      hold(t);
    };
    both(time());
    return subscribe(both);
  }, [shape, subscribe, time, wantEnd, switching]); // re-run once the end still mounts, to set its visibility

  // Video → clock: the clock runs up to the frame being shown, never past it.
  useEffect(() => {
    const video = ref.current;
    if (!video) return;
    let frame = 0;
    const tick = () => {
      // mid-switch the element is reloading at 0: keep the clock where it is
      if (switching.current == null) setLimit(video.ended ? FILM_END : video.currentTime * 1000);
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [shape, setLimit, switching]);

  // Play and pause with the clock.
  useEffect(() => {
    const video = ref.current;
    if (!video || switching.current != null) return;
    if (playing && !reduced) {
      // the clock waits at the video's time meanwhile, so the words wait too
      return whenBuffered(video, () => {
        // autoplay blocked (e.g. iOS Low Power Mode): go to the last frame, as for reduced motion
        video.play().catch((error: DOMException) => {
          if (error.name === "NotAllowedError") skip();
        });
      });
    }
    video.pause();
  }, [playing, reduced, shape, skip, switching]);

  if (!shape) return null;
  const name = `earth-${shape}${quality === "lite" ? "-lite" : ""}`;
  return (
    <>
      <video
        key={shape}
        ref={ref}
        className="film-video"
        // stills mode: the last frame as a still; the video loads only if a chapter is asked for
        poster={`${DIR}/earth-${shape}-${reduced ? "end" : "start"}.webp`}
        preload={reduced ? "none" : "auto"}
        muted
        playsInline
        disablePictureInPicture
        disableRemotePlayback
        aria-hidden="true"
        tabIndex={-1}
        onError={() => onStateRef.current("failed")}
        onCanPlayThrough={() => setWantEnd(true)}
      >
        <source src={`${DIR}/${name}.av1.mp4`} type='video/mp4; codecs="av01.0.09M.10"' />
        {/* no H.264: a browser that plays neither gets the end still (onError → Poster) */}
        <source
          src={`${DIR}/${name}.hevc.mp4`}
          type='video/mp4; codecs="hvc1.2.4.L123.B0"'
          onError={() => onStateRef.current("failed")}
        />
      </video>
      <canvas ref={holdRef} className="film-video" aria-hidden="true" style={{ visibility: "hidden" }} />
      {wantEnd || reduced ? (
        <img
          key={`end-${shape}`}
          ref={endRef}
          className="film-video"
          src={`${DIR}/earth-${shape}-end.webp`}
          alt=""
          decoding="async"
          fetchPriority="low"
          style={{ visibility: time() >= FILM_END ? "visible" : "hidden" }}
        />
      ) : null}
    </>
  );
}
