"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useMemo, useState } from "react";
import { scenario } from "@/data/scenario";
import { followUpTargets, openingMessage, runDesk } from "@/lib/desk";
import { buildDrafts } from "@/lib/drafts";
import { t } from "@/lib/i18n";
import { classifyReply, nextStatusAfterReply, replyNote } from "@/lib/replies";
import type {
  CaseStatus,
  DayRoute,
  DraftBundle,
  Locale,
  LogEntry,
  ParcelCase,
  ThreadMessage,
} from "@/lib/types";

const MapView = dynamic(() => import("@/components/MapView"), { ssr: false });

type Filter = "all" | "gap" | "flagged_declaration" | "complaint" | "out_of_scope" | "awaiting_officer_review";
type Tab = "queue" | "route" | "drafts";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export function DeskApp() {
  const copy = useCopy();
  const { locale, setLocale, tr } = copy;
  const [running, setRunning] = useState(false);
  const [ran, setRan] = useState(false);
  const [log, setLog] = useState<LogEntry[]>([]);
  const [cases, setCases] = useState<ParcelCase[] | null>(null);
  const [route, setRoute] = useState<DayRoute | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>("MYF-02");
  const [threads, setThreads] = useState<Record<string, ThreadMessage[]>>({});
  const [filter, setFilter] = useState<Filter>("all");
  const [tab, setTab] = useState<Tab>("queue");
  const [officer, setOfficer] = useState("");
  const [draft, setDraft] = useState<DraftBundle | null>(null);
  const [freeText, setFreeText] = useState("");

  const selected = cases?.find((c) => c.parcel.id === selectedId) ?? null;

  const visible = useMemo(() => {
    if (!cases) return [];
    return cases.filter((c) => {
      if (filter === "all") return c.zone.inDuty || c.status === "out_of_scope";
      if (filter === "complaint") return Boolean(c.complaint);
      return c.status === filter;
    });
  }, [cases, filter]);

  async function onRun() {
    setRunning(true);
    setDraft(null);
    const result = runDesk(scenario);
    setLog([]);
    setCases(null);
    setRoute(null);
    for (const entry of result.log) {
      await sleep(160);
      setLog((prev) => [...prev, entry]);
    }
    setCases(result.cases);
    setRoute(result.route);
    const seeded: Record<string, ThreadMessage[]> = {};
    for (const c of followUpTargets(result.cases)) {
      seeded[c.parcel.id] = [openingMessage(c, locale)];
    }
    setThreads(seeded);
    setRan(true);
    setRunning(false);
    setTab("queue");
  }

  function applyReply(intent: ReturnType<typeof classifyReply>, body: string, photo?: string) {
    if (!selected) return;
    const id = selected.parcel.id;
    const msg: ThreadMessage = {
      id: `in-${id}-${Date.now()}`,
      at: new Date().toISOString(),
      from: "owner",
      body,
      intent,
      photoSrc: photo,
    };
    setThreads((prev) => ({ ...prev, [id]: [...(prev[id] ?? []), msg] }));
    const note: ThreadMessage = {
      id: `sys-${id}-${Date.now()}`,
      at: new Date().toISOString(),
      from: "desk",
      body: replyNote(intent),
      intent,
    };
    setThreads((prev) => ({ ...prev, [id]: [...(prev[id] ?? []), note] }));
    const next = nextStatusAfterReply(intent);
    setCases((prev) =>
      prev
        ? prev.map((c) => (c.parcel.id === id ? { ...c, status: remapStatus(c.status, next) } : c))
        : prev,
    );
  }

  function openDraft(c: ParcelCase) {
    setDraft(buildDrafts(c, officer, scenario.meta.deskDate));
    setTab("drafts");
  }

  return (
    <div className="app">
      <div className="banner">{scenario.meta.disclaimer[locale]}</div>
      <header className="top">
        <div className="brand">
          <div className="stamp">23·06</div>
          <div>
            <h1>{tr.product}</h1>
            <p>
              {scenario.meta.municipality[locale]} · {tr.productSub} · {scenario.meta.deskDate}
            </p>
          </div>
        </div>
        <div className="top-actions">
          <div className="lang" role="group" aria-label="language">
            <button type="button" aria-pressed={locale === "el"} onClick={() => setLocale("el")}>
              {tr.langEl}
            </button>
            <button type="button" aria-pressed={locale === "en"} onClick={() => setLocale("en")}>
              {tr.langEn}
            </button>
          </div>
          <button className="primary" type="button" onClick={onRun} disabled={running}>
            {running ? tr.running : tr.runDesk}
          </button>
        </div>
      </header>

      <div className="workspace">
        <aside className="panel">
          <h2>{tr.queue}</h2>
          <div className="filters">
            {(
              [
                ["queue", tr.queue],
                ["route", tr.route],
                ["drafts", tr.drafts],
              ] as const
            ).map(([id, label]) => (
              <button key={id} type="button" aria-pressed={tab === id} onClick={() => setTab(id)}>
                {label}
              </button>
            ))}
          </div>
          {tab === "queue" && (
            <>
              <div className="filters">
                {(
                  [
                    ["all", tr.all],
                    ["gap", tr.gaps],
                    ["flagged_declaration", tr.declarations],
                    ["complaint", tr.complaints],
                    ["awaiting_officer_review", tr.awaiting],
                    ["out_of_scope", tr.outOfScope],
                  ] as const
                ).map(([id, label]) => (
                  <button key={id} type="button" aria-pressed={filter === id} onClick={() => setFilter(id)}>
                    {label}
                  </button>
                ))}
              </div>
              {!ran ? (
                <p className="empty">{tr.runHint}</p>
              ) : (
                visible.map((c) => (
                  <button
                    key={c.parcel.id}
                    className="item"
                    type="button"
                    data-active={c.parcel.id === selectedId}
                    onClick={() => setSelectedId(c.parcel.id)}
                  >
                    <b>
                      {c.parcel.id}{" "}
                      <span className={`tag ${tagClass(c.status)}`}>{statusLabel(c.status, locale)}</span>
                    </b>
                    <span>
                      {Math.round(c.parcel.areaM2)} m² · {c.parcel.frontage}
                    </span>
                  </button>
                ))
              )}
            </>
          )}
          {tab === "route" && (
            <div className="drawer">
              {!route ? (
                <p className="empty">{tr.runHint}</p>
              ) : (
                <>
                  <p className="hint">
                    {tr.sample}: 5% × {route.declarationCount} = {route.statutorySampleSize}.{" "}
                    {locale === "el"
                      ? `Στάσεις από δηλώσεις: ${route.stopsInSample}. Αδήλωτα: ${route.stopsUndeclared}.`
                      : `Stops from declarations: ${route.stopsInSample}. Undeclared: ${route.stopsUndeclared}.`}
                  </p>
                  {route.stops.map((s) => (
                    <button
                      key={s.parcelId}
                      className="item"
                      type="button"
                      data-active={s.parcelId === selectedId}
                      onClick={() => setSelectedId(s.parcelId)}
                    >
                      <b>
                        {s.rank}. {s.parcelId} · {s.riskScore}
                      </b>
                      <span>{s.why.join(" · ")}</span>
                    </button>
                  ))}
                </>
              )}
            </div>
          )}
          {tab === "drafts" && (
            <div className="drawer">
              <label className="officer">
                {tr.officer}
                <input
                  value={officer}
                  onChange={(e) => setOfficer(e.target.value)}
                  placeholder={tr.officerPh}
                />
              </label>
              <p className="hint">{tr.signHint}</p>
              {selected && ran && (
                <button className="primary" type="button" onClick={() => openDraft(selected)}>
                  {tr.draftA} / {tr.draftD}
                </button>
              )}
              {route?.stops.map((s) => (
                <button
                  key={s.parcelId}
                  className="item"
                  type="button"
                  data-active={s.parcelId === selectedId}
                  onClick={() => {
                    setSelectedId(s.parcelId);
                    const c = cases?.find((x) => x.parcel.id === s.parcelId);
                    if (c) openDraft(c);
                  }}
                >
                  <b>
                    {s.rank}. {s.parcelId}
                  </b>
                  <span>{tr.draftA}</span>
                </button>
              ))}
            </div>
          )}
        </aside>

        <section className="map-wrap">
          <MapView cases={cases} selectedId={selectedId} onSelect={setSelectedId} />
          <div className="map-legend">
            <div><span className="swatch" style={{ background: "#a33b1f" }} />{tr.gaps}</div>
            <div><span className="swatch" style={{ background: "#b8893a" }} />{tr.declarations}</div>
            <div><span className="swatch" style={{ background: "#6b1d12" }} />{tr.complaints}</div>
            <div><span className="swatch" style={{ background: "#6a7a6c" }} />{tr.outOfScope}</div>
          </div>
        </section>

        <aside className="panel right">
          <h2>{selected?.parcel.id ?? "—"}</h2>
          {!selected ? (
            <p className="empty">{ran ? tr.none : tr.runHint}</p>
          ) : (
            <div className="drawer">
              <h3>{selected.parcel.id}</h3>
              <dl className="meta-row">
                <dt>{tr.zone}</dt>
                <dd>
                  {zoneLabel(selected, locale)} · {selected.zone.article}
                </dd>
                <dt>{tr.declaration}</dt>
                <dd>
                  {selected.declaration
                    ? `${selected.declaration.id} · ${selected.declaration.submittedAt.slice(0, 10)}`
                    : tr.none}
                </dd>
                <dt>{tr.complaint}</dt>
                <dd>{selected.complaint ? selected.complaint.text : tr.none}</dd>
                <dt>{tr.imagery}</dt>
                <dd>{imageryLabel(selected, tr)}</dd>
              </dl>
              <div className="thread-actions">
                <Link className="ghost" href={`/owner/${selected.parcel.id}`}>
                  {tr.ownerPack}
                </Link>
                {ran && (
                  <button className="ghost" type="button" onClick={() => openDraft(selected)}>
                    {tr.draftA}
                  </button>
                )}
              </div>

              <h2>{tr.thread}</h2>
              <div className="thread">
                {(threads[selected.parcel.id] ?? []).map((m) => (
                  <div key={m.id} className={`bubble ${m.from}`}>
                    {m.body}
                    {m.photoSrc ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img className="photo" src={m.photoSrc} alt="owner photo" />
                    ) : null}
                  </div>
                ))}
                {ran && (
                  <>
                    <div className="thread-actions">
                      <button type="button" onClick={() => applyReply("already_cleared", "Το καθάρισα την προηγούμενη εβδομάδα.")}>
                        {tr.replyCleared}
                      </button>
                      <button type="button" onClick={() => applyReply("not_my_plot", "Δεν είναι δικό μου.")}>
                        {tr.replyNotMine}
                      </button>
                      <button type="button" onClick={() => applyReply("silence", "")}>
                        {tr.replySilence}
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          applyReply("photo_still_dry", "Ξερά χόρτα στο οικόπεδο.", "/evidence/owner-photo-dry.svg")
                        }
                      >
                        {tr.replyPhoto}
                      </button>
                    </div>
                    <textarea
                      className="free"
                      rows={2}
                      placeholder={tr.freeText}
                      value={freeText}
                      onChange={(e) => setFreeText(e.target.value)}
                    />
                    <button
                      className="ghost"
                      type="button"
                      onClick={() => {
                        if (!freeText.trim()) return;
                        applyReply(classifyReply(freeText), freeText);
                        setFreeText("");
                      }}
                    >
                      {tr.send}
                    </button>
                  </>
                )}
              </div>

              {draft && draft.parcelId === selected.parcel.id && (
                <>
                  <article className="sheet">
                    <div className="status">{draft.inspection.statusLine}</div>
                    <h3>{draft.inspection.title}</h3>
                    <table>
                      <tbody>
                        {draft.inspection.fields.map((f) => (
                          <tr key={f.label}>
                            <td>{f.label}</td>
                            <td>{f.value}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    <ul>
                      {draft.inspection.findings.map((x) => (
                        <li key={x}>{x}</li>
                      ))}
                    </ul>
                  </article>
                  <article className="sheet">
                    <div className="status">{draft.fine.statusLine}</div>
                    <h3>{draft.fine.title}</h3>
                    <table>
                      <tbody>
                        {draft.fine.fields.map((f) => (
                          <tr key={f.label}>
                            <td>{f.label}</td>
                            <td>{f.value}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </article>
                </>
              )}
            </div>
          )}
        </aside>
      </div>

      <footer className="log">
        <ol>
          {log.map((e) => (
            <li key={e.id}>
              <code>{e.fn}</code> — {e.summary}
            </li>
          ))}
        </ol>
      </footer>
    </div>
  );
}

function useCopy() {
  const [locale, setLocale] = useState<Locale>("el");
  return { locale, setLocale, tr: t(locale) };
}

function tagClass(status: CaseStatus): string {
  if (status === "gap") return "gap";
  if (status === "flagged_declaration" || status === "awaiting_reply") return "flag";
  if (status === "complaint") return "comp";
  if (status === "out_of_scope") return "out";
  if (status === "awaiting_officer_review") return "wait";
  return "out";
}

function statusLabel(status: CaseStatus, locale: Locale): string {
  const el: Record<CaseStatus, string> = {
    gap: "κενό",
    flagged_declaration: "δήλωση",
    complaint: "καταγγελία",
    awaiting_reply: "μήνυμα",
    awaiting_officer_review: "υπάλληλος",
    out_of_scope: "εκτός",
    quiet: "ήσυχο",
  };
  const en: Record<CaseStatus, string> = {
    gap: "gap",
    flagged_declaration: "declared",
    complaint: "complaint",
    awaiting_reply: "message",
    awaiting_officer_review: "officer",
    out_of_scope: "out",
    quiet: "quiet",
  };
  return (locale === "en" ? en : el)[status];
}

function zoneLabel(c: ParcelCase, locale: Locale): string {
  const map = {
    in_plan: locale === "el" ? "εντός σχεδίου" : "in town plan",
    in_settlement: locale === "el" ? "εντός οικισμού" : "in settlement",
    within_100m: locale === "el" ? "εντός 100 m" : "within 100 m",
    out_of_scope: locale === "el" ? "εκτός πεδίου" : "out of scope",
    outside_duty: locale === "el" ? "εκτός υποχρέωσης" : "outside duty",
  };
  return map[c.zone.class];
}

function imageryLabel(c: ParcelCase, tr: ReturnType<typeof t>): string {
  if (c.verdict.kind === "inconclusive") {
    return c.verdict.reason === "too_small"
      ? `${tr.tooSmall} · εσωτερικό ${Math.round(c.verdict.interiorM2)} m²`
      : tr.noPair;
  }
  const label = c.verdict.kind === "uncleared" ? tr.uncleared : tr.cleared;
  return `${label} · NDVI ${c.verdict.ndviSpring.toFixed(2)} → ${c.verdict.ndviSummer.toFixed(2)}`;
}

function remapStatus(current: CaseStatus, next: ReturnType<typeof nextStatusAfterReply>): CaseStatus {
  if (next === "awaiting_officer_review") return "awaiting_officer_review";
  if (next === "awaiting_reply") return "awaiting_reply";
  if (next === "flagged_declaration") return "flagged_declaration";
  if (next === "gap") return current === "flagged_declaration" ? "flagged_declaration" : "gap";
  return current;
}
