import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { z } from "zod";
import {
  capConfidence,
  clampVerdict,
  imageryFor,
  ruleAssessment,
  rulesOnlyAnalysis,
  type Analysis,
  type ParcelImagery,
  type RuleAssessment,
} from "@/lib/assess";
import { getParcel, scenario } from "@/lib/scenario";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MODEL = "claude-opus-5-5";
const CACHE_FILE = path.join(process.cwd(), "data", "analysis-cache.json");

const Bilingual = z.object({ el: z.string(), en: z.string() });
const Finding = z.object({
  verdict: z.enum(["likely_cleaned", "potentially_uncleaned", "uncertain"]),
  confidence: z.enum(["low", "medium", "high"]),
  summary: Bilingual,
  observations: z.array(Bilingual),
  limitations: z.array(Bilingual),
  landCover: z.object({
    trees: z.number(),
    lowVegetation: z.number(),
    bareGround: z.number(),
    built: z.number(),
  }),
});

const SYSTEM = `You help a Greek municipal civil-protection officer screen plots under the yearly plot-cleaning duty (dry grass, weeds and brush must be removed before fire season; healthy trees may stay).

You look at imagery of one plot and report what is visible. The officer decides; you never decide compliance. Imagery alone cannot prove that a plot is cleaned or uncleaned.

The plot is the area inside the yellow outline on each image. Describe only what you can see inside it, and say plainly when resolution or image age stops you from telling. The orthophoto has no published capture date and may be years old: use it to understand what kind of land this is (trees, shrubs, bare soil, buildings, paving), not its present state. The Sentinel-2 images are dated but each pixel is 10 m, so they show overall greenness only.

The request states which verdicts the measurements allow. Stay inside that list. Choose "uncertain" whenever the evidence does not clearly support another allowed verdict.

Write every text field in both Greek (el) and English (en), in short plain sentences an officer can read at a glance. Give 2 to 4 observations and 2 to 3 limitations specific to this plot. landCover is your estimate of the share of the outlined area, in whole percent summing to 100, read from the orthophoto.`;

async function readCache(): Promise<Record<string, Analysis>> {
  try {
    return JSON.parse(await readFile(CACHE_FILE, "utf8"));
  } catch {
    return {};
  }
}

async function writeCache(entry: Analysis) {
  try {
    const cache = await readCache();
    cache[entry.parcelId] = entry;
    await writeFile(CACHE_FILE, `${JSON.stringify(cache, null, 2)}\n`);
  } catch {
    // read-only disk: the live answer still goes back to the screen
  }
}

