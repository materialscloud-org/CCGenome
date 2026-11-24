// The information accordions of the landing page.
import { DoiBadge, McInfoAccordions } from "mc-react-library";

const ARCHIVE = "https://doi.org/10.24435/materialscloud:2019.0007/v3";

function AboutContent() {
  return (
    <div className="space-y-2">
      <p>
        We present sketch-maps for 25,112 catalysts, categorized by metal type.
        Each catalyst’s name is expressed in the form "metal_L<sub>1</sub>_L
        <sub>2</sub>" and is colored by the value of its energy-based descriptor
        (i.e., substrate binding energy) for different cross-coupling reactions.
        The color code corresponds to the volcano plateau of the different
        reactions, where black represents the plateau region for Suzuki
        coupling. Green and red shades (see color bar) indicate catalysts with
        ideal thermodynamics (i.e., species that fall off the plateau) for other
        cross-coupling reactions (i.e., Kumada, Negishi, Stille, and Hiyama).
        Catalysts depicted in gray are not ideal for any of the coupling
        reactions studied.
      </p>
      <p>
        The chemical structures of the 91 ligands are available in the{" "}
        <a href={ARCHIVE} target="_blank" rel="noopener noreferrer">
          archive record
        </a>
        .
      </p>
    </div>
  );
}

function HowToCiteContent() {
  return (
    <p>
      Please find the appropriate journal reference in{" "}
      <span className="inline-block align-middle">
        <DoiBadge doi_id="2019.0007/v3" label="Data DOI" />
      </span>
      .
    </p>
  );
}

const ACCORDIONS = [
  { title: "About", content: <AboutContent /> },
  { title: "How to cite", content: <HowToCiteContent /> },
];

/** The information accordions, one open at a time. */
export default function InfoAccordions() {
  return <McInfoAccordions items={ACCORDIONS} />;
}
