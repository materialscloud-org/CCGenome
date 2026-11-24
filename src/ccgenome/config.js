// The plot configuration, as figure/config.py read it from the YAML files
// (src/config/: columns.yml, filters.yml, presets.yml).

/**
 * columnList: columns.yml, filterList: filters.yml, presets: presets.yml
 * (parsed). Returns { quantities, plotQuantities, filterList, presets }.
 */
export function buildConfig(columnList, filterList, presets) {
  const quantities = Object.fromEntries(columnList.map((q) => [q.column, q]));
  // Quantities that can go on the axes and the colour: the float columns
  const plotQuantities = columnList.filter((q) => q.type === "float").map((q) => q.column);
  // A preset without colour gets the colour of the Pd preset
  const withColour = Object.fromEntries(
    Object.entries(presets).map(([label, p]) => [label, { clr: presets.Pd.clr, ...p }]),
  );
  return { quantities, plotQuantities, filterList, presets: withColour };
}

/** "Label [unit]", or "Label" when the unit is blank. */
export function quantityLabel(q) {
  return q.unit && q.unit.trim() ? `${q.label} [${q.unit.trim()}]` : q.label;
}
