// The web data (data/) holds every row of all_complexes.csv and every
// structure of structures.tar.gz, unchanged.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { gunzipSync } from "node:zlib";

import { propertiesJson, shardOf } from "../src/ccgenome/data.js";
import { readJson, root, table as loadTable } from "./helpers.mjs";

/** { path: text } of the regular files of a .tar.gz. */
function readTarGz(path) {
  const buf = gunzipSync(readFileSync(new URL(path, root)));
  const files = {};
  for (let pos = 0; pos + 512 <= buf.length; ) {
    const header = buf.subarray(pos, pos + 512);
    if (header.every((b) => b === 0)) break;
    const field = (start, len) => header.subarray(start, start + len).toString("latin1").replace(/\0.*$/s, "");
    const name = field(345, 155) ? `${field(345, 155)}/${field(0, 100)}` : field(0, 100);
    const size = parseInt(field(124, 12).trim() || "0", 8);
    const type = field(156, 1);
    if (type === "0" || type === "") files[name] = buf.subarray(pos + 512, pos + 512 + size).toString("utf8");
    pos += 512 + Math.ceil(size / 512) * 512;
  }
  return files;
}

// all_complexes.csv has no quoted fields
const csv = readFileSync(new URL("raw/all_complexes.csv", root), "utf8")
  .split("\n")
  .filter((line) => line !== "")
  .map((line) => line.split(","));
const [header, ...rows] = csv;

test("table.json: every CSV row, in order, with the same values", () => {
  const table = loadTable();
  const columns = { name: 0, X: 1, Y: 2, DeltaE: 3, Reaction: 4, bond_type: 12 };
  assert.deepEqual(Object.keys(table).sort(), Object.keys(columns).sort());
  for (const [key, i] of Object.entries(columns)) {
    const expected = rows.map((r) => (key === "name" || key === "Reaction" ? r[i] : Number(r[i])));
    assert.deepEqual(table[key], expected, key);
  }
});

test("structures/: every complex, its CSV row and its .xyz file, unchanged", () => {
  const tar = readTarGz("raw/structures.tar.gz");
  const dir = new URL("data/structures/", root);
  const published = {};
  for (const file of readdirSync(dir)) {
    const { columns, complexes } = readJson(`data/structures/${file}`);
    assert.deepEqual(columns, header);
    for (const [name, entry] of Object.entries(complexes)) {
      assert.equal(`${shardOf(name)}.json`, file, name);
      published[name] = entry;
    }
  }
  assert.equal(Object.keys(published).length, rows.length);
  for (const row of rows) {
    const entry = published[row[0]];
    assert.ok(entry, row[0]);
    assert.deepEqual(entry.row, row);
    assert.equal(entry.xyz, tar[`structures/${row[0]}.xyz`], row[0]);
  }
});

test("properties JSON", () => {
  assert.deepEqual(propertiesJson(["Name", "DeltaE", "HOMO"], ["Pd_0.0", "-9.500000", "NAN"]), {
    Name: "Pd_0.0",
    DeltaE: -9.5,
    HOMO: "NAN",
  });
});

test("every structure reads as a molecule with the atoms of its .xyz file", async () => {
  const { cartesian, fromXYZ } = await import("matsci-parse");
  const dir = new URL("data/structures/", root);
  let count = 0;
  for (const file of readdirSync(dir)) {
    for (const [name, { xyz }] of Object.entries(readJson(`data/structures/${file}`).complexes)) {
      const lines = xyz.split("\n");
      const n = Number(lines[0]);
      const atoms = lines.slice(2, 2 + n).map((l) => l.trim().split(/\s+/));
      const structure = fromXYZ(xyz);
      assert.deepEqual(structure.sites.map((site) => site.species.symbol), atoms.map((a) => a[0]), name);
      // the file's positions: Cartesian, plus the box shift
      const { origin } = structure.moleculeBox;
      structure.sites.forEach((site, i) =>
        cartesian(structure.lattice, site).forEach((v, k) =>
          assert.ok(Math.abs(v + origin[k] - Number(atoms[i][k + 1])) < 1e-9, `${name} atom ${i}`),
        ),
      );
      count++;
    }
  }
  assert.equal(count, rows.length);
});
