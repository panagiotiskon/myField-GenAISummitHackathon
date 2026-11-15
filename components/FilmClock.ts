"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { CHAPTERS, CHAPTER_STILL, FILM_END, cuesAt, type ChapterId, type Cues, type View } from "@/lib/film";

// The film's clock lives apart from its picture, so the page can start counting
// (and render its words) before the map engine has been downloaded.

type Listener = (time: number) => void;
const SEEN_KEY = "plotcheck.film.seen";
const CUT_MS = 160;

export type FilmClock = {
  cues: Cues;
  playing: boolean;
  /** true while the stage is dipped to black for a cut */
  cutting: boolean;
  /** stills only: the visitor asked for reduced motion */
  reduced: boolean;
  /** false until the browser has decided how to start, so nothing flashes */
  booted: boolean;
  time: () => number;
  subscribe: (listener: Listener) => () => void;
  /** how far the stage lets the clock run: tiles for the descent may still be arriving */
  setLimit: (limit: number) => void;
  setView: (view: View) => void;
  skip: () => void;
  replay: () => void;
  goTo: (chapter: ChapterId) => void;
};

const BOOT_VIEW: View = { width: 1440, height: 800, pad: { top: 0, right: 0, bottom: 0, left: 0 } };

function sameCues(a: Cues, b: Cues) {
  return (
    a.chapter === b.chapter &&
    a.source === b.source &&
    a.plot === b.plot &&
    a.measured === b.measured &&
    a.june === b.june &&
    a.ended === b.ended
  );
}

/**
 * One clock for the whole film. Everything on screen is a function of its time,
 * so a skip, a replay or a chapter click mid-flight is just a new time.
 */
export function useFilmClock(): FilmClock {
  const timeRef = useRef(0);
  const limitRef = useRef(0);
  const viewRef = useRef<View>(BOOT_VIEW);
  const listeners = useRef(new Set<Listener>());
  const frame = useRef(0);
  const lastTick = useRef(0);
  const cutTimer = useRef(0);
  const playingRef = useRef(false);
  const cuesRef = useRef<Cues>(cuesAt(0, BOOT_VIEW));

  const [cues, setCues] = useState<Cues>(cuesRef.current);
  const [playing, setPlaying] = useState(false);
  const [cutting, setCutting] = useState(false);
  const [reduced, setReduced] = useState(false);
  const [booted, setBooted] = useState(false);

  const publish = useCallback((time: number) => {
    timeRef.current = time;
    for (const listener of listeners.current) listener(time);
    const next = cuesAt(time, viewRef.current);
    if (!sameCues(next, cuesRef.current)) {
      cuesRef.current = next;
      setCues(next);
    }
  }, []);

  const stop = useCallback(() => {
    cancelAnimationFrame(frame.current);
    playingRef.current = false;
    setPlaying(false);
  }, []);

  const play = useCallback(() => {
    cancelAnimationFrame(frame.current);
    playingRef.current = true;
    setPlaying(true);
    lastTick.current = performance.now();
    const tick = (now: number) => {
      // a stalled tab or a long task must not make the camera leap
      const delta = Math.min(now - lastTick.current, 48);
      lastTick.current = now;
      const next = Math.min(timeRef.current + delta, limitRef.current, FILM_END);
      if (next !== timeRef.current) publish(next);
      if (next >= FILM_END) {
        playingRef.current = false;
        setPlaying(false);
        try {
          window.sessionStorage.setItem(SEEN_KEY, "1");
        } catch {
          // private window: it will simply play again next time
        }
        return;
      }
      frame.current = requestAnimationFrame(tick);
    };
    frame.current = requestAnimationFrame(tick);
  }, [publish]);

  /** Dip to black, move the clock, come back. Used for every jump in time. */
  const cut = useCallback(
    (time: number, thenPlay: boolean) => {
      stop();
      window.clearTimeout(cutTimer.current);
      setCutting(true);
      cutTimer.current = window.setTimeout(() => {
        publish(time);
        cutTimer.current = window.setTimeout(() => {
          setCutting(false);
          if (thenPlay) play();
        }, CUT_MS);
      }, CUT_MS);
    },
    [play, publish, stop],
  );

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const frozen = params.get("t");
    let seen = false;
    try {
      seen = window.sessionStorage.getItem(SEEN_KEY) === "1";
    } catch {
      seen = false;
    }
    let signedIn = false;
    try {
      const officer = window.localStorage.getItem("plotcheck.officer");
      signedIn = officer != null && officer !== "null";
    } catch {
      signedIn = false;
    }
    const forced = params.get("film");

    setReduced(motion.matches);
    // ?t=<ms> holds one frame, for checking the film frame by frame; a "film:seek" event moves it
    const onSeek = (event: Event) => {
      const to = Number((event as CustomEvent<number>).detail);
      if (Number.isFinite(to)) publish(Math.min(FILM_END, Math.max(0, to)));
    };
    if (frozen != null && Number.isFinite(Number(frozen))) {
      publish(Math.min(FILM_END, Math.max(0, Number(frozen))));
      window.addEventListener("film:seek", onSeek);
    } else if (forced === "play" && !motion.matches) {
      publish(0);
      play();
    } else if (motion.matches || seen || signedIn || forced === "end") {
      publish(FILM_END);
    } else {
      publish(0);
      play();
    }
    setBooted(true);

    const onMotion = () => {
      setReduced(motion.matches);
      if (motion.matches && playingRef.current) {
        stop();
        publish(FILM_END);
      }
    };
    motion.addEventListener("change", onMotion);
    return () => {
      motion.removeEventListener("change", onMotion);
      window.removeEventListener("film:seek", onSeek);
      cancelAnimationFrame(frame.current);
      window.clearTimeout(cutTimer.current);
    };
  }, [play, publish, stop]);

  return {
    cues,
    playing,
    cutting,
    reduced,
    booted,
    time: useCallback(() => timeRef.current, []),
    subscribe: useCallback((listener: Listener) => {
      listeners.current.add(listener);
      return () => {
        listeners.current.delete(listener);
      };
    }, []),
    setLimit: useCallback((limit: number) => {
      limitRef.current = limit;
    }, []),
    setView: useCallback(
      (view: View) => {
        viewRef.current = view;
        publish(timeRef.current);
      },
      [publish],
    ),
    skip: useCallback(() => cut(FILM_END, false), [cut]),
    replay: useCallback(() => cut(0, true), [cut]),
    goTo: useCallback(
      (chapter: ChapterId) => {
        const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        if (reduce) cut(CHAPTER_STILL[chapter], false);
        else cut(CHAPTERS.find((row) => row.id === chapter)?.at ?? 0, chapter !== "result");
      },
      [cut],
    ),
  };
}
