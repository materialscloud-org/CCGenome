// Presets and filters against the Bokeh app's SQL query
// (fixtures from scripts/build_fixtures.py).
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import { duplicateWarning, filterRows, presetSettings } from "../src/ccgenome/filter.js";
import { config, readGzJson, root, table as loadTable } from "./helpers.mjs";

const fixtures = readGzJson("tests/fixtures/filters.json.gz");
const table = loadTable();

function rowsOf(bitmask) {
  const bits = Buffer.from(bitmask, "base64");
  const out = [];
  for (let i = 0; i < fixtures.rows; i++) if (bits[i >> 3] & (1 << (i & 7))) out.push(i);
  return out;
}

test("every filter setting selects the rows of the SQL query on the CSV", () => {
  assert.equal(table.name.length, fixtures.rows);
  for (const c of fixtures.cases) {
    assert.deepEqual(filterRows(table, config, c.filters), rowsOf(c.csv.rows), c.label);
  }
});

test("presets give the filters of load_preset", () => {
  for (const c of fixtures.cases.filter((c) => c.label.startsWith("preset "))) {
    const label = c.label.slice("preset ".length);
    assert.deepEqual(presetSettings(config, label).filters, c.filters, c.label);
    assert.deepEqual(
      filterRows(table, config, presetSettings(config, label).filters),
      rowsOf(c.csv.rows),
      c.label,
    );
  }
  assert.deepEqual(presetSettings(config, "nonexistent"), presetSettings(config, "Pd"));
  assert.deepEqual(
    { ...presetSettings(config, "Ni"), filters: undefined },
    { x: "X", y: "Y", clr: "DeltaE", filters: undefined },
  );
});

// The deployed app's database.db differs from the CSV only in the Reaction
// column (see the docstring of scripts/prepareForFrontend.py): without a Reaction filter, the rows agree.
test("without a Reaction filter, the rows are those of the shipped database.db", () => {
  for (const c of fixtures.cases) {
    if (c.filters.Reaction.length !== config.quantities.Reaction.values.length) continue;
    assert.deepEqual(rowsOf(c.shipped.rows), rowsOf(c.csv.rows), c.label);
  }
});

test("duplicate warning", () => {
  assert.equal(duplicateWarning(config, "X", "Y", "DeltaE"), "");
  assert.equal(duplicateWarning(config, "X", "X", "DeltaE"), "Warning: X doubly selected.");
  assert.equal(duplicateWarning(config, "DeltaE", "DeltaE", "DeltaE"), "Warning: Descriptor doubly selected.");
});

test("the DeltaE palette is the one of the old figure/main.py", async () => {
  const { DELTAE_PALETTE } = await import("../src/ccgenome/colors.js");
  // the list of the old app's figure/main.py (commit 81f54b9), extracted once
  const python = JSON.parse(readFileSync(new URL("tests/fixtures/bokeh-deltae-palette.json", root), "utf8")).colors;
  assert.deepEqual(DELTAE_PALETTE.flatMap(([c, n]) => Array(n).fill(c)), python);
});
