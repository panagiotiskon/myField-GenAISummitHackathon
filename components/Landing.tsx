"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useLayoutEffect, useRef, useState, type FormEvent } from "react";
import { LangSwitch, Mark, Pin, Wordmark } from "@/components/Chrome";
import { useFilmClock } from "@/components/FilmClock";
import { FilmVideo } from "@/components/FilmVideo";
import { NdviScale } from "@/components/NdviScale";
import { imageryFor } from "@/lib/assess";
import { CHAPTERS, FILM_DIR, FILM_END, FILM_NARROW, FILM_PLOT, type ChapterId } from "@/lib/film";
import { copy, fill, localeOf, t } from "@/lib/i18n";
import { scenario } from "@/lib/scenario";
import { useLang, useOfficer } from "@/lib/store";
import type { Lang } from "@/lib/types";

const SKIP = { el: "Μετάβαση στο περιεχόμενο", en: "Skip to content" };

function longDate(lang: Lang, iso: string) {
  return new Date(`${iso.slice(0, 10)}T12:00:00Z`).toLocaleDateString(localeOf(lang), {
    day: "numeric",
    month: "long",
    timeZone: "UTC",
  });
}

function number(lang: Lang, value: number, digits = 2) {
  return value.toLocaleString(localeOf(lang), {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}

/** The film's last frame, for browsers that cannot play the video. */
function Poster() {
  return (
    <picture className="film-poster">
      <source media={FILM_NARROW} srcSet={`${FILM_DIR}/earth-mobile-end.webp`} />
      <img src={`${FILM_DIR}/earth-desktop-end.webp`} alt="" />
    </picture>
  );
}

export function Landing() {
  const router = useRouter();
  const [lang, setLang] = useLang();
  const { officer, signIn } = useOfficer();
  const [name, setName] = useState("");
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [stage, setStage] = useState<"loading" | "ready" | "failed">("loading");
  const rootRef = useRef<HTMLDivElement>(null);
  const chromeRef = useRef<HTMLElement>(null);
  const fills = useRef<(HTMLElement | null)[]>([]);
  const leaving = useRef<(() => void) | null>(null);
  const clock = useFilmClock();
  const { cues, subscribe, skip } = clock;

  // The film fills what is left of the first screen under the top bar and the demo banner,
  // whose height changes with the width and the language.
  useLayoutEffect(() => {
    const chrome = chromeRef.current;
    const root = rootRef.current;
    if (!chrome || !root) return;
    const sync = () => root.style.setProperty("--chrome-h", `${chrome.offsetHeight}px`);
    sync();
    const observer = new ResizeObserver(sync);
    observer.observe(chrome);
    return () => observer.disconnect();
  }, []);

  // Each chapter's own progress line, written straight to the element every frame.
  useEffect(() => {
    const paint = (time: number) => {
      CHAPTERS.forEach((chapter, index) => {
        const el = fills.current[index];
        if (!el) return;
        const end = CHAPTERS[index + 1]?.at ?? FILM_END;
        const done = Math.min(1, Math.max(0, (time - chapter.at) / (end - chapter.at)));
        el.style.transform = `scaleX(${done})`;
      });
    };
    paint(clock.time());
    return subscribe(paint);
  }, [clock, subscribe]);

  // No picture: there is no film to wait for, so go straight to the last frame.
  const onStage = useCallback(
    (state: "ready" | "failed") => {
      setStage(state);
      if (state === "failed") skip();
    },
    [skip],
  );

  // Leaving for the app: the old page's unmount tells the view transition the new one is in.
  useEffect(() => () => leaving.current?.(), []);
  const go = useCallback(
    (href: string) => {
      const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      if (reduce || typeof document.startViewTransition !== "function") {
        router.push(href);
        return;
      }
      document.startViewTransition(
        () =>
          new Promise<void>((resolve) => {
            leaving.current = resolve;
            window.setTimeout(resolve, 1200);
            router.push(href);
          }),
      );
    },
    [router],
  );

  const imagery = imageryFor(FILM_PLOT);
  const s2 = imagery?.sentinel ?? null;
  const declaration = scenario.declarations.find((row) => row.parcelId === FILM_PLOT) ?? null;

  const daysAfter =
    s2 && declaration
      ? Math.round((Date.parse(`${s2.after.date}T00:00:00Z`) - Date.parse(`${declaration.submittedAt.slice(0, 10)}T00:00:00Z`)) / 86_400_000)
      : 0;
  const lines: { id: string; text: string }[] = [
    { id: "orbit", text: t(lang, copy.film.lines.orbit) },
    { id: "scan", text: t(lang, copy.film.lines.scan) },
    {
      id: "descent",
      text: fill(t(lang, copy.film.lines.descent), {
        code: FILM_PLOT,
        date: declaration ? longDate(lang, declaration.submittedAt) : "",
      }),
    },
    ...(s2
      ? [
          {
            id: "april",
            text: fill(t(lang, copy.film.lines.april), {
              n: s2.after.pixelCount,
              date: longDate(lang, s2.before.date),
              ndvi: number(lang, s2.before.ndvi),
            }),
          },
          {
            id: "june",
            text: fill(t(lang, copy.film.lines.june), {
              date: longDate(lang, s2.after.date),
              days: daysAfter,
              ndvi: number(lang, s2.after.ndvi),
            }),
          },
        ]
      : []),
  ];
  const line =
    cues.chapter === "analysis" ? (cues.june ? "june" : "april") : cues.chapter === "result" ? "" : cues.chapter;

  const source =
    cues.source === "scenes" && s2
      ? fill(t(lang, copy.film.sources.scenes), { date: longDate(lang, cues.june ? s2.after.date : s2.before.date) })
      : cues.source === "mosaic"
        ? t(lang, copy.film.sources.mosaic)
        : ""; // no caption over the orthophoto

  function enter(event: FormEvent) {
    event.preventDefault();
    signIn(name);
    // close first, so the dialog is not caught in the view transition's snapshot
    dialogRef.current?.close();
    go("/dashboard");
  }

  const state = !clock.booted ? "boot" : stage;

  return (
    <div className="landing" ref={rootRef}>
      <header className="land-chrome film-world" ref={chromeRef}>
        <a className="skip-link" href="#main">
          {t(lang, SKIP)}
        </a>
        <div className="topbar">
          <div className="brand">
            <Link href="/" className="brand-link">
              <Mark />
              <Wordmark />
            </Link>
          </div>
          <div className="meta-line">
            {officer ? (
              <span className="place">
                <Pin />
                {t(lang, copy.region)}
              </span>
            ) : null}
            <LangSwitch lang={lang} setLang={setLang} />
            {officer ? (
              <Link href="/dashboard" className="btn land-enter">
                {t(lang, copy.dashboard)}
              </Link>
            ) : (
              <button
                type="button"
                className="btn land-enter"
                aria-haspopup="dialog"
                onClick={() => {
                  dialogRef.current?.showModal();
                  document.getElementById("officer-name")?.focus();
                }}
              >
                {t(lang, copy.film.signInShort)}
              </button>
            )}
          </div>
        </div>
      </header>

      <main id="main">
        <section
          className="film film-world"
          aria-labelledby="land-title"
          data-state={state}
          data-chapter={cues.chapter}
          data-line={line}
          data-measured={cues.measured ? "1" : "0"}
          data-june={cues.june ? "1" : "0"}
          data-cutting={clock.cutting ? "1" : "0"}
        >
          <div className="film-frame">
            <div className="film-picture" role="img" aria-label={fill(t(lang, copy.film.stageLabel), { code: FILM_PLOT })}>
              {stage === "failed" ? (
                <Poster />
              ) : !clock.booted ? null : (
                <FilmVideo clock={clock} onState={onStage} />
              )}
            </div>
            <div className="film-shade" aria-hidden="true" />
            {/* where the camera may put its subject: clear of the copy, and on the last frame clear of the reading */}
            <div className="film-safe" data-safe="flight" />
            <div className="film-safe" data-safe="end" />

            <div className="film-words">
              {lines.map((row) => (
                <p key={row.id} className="film-line" data-on={row.id === line ? "1" : "0"}>
                  {row.text}
                </p>
              ))}
              {s2 ? (
                <div className="film-meter">
                  <NdviScale before={s2.before.ndvi} after={s2.after.ndvi} pixels={s2.after.pixelCount} lang={lang} />
                </div>
              ) : null}
            </div>

            <div className="film-rail">
              {source ? <p className="film-source">{source}</p> : null}
              <ol className="film-chapters" aria-label={t(lang, copy.film.chaptersLabel)}>
                {CHAPTERS.map((chapter, index) => (
                  <li key={chapter.id}>
                    <button
                      type="button"
                      aria-current={cues.chapter === chapter.id ? "step" : undefined}
                      onClick={() => clock.goTo(chapter.id as ChapterId)}
                    >
                      <span className="chapter-bar" aria-hidden="true">
                        <i
                          ref={(el) => {
                            fills.current[index] = el;
                          }}
                        />
                      </span>
                      <span className="chapter-name">{t(lang, copy.film.chapters[chapter.id])}</span>
                    </button>
                  </li>
                ))}
              </ol>
              {clock.reduced ? null : cues.ended ? (
                <button type="button" className="film-control" onClick={clock.replay}>
                  <svg viewBox="0 0 16 16" width="15" height="15" aria-hidden="true">
                    <path d="M3 8a5 5 0 1 0 1.6-3.7M3 2.5v3h3" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  {t(lang, copy.film.replay)}
                </button>
              ) : (
                <button type="button" className="film-control" onClick={clock.skip}>
                  {t(lang, copy.film.skip)}
                  <svg viewBox="0 0 16 16" width="15" height="15" aria-hidden="true">
                    <path d="M3.5 3.5L8 8l-4.5 4.5M9 3.5L13.5 8 9 12.5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </button>
              )}
            </div>
          </div>

          <hgroup className="film-copy" data-enter>
            <h1 id="land-title">{t(lang, copy.landing.punchline)}</h1>
          </hgroup>
        </section>

      </main>

      {/* the only way in: the top bar's Sign in opens this; Esc, the close button or the backdrop dismiss it */}
      <dialog
        ref={dialogRef}
        className="signin-dialog film-world"
        aria-labelledby="signin-title"
        onClick={(event) => {
          if (event.target === event.currentTarget) event.currentTarget.close();
        }}
      >
        <form className="signin" onSubmit={enter}>
          <div className="signin-head">
            <h2 className="signin-title" id="signin-title">
              {t(lang, copy.landing.signIn)}
            </h2>
            <p className="signin-muni">{t(lang, scenario.meta.municipality)}</p>
            <button
              type="button"
              className="signin-close"
              aria-label={t(lang, copy.film.close)}
              onClick={() => dialogRef.current?.close()}
            >
              <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true">
                <path d="M4 4l8 8M12 4l-8 8" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
              </svg>
            </button>
          </div>
          <div className="field">
            <label className="field-label" htmlFor="officer-name">
              {t(lang, copy.landing.name)}
            </label>
            <input
              id="officer-name"
              autoComplete="name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder={t(lang, copy.landing.namePlaceholder)}
              aria-describedby="officer-hint"
              maxLength={60}
            />
            <p className="field-hint" id="officer-hint">
              {t(lang, copy.landing.nameHint)}
            </p>
          </div>
          <button type="submit" className="btn btn-primary">
            {t(lang, copy.landing.enter)}
          </button>
          <p className="signin-note">{t(lang, copy.landing.noAuth)}</p>
        </form>
      </dialog>

    </div>
  );
}
