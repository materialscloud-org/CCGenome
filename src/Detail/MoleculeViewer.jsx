// A small Three.js view of a molecule: atoms, bonds, optional labels,
// per-atom arrows (e.g. normal-mode displacements), free arrows with labels
// (e.g. lab axes) and an initial rotation. No cell is drawn.
//
// TODO: unify. Adapted from alpha-ml's MoleculeViewer
// (apps/contributed/modern/alpha-ml/frontend/src/AlphaML/MoleculeViewer.jsx);
// the same file is copied into CCGenome, molecular_data_explorer and
// molecular-vibration-explorer. It should become one component in
// mc-react-library (with alpha-ml's polarizability ellipsoids as an option).

import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { TrackballControls } from "three/examples/jsm/controls/TrackballControls.js";
import { CSS2DObject, CSS2DRenderer } from "three/examples/jsm/renderers/CSS2DRenderer.js";
import { cartesian, covalentRadii } from "matsci-parse";

// Jmol colours of common elements; anything else is pink
const COLORS = {
  H: 0xffffff, He: 0xd9ffff, Li: 0xcc80ff, B: 0xffb5b5, C: 0x909090, N: 0x3050f8,
  O: 0xff0d0d, F: 0x90e050, Na: 0xab5cf2, Mg: 0x8aff00, Al: 0xbfa6a6, Si: 0xf0c8a0,
  P: 0xff8000, S: 0xffff30, Cl: 0x1ff01f, K: 0x8f40d4, Ca: 0x3dff00, Ti: 0xbfc2c7,
  Cr: 0x8a99c7, Mn: 0x9c7ac7, Fe: 0xe06633, Co: 0xf090a0, Ni: 0x50d050, Cu: 0xc88033,
  Zn: 0x7d80b0, Ge: 0x668f8f, As: 0xbd80e3, Se: 0xffa100, Br: 0xa62929, Ru: 0x248f8f,
  Rh: 0x0a7d8c, Pd: 0x006985, Ag: 0xc0c0c0, Sn: 0x668080, I: 0x940094, Ir: 0x175487,
  Pt: 0xd0d0e0, Au: 0xffd123, Hg: 0xb8b8d0, Pb: 0x575961,
};
const DEFAULT_COLOR = 0xff1493;
const BOND_FACTOR = 1.1; // bonded below 1.1 (r_i + r_j), as alpha-ml
const radius = (symbol) => covalentRadii[symbol] ?? 0.7;

/** Bonds by distance: pairs [i, j] (i < j) closer than 1.1 (r_i + r_j). */
function bondsByDistance(symbols, positions) {
  const bonds = [];
  for (let i = 0; i < positions.length; i++) {
    for (let j = i + 1; j < positions.length; j++) {
      const d = Math.hypot(...positions[i].map((x, k) => x - positions[j][k]));
      if (d <= BOND_FACTOR * (radius(symbols[i]) + radius(symbols[j]))) bonds.push([i, j]);
    }
  }
  return bonds;
}

function atomLabel(text, position, size) {
  const div = document.createElement("div");
  div.textContent = text;
  div.className = "rounded bg-white/80 px-1 text-[11px] font-medium leading-tight text-slate-800";
  const label = new CSS2DObject(div);
  label.position.copy(position).add(new THREE.Vector3(size, size, 0));
  return label;
}

/** The scene objects, centred on the molecule, and its radius. */
function buildMolecule({ symbols, positions: cartesian }, bonds) {
  const group = new THREE.Group();
  const labels = [];
  const positions = cartesian.map((p) => new THREE.Vector3(...p));
  const center = positions.reduce((c, p) => c.add(p), new THREE.Vector3()).divideScalar(positions.length || 1);
  positions.forEach((p) => p.sub(center));
  const extent = Math.max(...positions.map((p) => p.length()), 1);

  const sphere = new THREE.SphereGeometry(1, 32, 16);
  positions.forEach((p, i) => {
    const atom = new THREE.Mesh(
      sphere,
      new THREE.MeshStandardMaterial({ color: COLORS[symbols[i]] ?? DEFAULT_COLOR, roughness: 0.5 }),
    );
    const size = 0.25 * radius(symbols[i]) + 0.1;
    atom.scale.setScalar(size);
    atom.position.copy(p);
    group.add(atom);
    labels.push(atomLabel(`${symbols[i]}${i + 1}`, p, size));
  });

  const cylinder = new THREE.CylinderGeometry(0.08, 0.08, 1, 12);
  const bondMaterial = new THREE.MeshStandardMaterial({ color: 0x999999 });
  for (const [i, j] of bonds ?? bondsByDistance(symbols, cartesian)) {
    const d = positions[i].distanceTo(positions[j]);
    const bond = new THREE.Mesh(cylinder, bondMaterial);
    bond.scale.set(1, d, 1);
    bond.position.copy(positions[i]).add(positions[j]).multiplyScalar(0.5);
    bond.quaternion.setFromUnitVectors(
      new THREE.Vector3(0, 1, 0),
      positions[j].clone().sub(positions[i]).normalize(),
    );
    group.add(bond);
  }

  group.add(...labels);
  return { group, center, extent, labels };
}

