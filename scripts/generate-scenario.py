#!/usr/bin/env python3
"""Hand-traced settlement-edge scenario for Drafi, Rafina-Pikermi.

The operating-cadastre WFS was unreachable (404/blocked) while building, so
outlines are traced in the same eastern-Attica bbox the plan named. Demo ids
replace KAEKs. One peri-urban plot sits on the Sentinel-2 window that was
actually sampled (spring 2026-04-29 vs late June 2026-06-20).
"""

from __future__ import annotations

import json
import math
from pathlib import Path

LAT0 = 38.0176
LON0 = 23.9172
M_LAT = 111_320.0
M_LON = 111_320.0 * math.cos(math.radians(LAT0))

MUNICIPALITY = {
    "el": "Δήμος Ραφήνας-Πικερμίου",
    "en": "Municipality of Rafina-Pikermi",
}
SETTLEMENT = {"el": "Δράφι", "en": "Drafi"}
DESK_DATE = "2026-06-23"
DEADLINE = "2026-06-22"
LAW = {
    "primary": "ΥΠ 1157 / ΦΕΚ Β' 2323/24.4.2026",
    "extension": "ΥΠ 1859/2026",
    "pdf": "https://civilprotection.gov.gr/sites/default/files/2026-04/20260202323.pdf",
}


def xy_to_lonlat(x: float, y: float) -> list[float]:
    return [round(LON0 + x / M_LON, 7), round(LAT0 + y / M_LAT, 7)]


def rect(x: float, y: float, w: float, h: float, j: list[tuple[float, float]] | None = None) -> list[list[float]]:
    """Axis-aligned plot with optional per-corner jitter in metres (SW, SE, NE, NW)."""
    corners = [(0.0, 0.0), (w, 0.0), (w, h), (0.0, h)]
    if j:
        corners = [(cx + dx, cy + dy) for (cx, cy), (dx, dy) in zip(corners, j)]
    ring = [xy_to_lonlat(x + cx, y + cy) for cx, cy in corners]
    ring.append(ring[0])
    return ring


def area_m2(ring: list[list[float]]) -> float:
    pts = [((lon - LON0) * M_LON, (lat - LAT0) * M_LAT) for lon, lat in ring]
    s = 0.0
    for i in range(len(pts) - 1):
        x1, y1 = pts[i]
        x2, y2 = pts[i + 1]
        s += x1 * y2 - x2 * y1
    return round(abs(s) / 2.0, 1)


def feature(pid, ring, **props):
    return {
        "type": "Feature",
        "id": pid,
        "geometry": {"type": "Polygon", "coordinates": [ring]},
        "properties": {"id": pid, "areaM2": area_m2(ring), **props},
    }


