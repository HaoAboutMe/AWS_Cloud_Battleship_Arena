import { useEffect, useRef, useState } from "react";
import "./PvpBattlePanels.css";

const EMOTES = ["🙂", "😎", "🫡", "🤔", "😮", "😤", "👏", "🔥", "🎯", "⚓", "💥", "🌊"];
const FLEET_SIGNALS = ["🚢", "🛳️", "⛴️", "🛥️", "⚓", "🚀", "🎯", "💣"];

const getInitials = (name = "Commander") =>
  name
    .split(/[\s@#._-]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("") || "C";

const CommanderAvatar = ({ player, tone = "cyan" }) => (
  <div className={`pvp-avatar pvp-avatar-${tone}`}>
    {player?.avatarUrl ? (
      <img src={player.avatarUrl} alt="" />
    ) : (
      <span>{getInitials(player?.displayName)}</span>
    )}
    <i aria-hidden="true" />
  </div>
);

const getStatusText = ({ copy, isConnected, isTurn, isDeploying, isReady }) => {
  if (!isConnected) return copy.disconnectedStatus;
  if (isReady) return copy.readyStatus;
  if (isDeploying) return copy.deployingStatus;
  return isTurn ? copy.yourTurnStatus : copy.opponentTurnStatus;
};

const formatTime = (value, language) => {
  const date = value ? new Date(value) : new Date();
  if (Number.isNaN(date.getTime())) return "--:--";
  return date.toLocaleTimeString(language === "vi" ? "vi-VN" : "en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
};

function PlayerIdentityPanel({
  side,
  player,
  rankLabel,
  isConnected,
  isTurn,
  isDeploying,
  isReady,
  shipsAfloat,
  speechMessage,
  copy,
}) {
  const isOpponent = side === "opponent";
  const [hiddenSpeechId, setHiddenSpeechId] = useState(null);
  const status = getStatusText({
    copy,
    isConnected,
    isTurn,
    isDeploying,
    isReady,
  });
  const visibleSpeech =
    speechMessage?.messageId !== hiddenSpeechId ? speechMessage : null;

  useEffect(() => {
    if (!speechMessage?.messageId) return undefined;
    const messageId = speechMessage.messageId;
    const timeoutId = window.setTimeout(() => setHiddenSpeechId(messageId), 6500);
    return () => window.clearTimeout(timeoutId);
  }, [speechMessage]);

  return (
    <aside
      className={`pvp-identity-panel is-${side}`}
      aria-label={isOpponent ? copy.opponentPanel : copy.commanderPanel}
    >
      <span className="pvp-panel-kicker">
        {isOpponent ? copy.opponentPanel : copy.commanderPanel}
      </span>
      <div className="pvp-avatar-stage">
        <CommanderAvatar player={player} tone={isOpponent ? "red" : "cyan"} />
        {visibleSpeech && (
          <div
            key={visibleSpeech.messageId}
            className={`pvp-speech-bubble ${visibleSpeech.kind === "emote" ? "is-emote" : ""}`}
            role="status"
          >
            {visibleSpeech.value}
          </div>
        )}
      </div>
      <strong title={player?.displayName}>
        {player?.displayName || (isOpponent ? copy.waitingPlayer : "Commander")}
      </strong>
      <span className="pvp-rank-label">{rankLabel}</span>
      <div
        className={`pvp-channel-status ${isOpponent ? "is-hostile" : ""} ${isConnected ? "is-online" : ""} ${isReady ? "is-ready" : ""}`}
      >
        <i /> {status}
      </div>
      <div className="pvp-fleet-meter">
        <span className="material-symbols-outlined" aria-hidden="true">
          {isOpponent ? "radar" : "directions_boat"}
        </span>
        <b>{copy.shipsAfloat.replace("{count}", shipsAfloat)}</b>
      </div>
    </aside>
  );
}

export function PvpCommanderPanel(props) {
  return <PlayerIdentityPanel side="commander" isTurn={props.isMyTurn} {...props} />;
}

export function PvpOpponentPanel(props) {
  return <PlayerIdentityPanel side="opponent" isTurn={props.isTheirTurn} {...props} />;
}

export function PvpBattleTools({
  isConnected,
  logs,
  chatMessages,
  copy,
  language,
  onSendChat,
  onSendEmote,
}) {
  const [openDrawer, setOpenDrawer] = useState(null);
  const [activeTab, setActiveTab] = useState("emotions");
  const [chatInput, setChatInput] = useState("");
  const chatFeedRef = useRef(null);
  const eventFeedRef = useRef(null);

  useEffect(() => {
    if (openDrawer === "chat" && chatFeedRef.current) {
      chatFeedRef.current.scrollTop = chatFeedRef.current.scrollHeight;
    }
    if (openDrawer === "log" && eventFeedRef.current) {
      eventFeedRef.current.scrollTop = eventFeedRef.current.scrollHeight;
    }
  }, [chatMessages, logs, openDrawer]);

  const toggleDrawer = (drawer) => {
    setOpenDrawer((current) => (current === drawer ? null : drawer));
  };

  const submitChat = (event) => {
    event.preventDefault();
    const message = chatInput.trim();
    if (!message || !isConnected) return;
    if (onSendChat(message) !== false) setChatInput("");
  };

  const signals = activeTab === "emotions" ? EMOTES : FLEET_SIGNALS;

  return (
    <>
      <button
        type="button"
        className={`pvp-tool-launcher is-chat ${openDrawer === "chat" ? "is-active" : ""}`}
        onClick={() => toggleDrawer("chat")}
        title={copy.battleChat}
        aria-label={copy.battleChat}
        aria-expanded={openDrawer === "chat"}
      >
        <span className="material-symbols-outlined" aria-hidden="true">forum</span>
      </button>

      <button
        type="button"
        className={`pvp-tool-launcher is-log ${openDrawer === "log" ? "is-active" : ""}`}
        onClick={() => toggleDrawer("log")}
        title={copy.eventLog}
        aria-label={copy.eventLog}
        aria-expanded={openDrawer === "log"}
      >
        <span className="material-symbols-outlined" aria-hidden="true">receipt_long</span>
      </button>

      {openDrawer === "chat" && (
        <aside className="pvp-tool-drawer is-left" aria-label={copy.battleChat}>
          <header className="pvp-drawer-header">
            <span><span className="material-symbols-outlined" aria-hidden="true">forum</span>{copy.battleChat}</span>
            <button type="button" onClick={() => setOpenDrawer(null)} aria-label="Close">
              <span className="material-symbols-outlined" aria-hidden="true">close</span>
            </button>
          </header>

          <section className="battle-emote-panel">
            <div className="pvp-panel-tabs" role="tablist">
              <button
                type="button"
                className={activeTab === "emotions" ? "is-active" : ""}
                onClick={() => setActiveTab("emotions")}
              >
                {copy.emotionsTab}
              </button>
              <button
                type="button"
                className={activeTab === "ships" ? "is-active" : ""}
                onClick={() => setActiveTab("ships")}
              >
                {copy.shipsTab}
              </button>
            </div>
            <div className="pvp-emote-grid">
              {signals.map((signal, index) => (
                <button
                  key={`${signal}-${index}`}
                  type="button"
                  title={signal}
                  disabled={!isConnected}
                  onClick={() => onSendEmote(signal)}
                >
                  {signal}
                </button>
              ))}
            </div>
          </section>

          <div ref={chatFeedRef} className="pvp-chat-feed">
            {chatMessages.length === 0 ? (
              <p className="pvp-empty-feed">{copy.awaitingSignal}</p>
            ) : (
              chatMessages.slice(-60).map((message) => (
                <div
                  key={message.messageId}
                  className={`pvp-feed-entry ${message.side === "player" ? "is-player" : "is-opponent"}`}
                >
                  <time>{formatTime(message.sentAt, language)}</time>
                  <b>{message.senderName}</b>
                  <span className={message.kind === "emote" ? "is-emote" : ""}>{message.value}</span>
                </div>
              ))
            )}
          </div>

          <form className="pvp-chat-form" onSubmit={submitChat}>
            <input
              value={chatInput}
              maxLength={180}
              disabled={!isConnected}
              onChange={(event) => setChatInput(event.target.value)}
              placeholder={copy.chatPlaceholder}
              aria-label={copy.chatPlaceholder}
            />
            <button
              type="submit"
              disabled={!isConnected || !chatInput.trim()}
              title={copy.sendChat}
              aria-label={copy.sendChat}
            >
              <span className="material-symbols-outlined" aria-hidden="true">send</span>
            </button>
          </form>
        </aside>
      )}

      {openDrawer === "log" && (
        <aside className="pvp-tool-drawer is-right" aria-label={copy.eventLog}>
          <header className="pvp-drawer-header">
            <span><span className="material-symbols-outlined" aria-hidden="true">receipt_long</span>{copy.eventLog}</span>
            <button type="button" onClick={() => setOpenDrawer(null)} aria-label="Close">
              <span className="material-symbols-outlined" aria-hidden="true">close</span>
            </button>
          </header>
          <div ref={eventFeedRef} className="pvp-event-feed">
            {logs.length === 0 ? (
              <p className="pvp-empty-feed">{copy.awaitingSignal}</p>
            ) : (
              logs.slice(-80).map((log) => (
                <div key={log.id} className={`pvp-event-entry is-${log.type || "info"}`}>
                  <time>{formatTime(log.timestamp, language)}</time>
                  <span>{log.msg}</span>
                </div>
              ))
            )}
          </div>
        </aside>
      )}
    </>
  );
}