const ARROW_RADIUS = 0.1;
const UP = new THREE.Vector3(0, 1, 0);

/** An arrow from `start` to `end` (Vector3s): shaft and cone, as 3Dmol's addArrow. */
function arrowMesh(start, end, color) {
  const v = end.clone().sub(start);
  const length = v.length();
  const material = new THREE.MeshStandardMaterial({ color });
  const arrow = new THREE.Group();
  const shaft = new THREE.Mesh(new THREE.CylinderGeometry(ARROW_RADIUS, ARROW_RADIUS, 0.618 * length, 12), material);
  shaft.position.y = 0.309 * length;
  const head = new THREE.Mesh(new THREE.ConeGeometry(1.618 * ARROW_RADIUS, 0.382 * length, 16), material);
  head.position.y = 0.809 * length;
  arrow.add(shaft, head);
  arrow.position.copy(start);
  arrow.quaternion.setFromUnitVectors(UP, v.normalize());
  return arrow;
}

/** The arrows (per atom and free), in the molecule's frame shifted by -center. */
function buildArrows(atoms, center, { arrows, arrowScale, arrowColor, centeredArrows, extraArrows }) {
  const group = new THREE.Group();
  arrows?.forEach((vector, i) => {
    const v = new THREE.Vector3(...vector).multiplyScalar(arrowScale);
    if (!(v.length() > 1e-6)) return;
    const p = new THREE.Vector3(...atoms.positions[i]).sub(center);
    group.add(arrowMesh(centeredArrows ? p.clone().sub(v) : p, p.clone().add(v), arrowColor));
  });
  for (const { start, end, color = arrowColor, label, labelPosition } of extraArrows ?? []) {
    const from = new THREE.Vector3(...start).sub(center);
    const to = new THREE.Vector3(...end).sub(center);
    if (from.distanceTo(to) > 1e-6) group.add(arrowMesh(from, to, color));
    if (label) {
      const div = document.createElement("div");
      div.textContent = label;
      Object.assign(div.style, { color: new THREE.Color(color).getStyle(), fontSize: "14px" });
      const text = new CSS2DObject(div);
      text.position.copy(labelPosition ? new THREE.Vector3(...labelPosition).sub(center) : to);
      group.add(text);
    }
  }
  return group;
}

const AXES = { x: new THREE.Vector3(1, 0, 0), y: new THREE.Vector3(0, 1, 0), z: new THREE.Vector3(0, 0, 1) };

/** The model turned by [axis, degrees] in turn, about its own axes (as 3Dmol's rotate). */
function rotation(rotations) {
  const q = new THREE.Quaternion();
  for (const [axis, degrees] of rotations ?? []) {
    q.multiply(new THREE.Quaternion().setFromAxisAngle(AXES[axis], (degrees * Math.PI) / 180));
  }
  return q;
}

/** Dispose of the meshes and remove the labels of a scene graph. */
function dispose(object) {
  object.traverse((o) => {
    o.geometry?.dispose();
    o.material?.dispose();
    o.element?.remove();
  });
}

/**
 * The molecule: a matsci-parse `structure` (e.g. from fromXYZ; its cell is
 * not drawn), or `atoms` ({ symbols, positions }, Cartesian Å). `bonds`: pairs
 * [i, j] (default: by distance, as alpha-ml); `arrows`: a vector per atom,
 * drawn times `arrowScale` from the atom, or through it (from p - v to p + v)
 * with `centeredArrows` (e.g. normal-mode displacements); `extraArrows`:
 * [{ start, end, color, label, labelPosition }] in the atoms' frame (e.g. lab
 * axes; the label, in the arrow's colour, at labelPosition or the end);
 * `rotations`: [[axis "x" | "y" | "z", degrees], ...] turning the model for
 * the initial view. Arrows and extraArrows change without resetting the
 * camera; `showLabels` switches the atom labels without rebuilding the view.
 */