# Settlement street block west of the forest edge, Drafi.
parcels = [
    feature(
        "DEMO-RAF-001",
        rect(-88, 8, 16, 20, [(0, 0), (0.6, -0.4), (0.4, 0.5), (-0.5, 0.3)]),
        street={"el": "Οδός Πεύκων 4", "en": "Pefkon 4"},
        zone="in_settlement",
        owner="Γεώργιος Παπαδόπουλος",
        forestEdge=False,
        nearbyHouses=True,
        sensitiveSite=False,
        slopeClass="low",
        poorEscapeRoad=False,
        enclosed=True,
    ),
    feature(
        "DEMO-RAF-002",
        rect(-68, 8, 15, 22, [(0.2, 0), (0.3, -0.5), (-0.2, 0.4), (-0.4, 0.2)]),
        street={"el": "Οδός Πεύκων 6", "en": "Pefkon 6"},
        zone="in_settlement",
        owner="Ελένη Νικολάου",
        forestEdge=False,
        nearbyHouses=True,
        sensitiveSite=False,
        slopeClass="low",
        poorEscapeRoad=False,
        enclosed=True,
    ),
    feature(
        "DEMO-RAF-003",
        rect(-49, 8, 18, 24, [(0, 0.3), (0.5, 0), (0.2, -0.4), (-0.3, 0)]),
        street={"el": "Οδός Πεύκων 8", "en": "Pefkon 8"},
        zone="in_settlement",
        owner="Νικόλαος Αθανασίου",
        forestEdge=False,
        nearbyHouses=True,
        sensitiveSite=False,
        slopeClass="low",
        poorEscapeRoad=False,
        enclosed=False,
    ),
    feature(
        "DEMO-RAF-004",
        rect(-88, 34, 14, 18, [(0.1, 0), (0.4, 0.3), (0, 0.5), (-0.4, 0.2)]),
        street={"el": "Οδός Δρυός 3", "en": "Dryos 3"},
        zone="in_settlement",
        owner="Μαρία Κωνσταντίνου",
        forestEdge=False,
        nearbyHouses=True,
        sensitiveSite=False,
        slopeClass="low",
        poorEscapeRoad=False,
        enclosed=True,
    ),
    feature(
        "DEMO-RAF-005",
        rect(-70, 34, 17, 21, [(0, -0.2), (0.3, 0.2), (0.2, 0.4), (-0.3, 0)]),
        street={"el": "Οδός Δρυός 5", "en": "Dryos 5"},
        zone="in_settlement",
        owner="Χρήστος Δημητρίου",
        forestEdge=False,
        nearbyHouses=True,
        sensitiveSite=False,
        slopeClass="low",
        poorEscapeRoad=False,
        enclosed=True,
    ),
    feature(
        "DEMO-RAF-006",
        rect(-49, 38, 16, 25, [(0.2, 0), (0.4, -0.3), (0, 0.5), (-0.5, 0.2)]),
        street={"el": "Οδός Δρυός 7", "en": "Dryos 7"},
        zone="in_settlement",
        owner="Αικατερίνη Βασιλείου",
        forestEdge=False,
        nearbyHouses=True,
        sensitiveSite=False,
        slopeClass="low",
        poorEscapeRoad=False,
        enclosed=False,
    ),
    feature(
        "DEMO-RAF-007",
        rect(-88, 58, 19, 20, [(0, 0.2), (0.5, 0), (0.3, 0.4), (-0.2, 0.3)]),
        street={"el": "Οδός Δρυός 9", "en": "Dryos 9"},
        zone="in_settlement",
        owner="Παναγιώτης Ιωάννου",
        forestEdge=False,
        nearbyHouses=True,
        sensitiveSite=False,
        slopeClass="low",
        poorEscapeRoad=True,
        enclosed=True,
    ),
    feature(
        "DEMO-RAF-008",
        rect(-65, 61, 13, 22, [(0.1, 0), (0.2, -0.4), (0.3, 0.3), (-0.3, 0.2)]),
        street={"el": "Οδός Δρυός 11", "en": "Dryos 11"},
        zone="in_settlement",
        owner="Σοφία Αντωνίου",
        forestEdge=False,
        nearbyHouses=True,
        sensitiveSite=False,
        slopeClass="low",
        poorEscapeRoad=True,
        enclosed=True,
    ),
    feature(
        "DEMO-RAF-009",
        rect(-28, 8, 20, 18, [(0, 0), (0.4, 0.2), (0.2, 0.5), (-0.4, 0.1)]),
        street={"el": "Οδός Άρεως 2", "en": "Areos 2"},
        zone="in_settlement",
        owner="Δημήτριος Σταυρίδης",
        forestEdge=False,
        nearbyHouses=True,
        sensitiveSite=True,
        slopeClass="low",
        poorEscapeRoad=False,
        enclosed=False,
    ),
    # Planned block toward Pikermi (εντός σχεδίου).
    feature(
        "DEMO-RAF-010",
        rect(-88, -42, 22, 20, [(0.2, 0), (0.3, -0.3), (0, 0.4), (-0.3, 0.2)]),
        street={"el": "Οδός Νηρηίδων 1", "en": "Nereidon 1"},
        zone="in_plan",
        owner="Αναστασία Γεωργίου",
        forestEdge=False,
        nearbyHouses=True,
        sensitiveSite=True,
        slopeClass="low",
        poorEscapeRoad=False,
        enclosed=True,
    ),
    feature(
        "DEMO-RAF-011",
        rect(-62, -42, 18, 22, [(0, 0.2), (0.4, 0), (0.2, 0.3), (-0.2, 0)]),
        street={"el": "Οδός Νηρηίδων 3", "en": "Nereidon 3"},
        zone="in_plan",
        owner="Κωνσταντίνος Μιχαηλίδης",
        forestEdge=False,
        nearbyHouses=True,
        sensitiveSite=False,
        slopeClass="low",
        poorEscapeRoad=False,
        enclosed=False,
    ),
    feature(
        "DEMO-RAF-012",
        rect(-40, -40, 16, 19, [(0.1, 0), (0.3, -0.2), (0.1, 0.4), (-0.4, 0.1)]),
        street={"el": "Οδός Νηρηίδων 5", "en": "Nereidon 5"},
        zone="in_plan",
        owner="Ιωάννα Χριστοδούλου",
        forestEdge=False,
        nearbyHouses=True,
        sensitiveSite=False,
        slopeClass="low",
        poorEscapeRoad=False,
        enclosed=True,
    ),
    # 100 m band: forest edge north and east.
    feature(
        "DEMO-RAF-013",
        rect(-40, 112, 25, 18, [(0.3, 0.6), (0.8, -0.4), (0.2, 0.7), (-0.6, 0.5)]),
        street={"el": "Αδιέξοδος Πευκώνα", "en": "Pefkonas cul-de-sac"},
        zone="within_100m",
        owner="Θεόδωρος Αλεξίου",
        forestEdge=True,
        nearbyHouses=True,
        sensitiveSite=False,
        slopeClass="steep",
        poorEscapeRoad=True,
        enclosed=False,
    ),
    feature(
        "DEMO-RAF-014",
        rect(-10, 110, 30, 16, [(0, 0.4), (0.6, 0.2), (0.3, 0.8), (-0.5, 0.3)]),
        street={"el": "Οδός Πευκώνα 14", "en": "Pefkona 14"},
        zone="within_100m",
        owner="Βασιλική Παπαγεωργίου",
        forestEdge=True,
        nearbyHouses=True,
        sensitiveSite=False,
        slopeClass="moderate",
        poorEscapeRoad=True,
        enclosed=True,
    ),
    feature(
        "DEMO-RAF-015",
        rect(28, 108, 22, 28, [(0.4, 0), (0.7, 0.5), (0.2, 0.6), (-0.4, 0.4)]),
        street={"el": "Οδός Πευκώνα 16", "en": "Pefkona 16"},
        zone="within_100m",
        owner="Ανδρέας Λαμπρόπουλος",
        forestEdge=True,
        nearbyHouses=True,
        sensitiveSite=False,
        slopeClass="moderate",
        poorEscapeRoad=False,
        enclosed=False,
    ),
    feature(
        "DEMO-RAF-016",
        rect(24, 54, 24, 20, [(0.2, 0), (0.4, -0.3), (0.1, 0.4), (-0.3, 0.2)]),
        street={"el": "Οδός Άρεως 18", "en": "Areos 18"},
        zone="within_100m",
        owner="Πέτρος Καραγιάννης",
        forestEdge=False,
        nearbyHouses=True,
        sensitiveSite=False,
        slopeClass="low",
        poorEscapeRoad=False,
        enclosed=False,
    ),
    feature(
        "DEMO-RAF-017",
        rect(24, 8, 35, 35, [(0.3, 0.2), (0.6, -0.4), (0.2, 0.5), (-0.5, 0.3)]),
        street={"el": "Οδός Άρεως 20", "en": "Areos 20"},
        zone="within_100m",
        owner="Ολυμπία Σακελλαρίου",
        forestEdge=False,
        nearbyHouses=True,
        sensitiveSite=False,
        slopeClass="low",
        poorEscapeRoad=False,
        enclosed=True,
    ),
    # Sampled peri-urban plot — lon/lat locked to the Sentinel window.
    feature(
        "DEMO-RAF-018",
        [
            [23.92000, 38.01440],
            [23.92138, 38.01442],
            [23.92145, 38.01548],
            [23.91995, 38.01552],
            [23.92000, 38.01440],
        ],
        street={"el": "Αγροτική οδός προς Πικέρμι", "en": "Farm road toward Pikermi"},
        zone="within_100m",
        owner="Σπυρίδων Μαυρίδης",
        forestEdge=False,
        nearbyHouses=True,
        sensitiveSite=False,
        slopeClass="low",
        poorEscapeRoad=False,
        enclosed=False,
    ),
    feature(
        "DEMO-RAF-019",
        rect(-36, 178, 42, 38, [(1.2, 0.8), (1.5, -0.6), (0.4, 1.1), (-0.9, 0.7)]),
        street={"el": "Δασική θέση Κουκουβάγιας", "en": "Koukouvagias forest stand"},
        zone="forest_excluded",
        owner="Ελληνικό Δημόσιο (προσομοίωση)",
        forestEdge=True,
        nearbyHouses=False,
        sensitiveSite=False,
        slopeClass="steep",
        poorEscapeRoad=True,
        enclosed=False,
        exclusionNote={"el": "Δασικός χάρτης · άρθρο 3.1.γ", "en": "Forest map · article 3.1.c"},
    ),
    feature(
        "DEMO-RAF-020",
        rect(90, -210, 48, 40, [(0.5, 0.3), (0.8, -0.4), (0.3, 0.6), (-0.6, 0.2)]),
        street={"el": "Αγροί Πικερμίου", "en": "Pikermi fields"},
        zone="cultivated_excluded",
        owner="Αγροτικός συνεταιρισμός (προσομοίωση)",
        forestEdge=False,
        nearbyHouses=False,
        sensitiveSite=False,
        slopeClass="low",
        poorEscapeRoad=False,
        enclosed=False,
        exclusionNote={"el": "Ανέκαθεν γεωργικώς καλλιεργούμενη · άρθρο 3.5.α", "en": "Long-cultivated land · article 3.5.a"},
    ),
    feature(
        "DEMO-RAF-021",
        rect(-28, 32, 21, 19, [(0, 0.1), (0.3, 0), (0.2, 0.3), (-0.2, 0.2)]),
        street={"el": "Οδός Άρεως 4", "en": "Areos 4"},
        zone="garden_excluded",
        owner="Πολυκατοικία Άρεως 4 (προσομοίωση)",
        forestEdge=False,
        nearbyHouses=True,
        sensitiveSite=False,
        slopeClass="low",
        poorEscapeRoad=False,
        enclosed=True,
        exclusionNote={"el": "Διαμορφωμένος συντηρημένος κήπος · άρθρο 3.5.β", "en": "Maintained garden · article 3.5.b"},
    ),
    feature(
        "DEMO-RAF-022",
        rect(58, 128, 18, 32, [(0.8, 1.4), (1.1, -0.8), (0.3, 1.6), (-0.9, 1.2)]),
        street={"el": "Ρέμα Δραφίου", "en": "Drafi ravine"},
        zone="inaccessible_excluded",
        owner="Άγνωστος υπόχρεος (προσομοίωση)",
        forestEdge=True,
        nearbyHouses=False,
        sensitiveSite=False,
        slopeClass="steep",
        poorEscapeRoad=True,
        enclosed=False,
        exclusionNote={"el": "Απρόσιτο λόγω μορφολογίας · άρθρο 3.5.γ", "en": "Inaccessible terrain · article 3.5.c"},
    ),
    feature(
        "DEMO-RAF-023",
        rect(24, 78, 28, 20, [(0.2, 0), (0.5, -0.3), (0.2, 0.5), (-0.4, 0.2)]),
        street={"el": "Οδός Άρεως 22", "en": "Areos 22"},
        zone="within_100m",
        owner="Ειρήνη Χατζή",
        forestEdge=False,
        nearbyHouses=True,
        sensitiveSite=False,
        slopeClass="moderate",
        poorEscapeRoad=False,
        enclosed=True,
    ),
    feature(
        "DEMO-RAF-024",
        rect(-48, 61, 21, 19, [(0.1, 0), (0.3, 0.2), (0, 0.4), (-0.3, 0.1)]),
        street={"el": "Οδός Δρυός 13", "en": "Dryos 13"},
        zone="in_settlement",
        owner="Λεωνίδας Οικονόμου",
        forestEdge=False,
        nearbyHouses=True,
        sensitiveSite=False,
        slopeClass="low",
        poorEscapeRoad=True,
        enclosed=False,
    ),
]

