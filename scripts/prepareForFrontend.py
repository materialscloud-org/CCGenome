#!/usr/bin/env python3
"""Prepare the data the web app serves (data/, served at data/) from the raw data.

Input (raw/, in git: the files of the old app's repository, commit 81f54b9):
  all_complexes.csv   one row per complex (25,112 rows)
  structures.tar.gz   structures/<Name>.xyz for every complex

Output (data/), JSON (the host compresses it on the wire):
  table.json                the columns the scatter plot needs, as columns:
                            {"name": [...], "X": [...], "Y": [...],
                             "DeltaE": [...], "Reaction": [...],
                             "bond_type": [...]}
  structures/<prefix>.json
                            the complexes whose name starts with <prefix>
                            (the name up to the "."; e.g. Pd_0 holds
                            Pd_0.0 ... Pd_0.N): {"columns": [CSV header],
                            "complexes": {name: {"row": [CSV fields],
                            "xyz": "<the .xyz file>"}}}

CSV fields and .xyz files are kept as text, unchanged; numbers in
table.json are the CSV values parsed as doubles (Python's float(), the same
double as JavaScript's parseFloat). Only the Python standard library is used.

Run from anywhere:  python3 scripts/prepareForFrontend.py

Decisions (against the old Bokeh app; its code is commit 81f54b9):

- No database at runtime: the old app read raw/database.db (made by its
  import_db.py); the web data comes from all_complexes.csv and the .xyz files.
  The table keeps only the plotted columns; the structures are bundled by name
  prefix (546 files, ~23 kB each), as 25,112 files would exceed Cloudflare
  Pages' 20,000. structures.tar.gz also holds a JVM crash log
  (hs_err_pid16900.log): not published.
- The Reaction column: all_complexes.csv and database.db (same commit,
  81f54b9) agree on every name and column except Reaction, which differs for
  12,541 of 25,112 complexes (e.g. Suzuki: 202 in the CSV, 1,330 in the
  database; each assigns other DeltaE windows). It is not a row shift: they
  look like two versions of the reaction assignment. The app uses the CSV.
  If database.db holds the correct one, take its Reaction column here and
  rerun this script and scripts/build_fixtures.py. TO BE DECIDED BY THE DATA
  OWNERS.
- database.db was written by pandas 0.24 (float parsing not correctly
  rounded): DeltaE differs from the CSV in the last bit for 4,663 rows, none
  on the slider's 0.1 grid, so no filter selects differently. The app uses
  the correctly rounded CSV values. scripts/build_fixtures.py checks the
  filters of the app against the old SQL on both tables (tests/fixtures/).
"""
import csv
import json
import shutil
import tarfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / "raw"
OUT = ROOT / "data"

# CSV header -> column id used by the app (the ids of src/config/columns.yml)
TABLE_COLUMNS = {
    "Name": "name",
    "X [ ]": "X",
    "Y [ ]": "Y",
    "DeltaE [kcal/mol]": "DeltaE",
    "Reaction": "Reaction",
    "bond type": "bond_type",
}
FLOATS = {"X", "Y", "DeltaE"}
INTS = {"bond_type"}


def shard_of(name):
    """Name of the structure file holding a complex: Pd_0.10 -> Pd_0."""
    return name.split(".")[0]


def read_csv(path):
    with open(path, newline="", encoding="utf-8") as f:
        rows = list(csv.reader(f))
    return rows[0], rows[1:]


def read_structures(path):
    """{name: xyz text} of structures/<name>.xyz in the archive (other files,
    such as a stray JVM crash log, are skipped)."""
    out = {}
    with tarfile.open(path, "r:gz") as tar:
        for member in tar:
            if not (member.isfile() and member.name.startswith("structures/")
                    and member.name.endswith(".xyz")):
                continue
            name = member.name[len("structures/"):-len(".xyz")]
            out[name] = tar.extractfile(member).read().decode("utf-8")
    return out


def write_json(path, obj):
    path.write_text(json.dumps(obj, separators=(",", ":"), ensure_ascii=False), encoding="utf-8")
    return path.stat().st_size


def main():
    header, rows = read_csv(DATA / "all_complexes.csv")
    structures = read_structures(DATA / "structures.tar.gz")

    names = [row[0] for row in rows]
    assert len(set(names)) == len(names), "duplicate names in the CSV"
    missing = [n for n in names if n not in structures]
    assert not missing, f"no structure for {missing[:5]}"
    extra = sorted(set(structures) - set(names))
    if extra:
        print(f"note: {len(extra)} structures without a CSV row, not published: {extra[:5]}")

    if OUT.exists():
        shutil.rmtree(OUT)
    (OUT / "structures").mkdir(parents=True)

    index = {h: header.index(h) for h in TABLE_COLUMNS}
    table = {}
    for h, key in TABLE_COLUMNS.items():
        values = [row[index[h]] for row in rows]
        if key in FLOATS:
            values = [float(v) for v in values]
        elif key in INTS:
            values = [int(v) for v in values]
        table[key] = values
    table_size = write_json(OUT / "table.json", table)

    shards = {}
    for row in rows:
        shards.setdefault(shard_of(row[0]), {})[row[0]] = {
            "row": row,
            "xyz": structures[row[0]],
        }
    sizes = [
        write_json(OUT / "structures" / f"{key}.json", {"columns": header, "complexes": complexes})
        for key, complexes in shards.items()
    ]
    sizes.sort()
    print(f"table.json: {len(rows)} rows, {table_size / 1e3:.0f} kB")
    print(
        f"structures/: {len(sizes)} files, {sum(sizes) / 1e6:.1f} MB "
        f"(median {sizes[len(sizes) // 2] / 1e3:.0f} kB, max {sizes[-1] / 1e3:.0f} kB)"
    )


if __name__ == "__main__":
    main()
