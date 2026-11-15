"use client";

import { buffer } from "@turf/turf";
import type { Feature, FeatureCollection, Polygon } from "geojson";
import maplibregl, { type GeoJSONSource, type Map as MapLibreMap, type StyleSpecification } from "maplibre-gl";
import { useEffect, useRef } from "react";
import "maplibre-gl/dist/maplibre-gl.css";
import { VERDICT_COLOR } from "@/components/Chrome";
import type { FilmClock } from "@/components/FilmClock";
import { imageryFor, type Verdict } from "@/lib/assess";
import {
  FILM_END,
  FILM_PLOT,
  MOSAIC_MAX_ZOOM,
  ORTHO_FADE,
  ORTHO_STILLS,
  PLOT_CENTER,
  S2_MAX_TILE_ZOOM,
  beatsAt,
  cameraAt,
  flightTiles,
  paddingAt,
  swathEdge,
  swathPolygon,
  type View,
} from "@/lib/film";
import { getParcel } from "@/lib/scenario";

// ------------------------------------------------------------------ stage

const PLOT_YELLOW = "#ffe14a"; // the app's selected-plot outline
const DESCENT_GATE = 5700; // the clock waits here until the deep tiles are in

const corners = (b: number[]): [[number, number], [number, number], [number, number], [number, number]] => [
  [b[0], b[3]],
  [b[2], b[3]],
  [b[2], b[1]],
  [b[0], b[1]],
];

