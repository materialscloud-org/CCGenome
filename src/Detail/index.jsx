// The page of one complex (detail/): its 3D structure and its properties,
// each downloadable.
import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo } from "react";

import { fetchComplex, propertiesJson } from "../ccgenome/data";
import { fromXYZ } from "matsci-parse";
import MoleculeViewer from "./MoleculeViewer";

function download(text, filename) {
  const link = document.createElement("a");
  link.href = URL.createObjectURL(new Blob([text], { type: "text/plain;charset=utf-8" }));
  link.download = filename;
  link.click();
  URL.revokeObjectURL(link.href);
}

const button =
  "rounded bg-[#337ab7] px-3 py-1.5 text-sm font-medium text-white hover:bg-[#286090] disabled:opacity-50";

export default function DetailPage({ name }) {
  // undefined: loading, null: no such complex
  const { data: entry, error } = useQuery({ queryKey: ["complex", name], queryFn: () => fetchComplex(name) });
  // the molecule of the .xyz file (no cell drawn, as JSmol)
  const structure = useMemo(() => (entry ? fromXYZ(entry.xyz) : null), [entry]);

  useEffect(() => {
    document.title = `${name} - C-C Cross-Coupling Genome`;
  }, [name]);

  if (error) return <p className="text-red-700">{error.message}</p>;
  if (entry === undefined) return <p className="text-slate-500">Loading {name}…</p>;
  if (entry === null) return <p>No matching complex found for “{name}”.</p>;

  return (
    <div>
      <h2 className="mb-4 text-xl font-semibold text-slate-900">{name}</h2>
      <div className="grid gap-6 lg:grid-cols-2">
        <section className="min-w-0 space-y-2">
          <div className="h-[480px] w-full border border-slate-200">
            <MoleculeViewer structure={structure} />
          </div>
          <button type="button" className={button} onClick={() => download(entry.xyz, `${name}.xyz`)}>
            Download xyz
          </button>
        </section>
        <section className="min-w-0 space-y-2">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-300 text-left">
                <th className="py-1 pr-4 font-semibold">Properties</th>
                <th className="py-1 font-semibold">Values</th>
              </tr>
            </thead>
            <tbody>
              {entry.columns.map((column, i) => (
                <tr key={column} className="border-b border-slate-100">
                  <td className="py-1 pr-4">{column}</td>
                  <td className="py-1 font-mono">{entry.row[i]}</td>
                </tr>
              ))}
              <tr className="border-b border-slate-100">
                <td className="py-1 pr-4">filename</td>
                <td className="py-1 font-mono">{name}.xyz</td>
              </tr>
            </tbody>
          </table>
          <button
            type="button"
            className={button}
            onClick={() =>
              download(
                JSON.stringify({ ...propertiesJson(entry.columns, entry.row), filename: `${name}.xyz` }, null, 2),
                `${name}.json`,
              )
            }
          >
            Download json
          </button>
        </section>
      </div>
    </div>
  );
}
