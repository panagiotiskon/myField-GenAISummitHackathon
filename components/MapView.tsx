"use client";

import maplibregl, { type Map as MapLibreMap, type StyleSpecification } from "maplibre-gl";
import { useEffect, useRef, useState } from "react";
import "maplibre-gl/dist/maplibre-gl.css";
import { scenario } from "@/lib/scenario";

const STREET_STYLE = "https://tiles.openfreemap.org/styles/positron";
const WMS = "/api/ortho?bbox={bbox-epsg-3857}";
const IDLE = "#6a6a6a";
const STYLE_TIMEOUT_MS = 4000;

// Used when the hosted style cannot be reached: outlines on a plain ground.
const OFFLINE_STYLE: StyleSpecification = {
  version: 8,
  sources: {},
  layers: [{ id: "ground", type: "background", paint: { "background-color": "#e6e6e1" } }],
};

function addDeskLayers(map: MapLibreMap) {
  if (map.getSource("parcels")) return;
  map.addSource("ortho", {
    type: "raster",
    tiles: [WMS],
    tileSize: 512,
    attribution: "Ελληνικό Κτηματολόγιο WMS",
  });
  map.addLayer({
    id: "ortho",
    type: "raster",
    source: "ortho",
    layout: { visibility: "none" },
  });
  map.addSource("settlement", {
    type: "geojson",
    data: { type: "Feature", properties: {}, geometry: scenario.settlementBoundary },
  });
  map.addLayer({
    id: "settlement-line",
    type: "line",
    source: "settlement",
    paint: { "line-color": "#1f6b3a", "line-width": 2, "line-dasharray": [2, 1.4] },
  });
  map.addSource("parcels", { type: "geojson", data: scenario.parcels });
  map.addLayer({
    id: "parcels-fill",
    type: "fill",
    source: "parcels",
    paint: { "fill-color": IDLE, "fill-opacity": 0.45 },
  });
  map.addLayer({
    id: "parcels-line",
    type: "line",
    source: "parcels",
    paint: { "line-color": "#0a0a0a", "line-width": 1.2 },
  });
  map.addLayer({
    id: "parcels-flagged",
    type: "line",
    source: "parcels",
    filter: ["in", ["get", "id"], ["literal", []]],
    paint: { "line-color": "#0a0a0a", "line-width": 3, "line-dasharray": [1.2, 1] },
  });
  map.addLayer({
    id: "parcels-selected",
    type: "line",
    source: "parcels",
    filter: ["==", ["get", "id"], ""],
    paint: { "line-color": "#ffe14a", "line-width": 3.5 },
  });
}

function parcelBounds(id: string | null) {
  const bounds = new maplibregl.LngLatBounds();
  for (const feature of scenario.parcels.features) {
    if (feature.geometry.type !== "Polygon") continue;
    if (id && (feature.properties as { id: string }).id !== id) continue;
    for (const pair of feature.geometry.coordinates[0]) bounds.extend(pair as [number, number]);
  }
  return bounds;
}

export function MapView(props: {
  /** parcel id -> fill colour */
  colors: Record<string, string>;
  selectedId: string | null;
  flaggedIds?: string[];
  orthophoto: boolean;
  onSelect?: (id: string) => void;
  offlineNote?: string;
}) {
  const root = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const onSelectRef = useRef(props.onSelect);
  onSelectRef.current = props.onSelect;
  const initialSelected = useRef(props.selectedId);
  // Bumps each time a style finishes loading, so the effects below re-apply.
  const [ready, setReady] = useState(0);
  const [offline, setOffline] = useState(false);

  useEffect(() => {
    if (!root.current || mapRef.current) return;
    const map = new maplibregl.Map({
      container: root.current,
      style: STREET_STYLE,
      center: [23.9176, 38.0168],
      zoom: 16.2,
      attributionControl: { compact: true },
    });
    map.addControl(
      new maplibregl.NavigationControl({ showCompass: false, visualizePitch: false }),
      "top-right",
    );
    mapRef.current = map;

    let styled = false;
    const goOffline = () => {
      if (styled) return;
      styled = true;
      setOffline(true);
      map.setStyle(OFFLINE_STYLE);
    };
    const timer = window.setTimeout(goOffline, STYLE_TIMEOUT_MS);

    map.on("style.load", () => {
      styled = true;
      window.clearTimeout(timer);
      addDeskLayers(map);
      setReady((n) => n + 1);
    });
    map.on("error", (event) => {
      // Tile misses after the style is in are fine. A style that never arrives is not.
      if (!styled && /style|Failed to fetch|NetworkError/i.test(String(event.error?.message))) {
        goOffline();
      }
    });
    map.on("click", "parcels-fill", (event) => {
      const id = event.features?.[0]?.properties?.id;
      if (typeof id === "string") onSelectRef.current?.(id);
    });
    map.on("mouseenter", "parcels-fill", () => {
      if (onSelectRef.current) map.getCanvas().style.cursor = "pointer";
    });
    map.on("mouseleave", "parcels-fill", () => {
      map.getCanvas().style.cursor = "";
    });
    map.fitBounds(parcelBounds(initialSelected.current), {
      padding: initialSelected.current ? 90 : 48,
      maxZoom: 18.5,
      duration: 0,
    });

    return () => {
      window.clearTimeout(timer);
      map.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!ready || !map?.getLayer("parcels-fill")) return;
    const entries = Object.entries(props.colors);
    map.setPaintProperty(
      "parcels-fill",
      "fill-color",
      entries.length
        ? ["match", ["get", "id"], ...entries.flatMap(([id, colour]) => [id, colour]), IDLE]
        : IDLE,
    );
  }, [props.colors, ready]);

  useEffect(() => {
    const map = mapRef.current;
    if (!ready || !map?.getLayer("parcels-selected")) return;
    map.setFilter("parcels-selected", ["==", ["get", "id"], props.selectedId ?? ""]);
    // On a single plot the fill would hide the ground we are looking at.
    map.setPaintProperty("parcels-fill", "fill-opacity", props.selectedId ? 0.12 : 0.45);
  }, [props.selectedId, ready]);

  useEffect(() => {
    const map = mapRef.current;
    if (!ready || !map?.getLayer("parcels-flagged")) return;
    map.setFilter("parcels-flagged", [
      "in",
      ["get", "id"],
      ["literal", props.flaggedIds ?? []],
    ]);
  }, [props.flaggedIds, ready]);

  useEffect(() => {
    const map = mapRef.current;
    if (!ready || !map?.getLayer("ortho")) return;
    map.setLayoutProperty("ortho", "visibility", props.orthophoto ? "visible" : "none");
  }, [props.orthophoto, ready]);

  return (
    <>
      <div ref={root} className="map-canvas" />
      {offline && props.offlineNote ? <div className="map-note">{props.offlineNote}</div> : null}
    </>
  );
}
