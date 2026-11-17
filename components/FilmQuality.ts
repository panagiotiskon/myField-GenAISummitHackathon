"use client";

import { useCallback, useEffect, useRef, useState, type RefObject } from "react";
import type { FilmShape } from "@/lib/film";

// How the film's recording copes with the connection.
//
// Each layout has a full and a light recording. The light one is 3/4 the size
// (desktop also at 30 fps), with its bitrate capped at 2.6 Mbit/s so the zoom costs
// about what the rest does: it plays through at about 1.6 Mbit/s without stalling.
// Playback starts only once the browser expects to play through, so a slow link
// waits a moment on the poster instead of freezing mid-zoom.

type Quality = "full" | "lite";

/** Mbit/s the full recording needs to play through (file size over 14 s), with headroom. */
const FULL_NEEDS: Record<FilmShape, number> = { desktop: 4.5 * 1.4, mobile: 2.8 * 1.4 };

type Connection = { effectiveType?: string; downlink?: number };

/** iOS may not buffer ahead before play() and then never fires canplaythrough: start anyway after this. */
const BUFFER_WAIT_MS = 3000;

/** Run `then` once the browser expects to play through without stopping. Returns a cancel. */
export function whenBuffered(video: HTMLVideoElement, then: () => void) {
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
function firstQuality(shape: FilmShape): Quality {
  const connection = (navigator as Navigator & { connection?: Connection }).connection;
  if (!connection) return "full";
  if (connection.effectiveType && connection.effectiveType !== "4g") return "lite";
  if (typeof connection.downlink === "number" && connection.downlink > 0 && connection.downlink < FULL_NEEDS[shape]) {
    return "lite";
  }
  return "full";
}

/** `switching`: while the light recording replaces the full one, the time (ms) to resume at. */
export function useFilmQuality(
  videoRef: RefObject<HTMLVideoElement | null>,
  holdRef: RefObject<HTMLCanvasElement | null>,
  shape: FilmShape | null,
  shouldPlay: RefObject<boolean>,
) {
  const [quality, setQuality] = useState<Quality>("full");
  const switching = useRef<number | null>(null);
  const started = useRef(false);

  const restart = useCallback((next: FilmShape) => {
    started.current = false;
    switching.current = null;
    // a switch cut short by a layout change never reaches done(): drop its held frame here
    if (holdRef.current) holdRef.current.style.visibility = "hidden";
    setQuality(firstQuality(next));
  }, [holdRef]);

  // The full recording stalled mid-play: hold the frame on screen and carry on in the light one.
  useEffect(() => {
    const video = videoRef.current;
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
  }, [videoRef, holdRef, quality, shape]);

  // After the switch has rendered the light sources: reload, seek to the held time, resume.
  useEffect(() => {
    const video = videoRef.current;
    if (!video || quality !== "lite" || switching.current == null) return;
    let cancel = () => undefined as void;
    const done = () => {
      switching.current = null;
      if (holdRef.current) holdRef.current.style.visibility = "hidden";
      if (shouldPlay.current) {
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
  }, [videoRef, holdRef, shouldPlay, quality]);

  return { quality, switching, restart };
}
