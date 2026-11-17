"use client";

import { useEffect, useRef, useState } from "react";
import type { FilmClock } from "@/components/FilmClock";
import { FILM_DIR, FILM_END, type FILM_SHAPES } from "@/lib/film";

// The film's picture as one recorded video of the original MapLibre flight
// (AV1 and HEVC per layout; first and last frames as WebP stills).
// The video sets the pace: the clock may never run ahead of the frame on screen,
// so a slow connection holds the words back exactly as the picture stalls.
//
// Each layout has a full and a light recording. The light one is 3/4 the size
// (desktop also at 30 fps), with its bitrate capped at 2.6 Mbit/s so the zoom costs
// about what the rest does: it plays through at about 1.6 Mbit/s without stalling.
// Playback starts only once the browser expects to play through, so a slow link
// waits a moment on the poster instead of freezing mid-zoom.

const DIR = FILM_DIR;
const NARROW = "(max-width: 900px)"; // the narrow layout in globals.css
const DRIFT_MS = 250; // a jump in the clock larger than this is a seek, not playback

type Shape = (typeof FILM_SHAPES)[number];
type Quality = "full" | "lite";

/** Mbit/s the full recording needs to play through (file size over 14 s), with headroom. */
const FULL_NEEDS: Record<Shape, number> = { desktop: 4.5 * 1.4, mobile: 2.8 * 1.4 };

type Connection = { effectiveType?: string; downlink?: number };

/** iOS may not buffer ahead before play() and then never fires canplaythrough: start anyway after this. */
const BUFFER_WAIT_MS = 3000;

/** Run `then` once the browser expects to play through without stopping. Returns a cancel. */
function whenBuffered(video: HTMLVideoElement, then: () => void) {
  if (video.readyState >= HTMLMediaElement.HAVE_ENOUGH_DATA) {
    then();
    return () => undefined;
  }
  let done = false;
  const go = () => {
    if (done) return;
    done = true;
    window.clearTimeout(timer);
    video.removeEventListener("canplaythrough", go);
    then();
  };
  const timer = window.setTimeout(go, BUFFER_WAIT_MS);
  video.addEventListener("canplaythrough", go);
  return () => {
    done = true;
    window.clearTimeout(timer);
    video.removeEventListener("canplaythrough", go);
  };
}

/** Start light when the browser says the connection is slow (Chromium only; elsewhere a stall decides). */
function firstQuality(shape: Shape): Quality {
  const connection = (navigator as Navigator & { connection?: Connection }).connection;
  if (!connection) return "full";
  if (connection.effectiveType && connection.effectiveType !== "4g") return "lite";
  if (typeof connection.downlink === "number" && connection.downlink > 0 && connection.downlink < FULL_NEEDS[shape]) {
    return "lite";
  }
  return "full";
}

export function FilmVideo({ clock, onState }: { clock: FilmClock; onState: (state: "ready" | "failed") => void }) {
  const ref = useRef<HTMLVideoElement>(null);
  const endRef = useRef<HTMLImageElement>(null);
  const holdRef = useRef<HTMLCanvasElement>(null);
  const { subscribe, time, setLimit, playing, reduced, skip } = clock;
  // the last frame is held on screen, so it is shown as a full-quality still instead
  const [wantEnd, setWantEnd] = useState(false);
  const onStateRef = useRef(onState);
  onStateRef.current = onState;
  const [shape, setShape] = useState<Shape | null>(null);
  const [quality, setQuality] = useState<Quality>("full");
  const reducedRef = useRef(reduced);
  reducedRef.current = reduced;
  const playingRef = useRef(playing);
  playingRef.current = playing;
  /** while the light recording replaces the full one: the time (ms) to resume at */
  const switching = useRef<number | null>(null);
  const started = useRef(false);

  // Pick the recording made for this layout and connection; swap if the layout changes.
  useEffect(() => {
    const narrow = window.matchMedia(NARROW);
    const sync = () => {
      const next: Shape = narrow.matches ? "mobile" : "desktop";
      started.current = false;
      switching.current = null;
      setQuality(firstQuality(next));
      setShape(next);
    };
    sync();
    narrow.addEventListener("change", sync);
    return () => narrow.removeEventListener("change", sync);
  }, []);

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
  }, [shape, subscribe, time, wantEnd]); // re-run once the end still mounts, to set its visibility

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
  }, [shape, setLimit]);

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
  }, [playing, reduced, shape, skip]);

  // The full recording stalled mid-play: hold the frame on screen and carry on in the light one.
  useEffect(() => {
    const video = ref.current;
    if (!video || quality === "lite") return;
    const onPlaying = () => {
      started.current = true;
    };
    const onWaiting = () => {
      if (!started.current || video.seeking || video.ended) return;
      const canvas = holdRef.current;
      if (canvas && video.videoWidth > 0) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        canvas.getContext("2d")?.drawImage(video, 0, 0);
        canvas.style.visibility = "visible";
      }
      switching.current = video.currentTime * 1000;
      setQuality("lite");
    };
    video.addEventListener("playing", onPlaying);
    video.addEventListener("waiting", onWaiting);
    return () => {
      video.removeEventListener("playing", onPlaying);
      video.removeEventListener("waiting", onWaiting);
    };
  }, [quality, shape]);

  // After the switch has rendered the light sources: reload, seek to the held time, resume.
  useEffect(() => {
    const video = ref.current;
    if (!video || quality !== "lite" || switching.current == null) return;
    let cancel = () => undefined as void;
    const done = () => {
      switching.current = null;
      if (holdRef.current) holdRef.current.style.visibility = "hidden";
      if (playingRef.current && !reducedRef.current) {
        cancel = whenBuffered(video, () => void video.play().catch(() => undefined));
      }
    };
    const onMeta = () => {
      video.currentTime = (switching.current ?? 0) / 1000;
      video.addEventListener("seeked", done, { once: true });
    };
    video.addEventListener("loadedmetadata", onMeta, { once: true });
    video.load();
    return () => {
      cancel();
      video.removeEventListener("loadedmetadata", onMeta);
      video.removeEventListener("seeked", done);
    };
  }, [quality]);

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
