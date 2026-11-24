// Shared loaders of the tests (Node).
import { readFileSync } from "node:fs";
import { gunzipSync } from "node:zlib";
import { parse } from "yaml";

import { buildConfig } from "../src/ccgenome/config.js";

export const root = new URL("../", import.meta.url);

export const readGzJson = (path) => JSON.parse(gunzipSync(readFileSync(new URL(path, root))).toString("utf8"));

const readYaml = (name) => parse(readFileSync(new URL(`src/config/${name}`, root), "utf8"));

export const config = buildConfig(readYaml("columns.yml"), readYaml("filters.yml"), readYaml("presets.yml"));

export const readJson = (path) => JSON.parse(readFileSync(new URL(path, root), "utf8"));

export const table = () => readJson("data/table.json");
