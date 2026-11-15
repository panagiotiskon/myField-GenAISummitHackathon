"use client";

import maplibregl, { type GeoJSONSource, type Map as MapLibreMap } from "maplibre-gl";
import { useEffect, useRef } from "react";
import "maplibre-gl/dist/maplibre-gl.css";
import { scenario } from "@/lib/scenario";
import type { QueueBucket } from "@/lib/types";

const STREET_STYLE = "https://tiles.openfreemap.org/styles/positron";

const WMS = "/api/ortho?bbox={bbox-epsg-3857}";

const COLORS: Record<QueueBucket | "idle", string> = {
  idle: "#5c574e",
  no_declaration: "#9c3b24",
  declaration_vs_imagery: "#b0893e",
  complaint: "#5c2e4a",
  out_of_scope: "#8a8578",
};

function addDeskLayers(map: MapLibreMap) {
  if (map.getSource("parcels")) return;
  map.addSource("ortho", {
    type: "raster",
    tiles: [WMS],
    tileSize: 256,
    attribution: "Ελληνικό Κτηματολόγιο WMS",
  });
  map.addLayer({
    id: "ortho",
    type: "raster",
    source: "ortho",
    layout: { visibility: "none" },
    paint: { "raster-opacity": 0.86 },
  });
  map.addSource("settlement", {
    type: "geojson",
    data: {
      type: "Feature",
      properties: {},
      geometry: scenario.settlementBoundary,
    },
  });
  map.addLayer({
    id: "settlement-line",
    type: "line",
    source: "settlement",
    paint: {
      "line-color": "#2f3b28",
      "line-width": 2,
      "line-dasharray": [2, 1.4],
    },
  });
  map.addSource("parcels", {
    type: "geojson",
    data: scenario.parcels,
  });
  map.addLayer({
    id: "parcels-fill",
    type: "fill",
    source: "parcels",
    paint: {
      "fill-color": COLORS.idle,
      "fill-opacity": 0.45,
    },
  });
  map.addLayer({
    id: "parcels-line",
    type: "line",
    source: "parcels",
    paint: {
      "line-color": "#1c1814",
      "line-width": 1.2,
    },
  });
  map.addLayer({
    id: "parcels-selected",
    type: "line",
    source: "parcels",
    filter: ["==", ["get", "id"], ""],
    paint: {
      "line-color": "#fff8ee",
      "line-width": 4,
    },
  });
}

export function MapView(props: {
  buckets: Record<string, QueueBucket | undefined>;
  selectedId: string | null;
  orthophoto: boolean;
  onSelect: (id: string) => void;
}) {
  const root = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const onSelectRef = useRef(props.onSelect);
  onSelectRef.current = props.onSelect;

  useEffect(() => {
    if (!root.current || mapRef.current) return;
    const map = new maplibregl.Map({
      container: root.current,
      style: STREET_STYLE,
      center: [23.9176, 38.0168],
      zoom: 16.2,
      attributionControl: { compact: true },
      logoPosition: "bottom-right",
    });
    map.addControl(
      new maplibregl.NavigationControl({ showCompass: false, visualizePitch: false }),
      "top-right",
    );
    mapRef.current = map;

    map.on("load", () => {
      addDeskLayers(map);
      map.on("click", "parcels-fill", (event) => {
        const id = event.features?.[0]?.properties?.id;
        if (typeof id === "string") onSelectRef.current(id);
      });
      map.on("mouseenter", "parcels-fill", () => {
        map.getCanvas().style.cursor = "pointer";
      });
      map.on("mouseleave", "parcels-fill", () => {
        map.getCanvas().style.cursor = "";
      });
      const bounds = new maplibregl.LngLatBounds();
      for (const feature of scenario.parcels.features) {
        if (feature.geometry.type !== "Polygon") continue;
        for (const pair of feature.geometry.coordinates[0]) {
          bounds.extend(pair as [number, number]);
        }
      }
      map.fitBounds(bounds, { padding: 48, duration: 0 });
    });

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map?.isStyleLoaded() || !map.getLayer("parcels-fill")) return;
    const entries = Object.entries(props.buckets);
    if (entries.length === 0) {
      map.setPaintProperty("parcels-fill", "fill-color", COLORS.idle);
      return;
    }
    const expression = [
      "match",
      ["get", "id"],
      ...entries.flatMap(([id, bucket]) => [id, COLORS[bucket ?? "idle"]]),
      COLORS.idle,
    ];
    map.setPaintProperty("parcels-fill", "fill-color", expression);
  }, [props.buckets]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map?.getLayer("parcels-selected")) return;
    map.setFilter("parcels-selected", ["==", ["get", "id"], props.selectedId ?? ""]);
  }, [props.selectedId]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map?.getLayer("ortho")) return;
    map.setLayoutProperty("ortho", "visibility", props.orthophoto ? "visible" : "none");
  }, [props.orthophoto]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !props.selectedId) return;
    const source = map.getSource("parcels") as GeoJSONSource | undefined;
    if (!source) return;
    const feature = scenario.parcels.features.find(
      (row) => row.properties && (row.properties as { id: string }).id === props.selectedId,
    );
    if (!feature || feature.geometry.type !== "Polygon") return;
    const bounds = new maplibregl.LngLatBounds();
    for (const pair of feature.geometry.coordinates[0]) {
      bounds.extend(pair as [number, number]);
    }
    map.fitBounds(bounds, { padding: 80, maxZoom: 18, duration: 600 });
  }, [props.selectedId]);

  return <div ref={root} className="map-canvas" />;
}
