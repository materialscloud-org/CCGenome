import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { parse } from "yaml";

// matsci-parse (via mc-react-library) imports moyo-wasm for symmetry, and Vite
// emits moyo's .wasm when it loads the module, even though tree-shaking drops
// all of moyo's code. Drop .wasm files that no chunk refers to.
function dropUnreferencedWasm() {
  return {
    name: "drop-unreferenced-wasm",
    apply: "build",
    generateBundle(_, bundle) {
      const code = Object.values(bundle)
        .filter((file) => file.type === "chunk")
        .map((chunk) => chunk.code)
        .join("\n");
      for (const [name, file] of Object.entries(bundle)) {
        if (file.type === "asset" && name.endsWith(".wasm") && !code.includes(name.split("/").pop())) {
          delete bundle[name];
        }
      }
    },
  };
}

// The plot configuration stays in YAML (src/config/*.yml, as in the Bokeh
// app); importing a .yml file gives its content, converted at build time.
function yamlAsJson() {
  return {
    name: "yaml-as-json",
    transform(code, id) {
      if (!id.split("?")[0].endsWith(".yml")) return null;
      return { code: `export default ${JSON.stringify(parse(code))};`, map: null };
    },
  };
}

const DATA = path.join(path.dirname(fileURLToPath(import.meta.url)), "data");

/** data/ (scripts/prepareForFrontend.py) at <base>data/: served in dev, copied on build */
function publishData() {
  let base = "/";
  return {
    name: "publish-data",
    configResolved(config) {
      base = config.base;
    },
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const url = decodeURIComponent((req.url ?? "").split("?")[0]);
        if (!url.startsWith(`${base}data/`)) return next();
        const file = path.join(DATA, url.slice(base.length + "data/".length));
        if (!file.startsWith(DATA + path.sep) || !fs.existsSync(file) || !fs.statSync(file).isFile()) return next();
        res.setHeader("Content-Type", "application/json");
        fs.createReadStream(file).pipe(res);
      });
    },
    writeBundle(options) {
      fs.cpSync(DATA, path.join(options.dir, "data"), { recursive: true });
    },
  };
}

export default defineConfig({
  plugins: [react(), tailwindcss(), dropUnreferencedWasm(), yamlAsJson(), publishData()],
  // the data and the legacy app are not sources: don't watch their files
  server: { watch: { ignored: ["**/data/**", "**/raw/**"] } },
  optimizeDeps: {
    include: ["mc-react-header"],
    // Required to run wasm modules in dev mode for vite.
    exclude: ["@spglib/moyo-wasm"],
  },
});
