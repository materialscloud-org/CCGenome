# C-C Cross-Coupling Genome (CCGenome)

Energy-based screening of 25,112 catalysts (Pd, Pt, Cu, Ni, Au and Ag
complexes) for various cross-coupling reactions: a scatter plot of the
complexes, which can be coloured and filtered by metal, reaction and
descriptor (ΔE), and a page per complex with its 3D structure and properties.
Data: [doi:10.24435/materialscloud:2019.0007/v3](https://doi.org/10.24435/materialscloud:2019.0007/v3).

A static single-page app, the port of the Bokeh "CCGenome" section of
Materials Cloud (the old app is commit [`81f54b9`](https://github.com/materialscloud-org/CCGenome/tree/81f54b9) of this
repository; data decisions are documented in `scripts/prepareForFrontend.py`).

## Development

This app was migrated to a single page app, with the intention of providing users a serverless way to explore this data.

The legacy software, with tools to containerize it (which may be out of date), is commit [`81f54b9`](https://github.com/materialscloud-org/CCGenome/tree/81f54b9) of this repository.

If you would like to launch the Single Page App locally:

```bash
pnpm install
python3 scripts/prepareForFrontend.py # a few seconds; data/ is in git (only when the data changes)
pnpm dev        # http://localhost:5173 (needs data/)
pnpm test       # node --test tests/*.test.mjs
pnpm lint
pnpm build      # static site in dist/ (copies data/: 40 MB)
```

The data is built from `raw/all_complexes.csv` and `raw/structures.tar.gz`,
the files of the old app's repository (kept in git, as the archive record holds
other versions of them). `python3 scripts/build_fixtures.py` (needs PyYAML)
rebuilds the test fixtures from the old app's SQL on `raw/database.db`.

## Deployment

The app is currently deployed by hand to Cloudflare Pages with wrangler with no CI/CD, so changes have to be pushed to materialscloud cloudflare. Its data (`data/`, 40 MB) is small and kept in git, like the code; the sibling apps' larger data is too large for git and comes from the Materials Cloud Archive.

```bash
pnpm build
npx wrangler pages deploy dist --project-name ccgenome
```