async function imageBlock(src: string): Promise<Anthropic.Beta.BetaImageBlockParam> {
  const file = path.join(process.cwd(), "public", src.replace(/^\//, ""));
  const data = (await readFile(file)).toString("base64");
  return { type: "image", source: { type: "base64", media_type: "image/jpeg", data } };
}

async function buildContent(
  parcelId: string,
  imagery: ParcelImagery,
  rule: RuleAssessment,
): Promise<Anthropic.Beta.BetaContentBlockParam[]> {
  const parcel = getParcel(parcelId)!;
  const declaration = scenario.declarations.find((row) => row.parcelId === parcelId);
  const complaint = scenario.complaints.find((row) => row.parcelId === parcelId);
  const content: Anthropic.Beta.BetaContentBlockParam[] = [];

  if (imagery.ortho) {
    content.push({
      type: "text",
      text: `Image 1. Aerial orthophoto, Hellenic Cadastre. Capture date not published. Window ${imagery.ortho.sideM} m wide.`,
    });
    content.push(await imageBlock(imagery.ortho.src));
  }
  if (imagery.sentinel) {
    const { before, after } = imagery.sentinel;
    content.push({
      type: "text",
      text: `Image 2. Sentinel-2 true colour, ${before.date} (spring). Window ${before.chip.sideM} m wide, 10 m pixels.`,
    });
    content.push(await imageBlock(before.chip.src));
    content.push({
      type: "text",
      text: `Image 3. Sentinel-2 true colour, ${after.date} (late June, the dated image closest to the declaration deadline). Same window.`,
    });
    content.push(await imageBlock(after.chip.src));
  }

  const facts = {
    plotAreaM2: parcel.properties.areaM2,
    zone: parcel.properties.zone,
    forestEdge: parcel.properties.forestEdge,
    declaration: declaration
      ? { submitted: declaration.submittedAt.slice(0, 10), ownerSaysCleaned: declaration.claimedCleaned }
      : null,
    neighbourComplaint: complaint?.text.en ?? null,
    sentinel: imagery.sentinel
      ? {
          ndviSpring: imagery.sentinel.before.ndvi,
          ndviLateJune: imagery.sentinel.after.ndvi,
          pixelsInsidePlot: imagery.sentinel.after.pixelCount,
          note: "Mean NDVI over the plot interior. Dry grass and bare soil both read low; evergreen tree canopy reads high even when the ground under it is cleared.",
        }
      : "Plot is too small for Sentinel-2: no whole 10 m pixel fits inside it.",
    measurementVerdict: rule.verdict,
    allowedVerdicts: rule.allowed,
    highestConfidenceAllowed: rule.confidenceCap,
  };
  content.push({
    type: "text",
    text: `Facts for this plot:\n${JSON.stringify(facts, null, 2)}\n\nAssess whether the plot appears cleaned.`,
  });
  return content;
}

async function askModel(
  parcelId: string,
  imagery: ParcelImagery,
  rule: RuleAssessment,
): Promise<Analysis | "declined"> {
  const client = new Anthropic({ timeout: 60_000, maxRetries: 1 });
  const response = await client.beta.messages.create({
    model: MODEL,
    max_tokens: 4000,
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default",
    output_config: { effort: "low", format: zodOutputFormat(Finding) },
    system: SYSTEM,
    messages: [{ role: "user", content: await buildContent(parcelId, imagery, rule) }],
  });
  if (response.stop_reason === "refusal") return "declined";

  const text = response.content.find((block) => block.type === "text");
  if (!text || text.type !== "text") throw new Error("no text block in model answer");
  const finding = Finding.parse(JSON.parse(text.text));
  const { verdict, clamped } = clampVerdict(finding.verdict, rule);
  const pct = (n: number) => Math.max(0, Math.min(100, Math.round(n)));

  return {
    parcelId,
    verdict,
    confidence: capConfidence(finding.confidence, rule.confidenceCap),
    source: "ai_live",
    model: response.model,
    analysedAt: new Date().toISOString(),
    rule,
    ai: {
      summary: finding.summary,
      observations: finding.observations.slice(0, 5),
      limitations: finding.limitations.slice(0, 4),
      landCover: {
        trees: pct(finding.landCover.trees),
        lowVegetation: pct(finding.landCover.lowVegetation),
        bareGround: pct(finding.landCover.bareGround),
        built: pct(finding.landCover.built),
      },
      proposedVerdict: finding.verdict,
      clamped,
    },
    aiNote: null,
  };
}

export async function POST(request: Request) {
  let parcelId = "";
  try {
    parcelId = String((await request.json())?.parcelId ?? "");
  } catch {
    return Response.json({ error: "invalid body" }, { status: 400 });
  }
  const parcel = getParcel(parcelId);
  if (!parcel) return Response.json({ error: "unknown parcel" }, { status: 404 });

  const imagery = imageryFor(parcelId);
  const declaration = scenario.declarations.find((row) => row.parcelId === parcelId) ?? null;
  const rule = ruleAssessment(parcel, imagery, declaration);
  const now = new Date().toISOString();

  if (rule.verdict === "not_applicable" || !imagery?.ortho) {
    return Response.json(rulesOnlyAnalysis(rule, null, now));
  }

  let aiNote: Analysis["aiNote"] = "no_key";
  if (process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_AUTH_TOKEN) {
    try {
      const result = await askModel(parcelId, imagery, rule);
      if (result !== "declined") {
        await writeCache(result);
        return Response.json(result);
      }
      aiNote = "declined";
    } catch (error) {
      aiNote = "call_failed";
      if (error instanceof Anthropic.AuthenticationError) {
        console.error("analyze: API key rejected");
      } else if (error instanceof Anthropic.RateLimitError) {
        console.error("analyze: rate limited");
      } else if (error instanceof Anthropic.APIError) {
        console.error(`analyze: API error ${error.status}: ${error.message}`);
      } else {
        console.error("analyze:", error);
      }
    }
  }

  // No live answer. Use the last saved model answer for this plot, if one exists,
  // re-checked against today's rule. Otherwise measurements only.
  const saved = (await readCache())[parcelId];
  if (saved?.ai) {
    const { verdict } = clampVerdict(saved.verdict, rule);
    return Response.json({
      ...saved,
      verdict,
      confidence: capConfidence(saved.confidence, rule.confidenceCap),
      rule,
      source: "ai_saved",
      aiNote,
    } satisfies Analysis);
  }
  return Response.json(rulesOnlyAnalysis(rule, aiNote, now));
}