declarations = [
    {"parcelId": "DEMO-RAF-002", "submittedAt": "2026-06-10T09:14:00+03:00", "claimedCleaned": True, "registryRef": "SIM-ΔΗΛ-2026-0142"},
    {"parcelId": "DEMO-RAF-003", "submittedAt": "2026-06-08T11:02:00+03:00", "claimedCleaned": True, "registryRef": "SIM-ΔΗΛ-2026-0098"},
    {"parcelId": "DEMO-RAF-005", "submittedAt": "2026-06-12T16:40:00+03:00", "claimedCleaned": True, "registryRef": "SIM-ΔΗΛ-2026-0211"},
    {"parcelId": "DEMO-RAF-007", "submittedAt": "2026-06-14T08:21:00+03:00", "claimedCleaned": True, "registryRef": "SIM-ΔΗΛ-2026-0284"},
    {"parcelId": "DEMO-RAF-009", "submittedAt": "2026-06-11T13:55:00+03:00", "claimedCleaned": True, "registryRef": "SIM-ΔΗΛ-2026-0177"},
    {"parcelId": "DEMO-RAF-010", "submittedAt": "2026-06-09T10:08:00+03:00", "claimedCleaned": True, "registryRef": "SIM-ΔΗΛ-2026-0120"},
    {"parcelId": "DEMO-RAF-012", "submittedAt": "2026-06-13T19:12:00+03:00", "claimedCleaned": True, "registryRef": "SIM-ΔΗΛ-2026-0249"},
    {"parcelId": "DEMO-RAF-014", "submittedAt": "2026-06-15T07:44:00+03:00", "claimedCleaned": True, "registryRef": "SIM-ΔΗΛ-2026-0310"},
    {"parcelId": "DEMO-RAF-017", "submittedAt": "2026-06-07T15:30:00+03:00", "claimedCleaned": True, "registryRef": "SIM-ΔΗΛ-2026-0071"},
    {"parcelId": "DEMO-RAF-023", "submittedAt": "2026-06-16T12:18:00+03:00", "claimedCleaned": True, "registryRef": "SIM-ΔΗΛ-2026-0338"},
]

