// The scatter plot (WebGL): one point per complex, coloured by a quantity;
// hovering shows its values, clicking opens its page.
import Plotly from "plotly.js-gl2d-dist-min";
import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";

import { colourScale, formatNumber } from "../ccgenome/colors";
import { quantityLabel } from "../ccgenome/config";

function hoverLine(q, v) {
  const unit = q.unit?.trim();
  return `${q.label}: ${formatNumber(v)}${unit ? ` ${unit}` : ""}`;
}

export default function ScatterPlot({ config, table, rows, x, y, clr }) {
  const div = useRef(null);
  const names = useRef([]);
  const navigate = useNavigate();

  useEffect(() => {
    const qx = config.quantities[x];
    const qy = config.quantities[y];
    const qc = config.quantities[clr];
    const pick = (key) => rows.map((i) => table[key][i]);
    const [xs, ys, cs] = [pick(x), pick(y), pick(clr)];
    names.current = pick("name");
    const text = rows.map(
      (_, k) =>
        `name: ${names.current[k]}<br>${hoverLine(qx, xs[k])}<br>${hoverLine(qy, ys[k])}<br>${hoverLine(qc, cs[k])}`,
    );
    const trace = {
      type: "scattergl",
      mode: "markers",
      x: xs,
      y: ys,
      text,
      hovertemplate: "%{text}<extra></extra>",
      marker: {
        size: 10,
        color: cs,
        ...colourScale(clr),
        showscale: true,
        colorbar: { title: { text: quantityLabel(qc), side: "right" } },
      },
    };
    const layout = {
      height: 600,
      margin: { l: 50, r: 20, t: 20, b: 40 },
      hovermode: "closest",
      dragmode: "zoom",
      xaxis: { zeroline: false },
      yaxis: { zeroline: false },
    };
    const plotConfig = {
      responsive: true,
      scrollZoom: true,
      displaylogo: false,
      modeBarButtonsToRemove: ["select2d", "lasso2d", "autoScale2d"],
      toImageButtonOptions: { filename: "ccgenome" },
    };
    const el = div.current;
    Plotly.react(el, [trace], layout, plotConfig).then(() => {
      el.removeAllListeners?.("plotly_click");
      el.on("plotly_click", (event) => {
        const point = event.points?.[0];
        if (point) navigate(`?name=${encodeURIComponent(names.current[point.pointIndex])}`);
      });
    });
  }, [config, table, rows, x, y, clr, navigate]);

  useEffect(() => {
    const el = div.current;
    return () => Plotly.purge(el);
  }, []);

  return <div ref={div} className="w-full" />;
}
