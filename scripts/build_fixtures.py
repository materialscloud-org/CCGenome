#!/usr/bin/env python3
"""Reference results of the Bokeh app's query for the JS tests
(tests/fixtures/filters.json.gz).

The old app's (commit 81f54b9) figure/query.py (get_data_sqla) selects, in table order, the rows where every
*active* filter holds, combined with AND:
  - a range filter (RangeSlider) is active unless its value equals the
    column's full range in columns.yml; then  col BETWEEN lo AND hi;
  - a list filter (CheckboxButtonGroup) is active unless every box is
    checked; then  col IN (checked values)  (no box checked: no rows, as
    SQLAlchemy 1.0's empty IN).
Presets (figure/main.py load_preset) set the filters they name and reset the
others to their full range / all values.

The same SQL runs on two SQLite tables:
  csv      built here from data/all_complexes.csv (the source of the web
           data) with the columns import_db.py creates, values parsed with
           Python's float()/int();
  shipped  the table "Pd" of raw/database.db, the database the deployed
           Bokeh app read. It is not identical to the CSV (see
           scripts/prepareForFrontend.py), so its results are recorded for comparison.
Each result is stored as the CSV row indices, as a base64 bitmask.

Needs PyYAML. Run:  python3 scripts/build_fixtures.py
"""
import base64
import csv
import gzip
import json
import random
import sqlite3
from pathlib import Path

import yaml

ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / "raw"
CONFIG = ROOT / "src" / "config"
OUT = ROOT / "tests" / "fixtures" / "filters.json.gz"


def load_yaml(name):
    with open(CONFIG / name) as f:
        return yaml.safe_load(f)


columns = {c["column"]: c for c in load_yaml("columns.yml")}
filter_list = load_yaml("filters.yml")
presets = load_yaml("presets.yml")


def csv_db():
    """The import_db.py table (name, X, Y, DeltaE, Reaction, ..., bond_type,
    filename) from the CSV, in memory."""
    with open(DATA / "all_complexes.csv", newline="") as f:
        rows = list(csv.reader(f))[1:]
    con = sqlite3.connect(":memory:")
    con.execute(
        'CREATE TABLE "Pd" (id INTEGER PRIMARY KEY, name TEXT, X FLOAT, Y FLOAT, '
        "DeltaE FLOAT, Reaction TEXT, bond_type BIGINT, filename TEXT)"
    )
    con.executemany(
        'INSERT INTO "Pd" VALUES (?,?,?,?,?,?,?,?)',
        [
            (i, r[0], float(r[1]), float(r[2]), float(r[3]), r[4], int(r[12]), r[0] + ".xyz")
            for i, r in enumerate(rows)
        ],
    )
    return con, [r[0] for r in rows]


def query(con, filters):
    """figure/query.py get_data_sqla: the names of the matching rows, in the
    order SQLite returns them."""
    where, params = [], []
    for key in filter_list:
        q, value = columns[key], filters[key]
        if q["type"] == "float":
            if list(value) != list(q["range"]):
                where.append(f'"{key}" BETWEEN ? AND ?')
                params += list(value)
        elif len(value) != len(q["values"]):
            if not value:
                where.append("0")  # empty IN: no row
            else:
                where.append(f'"{key}" IN ({",".join("?" * len(value))})')
                params += list(value)
    sql = 'SELECT X, Y, DeltaE, name, filename FROM "Pd"'
    if where:
        sql += " WHERE " + " AND ".join(where)
    return [row[3] for row in con.execute(sql, params)]


def preset_filters(label):
    """figure/main.py load_preset (an unknown label gives the Pd preset)."""
    preset = presets.get(label, presets["Pd"])
    out = {}
    for key in filter_list:
        q = columns[key]
        if key in preset:
            out[key] = preset[key]
        else:
            out[key] = q["range"] if q["type"] == "float" else q["values"]
    return out


def bitmask(indices, n):
    bits = bytearray((n + 7) // 8)
    for i in indices:
        bits[i >> 3] |= 1 << (i & 7)
    return base64.b64encode(bytes(bits)).decode()


def cases():
    out = [(f"preset {label}", preset_filters(label)) for label in presets]
    out.append(("unknown preset (falls back to Pd)", preset_filters("nonexistent")))
    full = preset_filters("Pd") | {"bond_type": columns["bond_type"]["values"]}
    out.append(("no filter", full))
    hand = [
        ("DeltaE lower bound", {"DeltaE": [-30.0, 40.0]}),
        ("DeltaE upper bound", {"DeltaE": [-80.0, -10.0]}),
        ("DeltaE just inside full range", {"DeltaE": [-80.0, 39.9]}),
        ("DeltaE on values in the data", {"DeltaE": [-25.6, -23.0]}),
        ("DeltaE single value", {"DeltaE": [-23.0, -23.0]}),
        ("DeltaE empty range", {"DeltaE": [10.0, 5.0]}),
        ("Reaction None only", {"Reaction": ["None"]}),
        ("Reaction none checked", {"Reaction": []}),
        ("Metal none checked", {"bond_type": []}),
        ("Metal Ni, Cu", {"bond_type": [3, 2]}),
        ("Suzuki and Stille on Pd, Pt", {"bond_type": [0, 1], "Reaction": ["Suzuki", "Stille"]}),
        ("Kumada on Ni in [-40, -5]", {"bond_type": [3], "Reaction": ["Kumada"], "DeltaE": [-40.0, -5.0]}),
    ]
    out += [(label, full | change) for label, change in hand]
    # random settings: slider values on the 0.1 grid, random subsets
    rng = random.Random(1)
    for i in range(20):
        lo = rng.randint(-800, 0) / 10
        hi = rng.randint(int(lo * 10), 400) / 10
        f = {
            "DeltaE": [lo, hi],
            "bond_type": sorted(rng.sample(columns["bond_type"]["values"], rng.randint(1, 6))),
            "Reaction": rng.sample(columns["Reaction"]["values"], rng.randint(1, 6)),
        }
        out.append((f"random {i}", f))
    return out


def main():
    con, names = csv_db()
    shipped = sqlite3.connect(f"file:{DATA / 'database.db'}?mode=ro", uri=True)
    index = {name: i for i, name in enumerate(names)}
    n = len(names)
    result = []
    for label, filters in cases():
        entry = {"label": label, "filters": filters}
        for db_label, db in (("csv", con), ("shipped", shipped)):
            idx = [index[name] for name in query(db, filters)]
            assert idx == sorted(idx), "SQLite did not return rows in table order"
            entry[db_label] = {"count": len(idx), "rows": bitmask(idx, n)}
        result.append(entry)
        print(f"{label:40s} csv {entry['csv']['count']:6d}  shipped {entry['shipped']['count']:6d}")
    OUT.parent.mkdir(parents=True, exist_ok=True)
    data = json.dumps({"rows": n, "cases": result}, separators=(",", ":"))
    OUT.write_bytes(gzip.compress(data.encode(), compresslevel=9, mtime=0))


if __name__ == "__main__":
    main()
