// The figure choice (select-figure): one picture per metal, each opening the
// scatter plot with that metal's preset.
import InfoAccordions from "./AccordionContent";
import { Link } from "react-router-dom";

import { FIGURES } from "./appConfig";

export default function Landing() {
  return (
    <div className="mx-auto max-w-4xl text-center">
      {/* as the sibling apps: subtitle and accordions in a narrower column */}
      <div className="mx-auto mb-8 max-w-4xl space-y-3 px-6 pt-2 text-left sm:px-10">
        <p className="text-lg">Energy-based screening of catalysts for various cross-coupling reactions.</p>
        <InfoAccordions />
      </div>
      <p className="mb-6">
        Click on a figure for the <strong>interactive plot</strong>.
      </p>
      <div className="grid grid-cols-1 gap-8 xs:grid-cols-2 md:grid-cols-3">
        {FIGURES.map((fig) => (
          <figure key={fig.preset} className="m-0">
            <Link to={`?preset=${fig.preset}`} className="group relative block hover:no-underline">
              <img
                src={fig.image}
                alt={`Scatter plot of the ${fig.label}`}
                className="mx-auto w-full max-w-[250px] rounded px-0.5 pt-2.5 pb-0.5 shadow-md transition-opacity group-hover:opacity-30"
              />
              <span className="absolute inset-0 flex items-center justify-center text-xl font-bold text-[#1565C0] opacity-0 group-hover:opacity-100">
                {fig.label}
              </span>
            </Link>
            <figcaption className="p-1.5">{fig.label}</figcaption>
          </figure>
        ))}
      </div>
    </div>
  );
}
