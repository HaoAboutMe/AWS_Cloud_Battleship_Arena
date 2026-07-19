import { Suspense, lazy, useState, useCallback } from "react";
import "./RankDemo.css";

const RankUpAnimation = lazy(() => import("../components/RankUpAnimation"));

/* ── All rank-up transitions to showcase ─────────────────────────── */
const TRANSITIONS = [
  { id: "unranked-bronze",   from: null,       to: "bronze",   label: "Vô hạng  →  Đồng",     fromColor: "#888",      toColor: "#d4874a" },
  { id: "bronze-silver",     from: "bronze",   to: "silver",   label: "Đồng  →  Bạc",          fromColor: "#d4874a",   toColor: "#cfd8e3" },
  { id: "silver-gold",       from: "silver",   to: "gold",     label: "Bạc  →  Vàng",           fromColor: "#cfd8e3",   toColor: "#ffd84a" },
  { id: "gold-platinum",     from: "gold",     to: "platinum", label: "Vàng  →  Bạch Kim",      fromColor: "#ffd84a",   toColor: "#4fd1c5" },
  { id: "platinum-diamond",  from: "platinum", to: "diamond",  label: "Bạch Kim  →  Kim Cương", fromColor: "#4fd1c5",   toColor: "#7dd3fc" },
  { id: "diamond-master",    from: "diamond",  to: "master",   label: "Kim Cương  →  Cao Thủ",  fromColor: "#7dd3fc",   toColor: "#b57bff" },
  { id: "master-admiral",    from: "master",   to: "admiral",  label: "Cao Thủ  →  Đô Đốc",    fromColor: "#b57bff",   toColor: "#ff4d6d" },
];

export default function RankDemo() {
  const [active, setActive]     = useState(null); // { from, to }
  const [playing, setPlaying]   = useState(null); // transition id currently animating

  const handlePlay = useCallback((t) => {
    setActive({ from: t.from, to: t.to });
    setPlaying(t.id);
  }, []);

  const handleComplete = useCallback(() => {
    setActive(null);
    setPlaying(null);
  }, []);

  return (
    <div className="rd-page">
      {/* Header */}
      <div className="rd-header">
        <div className="rd-header-line" />
        <div className="rd-header-content">
          <span className="rd-header-icon material-symbols-outlined">military_tech</span>
          <div>
            <h1 className="rd-title">Rank Promotion Preview</h1>
            <p className="rd-subtitle">Chọn một chuyển rank để xem hiệu ứng cinematic</p>
          </div>
        </div>
        <div className="rd-header-line" />
      </div>

      {/* Grid of transition cards */}
      <div className="rd-grid">
        {TRANSITIONS.map((t) => (
          <button
            key={t.id}
            className={`rd-card${playing === t.id ? " rd-card-active" : ""}`}
            style={{ "--to-color": t.toColor, "--from-color": t.fromColor }}
            onClick={() => handlePlay(t)}
            disabled={!!active}
            aria-label={`Xem hiệu ứng: ${t.label}`}
          >
            {/* Rank badge dots */}
            <div className="rd-card-ranks">
              <span className="rd-rank-dot" style={{ background: t.fromColor, boxShadow: `0 0 10px ${t.fromColor}` }} />
              <span className="rd-arrow material-symbols-outlined">arrow_forward</span>
              <span className="rd-rank-dot rd-rank-dot-new" style={{ background: t.toColor, boxShadow: `0 0 14px ${t.toColor}` }} />
            </div>

            {/* Label */}
            <span className="rd-card-label">{t.label}</span>

            {/* Play hint */}
            <span className="rd-card-play">
              <span className="material-symbols-outlined">play_circle</span>
            </span>

            {/* Active indicator */}
            {playing === t.id && (
              <span className="rd-card-badge">Đang phát…</span>
            )}
          </button>
        ))}
      </div>

      {/* Hint */}
      <p className="rd-hint">
        <span className="material-symbols-outlined">info</span>
        Click vào một ô bên trên để phát hiệu ứng. Hiệu ứng tự kết thúc sau ~4 giây.
      </p>

      {/* Animation overlay */}
      {active && (
        <Suspense fallback={null}>
          <RankUpAnimation
            oldRank={active.from}
            newRank={active.to}
            onComplete={handleComplete}
          />
        </Suspense>
      )}
    </div>
  );
}
