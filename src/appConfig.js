// The plot configuration of the app (src/config/*.yml, converted to JSON at
// build time by the yaml-as-json plugin of vite.config.js).
import columns from "./config/columns.yml";
import filters from "./config/filters.yml";
import presets from "./config/presets.yml";
import { buildConfig } from "./ccgenome/config.js";

export const CONFIG = buildConfig(columns, filters, presets);

export const TITLE = "C-C Cross-Coupling Genome";

export const BASE = import.meta.env.BASE_URL;

/** The figures of the landing page (select-figure/main.py), in its order. */
export const FIGURES = ["Ni", "Pd", "Pt", "Cu", "Ag", "Au"].map((metal) => ({
  preset: metal,
  label: `${metal} complexes`,
  image: `${BASE}images/${metal}.png`,
}));