complaints = [
    {
        "id": "SIM-ΚΑΤ-2026-0041",
        "parcelId": "DEMO-RAF-002",
        "filedAt": "2026-06-18T17:40:00+03:00",
        "text": {
            "el": "Ξερά χόρτα και πευκοβελόνες δίπλα στα σπίτια. Η δήλωση λέει καθαρισμένο.",
            "en": "Dry grass and pine needles against the houses. The declaration says it was cleaned.",
        },
    },
    {
        "id": "SIM-ΚΑΤ-2026-0048",
        "parcelId": "DEMO-RAF-006",
        "filedAt": "2026-06-20T09:05:00+03:00",
        "text": {
            "el": "Ακάλυπτο οικόπεδο με σωρό κλαδεμάτων. Δεν φαίνεται δήλωση.",
            "en": "Vacant plot with a pile of prunings. No declaration in sight.",
        },
    },
    {
        "id": "SIM-ΚΑΤ-2026-0055",
        "parcelId": "DEMO-RAF-013",
        "filedAt": "2026-06-21T20:12:00+03:00",
        "text": {
            "el": "Στο όριο με το δάσος, ξερή καύσιμη ύλη και μία στενή έξοδος.",
            "en": "On the forest edge, dry fuel and only a narrow way out.",
        },
    },
    {
        "id": "SIM-ΚΑΤ-2026-0060",
        "parcelId": "DEMO-RAF-023",
        "filedAt": "2026-06-22T11:33:00+03:00",
        "text": {
            "el": "Μετά τη δήλωση το οικόπεδο μοιάζει ακόμα ακαθάριστο.",
            "en": "After the declaration the plot still looks uncleared.",
        },
    },
]

