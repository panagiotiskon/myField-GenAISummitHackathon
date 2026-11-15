"use client";

import { useEffect, useRef } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import type { FeatureCollection, Polygon } from "geojson";
import type { ParcelCase } from "@/lib/types";
import { scenario } from "@/data/scenario";

const FILL: Record<string, string> = {
  gap: "#a33b1f",
  flagged_declaration: "#b8893a",
  complaint: "#6b1d12",
  awaiting_reply: "#b8893a",
  awaiting_officer_review: "#3d5a4c",
  out_of_scope: "#6a7a6c",
  quiet: "#c5bba8",
};

type Props = {
  cases: ParcelCase[] | null;
  selectedId: string | null;
  onSelect: (id: string) => void;
};

export default function MapView({ cases, selectedId, onSelect }: Props) {
  const root = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const onSelectRef = useRef(onSelect);
  onSelectRef.current = onSelect;

  useEffect(() => {
    if (!root.current || mapRef.current) return;
    const map = new maplibregl.Map({
      container: root.current,
      style: {
        version: 8,
        glyphs: "https://demotiles.maplibre.org/font/{fontstack}/{range}.pbf",
        sources: {
          osm: {
            type: "raster",
            tiles: ["https://basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png"],
            tileSize: 256,
            attribution: "© OpenStreetMap © CARTO",
          },
          ortho: {
            type: "raster",
            tiles: ["/api/ortho/{z}/{x}/{y}"],
            tileSize: 256,
            attribution: "Ελληνικό Κτηματολόγιο WMS (θέαση)",
          },
        },
        layers: [
          { id: "osm", type: "raster", source: "osm" },
          { id: "ortho", type: "raster", source: "ortho", paint: { "raster-opacity": 0.55 } },
        ],
      },
      center: [23.9102, 38.0321],
      zoom: 16.2,
      attributionControl: { compact: true },
    });
    map.fitBounds(parcelBounds(), { padding: 48, maxZoom: 17.6, duration: 0 });
    map.addControl(new maplibregl.NavigationControl({ visualizePitch: false }), "top-right");
    mapRef.current = map;

    map.on("load", () => {
      map.addSource("context", { type: "geojson", data: contextFc() });
      map.addLayer({
        id: "forest-fill",
        type: "fill",
        source: "context",
        filter: ["==", ["get", "kind"], "forest"],
        paint: { "fill-color": "#2f4a3c", "fill-opacity": 0.18 },
      });
      map.addLayer({
        id: "settlement-line",
        type: "line",
        source: "context",
        filter: ["==", ["get", "kind"], "settlement"],
        paint: { "line-color": "#24382c", "line-width": 1.5, "line-dasharray": [2, 1] },
      });
      map.addLayer({
        id: "school-fill",
        type: "fill",
        source: "context",
        filter: ["==", ["get", "kind"], "school"],
        paint: { "fill-color": "#3d5a4c", "fill-opacity": 0.45 },
      });

      map.addSource("parcels", { type: "geojson", data: emptyFc() });
      map.addLayer({
        id: "parcel-fill",
        type: "fill",
        source: "parcels",
        paint: {
          "fill-color": ["coalesce", ["get", "color"], "#8a8173"],
          "fill-opacity": ["case", ["boolean", ["get", "selected"], false], 0.8, 0.55],
        },
      });
      map.addLayer({
        id: "parcel-line",
        type: "line",
        source: "parcels",
        paint: {
          "line-color": ["case", ["boolean", ["get", "selected"], false], "#6b1d12", "#1c1812"],
          "line-width": ["case", ["boolean", ["get", "selected"], false], 3, 1.6],
        },
      });
      map.addLayer({
        id: "parcel-label",
        type: "symbol",
        source: "parcels",
        layout: {
          "text-field": ["get", "id"],
          "text-size": 11,
          "text-font": ["Open Sans Regular", "Arial Unicode MS Regular"],
        },
        paint: { "text-color": "#1c1812", "text-halo-color": "#efe6d4", "text-halo-width": 1.2 },
      });

      map.on("click", "parcel-fill", (e) => {
        const id = e.features?.[0]?.properties?.id;
        if (typeof id === "string") onSelectRef.current(id);
      });
      map.on("mouseenter", "parcel-fill", () => {
        map.getCanvas().style.cursor = "pointer";
      });
      map.on("mouseleave", "parcel-fill", () => {
        map.getCanvas().style.cursor = "";
      });
    });

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const apply = () => {
      const src = map.getSource("parcels") as maplibregl.GeoJSONSource | undefined;
      if (!src) return;
      src.setData(parcelsFc(cases, selectedId));
    };
    if (map.isStyleLoaded()) apply();
    else map.once("load", apply);
  }, [cases, selectedId]);

  return <div ref={root} style={{ position: "absolute", inset: 0 }} />;
}

function parcelBounds(): [[number, number], [number, number]] {
  let minX = 180;
  let minY = 90;
  let maxX = -180;
  let maxY = -90;
  for (const p of scenario.parcels) {
    for (const ring of p.geometry.coordinates) {
      for (const [x, y] of ring) {
        minX = Math.min(minX, x);
        minY = Math.min(minY, y);
        maxX = Math.max(maxX, x);
        maxY = Math.max(maxY, y);
      }
    }
  }
  return [
    [minX, minY],
    [maxX, maxY],
  ];
}

function emptyFc(): FeatureCollection<Polygon> {
  return { type: "FeatureCollection", features: [] };
}

function contextFc(): FeatureCollection {
  return {
    type: "FeatureCollection",
    features: [
      {
        type: "Feature",
        properties: { kind: "forest" },
        geometry: scenario.context.forest,
      },
      {
        type: "Feature",
        properties: { kind: "settlement" },
        geometry: scenario.context.settlement,
      },
      {
        type: "Feature",
        properties: { kind: "school" },
        geometry: scenario.context.sensitiveSites[0].geometry,
      },
    ],
  };
}

function parcelsFc(cases: ParcelCase[] | null, selectedId: string | null): FeatureCollection<Polygon> {
  const rows = cases ?? [];
  if (rows.length === 0) {
    return {
      type: "FeatureCollection",
      features: scenario.parcels.map((p) => ({
        type: "Feature" as const,
        properties: { id: p.id, color: "#8a8173", selected: p.id === selectedId },
        geometry: p.geometry,
      })),
    };
  }
  return {
    type: "FeatureCollection",
    features: rows.map((c) => ({
      type: "Feature" as const,
      properties: {
        id: c.parcel.id,
        color: FILL[c.status] ?? "#8a8173",
        selected: c.parcel.id === selectedId,
      },
      geometry: c.parcel.geometry,
    })),
  };
}
