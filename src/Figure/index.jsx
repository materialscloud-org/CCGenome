// The scatter plot page (figure/): settings from the preset in the URL, the
// controls, and the plot of the complexes passing the filters.
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";

import { CONFIG } from "../appConfig";
import { fetchData } from "../ccgenome/data";
import { duplicateWarning, filterRows, presetSettings } from "../ccgenome/filter";
import Controls from "./Controls";
import ScatterPlot from "./ScatterPlot";

export default function FigurePage({ preset }) {
  const [settings, setSettings] = useState(() => presetSettings(CONFIG, preset));
  // the plot table: { name, X, Y, DeltaE, Reaction, bond_type }, one array per column
  const { data: table, error } = useQuery({
    queryKey: ["table"],
    queryFn: async () => (await fetchData("table.json")) ?? Promise.reject(new Error("Could not download the table")),
  });

  const rows = useMemo(() => (table ? filterRows(table, CONFIG, settings.filters) : []), [table, settings.filters]);
  const warning = duplicateWarning(CONFIG, settings.x, settings.y, settings.clr);

  return (
    <div className="flex flex-col gap-6 md:flex-row">
      <div className="w-full shrink-0 space-y-4 md:w-64">
        <Controls config={CONFIG} settings={settings} onChange={setSettings} />
        <div className="text-sm whitespace-pre-line" role="status">
          {error
            ? error.message
            : !table
              ? "Loading the complexes…"
              : rows.length === 0
                ? "No matching complexes found."
                : `${rows.length} complexes found.`}
          {warning && <p className="mt-1 font-medium text-red-700">{warning}</p>}
        </div>
      </div>
      <div className="min-w-0 flex-1">
        <p className="mb-2 text-sm text-slate-600">Click on a point for details.</p>
        {table && (
          <ScatterPlot
            config={CONFIG}
            table={table}
            rows={rows}
            x={settings.x}
            y={settings.y}
            clr={settings.clr}
          />
        )}
      </div>
    </div>
  );
}