function filmStyle(verdict: Verdict): StyleSpecification {
  const parcel = getParcel(FILM_PLOT);
  const imagery = imageryFor(FILM_PLOT);
  const plot: Feature<Polygon> = {
    type: "Feature",
    properties: {},
    geometry: parcel?.geometry ?? { type: "Polygon", coordinates: [[]] },
  };
  // what the rule measures: the plot 10 m in from its edge
  let interior: Feature | null = null;
  try {
    interior = (buffer(plot, -10, { units: "meters" }) as Feature | undefined) ?? null;
  } catch {
    interior = null;
  }
  const ring = plot.geometry.coordinates[0] ?? [];
  const pins: FeatureCollection = {
    type: "FeatureCollection",
    features: ring.slice(0, -1).map((pair, i) => ({
      type: "Feature",
      properties: { i },
      geometry: { type: "Point", coordinates: pair },
    })),
  };
  const empty: FeatureCollection = { type: "FeatureCollection", features: [] };
  const orthoOpacity = ["interpolate", ["linear"], ["zoom"], ORTHO_FADE[0], 0, ORTHO_FADE[1], 1];
  const s2 = imagery?.sentinel;

  const style = {
    version: 8,
    projection: { type: "globe" },
    sky: {
      "atmosphere-blend": ["interpolate", ["linear"], ["zoom"], 0, 0.6, 4.2, 0.6, 6.2, 0],
    },
    // the sun behind the camera: the whole disc is lit evenly, with haze only at the limb
    light: { anchor: "viewport", position: [1.5, 0, 0] },
    sources: {
      mosaic: {
        type: "raster",
        tiles: ["flight://s2/{z}/{x}/{y}"],
        tileSize: 256,
        maxzoom: S2_MAX_TILE_ZOOM,
      },
      ...Object.fromEntries(
        ORTHO_STILLS.map((still) => [
          `ortho-${still.sideM}`,
          { type: "image", url: still.src, coordinates: corners(still.bounds) },
        ]),
      ),
      ...(s2
        ? {
            april: { type: "image", url: s2.before.chip.src, coordinates: corners(s2.before.chip.bounds) },
            june: { type: "image", url: s2.after.chip.src, coordinates: corners(s2.after.chip.bounds) },
          }
        : {}),
      // dims the orthophoto around the two Sentinel-2 chips, so the chips read as the subject
      veil: {
        type: "geojson",
        data: {
          type: "Feature",
          properties: {},
          geometry: {
            type: "Polygon",
            coordinates: [
              [
                [PLOT_CENTER[0] - 0.2, PLOT_CENTER[1] - 0.2],
                [PLOT_CENTER[0] + 0.2, PLOT_CENTER[1] - 0.2],
                [PLOT_CENTER[0] + 0.2, PLOT_CENTER[1] + 0.2],
                [PLOT_CENTER[0] - 0.2, PLOT_CENTER[1] + 0.2],
                [PLOT_CENTER[0] - 0.2, PLOT_CENTER[1] - 0.2],
              ],
            ],
          },
        },
      },
      swath: { type: "geojson", data: empty },
      "swath-edge": { type: "geojson", data: empty },
      plot: { type: "geojson", data: plot },
      interior: { type: "geojson", data: interior ?? empty },
      pins: { type: "geojson", data: pins },
    },
    layers: [
      { id: "mosaic", type: "raster", source: "mosaic", maxzoom: MOSAIC_MAX_ZOOM, paint: { "raster-fade-duration": 0 } },
      ...ORTHO_STILLS.map((still) => ({
        id: `ortho-${still.sideM}`,
        type: "raster",
        source: `ortho-${still.sideM}`,
        paint: { "raster-opacity": orthoOpacity, "raster-fade-duration": 0 },
      })),
      { id: "veil", type: "fill", source: "veil", minzoom: 14, paint: { "fill-color": "#060a08", "fill-opacity": 0 } },
      ...(s2
        ? ["april", "june"].map((id) => ({
            id,
            type: "raster",
            source: id,
            // Each square in these chips is one 10 m pixel, drawn about 21 px wide, so plain
            // linear sampling keeps the squares. ("nearest" draws a 512 px image source black.)
            paint: { "raster-opacity": 0, "raster-fade-duration": 0 },
          }))
        : []),
      { id: "swath", type: "fill", source: "swath", paint: { "fill-color": "#ffffff", "fill-opacity": 0 } },
      {
        id: "swath-sides",
        type: "line",
        source: "swath",
        paint: { "line-color": "#ffffff", "line-width": 1, "line-opacity": 0 },
      },
      {
        id: "swath-edge",
        type: "line",
        source: "swath-edge",
        paint: { "line-color": "#ffffff", "line-width": 2.5, "line-opacity": 0 },
      },
      {
        id: "plot-fill",
        type: "fill",
        source: "plot",
        paint: { "fill-color": VERDICT_COLOR[verdict], "fill-opacity": 0 },
      },
      {
        id: "interior-casing",
        type: "line",
        source: "interior",
        paint: { "line-color": "#0b1210", "line-width": 4, "line-opacity": 0 },
      },
      {
        id: "interior",
        type: "line",
        source: "interior",
        paint: { "line-color": "#ffffff", "line-width": 2, "line-dasharray": [2.5, 2], "line-opacity": 0 },
      },
      {
        id: "plot-casing",
        type: "line",
        source: "plot",
        layout: { "line-join": "round" },
        paint: { "line-color": "#0b1210", "line-width": 6, "line-opacity": 0 },
      },
      {
        id: "plot-line",
        type: "line",
        source: "plot",
        layout: { "line-join": "round" },
        paint: { "line-color": PLOT_YELLOW, "line-width": 3, "line-opacity": 0 },
      },
      {
        id: "pins",
        type: "circle",
        source: "pins",
        paint: {
          "circle-radius": 5,
          "circle-color": "#0b1210",
          "circle-stroke-color": PLOT_YELLOW,
          "circle-stroke-width": 2.5,
          "circle-opacity": 0,
          "circle-stroke-opacity": 0,
        },
      },
    ],
  };
  return style as unknown as StyleSpecification;
}

// Tiles are fetched once into memory and handed to the map from there, so the
// descent never waits on the network mid-flight.
const tileStore = new Map<string, ArrayBuffer>();
let protocolReady = false;

