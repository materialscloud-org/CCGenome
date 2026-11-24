import { test } from "node:test";
import assert from "node:assert/strict";

import { formatNumber, steppedColorscale } from "../src/ccgenome/colors.js";

test("tooltip numbers as Bokeh's default format", () => {
  assert.equal(formatNumber(-25.86), "-25.860");
  assert.equal(formatNumber(3), "3");
  assert.equal(formatNumber(0.05), "5.000e-02");
  assert.equal(formatNumber(-1571.363), "-1.571e+03");
});

test("stepped colorscale", () => {
  assert.deepEqual(steppedColorscale([["#000", 1], ["#fff", 3]]), [
    [0, "#000"],
    [0.25, "#000"],
    [0.25, "#fff"],
    [1, "#fff"],
  ]);
});
