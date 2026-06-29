import { useEffect, useState } from "react";
import "./GameResultModal.css";

function GameResultModal({
    showModal,
    winner,
    gameOverReason,
    subMessage,
    copy,
    difficulty,
    isPvpMode = false,
    stats,
    rankedResult,
    handlePlayAgain,
    rematchLoading,
    handleReturnHome,
    returnHomeLoading,
}) {
    const [resultArt, setResultArt] = useState("");

    useEffect(() => {
        if (!showModal) return;

        let cancelled = false;
        const loadResultArt = winner === "PLAYER"
            ? import("../assets/results/result-victory-art.webp")
            : import("../assets/results/result-defeat-art.webp");

        loadResultArt.then((module) => {
            if (!cancelled) setResultArt(module.default);
        });

        return () => {
            cancelled = true;
        };
    }, [showModal, winner]);

    if (!showModal) return null;

    const isVictory = winner === "PLAYER";
    const resultTitle = isVictory
        ? (gameOverReason === "opponent_left" ? copy.opponentLeftTitle : copy.victoryTitle || "VICTORY")
        : copy.defeatTitle || "DEFEAT";
    const resultSubtitle = gameOverReason === "opponent_left"
        ? copy.opponentLeftBody
        : isPvpMode
            ? (isVictory
                ? copy.pvpVictorySubtitle || "Enemy command channel neutralized."
                : copy.pvpDefeatSubtitle || "Your fleet has been shattered in PvP combat.")
            : `${copy.difficultyLabel || "Difficulty"}: ${copy.difficultyNames?.[difficulty] || difficulty}`;
    const posterTitle = isVictory ? (copy.victoryTitle || "VICTORY") : (copy.defeatTitle || "DEFEAT");

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-background/85 backdrop-blur-md animate-fade-in">
            <div className={`result-modal ${isVictory ? 'result-modal--victory' : 'result-modal--defeat'}`}>
                <div className="result-modal__signal">
                    <span />
                    <span />
                    <span />
                </div>

                <div
                    className={`result-battle-scene result-battle-scene--art ${isVictory ? "result-battle-scene--victory" : "result-battle-scene--defeat"}`}
                    aria-label={resultTitle}
                >
                    {resultArt ? <img className="result-scene-art" src={resultArt} alt="" /> : null}
                    <div className="result-modal__header">
                        <h2 className="result-modal__title">
                            {posterTitle}
                        </h2>
                    </div>
                </div>

                <p className="result-modal__subtitle">
                    {resultSubtitle}
                </p>

                <div className="result-stats">
                    <div className="result-stat flex flex-col">
                        <p>{copy.reason || "Reason"}</p>
                        <strong className="!text-[16px] md:!text-[18px] !leading-tight !mt-auto">
                            {subMessage || (isVictory ? (copy.sectorSecured || "Sector Secured!") : (copy.fleetAnnihilated || "Fleet Annihilated!"))}
                        </strong>
                    </div>
                    <div className="result-stat">
                        <p>{copy.totalShots || "Total Shots"}</p>
                        <strong>{stats.shots}</strong>
                    </div>
                    <div className="result-stat">
                        <p>{copy.hitsMisses || "Hits / Misses"}</p>
                        <strong className="result-stat__accent">{stats.hits} <span>/ {stats.misses}</span></strong>
                    </div>
                    <div className="result-stat">
                        <p>{copy.accuracy || "Accuracy"}</p>
                        <strong className="result-stat__accent">{stats.shots > 0 ? Math.round((stats.hits / stats.shots) * 100) : 0}%</strong>
                    </div>
                </div>

                {rankedResult && (
                    <div className="ranked-result-card">
                        <div className="ranked-result-card__top">
                            <p>Ranked Result</p>
                            <strong>
                                {rankedResult.delta > 0 ? "+" : ""}{rankedResult.delta} RP
                            </strong>
                        </div>
                        <p className="ranked-result-card__rank">
                            {rankedResult.oldRank} <span>-&gt;</span> {rankedResult.newRank}
                        </p>
                        <p className="ranked-result-card__rp">
                            {rankedResult.oldRp} RP <span>-&gt;</span> {rankedResult.newRp} RP
                        </p>
                        <div className="ranked-result-card__meter">
                            <span />
                        </div>
                    </div>
                )}

                <div className="result-actions">
                    <button
                        onClick={handlePlayAgain}
                        disabled={rematchLoading}
                        className="result-action result-action--primary"
                    >
                        {rematchLoading ? copy.syncing : copy.playAgain}
                    </button>
                    <button
                        type="button"
                        onClick={handleReturnHome}
                        disabled={returnHomeLoading}
                        className="result-action result-action--ghost"
                    >
                        {returnHomeLoading ? copy.syncing : copy.returnHome}
                    </button>
                </div>
            </div>
        </div>
    );
}

export default GameResultModal;