function installProtocol() {
  if (protocolReady) return;
  protocolReady = true;
  maplibregl.addProtocol("flight", async (params, abort) => {
    const key = params.url.slice("flight://s2/".length);
    const hit = tileStore.get(key);
    if (hit) return { data: hit.slice(0) };
    const response = await fetch(`/flight/s2/${key}.jpg`, { signal: abort.signal });
    if (!response.ok) throw new Error(`flight tile ${key}: ${response.status}`);
    const data = await response.arrayBuffer();
    tileStore.set(key, data);
    return { data: data.slice(0) };
  });
}

async function prefetch(keys: string[], signal: AbortSignal, onCoarse: () => void) {
  const coarse = keys.filter((key) => Number(key.split("/")[0]) <= 5).length;
  let done = 0;
  let next = 0;
  const worker = async () => {
    while (next < keys.length && !signal.aborted) {
      const key = keys[next];
      next += 1;
      if (!tileStore.has(key)) {
        try {
          const response = await fetch(`/flight/s2/${key}.jpg`, { signal });
          if (response.ok) tileStore.set(key, await response.arrayBuffer());
        } catch {
          // a missing tile falls back to its coarser parent on the map
        }
      }
      done += 1;
      if (done === coarse) onCoarse();
    }
  };
  await Promise.all(Array.from({ length: 8 }, worker));
}

function measureView(frame: HTMLElement): View | null {
  const box = frame.getBoundingClientRect();
  if (box.width < 40 || box.height < 40) return null;
  const pad = (selector: string) => {
    const gauge = frame.querySelector<HTMLElement>(selector);
    if (!gauge) return { top: 0, right: 0, bottom: 0, left: 0 };
    const inner = gauge.getBoundingClientRect();
    return {
      top: Math.max(0, inner.top - box.top),
      right: Math.max(0, box.right - inner.right),
      bottom: Math.max(0, box.bottom - inner.bottom),
      left: Math.max(0, inner.left - box.left),
    };
  };
  return { width: box.width, height: box.height, pad: pad("[data-safe='flight']"), endPad: pad("[data-safe='end']") };
}

/**
 * The film's picture: a MapLibre globe driven frame by frame from the clock.
 * `onState` reports "ready" once the picture can be shown and "failed" when
 * there is no WebGL, so the page can fall back to a still.
 */
