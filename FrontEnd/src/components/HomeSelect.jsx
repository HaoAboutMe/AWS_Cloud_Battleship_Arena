import { useState, useRef, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import "./HomeSelect.css";

/**
 * HomeSelect – Custom styled dropdown for the Home page.
 * Uses a React Portal so the panel escapes overflow:hidden containers.
 *
 * Props:
 *   options  : [{ value, label }]
 *   value    : current value
 *   onChange : (value) => void
 *   id       : optional id
 */
export default function HomeSelect({ options = [], value, onChange, id }) {
  const [open, setOpen] = useState(false);
  const [panelStyle, setPanelStyle] = useState({});
  const triggerRef = useRef(null);

  const selected = options.find((o) => o.value === value) || options[0];

  /* Calculate panel position from trigger rect */
  const updatePosition = useCallback(() => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const spaceBelow = window.innerHeight - rect.bottom - 16;
    setPanelStyle({
      position: "fixed",
      top: rect.bottom,
      left: rect.left,
      width: rect.width,
      zIndex: 9999,
      maxHeight: spaceBelow > 100 ? spaceBelow : 220, // Đảm bảo không quá nhỏ
    });
  }, []);

  /* Open/close */
  const toggle = () => {
    if (!open) updatePosition();
    setOpen((v) => !v);
  };

  /* Reposition on scroll/resize while open */
  useEffect(() => {
    if (!open) return;
    const handler = () => updatePosition();
    window.addEventListener("scroll", handler, true);
    window.addEventListener("resize", handler);
    return () => {
      window.removeEventListener("scroll", handler, true);
      window.removeEventListener("resize", handler);
    };
  }, [open, updatePosition]);

  /* Close on outside click */
  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (
        triggerRef.current && !triggerRef.current.contains(e.target) &&
        !document.getElementById("hs-portal-panel")?.contains(e.target)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  /* Close on Escape */
  useEffect(() => {
    const handler = (e) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, []);

  const handleSelect = (optVal) => {
    onChange(optVal);
    setOpen(false);
  };

  /* Portal panel */
  const panel = open
    ? createPortal(
        <div id="hs-portal-panel" className="hs-portal-panel" style={panelStyle}>
          <div className="hs-panel-inner">
            {options.map((opt) => (
              <button
                key={opt.value}
                type="button"
                role="option"
                aria-selected={opt.value === value}
                className={`hs-option${opt.value === value ? " hs-option-selected" : ""}`}
                onMouseDown={(e) => e.preventDefault()} // prevent blur before click
                onClick={() => handleSelect(opt.value)}
              >
                <span className="hs-option-check" aria-hidden="true">
                  {opt.value === value && (
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
                      stroke="currentColor" strokeWidth="3"
                      strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  )}
                </span>
                <span className="hs-option-label">{opt.label}</span>
              </button>
            ))}
          </div>
        </div>,
        document.body
      )
    : null;

  return (
    <>
      {/* Trigger – stays inside the card */}
      <div
        className={`hs-root${open ? " hs-open" : ""}`}
        id={id}
        ref={triggerRef}
      >
        <button
          type="button"
          className="hs-trigger"
          aria-haspopup="listbox"
          aria-expanded={open}
          onClick={toggle}
        >
          <span className="hs-trigger-label">{selected?.label}</span>
          <span className="hs-chevron" aria-hidden="true">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="2.5"
              strokeLinecap="round" strokeLinejoin="round">
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </span>
        </button>
      </div>

      {/* Portal panel – rendered at body level to escape overflow:hidden */}
      {panel}
    </>
  );
}
