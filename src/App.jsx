import "./index.css";
import MaterialsCloudHeader from "mc-react-header";
import { McAppHeader } from "mc-react-library";
import { lazy, Suspense } from "react";
import { useSearchParams } from "react-router-dom";

import { BASE, FIGURES, TITLE } from "./appConfig";
import BackButton from "./BackButton";
import Landing from "./Landing";

// The pages of the Bokeh app, chosen by the query string (react-router: moving
// between them keeps the app and its loaded data, no page reload):
//   ?preset=<label>  scatter plot   (was /figure?preset=<label>)
//   ?name=<complex>  one complex    (was /detail?name=<complex>)
//   (none)           figure choice  (was /select-figure)
const FigurePage = lazy(() => import("./Figure"));
const DetailPage = lazy(() => import("./Detail"));

function route(params) {
  if (params.get("name")) return { page: "detail", name: params.get("name") };
  if (params.has("preset")) return { page: "figure", preset: params.get("preset") };
  return { page: "landing" };
}

function App() {
  const [params] = useSearchParams();
  const r = route(params);
  const figure = FIGURES.find((f) => f.preset === r.preset);
  const crumb =
    r.page === "detail" ? r.name : r.page === "figure" ? (figure?.label ?? "Scatter plot") : null;

  return (
    <>
      <MaterialsCloudHeader
        activeSection="discover"
        breadcrumbsPath={[
          { name: "Discover", link: "https://www.materialscloud.org/discover" },
          { name: TITLE, link: crumb ? BASE : null },
          ...(crumb ? [{ name: crumb, link: null }] : []),
        ]}
      />

      <main className="min-h-screen bg-[aliceblue] pb-10">
        <div className="mx-auto max-w-7xl px-4">
          <div className="overflow-hidden bg-white shadow-sm p-4">
            <McAppHeader title={TITLE} logo={`${BASE}ccg.png`} logoAlt="C-C Cross-Coupling Genome logo" />
            <div className="mx-auto max-w-6xl py-4">
              {r.page !== "landing" && (
                <div className="mb-3">
                  <BackButton />
                </div>
              )}
              <Suspense fallback={<p className="text-slate-500">Loading…</p>}>
                {r.page === "landing" && <Landing />}
                {r.page === "figure" && <FigurePage preset={r.preset} />}
                {r.page === "detail" && <DetailPage name={r.name} />}
              </Suspense>
            </div>
          </div>
        </div>
      </main>
    </>
  );
}

export default App;
