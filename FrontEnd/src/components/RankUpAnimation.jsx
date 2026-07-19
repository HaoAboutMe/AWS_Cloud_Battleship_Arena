import { useEffect, useRef } from "react";
import { getRankMeta } from "../game/rankConfig";
import { playSound } from "../services/soundService";
import "./RankUpAnimation.css";

const SPARKS = Array.from({ length: 18 }, (_, index) => ({
  angle: `${index * 20}deg`,
  distance: `${150 + (index % 4) * 28}px`,
  delay: `${1.72 + (index % 3) * 0.045}s`,
  length: `${34 + (index % 5) * 9}px`,
}));

function RankUpAnimation({ oldRank, newRank, onComplete }) {
  const completeRef = useRef(onComplete);

  const newMeta = getRankMeta(newRank || "bronze");
  const oldMeta = oldRank ? getRankMeta(oldRank) : null;

  useEffect(() => {
    completeRef.current = onComplete;
  }, [onComplete]);

  useEffect(() => {
    playSound("rankUp", { minGap: 1200 });
    const timer = window.setTimeout(() => completeRef.current?.(), 5200);
    return () => window.clearTimeout(timer);
  }, [newRank, oldRank]);

  return (
    <div
      className="rank-ceremony"
      data-rank={newMeta.id}
      role="dialog"
      aria-modal="true"
      aria-label={`Promoted to ${newMeta.label}`}
    >
      <div className="rank-ceremony__backdrop" aria-hidden="true" />
      <div className="rank-ceremony__beams" aria-hidden="true">
        <i /><i /><i /><i /><i />
      </div>
      <div className="rank-ceremony__wordmark" aria-hidden="true">{newMeta.label}</div>

      <div className="rank-ceremony__stage">
        <div className="rank-ceremony__eyebrow">Fleet command promotion</div>

        <div className="rank-ceremony__emblem">
          <div className="rank-ceremony__orbit rank-ceremony__orbit--outer" aria-hidden="true" />
          <div className="rank-ceremony__orbit rank-ceremony__orbit--inner" aria-hidden="true" />
          <div className="rank-ceremony__axis" aria-hidden="true"><i /><i /></div>

          {oldMeta && (
            <div className="rank-ceremony__old" aria-hidden="true">
              <img src={oldMeta.badge} alt="" />
              <img src={oldMeta.badge} alt="" />
              <img src={oldMeta.badge} alt="" />
            </div>
          )}

          <div className="rank-ceremony__core" aria-hidden="true" />
          <div className="rank-ceremony__badge-wrap">
            <div className="rank-ceremony__badge-aura" aria-hidden="true" />
            <img className="rank-ceremony__badge" src={newMeta.badge} alt={`${newMeta.label} rank badge`} />
            <div className="rank-ceremony__badge-shine" aria-hidden="true" />
          </div>

          <div className="rank-ceremony__shockwaves" aria-hidden="true"><i /><i /><i /></div>
          <div className="rank-ceremony__sparks" aria-hidden="true">
            {SPARKS.map((spark, index) => (
              <i
                key={index}
                style={{
                  "--spark-angle": spark.angle,
                  "--spark-distance": spark.distance,
                  "--spark-delay": spark.delay,
                  "--spark-length": spark.length,
                }}
              />
            ))}
          </div>
        </div>

        <div className="rank-ceremony__copy" aria-live="polite">
          <span>Promoted to</span>
          <h2>{newMeta.label}</h2>
          <p>{newMeta.viLabel}</p>
          <div className="rank-ceremony__route">
            <b>{oldMeta?.label || "Unranked"}</b>
            <i />
            <b>{newMeta.label}</b>
          </div>
        </div>
      </div>

      <div className="rank-ceremony__footer" aria-hidden="true">
        <span>Authority verified</span><i /><b>New clearance granted</b><i /><span>Fleet registry updated</span>
      </div>
    </div>
  );
}

export default RankUpAnimation;