export default function MoleculeViewer({
  structure,
  atoms: atomsProp,
  bonds,
  arrows,
  arrowScale = 1,
  arrowColor = 0x2563eb,
  centeredArrows = false,
  extraArrows,
  rotations,
  showLabels = false,
  className = "",
}) {
  const atoms = useMemo(
    () =>
      structure
        ? {
            symbols: structure.sites.map((site) => site.species.symbol),
            positions: structure.sites.map((site) => Array.from(cartesian(structure.lattice, site))),
          }
        : atomsProp,
    [structure, atomsProp],
  );
  const container = useRef(null);
  // Interaction guard: the viewer takes the mouse (and the wheel) once
  // clicked, until the mouse leaves it (a touch: until a tap outside)
  const [active, setActive] = useState(false);
  useEffect(() => {
    if (!active) return;
    const outside = (event) => {
      if (!container.current?.contains(event.target)) setActive(false);
    };
    document.addEventListener("pointerdown", outside);
    return () => document.removeEventListener("pointerdown", outside);
  }, [active]);
  const labelsRef = useRef(null);
  const showLabelsRef = useRef(showLabels);
  showLabelsRef.current = showLabels;
  const applyLabels = () => labelsRef.current?.forEach((label) => (label.visible = showLabelsRef.current));
  useEffect(applyLabels, [showLabels]);
  // the molecule's group and centre, for the arrows
  const model = useRef(null);

  useEffect(() => {
    const element = container.current;
    if (!atoms?.symbols?.length) return undefined;
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setClearColor(0xffffff, 1);
    element.appendChild(renderer.domElement);
    const labelRenderer = new CSS2DRenderer();
    Object.assign(labelRenderer.domElement.style, { position: "absolute", inset: "0", pointerEvents: "none" });
    element.appendChild(labelRenderer.domElement);

    const scene = new THREE.Scene();
    scene.add(new THREE.AmbientLight(0xffffff, 1.2));
    const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 1000);
    camera.add(new THREE.DirectionalLight(0xffffff, 1.8));
    scene.add(camera);

    const { group, center, extent, labels } = buildMolecule(atoms, bonds);
    group.quaternion.copy(rotation(rotations));
    scene.add(group);
    model.current = { group, center };
    labelsRef.current = labels;
    applyLabels();
    camera.position.set(0, 0, 3.2 * extent + 4);

    // Trackball: rotates freely, also over the poles
    const controls = new TrackballControls(camera, renderer.domElement);
    controls.rotateSpeed = 3;
    controls.zoomSpeed = 1.2;
    controls.panSpeed = 0.6;

    const resize = () => {
      const { clientWidth: w, clientHeight: h } = element;
      renderer.setSize(w, h);
      labelRenderer.setSize(w, h);
      camera.aspect = w / Math.max(h, 1);
      camera.updateProjectionMatrix();
      controls.handleResize();
    };
    const observer = new ResizeObserver(resize);
    observer.observe(element);
    resize();

    let frame;
    const animate = () => {
      frame = requestAnimationFrame(animate);
      controls.update();
      renderer.render(scene, camera);
      labelRenderer.render(scene, camera);
    };
    animate();

    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      controls.dispose();
      dispose(scene);
      renderer.dispose();
      renderer.forceContextLoss(); // dispose() keeps the WebGL context; browsers allow ~16
      element.removeChild(renderer.domElement);
      element.removeChild(labelRenderer.domElement);
      labelsRef.current = null;
      model.current = null;
    };
    // Labels are switched by applyLabels, without a rebuild; rotations: initial view only
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [atoms, bonds]);

  // The arrows, in the molecule's group, replaced without touching the camera
  // (atoms, bonds: a new molecule's group needs them again)
  useEffect(() => {
    if (!model.current) return undefined;
    const { group, center } = model.current;
    const overlay = buildArrows(atoms, center, { arrows, arrowScale, arrowColor, centeredArrows, extraArrows });
    group.add(overlay);
    return () => {
      group.remove(overlay);
      dispose(overlay);
    };
  }, [atoms, bonds, arrows, arrowScale, arrowColor, centeredArrows, extraArrows]);

  return (
    <div
      ref={container}
      role="img"
      aria-label="3D view of the molecule"
      className={`relative h-full w-full overflow-hidden ${className}`}
      onPointerLeave={(e) => e.pointerType === "mouse" && setActive(false)}
    >
      {!active && (
        <div
          className="group absolute inset-0 z-[5] flex cursor-pointer items-center justify-center"
          onClick={() => setActive(true)}
        >
          <span className="rounded bg-white/80 px-3 py-1 text-sm text-slate-600 opacity-0 transition-opacity group-hover:opacity-100">
            Click to interact
          </span>
        </div>
      )}
    </div>
  );
}
