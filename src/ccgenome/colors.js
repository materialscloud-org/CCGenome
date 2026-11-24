// Point colours and number formatting of the Bokeh scatter plot
// (figure/main.py create_plot / update_legends).

/**
 * Colour of the DeltaE ("Descriptor") points: Bokeh's LinearColorMapper over
 * the 222-colour palette of figure/main.py (written as runs of equal
 * colours), from -80 to 30 kcal/mol; values outside take the end colours.
 */
export const DELTAE_PALETTE = [
  ["#CCFFCC", 15],
  ["#80FF66", 25],
  ["#19FF19", 13],
  ["#009900", 44],
  ["#000000", 18],
  ["#B30000", 22],
  ["#FF1919", 7],
  ["#FF8080", 13],
  ["#FFCCCC", 9],
  ["#C0C0C0", 56],
];
export const DELTAE_RANGE = [-80, 30];

/** The palette as a stepped Plotly colorscale (bin k of n covers [k/n, (k+1)/n)). */
export function steppedColorscale(runs) {
  const n = runs.reduce((sum, [, count]) => sum + count, 0);
  const scale = [];
  let start = 0;
  for (const [colour, count] of runs) {
    scale.push([start / n, colour], [(start + count) / n, colour]);
    start += count;
  }
  return scale;
}

/**
 * Plotly marker colour settings for a colour quantity: the DeltaE palette on
 * a fixed range, otherwise Viridis over the plotted values (Bokeh's
 * LinearColorMapper(Viridis256) without low/high).
 */
export function colourScale(clr) {
  if (clr === "DeltaE") {
    return { colorscale: steppedColorscale(DELTAE_PALETTE), cmin: DELTAE_RANGE[0], cmax: DELTAE_RANGE[1] };
  }
  return { colorscale: "Viridis", cauto: true };
}

/**
 * Bokeh's default format of a number in a tooltip ("@x"): integers as is,
 * 0.1 < |v| < 1000 with three decimals, otherwise "%0.3e".
 */
export function formatNumber(v) {
  if (typeof v !== "number") return String(v);
  if (Math.floor(v) === v) return String(v);
  const a = Math.abs(v);
  if (a > 0.1 && a < 1000) return v.toFixed(3);
  // printf's %e: at least two exponent digits
  return v.toExponential(3).replace(/e([+-])(\d)$/, "e$10$2");
}
