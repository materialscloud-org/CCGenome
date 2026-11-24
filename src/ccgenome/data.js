// The data the app downloads (data/, written by scripts/prepareForFrontend.py).

import { queryClient } from "../queryClient.js";

/** File of data/structures/ holding a complex: Pd_0.10 -> Pd_0. */
export function shardOf(name) {
  return name.split(".")[0];
}

/** a JSON file of data/, fetched once (cached by TanStack Query); null if there is none */
export const fetchData = (path) =>
  queryClient.ensureQueryData({
    queryKey: ["data", path],
    queryFn: async () => {
      const res = await fetch(`${import.meta.env.BASE_URL}data/${path}`);
      // a static host may answer an unknown path with the app's index.html
      if (res.status === 404 || !res.headers.get("content-type")?.includes("json")) return null;
      if (!res.ok) throw new Error(`Could not download ${path} (HTTP ${res.status})`);
      return res.json();
    },
  });

/**
 * One complex: { columns: CSV header, row: CSV fields, xyz: text }, or null
 * if there is no complex of that name.
 */
export async function fetchComplex(name) {
  const shard = shardOf(name);
  // Names are <metal>_<n>.<m>; anything else cannot be in a file
  if (!/^[A-Za-z]+_\d+$/.test(shard)) return null;
  const file = await fetchData(`structures/${shard}.json`);
  const entry = file?.complexes[name];
  return entry ? { columns: file.columns, ...entry } : null;
}

/**
 * The properties of a complex as a JSON object (the "Download json" file):
 * CSV header -> value, numbers as numbers, other fields (e.g. "NAN") as text.
 */
export function propertiesJson(columns, row) {
  return Object.fromEntries(
    columns.map((c, i) => {
      const v = row[i];
      const x = Number(v);
      return [c, v.trim() !== "" && Number.isFinite(x) ? x : v];
    }),
  );
}
