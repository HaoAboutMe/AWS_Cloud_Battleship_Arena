import { RANKS } from "../game/rankConfig";
import "./RankProgressionModal.css";

function RankProgressionModal({
  isOpen,
  onClose,
  selectedRankId,
  selectedTitle,
  selectedRank,
  selectedProgressLabel,
  selectedProgressPercent,
  rankRewards,
  unrankedRewards,
  hasRank,
  rankPoints,
  rankMeta,
  currentRankIndex,
  getRankDisplayName,
  setSelectedRankId,
  t,
}) {
  if (!isOpen) return null;

  return (
    <div
      className="profile-rank-modal"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <div className="profile-rank-panel" onClick={(event) => event.stopPropagation()}>
        <button
          type="button"
          className="profile-rank-close"
          onClick={onClose}
          aria-label={t("profile.closeRankLadder")}
        >
          <span className="material-symbols-outlined">close</span>
        </button>
        <div className="profile-rank-command-shell">
          <section className="profile-rank-focus" key={selectedRankId}>
            <span className="profile-rank-kicker">{t("profile.commanderLadder")}</span>
            <h2>{selectedTitle}</h2>
            <div className="profile-rank-radar">
              <span className="profile-rank-sonar one" />
              <span className="profile-rank-sonar two" />
              <span className="profile-rank-light left" />
              <span className="profile-rank-light right" />
              {selectedRank ? (
                <img src={selectedRank.badge} alt="" className="profile-rank-focus-badge" />
              ) : (
                <i className="profile-empty-rank-badge profile-rank-focus-empty" />
              )}
            </div>
            <div className="profile-rank-progress">
              <div>
                <span>{t("profile.pressureGauge")}</span>
                <strong>{selectedProgressLabel}</strong>
              </div>
              <i>
                <b style={{ width: `${selectedProgressPercent}%` }} />
              </i>
            </div>
            <div className="profile-rank-rewards">
              <span>{t("profile.rewardManifest")}</span>
              <ul>
                {(selectedRank ? rankRewards[selectedRank.id] : unrankedRewards).map((reward) => (
                  <li key={reward}>{reward}</li>
                ))}
              </ul>
            </div>
          </section>

          <section className="profile-rank-voyage">
            <div className="profile-voyage-heading">
              <span>{t("profile.leagueLevels")}</span>
              <strong>{hasRank ? t("profile.rpSecured", { points: rankPoints }) : t("profile.rankedRouteLocked")}</strong>
            </div>
            <div className="profile-voyage-map profile-league-levels">
              {RANKS.map((rank, index) => {
                const isCurrent = hasRank && rank.id === rankMeta.id;
                const isUnlocked = hasRank && rankPoints >= rank.minRp;
                const isPassed = isUnlocked && index < currentRankIndex;
                const isSelected = selectedRank ? rank.id === selectedRank.id : false;
                const columnHeight = 38 + (index * 8);

                return (
                  <button
                    type="button"
                    key={rank.id}
                    className={[
                      "profile-voyage-node",
                      `rank-${rank.id}`,
                      isCurrent ? "is-current" : "",
                      isPassed ? "is-passed" : "",
                      isUnlocked ? "is-unlocked" : "is-locked",
                      isSelected ? "is-selected" : "",
                    ].filter(Boolean).join(" ")}
                    onClick={() => setSelectedRankId(rank.id)}
                    style={{ "--node-color": rank.color, "--league-height": `${columnHeight}%` }}
                  >
                    <span className="profile-league-column" />
                    <img src={rank.badge} alt="" />
                    <strong>{getRankDisplayName(rank)}</strong>
                    <em>{rank.minRp}+ RP</em>
                  </button>
                );
              })}
              <span className="profile-league-divisions">{t("profile.divisions")}</span>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

export default RankProgressionModal;