export function FilmStage({
  clock,
  verdict,
  onState,
}: {
  clock: FilmClock;
  verdict: Verdict;
  onState: (state: "ready" | "failed") => void;
}) {
  const root = useRef<HTMLDivElement>(null);
  const { subscribe, time, setLimit, setView } = clock;
  const onStateRef = useRef(onState);
  onStateRef.current = onState;
  const verdictRef = useRef(verdict);
  const mapRef = useRef<MapLibreMap | null>(null);

  useEffect(() => {
    const el = root.current;
    const frame = el?.closest<HTMLElement>(".film-frame");
    if (!el || !frame) return;
    let view = measureView(frame);
    if (!view) return;

    installProtocol();
    let map: MapLibreMap;
    try {
      const start = cameraAt(time(), view);
      map = new maplibregl.Map({
        container: el,
        style: filmStyle(verdictRef.current),
        center: [start.lng, start.lat],
        zoom: start.zoom,
        bearing: start.bearing,
        interactive: false,
        attributionControl: false,
        fadeDuration: 0,
        renderWorldCopies: false,
        pixelRatio: Math.min(window.devicePixelRatio || 1, 2),
        maxPitch: 0,
      });
    } catch {
      onStateRef.current("failed");
      return;
    }
    mapRef.current = map;
    setView(view);

    const painted = new Map<string, number>();
    const paint = (layer: string, property: string, value: number) => {
      const key = `${layer}/${property}`;
      const rounded = Math.round(value * 1000) / 1000;
      if (painted.get(key) === rounded || !map.getLayer(layer)) return;
      painted.set(key, rounded);
      map.setPaintProperty(layer, property, rounded);
    };
    let lastHead = -1;
    let styled = false;

    const apply = (t: number) => {
      if (!view) return;
      const camera = cameraAt(t, view);
      map.jumpTo({
        center: [camera.lng, camera.lat],
        zoom: camera.zoom,
        bearing: camera.bearing,
        padding: paddingAt(t, view),
      });
      if (!styled) return;
      const beats = beatsAt(t);
      paint("swath", "fill-opacity", beats.swath * 0.1);
      paint("swath-sides", "line-opacity", beats.swath * 0.45);
      paint("swath-edge", "line-opacity", beats.swath);
      if (beats.swath > 0 && beats.swathHead !== lastHead) {
        lastHead = beats.swathHead;
        (map.getSource("swath") as GeoJSONSource | undefined)?.setData({
          type: "Feature",
          properties: {},
          geometry: { type: "Polygon", coordinates: [swathPolygon(beats.swathHead)] },
        });
        (map.getSource("swath-edge") as GeoJSONSource | undefined)?.setData({
          type: "Feature",
          properties: {},
          geometry: { type: "LineString", coordinates: swathEdge(beats.swathHead) },
        });
      }
      paint("april", "raster-opacity", beats.april);
      paint("june", "raster-opacity", beats.june);
      paint("veil", "fill-opacity", beats.april * 0.62);
      paint("interior-casing", "line-opacity", beats.interior * 0.6);
      paint("interior", "line-opacity", beats.interior);
      paint("plot-casing", "line-opacity", beats.outline * 0.55);
      paint("plot-line", "line-opacity", beats.outline);
      paint("plot-fill", "fill-opacity", beats.verdictFill * 0.16);
      // the four boundary markers land one after another
      const pin = Math.round((beats.pins[0] + beats.pins[1] + beats.pins[2] + beats.pins[3]) * 250);
      if (painted.get("pins") !== pin && map.getLayer("pins")) {
        painted.set("pins", pin);
        const each = ["match", ["get", "i"], 0, beats.pins[0], 1, beats.pins[1], 2, beats.pins[2], beats.pins[3]];
        map.setPaintProperty("pins", "circle-opacity", each);
        map.setPaintProperty("pins", "circle-stroke-opacity", each);
      }
    };

    const unsubscribe = subscribe(apply);
    apply(time());

    const abort = new AbortController();
    let coarse = false;
    let loaded = false;
    const maybeStart = () => {
      if (!coarse || !loaded) return;
      setLimit(Math.max(DESCENT_GATE, 0));
      onStateRef.current("ready");
    };
    void prefetch(flightTiles(view), abort.signal, () => {
      coarse = true;
      maybeStart();
    }).then(() => {
      if (!abort.signal.aborted) setLimit(FILM_END);
    });

    map.on("load", () => {
      styled = true;
      loaded = true;
      apply(time());
      maybeStart();
    });
    // a tile the committed set does not hold is not an error worth surfacing
    map.on("error", () => undefined);

    const observer = new ResizeObserver(() => {
      const next = measureView(frame);
      if (!next) return;
      view = next;
      map.resize();
      setView(next);
      apply(time());
    });
    observer.observe(frame);

    return () => {
      abort.abort();
      observer.disconnect();
      unsubscribe();
      map.remove();
      mapRef.current = null;
    };
  }, [setLimit, setView, subscribe, time]);

  // a new analysis may change the verdict colour under the outline
  useEffect(() => {
    verdictRef.current = verdict;
    const map = mapRef.current;
    if (map?.getLayer("plot-fill")) map.setPaintProperty("plot-fill", "fill-color", VERDICT_COLOR[verdict]);
  }, [verdict]);

  return <div ref={root} className="film-map" aria-hidden="true" />;
}
