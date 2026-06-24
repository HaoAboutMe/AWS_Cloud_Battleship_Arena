import { useEffect, useRef, useState } from "react";
import "./PvpBattlePanels.css";

// ─────────────────────────────────────────────
//  Constants
// ─────────────────────────────────────────────
const EMOTES = ["🙂", "😎", "🫡", "🤔", "😮", "😤", "👏", "🔥", "🎯", "⚓", "💥", "🌊"];
const FLEET_SIGNALS = ["🚢", "🛳️", "⛴️", "🛥️", "⚓", "🚀", "🎯", "💣"];

// ─────────────────────────────────────────────
//  Helpers
// ─────────────────────────────────────────────
const getInitials = (name = "Commander") =>
  name
    .split(/[\s@#._-]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("") || "C";

const formatTime = (value, language) => {
  const date = value ? new Date(value) : new Date();
  if (Number.isNaN(date.getTime())) return "--:--";
  return date.toLocaleTimeString(language === "vi" ? "vi-VN" : "en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
};

// ─────────────────────────────────────────────
//  Mini Avatar (40px, inline in strip)
// ─────────────────────────────────────────────
function MiniAvatar({ player, tone = "cyan" }) {
  return (
    <div className={`pvp-mini-avatar pvp-mini-avatar-${tone}`}>
      {player?.avatarUrl ? (
        <img src={player.avatarUrl} alt="" />
      ) : (
        <span>{getInitials(player?.displayName)}</span>
      )}
    </div>
  );
}


// ─────────────────────────────────────────────
//  PvpCommandStrip — replaces the two side panels
//  Layout: [Avatar | Name · Rank · ⚓Ships] ── [STATUS BADGE] ── [⚓Ships · Rank · Name | Avatar]
// ─────────────────────────────────────────────
export function PvpCommandStrip({
  myPlayer,
  myRankLabel,
  myIsConnected,
  myIsMyTurn,
  myIsDeploying,
  myIsReady,
  myShipsAfloat,
  oppPlayer,
  oppRankLabel,
  oppIsConnected,
  oppIsTheirTurn,
  oppIsDeploying,
  oppIsReady,
  oppShipsAfloat,
  statusTextNode,
  actionButtonNode,
  copy,
}) {
  const myStatusDot = myIsConnected
    ? myIsReady
      ? "ready"
      : myIsMyTurn
        ? "turn"
        : "online"
    : "offline";

  const oppStatusDot = oppIsConnected
    ? oppIsReady
      ? "ready"
      : oppIsTheirTurn
        ? "turn"
        : "online"
    : "offline";

  const centerLabel = (() => {
    if (myIsDeploying) return copy.deployingStatus || "Deploying";
    if (myIsMyTurn) return copy.yourTurnStatus || "Your Turn";
    if (oppIsTheirTurn) return copy.opponentTurnStatus || "Opponent Turn";
    return "VS";
  })();

  const isBattlePhase = !myIsDeploying && !myIsReady;

  return (
    <div className="pvp-command-strip-wrapper" aria-label="Battle HUD">

      <div className="pvp-command-strip flex flex-col gap-2">
        <div className="pvp-command-strip-top">
          {/* ── LEFT: Commander ── */}
        <div className="pvp-strip-player pvp-strip-commander">
          <div className="pvp-strip-avatar-wrap">
            <MiniAvatar player={myPlayer} tone="cyan" />
            <span className={`pvp-strip-dot is-${myStatusDot}`} aria-hidden="true" />
          </div>
          <div className="pvp-strip-info">
            <strong title={myPlayer?.displayName}>
              {myPlayer?.displayName || "Commander"}
            </strong>
            <span className="pvp-strip-rank">
              {myRankLabel}
              {myIsDeploying && myIsConnected && (
                <span className="ml-1 opacity-80 italic">
                  - {myIsReady ? (copy?.readyStatus || "Đã sẵn sàng") : (copy?.deployingStatus || "Đang xếp tàu")}
                </span>
              )}
            </span>
          </div>

        </div>

        {/* ── CENTER: Status badge ── */}
        <div
          className={`pvp-strip-center ${
            myIsMyTurn
              ? "is-my-turn"
              : oppIsTheirTurn
                ? "is-opp-turn"
                : myIsReady || myIsDeploying
                  ? "is-deploying"
                  : ""
          }`}
        >
          {(myIsMyTurn || oppIsTheirTurn) && (
            <span className="pvp-strip-center-pulse" aria-hidden="true" />
          )}
          <span className="pvp-strip-center-icon material-symbols-outlined" aria-hidden="true">
            {myIsMyTurn ? "my_location" : oppIsTheirTurn ? "radar" : "anchor"}
          </span>
          <span className="pvp-strip-center-label">{centerLabel}</span>
        </div>

        {/* ── RIGHT: Opponent ── */}
        <div className="pvp-strip-player pvp-strip-opponent">

          <div className="pvp-strip-info pvp-strip-info-right">
            <strong title={oppPlayer?.displayName}>
              {oppPlayer?.displayName || (copy.waitingPlayer || "Waiting…")}
            </strong>
            <span className="pvp-strip-rank">
              {oppRankLabel}
              {oppIsDeploying && oppIsConnected && (
                <span className="ml-1 opacity-80 italic">
                  - {oppIsReady ? (copy?.readyStatus || "Đã sẵn sàng") : (copy?.deployingStatus || "Đang xếp tàu")}
                </span>
              )}
            </span>
          </div>
          <div className="pvp-strip-avatar-wrap">
            <MiniAvatar player={oppPlayer} tone="red" />
            <span className={`pvp-strip-dot is-${oppStatusDot}`} aria-hidden="true" />
          </div>
        </div>
        </div>

        {/* ── BOTTOM: Status & Action ── */}
        {(statusTextNode || actionButtonNode) && (
          <div className="pvp-command-strip-bottom">
            <div className="pvp-strip-status-text">
              {statusTextNode}
            </div>
            {actionButtonNode && (
              <div className="pvp-strip-action">
                {actionButtonNode}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
//  PvpCommsPanel — replaces FABs + drawers
//  Tabs: Chat | Log | Emotes
//  Collapsed by default, expands on tab click
// ─────────────────────────────────────────────
export function PvpCommsPanel({
  myPlayer,
  oppPlayer,
  isConnected,
  logs,
  chatMessages,
  copy,
  language,
  onSendChat,
  onSendEmote,
  isPveMode = false,
}) {
  const [activeTab, setActiveTab] = useState(
    window.innerWidth < 1024 ? null : isPveMode ? "log" : "chat"
  );
  const [emoteTab, setEmoteTab] = useState("emotions");
  const [chatInput, setChatInput] = useState("");
  const chatFeedRef = useRef(null);
  const eventFeedRef = useRef(null);

  // Auto-scroll feeds on new messages
  useEffect(() => {
    if (activeTab === "chat" && chatFeedRef.current) {
      chatFeedRef.current.scrollTop = chatFeedRef.current.scrollHeight;
    }
    if (activeTab === "log" && eventFeedRef.current) {
      eventFeedRef.current.scrollTop = eventFeedRef.current.scrollHeight;
    }
  }, [chatMessages, logs, activeTab]);

  const toggleTab = (tab) => {
    setActiveTab((cur) => {
      // Don't allow collapsing on desktop where it's a sidebar.
      // For mobile, maybe allow it, but for simplicity, just keep it open or switch tabs.
      // We will let it toggle to null if we want, or just always be open.
      // Let's just switch tabs. If they click the same tab, maybe we allow collapse on small screens.
      if (window.innerWidth < 1024) {
        return cur === tab ? null : tab;
      }
      return tab;
    });
  };

  const submitChat = (event) => {
    event.preventDefault();
    const message = chatInput.trim();
    if (!message || !isConnected) return;
    if (onSendChat(message) !== false) setChatInput("");
  };

  const signals = emoteTab === "emotions" ? EMOTES : FLEET_SIGNALS;
  const isExpanded = activeTab !== null;

  return (
    <>
      {isExpanded && (
        <div 
          className="fixed inset-0 z-[-1] lg:hidden bg-background/80 backdrop-blur-sm transition-opacity"
          style={{ height: "100vh", width: "100vw" }}
          onClick={() => setActiveTab(null)}
          aria-hidden="true"
        />
      )}
      <section
        className={`pvp-comms-panel ${isExpanded ? "is-expanded" : ""}`}
        aria-label="Battle Communications"
      >
      {/* ── Tab Bar (always visible) ── */}
      <div className="pvp-comms-tabbar" role="tablist">
        {!isPveMode && (
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === "chat"}
            className={`pvp-comms-tab ${activeTab === "chat" ? "is-active" : ""}`}
            onClick={() => toggleTab("chat")}
            title={copy.battleChat}
          >
            <span className="material-symbols-outlined" aria-hidden="true">forum</span>
            <span className="pvp-comms-tab-label">{copy.battleChat || "Chat"}</span>
            {chatMessages.length > 0 && activeTab !== "chat" && (
              <span className="pvp-comms-badge">{Math.min(chatMessages.length, 99)}</span>
            )}
          </button>
        )}

        <button
          type="button"
          role="tab"
          aria-selected={activeTab === "log"}
          className={`pvp-comms-tab ${activeTab === "log" ? "is-active" : ""}`}
          onClick={() => toggleTab("log")}
          title={copy.eventLog}
        >
          <span className="material-symbols-outlined" aria-hidden="true">receipt_long</span>
          <span className="pvp-comms-tab-label">{copy.eventLog || "Log"}</span>
        </button>

        {!isPveMode && (
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === "emotes"}
            className={`pvp-comms-tab ${activeTab === "emotes" ? "is-active" : ""}`}
            onClick={() => toggleTab("emotes")}
            title={copy.emotionsTab}
          >
            <span className="material-symbols-outlined" aria-hidden="true">mood</span>
            <span className="pvp-comms-tab-label">{copy.emotionsTab || "Emotes"}</span>
          </button>
        )}

        {isExpanded && (
          <button
            type="button"
            className="pvp-comms-collapse"
            onClick={() => setActiveTab(null)}
            aria-label="Collapse panel"
          >
            <span className="material-symbols-outlined" aria-hidden="true">keyboard_arrow_down</span>
          </button>
        )}
      </div>

      {/* ── Expandable Body ── */}
      {isExpanded && (
        <div className="pvp-comms-body">
          {/* CHAT TAB */}
          {activeTab === "chat" && (
            <>
              <div ref={chatFeedRef} className="pvp-comms-feed flex flex-col px-3 py-4">
                {chatMessages.length === 0 ? (
                  <p className="pvp-comms-empty">{copy.awaitingSignal || "Awaiting signals…"}</p>
                ) : (
                  chatMessages.slice(-60).map((msg, idx, arr) => {
                    const prevMsg = idx > 0 ? arr[idx - 1] : null;
                    const nextMsg = idx < arr.length - 1 ? arr[idx + 1] : null;

                    const isSameSenderAsPrev = prevMsg && prevMsg.side === msg.side;
                    const isSameSenderAsNext = nextMsg && nextMsg.side === msg.side;
                    const isPlayer = msg.side === "player";

                    return (
                      <div
                        key={msg.messageId}
                        className={`flex flex-col w-full ${isSameSenderAsPrev ? "mt-[2px]" : "mt-4"}`}
                      >
                        {/* Sender Name (above bubble and avatar) */}
                        {!isSameSenderAsPrev && (
                          <span 
                            className={`text-[10px] text-on-surface-variant/70 mb-[2px] px-1 font-medium tracking-wide uppercase ${
                              isPlayer ? "text-right mr-10" : "text-left ml-10"
                            }`}
                          >
                            {msg.senderName} • {formatTime(msg.sentAt, language)}
                          </span>
                        )}

                        {/* Avatar & Bubble Row */}
                        <div className={`flex w-full ${isPlayer ? "justify-end" : "justify-start"}`}>
                          {/* Opponent Avatar Column (Left) */}
                          {!isPlayer && (
                            <div 
                              className="flex-shrink-0 w-8 flex flex-col justify-start mr-2" 
                              style={{ "--avatar-size": "32px" }}
                            >
                              {!isSameSenderAsPrev && (
                                <MiniAvatar player={oppPlayer} tone="red" />
                              )}
                            </div>
                          )}

                          {/* Message Content */}
                          <div
                            className={`flex flex-col max-w-[75%] ${
                              isPlayer ? "items-end" : "items-start"
                            }`}
                          >
                          <div
                            className={`px-3 py-2 text-sm shadow-md transition-all ${
                              isPlayer
                                ? "bg-[#0b5478]/90 text-[#e2f7ff] border border-[#21a1d1]/30"
                                : "bg-[#252836]/95 text-[#f1f1f1] border border-[#ffffff]/10"
                            } ${
                              isPlayer
                                ? `rounded-l-2xl ${
                                    !isSameSenderAsPrev ? "rounded-tr-2xl" : "rounded-tr-md"
                                  } ${!isSameSenderAsNext ? "rounded-br-2xl" : "rounded-br-md"}`
                                : `rounded-r-2xl ${
                                    !isSameSenderAsPrev ? "rounded-tl-2xl" : "rounded-tl-md"
                                  } ${!isSameSenderAsNext ? "rounded-bl-2xl" : "rounded-bl-md"}`
                            }`}
                          >
                            {msg.kind === "emote" ? (
                              <span className="text-3xl leading-none filter drop-shadow-sm">{msg.value}</span>
                            ) : (
                              <span className="break-words leading-relaxed">{msg.value}</span>
                            )}
                          </div>
                          </div>

                          {/* Player Avatar Column (Right) */}
                          {isPlayer && (
                            <div 
                              className="flex-shrink-0 w-8 flex flex-col justify-start ml-2" 
                              style={{ "--avatar-size": "32px" }}
                            >
                              {!isSameSenderAsPrev && (
                                <MiniAvatar player={myPlayer} tone="cyan" />
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
              <form className="pvp-comms-form" onSubmit={submitChat}>
                <input
                  value={chatInput}
                  maxLength={180}
                  disabled={!isConnected}
                  onChange={(e) => setChatInput(e.target.value)}
                  placeholder={copy.chatPlaceholder || "Send a message…"}
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
            </>
          )}

          {/* LOG TAB */}
          {activeTab === "log" && (
            <div ref={eventFeedRef} className="pvp-comms-feed">
              {logs.length === 0 ? (
                <p className="pvp-comms-empty">{copy.awaitingSignal || "Awaiting signals…"}</p>
              ) : (
                logs.slice(-80).map((log) => (
                  <div key={log.id} className={`pvp-event-entry is-${log.type || "info"}`}>
                    <time>{formatTime(log.timestamp, language)}</time>
                    <span>{log.msg}</span>
                  </div>
                ))
              )}
            </div>
          )}

          {/* EMOTES TAB */}
          {activeTab === "emotes" && (
            <div className="pvp-comms-emotes">
              <div className="pvp-emote-tabs" role="tablist">
                <button
                  type="button"
                  className={emoteTab === "emotions" ? "is-active" : ""}
                  onClick={() => setEmoteTab("emotions")}
                >
                  {copy.emotionsTab || "Emotions"}
                </button>
                <button
                  type="button"
                  className={emoteTab === "ships" ? "is-active" : ""}
                  onClick={() => setEmoteTab("ships")}
                >
                  {copy.shipsTab || "Fleet signals"}
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
            </div>
          )}
        </div>
      )}
    </section>
    </>
  );
}

// ─────────────────────────────────────────────
//  Legacy exports kept for backward-compat
//  (Game.jsx will import new names, but keep
//   these so no other file breaks)
// ─────────────────────────────────────────────
export function PvpCommanderPanel() { return null; }
export function PvpOpponentPanel() { return null; }
export function PvpBattleTools() { return null; }
