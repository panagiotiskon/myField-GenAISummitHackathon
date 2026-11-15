"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { DraftView } from "@/components/DraftView";
import { MapView } from "@/components/MapView";
import {
  buildDraft,
  parcelById,
  queueBucket,
  runTodaysDesk,
  suspectedFalseDeclaration,
  type DeskRun,
} from "@/lib/desk";
import { copy, euro, t } from "@/lib/i18n";
import { cannedReplies, classifyReply, routeReply } from "@/lib/replies";
import { parcels, scenario } from "@/lib/scenario";
import type {
  CaseStatus,
  Lang,
  OwnerThread,
  QueueBucket,
  ReplyIntent,
} from "@/lib/types";
import { zoneMembership } from "@/lib/zones";

const FILTERS: Array<QueueBucket | "all"> = [
  "all",
  "no_declaration",
  "declaration_vs_imagery",
  "complaint",
  "out_of_scope",
];

function useLang(): [Lang, (lang: Lang) => void] {
  const [lang, setLang] = useState<Lang>("el");
  return [lang, setLang];
}

export function DeskApp() {
  const [lang, setLang] = useLang();
  const [run, setRun] = useState<DeskRun | null>(null);
  const [running, setRunning] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>("all");
  const [tab, setTab] = useState<"drawer" | "thread" | "route" | "draft">("drawer");
  const [officerName, setOfficerName] = useState("");
  const [orthophoto, setOrthophoto] = useState(false);
  const [threads, setThreads] = useState<Record<string, OwnerThread>>({});
  const [freeText, setFreeText] = useState("");

  const buckets = useMemo(() => {
    const out: Record<string, QueueBucket> = {};
    if (!run) return out;
    const verdictById = new Map(run.verdicts.map((row) => [row.parcelId, row]));
    for (const parcel of parcels) {
      const id = parcel.properties.id;
      out[id] = queueBucket(parcel, {
        declared: Boolean(run.ingest.declarations[id]),
        claimedCleaned: Boolean(run.ingest.declarations[id]?.claimedCleaned),
        hasComplaint: (run.ingest.complaints[id] ?? []).length > 0,
        verdict: verdictById.get(id),
      });
    }
    return out;
  }, [run]);

  const queue = parcels.filter((parcel) => {
    const bucket = buckets[parcel.properties.id];
    if (!run) return true;
    if (filter === "all") return true;
    return bucket === filter;
  });

  async function onRun() {
    setRunning(true);
    await new Promise((resolve) => setTimeout(resolve, 180));
    const next = runTodaysDesk(scenario);
    setRun(next);
    setThreads(next.threads);
    setSelectedId("DEMO-RAF-001");
    setTab("drawer");
    setRunning(false);
  }

  const selected = selectedId ? parcelById(scenario, selectedId) : undefined;
  const verdict = run?.verdicts.find((row) => row.parcelId === selectedId);
  const declaration = selectedId ? run?.ingest.declarations[selectedId] : null;
  const complaints = selectedId ? (run?.ingest.complaints[selectedId] ?? []) : [];
  const thread = selectedId ? threads[selectedId] : undefined;
  const membership = selected ? zoneMembership(selected.properties.zone) : null;
  const dryPhoto = Boolean(thread?.messages.some((msg) => msg.photoSrc));
  const draft = useMemo(() => {
    if (!selected || !run) return null;
    return buildDraft({
      parcel: selected,
      declared: Boolean(declaration),
      claimedCleaned: Boolean(declaration?.claimedCleaned),
      verdict,
      hasComplaint: complaints.length > 0,
      hasDryPhoto: dryPhoto,
    });
  }, [selected, run, declaration, verdict, complaints.length, dryPhoto]);

  function pushReply(intent: ReplyIntent) {
    if (!selectedId) return;
    const at = `${scenario.meta.deskDate}T09:${String(20 + (thread?.messages.length ?? 0)).padStart(2, "0")}:00+03:00`;
    setThreads((prev) => {
      const current = prev[selectedId] ?? {
        parcelId: selectedId,
        status: "open" as CaseStatus,
        messages: [],
      };
      const canned =
        intent === "silence"
          ? { el: "(σιωπή — δεν ελήφθη απάντηση)", en: "(silence — no reply received)" }
          : intent === "unknown"
            ? { el: "", en: "" }
            : cannedReplies[intent];
      return {
        ...prev,
        [selectedId]: {
          parcelId: selectedId,
          status: routeReply(intent),
          messages: [
            ...current.messages,
            {
              id: `${selectedId}-${intent}-${current.messages.length}`,
              from: "owner",
              at,
              intent,
              text: canned,
              photoSrc: intent === "dry_cover_photo" ? "/fixtures/dry-cover.jpg" : undefined,
            },
          ],
        },
      };
    });
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="brand">
          <strong>myField</strong>
          <span>{t(lang, copy.deskName)}</span>
        </div>
        <div className="meta-line">
          <span>{t(lang, scenario.meta.municipality)}</span>
          <span>· {t(lang, scenario.meta.settlement)}</span>
          <span>· {scenario.meta.deskDate}</span>
          <div className="lang-toggle">
            <button type="button" aria-pressed={lang === "el"} onClick={() => setLang("el")}>
              ΕΛ
            </button>
            <button type="button" aria-pressed={lang === "en"} onClick={() => setLang("en")}>
              EN
            </button>
          </div>
        </div>
      </header>
      <div className="banner">{t(lang, scenario.meta.banner)}</div>
      <div className="toolbar">
        <button type="button" className="btn btn-primary" onClick={onRun} disabled={running}>
          {running ? t(lang, copy.running) : t(lang, copy.runDesk)}
        </button>
        <button type="button" className="btn" onClick={() => setOrthophoto((v) => !v)}>
          {orthophoto ? t(lang, copy.streets) : t(lang, copy.orthophoto)}
        </button>
        <button type="button" className="btn" onClick={() => setTab("route")}>
          {t(lang, copy.route)}
        </button>
        <button type="button" className="btn" onClick={() => setTab("draft")}>
          {t(lang, copy.drafts)}
        </button>
        <label>
          {t(lang, copy.officerName)}{" "}
          <input
            value={officerName}
            onChange={(event) => setOfficerName(event.target.value)}
            placeholder={t(lang, copy.officerPlaceholder)}
          />
        </label>
      </div>
      <div className="workspace">
        <aside className="panel">
          <h2>{t(lang, copy.queue)}</h2>
          <div className="filters">
            {FILTERS.map((key) => (
              <button
                key={key}
                type="button"
                aria-pressed={filter === key}
                onClick={() => setFilter(key)}
              >
                {key === "all" ? t(lang, copy.filterAll) : t(lang, copy.buckets[key])}
              </button>
            ))}
          </div>
          {queue.map((parcel) => {
            const id = parcel.properties.id;
            const bucket = buckets[id] ?? "no_declaration";
            return (
              <button
                key={id}
                type="button"
                className={`queue-item${selectedId === id ? " active" : ""}`}
                onClick={() => {
                  setSelectedId(id);
                  setTab("drawer");
                }}
              >
                <div>
                  <span className={`swatch ${bucket}`} />
                  <strong>{id}</strong>
                </div>
                <small>
                  {t(lang, copy.buckets[bucket])} · {parcel.properties.areaM2} m²
                </small>
              </button>
            );
          })}
        </aside>
        <section className="map-wrap">
          <MapView
            buckets={buckets}
            selectedId={selectedId}
            orthophoto={orthophoto}
            onSelect={(id) => {
              setSelectedId(id);
              setTab("drawer");
            }}
          />
          <div className="map-legend">
            {(["no_declaration", "declaration_vs_imagery", "complaint", "out_of_scope"] as QueueBucket[]).map(
              (key) => (
                <div key={key}>
                  <span className={`swatch ${key}`} />
                  {t(lang, copy.buckets[key])}
                </div>
              ),
            )}
          </div>
        </section>
        <aside className="panel right">
          <div className="tabs" role="tablist">
            {(["drawer", "thread", "route", "draft"] as const).map((key) => (
              <button
                key={key}
                type="button"
                role="tab"
                aria-selected={tab === key}
                onClick={() => setTab(key)}
              >
                {t(
                  lang,
                  key === "drawer"
                    ? copy.drawer
                    : key === "thread"
                      ? copy.thread
                      : key === "route"
                        ? copy.route
                        : copy.drafts,
                )}
              </button>
            ))}
          </div>
          {!run ? <p className="kv">{t(lang, copy.runFirst)}</p> : null}
          {tab === "drawer" && selected ? (
            <div className="drawer">
              <h2>{selected.properties.id}</h2>
              <div className="kv">
                <span>{t(lang, copy.demoId)}</span>
                <strong>{selected.properties.id}</strong>
                <span>{t(lang, copy.owner)}</span>
                <span>{selected.properties.owner}</span>
                <span>{t(lang, copy.area)}</span>
                <span>{selected.properties.areaM2} m²</span>
                <span>{t(lang, copy.zone)}</span>
                <span>
                  {t(lang, copy.zones[selected.properties.zone])}
                  {membership ? ` · ${membership.article}` : ""}
                </span>
                <span>{t(lang, copy.declaration)}</span>
                <span>
                  {declaration
                    ? `${declaration.registryRef} · ${t(lang, copy.claimedCleaned)}`
                    : t(lang, copy.none)}
                </span>
                <span>{t(lang, copy.imagery)}</span>
                <span>
                  {verdict
                    ? `${t(lang, copy.imageryStatus[verdict.status])}. ${t(lang, copy.imageryReason[verdict.reason])}`
                    : "—"}
                  {verdict?.juneNdvi != null
                    ? ` NDVI ${verdict.springNdvi?.toFixed(3)} → ${verdict.juneNdvi.toFixed(3)}.`
                    : ""}
                </span>
                <span>{t(lang, copy.complaint)}</span>
                <span>
                  {complaints.length
                    ? complaints.map((row) => t(lang, row.text)).join(" ")
                    : t(lang, copy.none)}
                </span>
              </div>
              {!declaration && membership?.inDuty ? (
                <p className="status-pill">{t(lang, copy.consent)}</p>
              ) : null}
              {selected.properties.exclusionNote ? (
                <p className="status-pill">{t(lang, selected.properties.exclusionNote)}</p>
              ) : null}
              <p className="kv">
                <Link href={`/owner/${selected.properties.id}`}>{t(lang, copy.openOwnerPack)}</Link>
              </p>
            </div>
          ) : null}
          {tab === "thread" && selected ? (
            <div>
              <h2>{t(lang, copy.thread)}</h2>
              {thread ? (
                <span className="status-pill">{t(lang, copy.caseStatus[thread.status])}</span>
              ) : (
                <p className="kv">{t(lang, copy.selectParcel)}</p>
              )}
              <div className="thread">
                {(thread?.messages ?? []).map((msg) => (
                  <div key={msg.id} className={`bubble ${msg.from}`}>
                    <div>{t(lang, msg.text)}</div>
                    {msg.photoSrc ? (
                      // fixture photo, labeled as simulation in the image itself
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={msg.photoSrc} alt={t(lang, cannedReplies.dry_cover_photo)} />
                    ) : null}
                  </div>
                ))}
              </div>
              <div className="thread-actions">
                <button type="button" className="btn" onClick={() => pushReply("cleared_last_week")}>
                  {t(lang, copy.clearedLastWeek)}
                </button>
                <button type="button" className="btn" onClick={() => pushReply("not_my_plot")}>
                  {t(lang, copy.notMyPlot)}
                </button>
                <button type="button" className="btn" onClick={() => pushReply("silence")}>
                  {t(lang, copy.silence)}
                </button>
                <button type="button" className="btn" onClick={() => pushReply("dry_cover_photo")}>
                  {t(lang, copy.attachDry)}
                </button>
                <input
                  value={freeText}
                  onChange={(event) => setFreeText(event.target.value)}
                  placeholder={lang === "el" ? "Ελεύθερο κείμενο…" : "Free text…"}
                  style={{ gridColumn: "1 / -1" }}
                />
                <button
                  type="button"
                  className="btn"
                  style={{ gridColumn: "1 / -1" }}
                  onClick={() => {
                    const intent = classifyReply(freeText);
                    if (intent === "unknown" && freeText.trim()) {
                      const at = `${scenario.meta.deskDate}T09:40:00+03:00`;
                      setThreads((prev) => {
                        const current = prev[selectedId!] ?? {
                          parcelId: selectedId!,
                          status: "open" as CaseStatus,
                          messages: [],
                        };
                        return {
                          ...prev,
                          [selectedId!]: {
                            ...current,
                            status: "open",
                            messages: [
                              ...current.messages,
                              {
                                id: `${selectedId}-free-${current.messages.length}`,
                                from: "owner",
                                at,
                                intent,
                                text: { el: freeText, en: freeText },
                              },
                            ],
                          },
                        };
                      });
                    } else {
                      pushReply(intent);
                    }
                    setFreeText("");
                  }}
                >
                  {t(lang, copy.send)}
                </button>
              </div>
            </div>
          ) : null}
          {tab === "route" && run ? (
            <div>
              <h2>{t(lang, copy.route)}</h2>
              <p className="kv">
                {t(lang, copy.sampleCaption)}: {run.route.sampleSize} / {run.route.declarationCount}{" "}
                ({run.route.stopsInSample} {lang === "el" ? "στάσεις στο δείγμα" : "stops in sample"})
              </p>
              {run.route.stops.map((stop) => (
                <button
                  key={stop.parcelId}
                  type="button"
                  className={`route-item${selectedId === stop.parcelId ? " active" : ""}`}
                  onClick={() => {
                    setSelectedId(stop.parcelId);
                    setTab("drawer");
                  }}
                >
                  <strong>
                    {stop.rank}. {stop.parcelId}
                  </strong>
                  <div>
                    <small>
                      {stop.reasons.map((reason) => t(lang, copy.reasons[reason as keyof typeof copy.reasons])).join(" · ")}
                      {stop.inStatutorySample ? " · 5%" : ""}
                    </small>
                  </div>
                </button>
              ))}
            </div>
          ) : null}
          {tab === "draft" && selected && draft ? (
            <div>
              <DraftView
                lang={lang}
                parcel={selected}
                draft={draft}
                officerName={officerName}
                declared={Boolean(declaration)}
                claimedCleaned={Boolean(declaration?.claimedCleaned)}
                complaintText={complaints[0] ? t(lang, complaints[0].text) : undefined}
              />
              {suspectedFalseDeclaration({
                declared: Boolean(declaration),
                claimedCleaned: Boolean(declaration?.claimedCleaned),
                verdict,
                hasComplaint: complaints.length > 0,
                hasDryPhoto: dryPhoto,
              }) ? null : null}
              <div className="thread-actions">
                <button
                  type="button"
                  className="btn"
                  onClick={() => window.print()}
                >
                  {t(lang, copy.print)}
                </button>
              </div>
              <p className="status-pill">{t(lang, copy.draftStatus)}</p>
              {draft.fines.totalEur ? (
                <p className="kv">
                  {t(lang, copy.fines.total)}: {euro(draft.fines.totalEur)}
                </p>
              ) : null}
            </div>
          ) : null}
        </aside>
      </div>
      <footer className="footer-log">
        <strong>{t(lang, copy.log)}</strong>
        {run ? (
          <ol>
            {run.log.map((entry) => (
              <li key={entry.id}>
                {entry.fn} — {t(lang, entry.summary)}
              </li>
            ))}
          </ol>
        ) : (
          <div>{t(lang, copy.runFirst)}</div>
        )}
      </footer>
    </div>
  );
}
