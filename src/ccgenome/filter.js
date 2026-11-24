// Presets and filters of the scatter plot: figure/main.py (load_preset,
// check_uniqueness) and figure/query.py (get_data_sqla), on the table in
// memory instead of SQLite. Checked against the SQL query in
// tests/filters.test.mjs.

/**
 * The plot settings of a preset (?preset=<label>): { x, y, clr, filters },
 * filters = { column: [lo, hi] (range) or [values] (list) }. An unknown
 * label gives the Pd preset; filters the preset does not name are reset to
 * their full range / all values.
 */
export function presetSettings(config, label) {
  const preset = config.presets[label] ?? config.presets.Pd;
  const filters = {};
  for (const key of config.filterList) {
    const q = config.quantities[key];
    const value = preset[key] ?? (q.type === "float" ? q.range : q.values);
    filters[key] = [...value];
  }
  return { x: preset.x, y: preset.y, clr: preset.clr, filters };
}

/**
 * Whether a filter restricts the rows. As in query.py, a range filter at the
 * column's full range and a list filter with every value checked are not
 * applied at all (so rows outside a range's ends are then kept).
 */
export function isActive(q, value) {
  if (q.type === "float") return value[0] !== q.range[0] || value[1] !== q.range[1];
  return value.length !== q.values.length;
}

/**
 * Indices (in table order) of the rows passing every active filter.
 * table: { column: array } (see src/ccgenome/data.js).
 */
export function filterRows(table, config, filters) {
  const tests = [];
  for (const key of config.filterList) {
    const q = config.quantities[key];
    const value = filters[key];
    if (!isActive(q, value)) continue;
    const column = table[key];
    if (q.type === "float") {
      const [lo, hi] = value;
      tests.push((i) => column[i] >= lo && column[i] <= hi); // SQL BETWEEN
    } else {
      const allowed = new Set(value);
      tests.push((i) => allowed.has(column[i]));
    }
  }
  const n = table.name.length;
  const out = [];
  for (let i = 0; i < n; i++) {
    if (tests.every((test) => test(i))) out.push(i);
  }
  return out;
}

/**
 * The warning of check_uniqueness when a quantity is chosen twice among X,
 * Y and colour (the plot is still drawn), or "".
 */
export function duplicateWarning(config, x, y, clr) {
  const chosen = [x, y, clr];
  const doubled = [...new Set(chosen.filter((q, i) => chosen.indexOf(q) !== i))];
  if (doubled.length === 0) return "";
  return `Warning: ${doubled.map((q) => config.quantities[q].label).join(", ")} doubly selected.`;
}
