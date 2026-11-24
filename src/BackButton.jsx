// "Back" on the figure and complex pages: to the previous page of the app, or
// to the landing page when opened directly (no app history).
import { useLocation, useNavigate } from "react-router-dom";

/** Lucide "arrow-left" (ISC licence), inlined */
const ArrowLeft = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <path d="m12 19-7-7 7-7" />
    <path d="M19 12H5" />
  </svg>
);

export default function BackButton() {
  const navigate = useNavigate();
  const { key } = useLocation();
  return (
    <button
      type="button"
      onClick={() => (key === "default" ? navigate("/") : navigate(-1))}
      className="inline-flex items-center gap-1 rounded bg-[#0d6efd] px-3 py-1 text-sm text-white hover:bg-[#0b5ed7]"
    >
      <ArrowLeft />
      Back
    </button>
  );
}