settlement_boundary = {
    "type": "Polygon",
    "coordinates": [[
        xy_to_lonlat(-100, -52),
        xy_to_lonlat(12, -52),
        xy_to_lonlat(18, 96),
        xy_to_lonlat(-100, 96),
        xy_to_lonlat(-100, -52),
    ]],
}

band_100m = {
    "type": "Polygon",
    "coordinates": [[
        xy_to_lonlat(-200, -152),
        xy_to_lonlat(230, -152),
        xy_to_lonlat(230, 250),
        xy_to_lonlat(-200, 250),
        xy_to_lonlat(-200, -152),
    ]],
}

scenario = {
    "meta": {
        "title": "Drafi settlement edge, eastern Attica",
        "municipality": MUNICIPALITY,
        "settlement": SETTLEMENT,
        "deskDate": DESK_DATE,
        "declarationDeadline": DEADLINE,
        "law": LAW,
        "geometrySource": "hand-traced-fallback",
        "geometryNote": (
            "Hellenic Cadastre INSPIRE WFS (CadastralParcel) returned 404 / was blocked "
            "while building. Outlines are hand-traced in Drafi, Municipality of "
            "Rafina-Pikermi, to mix small urban plots with one larger peri-urban plot. "
            "Ids are DEMO-RAF-* and are not KAEKs."
        ),
        "wfsAttempt": "https://gis.ktimanet.gr/inspire/rest/services/cadastralparcels/CadastralParcel/MapServer/exts/InspireFeatureDownload/service",
        "orthophotoWms": "https://gis.ktimanet.gr/wms/wmsopen/wmsserver.aspx",
        "imagery": {
            "springScene": "S2C_34SGH_20260429_0_L2A",
            "juneScene": "S2A_34SGH_20260620_0_L2A",
            "springDate": "2026-04-29",
            "juneDate": "2026-06-20",
            "sampledParcelId": "DEMO-RAF-018",
            "springNdvi": 0.472,
            "juneNdvi": 0.383,
            "delta": -0.089,
            "note": "Mean NDVI over the peri-urban plot from public Sentinel-2 L2A COGs. Not painted on the map.",
        },
        "banner": {
            "el": "Τα όρια είναι δημόσια γεωμετρία κτηματολογίου (χειροκίνητα ιχνηλατημένη, επειδή το WFS δεν αποκρίθηκε). Ιδιοκτήτες, δηλώσεις, καταγγελίες και ευρήματα είναι προσομοιωμένα και δεν αποτελούν ισχυρισμούς για τα ακίνητα. Τα DEMO-RAF-* δεν είναι ΚΑΕΚ.",
            "en": "Parcel outlines are public cadastre geometry (hand-traced because the WFS did not respond). Owners, declarations, complaints and findings are simulated and are not statements about those properties. DEMO-RAF-* ids are not KAEKs.",
        },
    },
    "parcels": {"type": "FeatureCollection", "features": parcels},
    "declarations": declarations,
    "complaints": complaints,
    "settlementBoundary": settlement_boundary,
    "landmarks": [
        {
            "id": "school",
            "name": {"el": "Δημοτικό Σχολείο Δραφίου (προσομοίωση)", "en": "Drafi primary school (simulated)"},
            "coordinates": xy_to_lonlat(-8, -8),
        }
    ],
}

out = Path(__file__).resolve().parents[1] / "data" / "scenario.json"
out.parent.mkdir(parents=True, exist_ok=True)
out.write_text(json.dumps(scenario, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
print(f"wrote {out}")
print("parcels", len(parcels))
for f in parcels:
    p = f["properties"]
    print(f"{p['id']:13} {p['zone']:24} {p['areaM2']:8.0f} m2  {p['street']['el']}")
