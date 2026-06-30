import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import CommandHeader from "../components/CommandHeader";
import { getAvatarCdnUrl } from "../utils/avatar";
import { useAuth } from "../contexts/AuthContext";
import { useLanguage } from "../contexts/LanguageContext";
import {
  createRoom,
  getRoom,
  getRoomPlayerId,
  joinRoom,
  leaveRoom,
  markLobbyReady,
} from "../services/matchService";
import { playSound } from "../services/soundService";
import "./HomeHeader.css";
import "./Lobby.css";

const COMMANDER_AVATAR =
  "https://lh3.googleusercontent.com/aida-public/AB6AXuBaat_LefR8zmWVQ9CHx0bp9dTekwkF9c9AQAo9FxlAx2bSsRi_lWU3tRBK1vdpC50zM3NdKJAB5hHd5ZusN0HuCxBcpe1IbzSlreCalSVomkgeQwYwz9iKrXYvj55d42PgtFMDfCUosVO6NBFPXtM_vVCTYDxnC7xz1DxkbcIvRSfpehGpD-kbu7XuQbuktassmbGVExYQy0GTNC_jJHX3hmbFNDIdyfqO5-uwHYbgPtFdacF4kVhq0AnscPv4dWSz-e_6DYUDMSxe";

const LOBBY_COPY = {
  en: {
    title: "Battle Room",
    intro: "Create a private room or enter a room code to prepare for PvP.",
    createTitle: "Create Room",
    createBody: "Open a private command channel.",
    createButton: "Create room",
    joinTitle: "Join Room",
    joinBody: "Paste a received room code to connect.",
    joinButton: "Join room",
    placeholder: "ENTER ROOM CODE",
    processing: "Processing...",
    copy: "Copy",
    copied: "Copied!",
    leaveRoom: "Leave Room",
    leaveQueue: "Leave Queue",
    ready: "Ready",
    standby: "Standby",
    matchmakingTitle: "Matchmaking Channel",
    casualBattle: "Casual Battle",
    rankedBattle: "Ranked Battle",
    queueStatus: "Queue Status",
    searchingOpponent: "Searching for an opponent...",
    opponentFound: "Opponent found",
    secureRoom:
      "Secure battle channel is active. Room code is hidden during matchmaking.",
    waitingSecond: "Waiting for a commander to join...",
    waitingMessage: "Waiting for opponent to ready up...",
    startDeployment: "Start Deployment",
    syncing: "Waiting...",
    openSlot: "Awaiting commander...",
    loadError: "Unable to load room information.",
    createError: "Unable to create room.",
    joinError: "Unable to join room.",
    readyError: "Unable to update ready status.",
  },
  vi: {
    title: "Phòng chiến đấu",
    intro: "Tạo phòng riêng hoặc nhập mã phòng để chuẩn bị trận PvP.",
    createTitle: "Tạo phòng",
    createBody: "Mở một kênh riêng để chơi với bạn bè.",
    createButton: "Tạo phòng",
    joinTitle: "Vào phòng",
    joinBody: "Nhập mã phòng đã nhận để kết nối.",
    joinButton: "Vào phòng",
    placeholder: "NHẬP MÃ PHÒNG",
    processing: "Đang xử lý...",
    copy: "Sao chép",
    copied: "Đã sao chép!",
    leaveRoom: "Rời phòng",
    leaveQueue: "Rời hàng chờ",
    ready: "Sẵn sàng",
    standby: "Chờ",
    matchmakingTitle: "Kênh ghép trận",
    casualBattle: "Đấu thường",
    rankedBattle: "Đấu hạng",
    queueStatus: "Trạng thái hàng chờ",
    searchingOpponent: "Đang tìm đối thủ...",
    opponentFound: "Đã tìm thấy đối thủ",
    secureRoom:
      "Kênh trận đấu đã được bảo mật. Mã phòng được ẩn trong chế độ ghép trận.",
    waitingSecond: "Đang chờ chỉ huy thứ hai vào phòng...",
    waitingMessage: "Đang chờ đối thủ sẵn sàng...",
    startDeployment: "Bắt đầu xếp tàu",
    syncing: "Đang chờ...",
    openSlot: "Đang chờ chỉ huy...",
    loadError: "Không thể tải thông tin phòng.",
    createError: "Không thể tạo phòng.",
    joinError: "Không thể vào phòng.",
    readyError: "Không thể cập nhật trạng thái sẵn sàng.",
  },
};

const MATCHMAKING_COPY = {
  en: {
    leaveQueue: "Leave Queue",
    matchmakingTitle: "Matchmaking Channel",
    casualBattle: "Casual Battle",
    rankedBattle: "Ranked Battle",
    queueStatus: "Queue Status",
    searchingOpponent: "Searching for an opponent...",
    opponentFound: "Opponent found",
    secureRoom:
      "Secure battle channel is active. Room code is hidden during matchmaking.",
  },
  vi: {
    leaveQueue: "Rời hàng chờ",
    matchmakingTitle: "Kênh ghép trận",
    casualBattle: "Đấu thường",
    rankedBattle: "Đấu hạng",
    queueStatus: "Trạng thái hàng chờ",
    searchingOpponent: "Đang tìm đối thủ...",
    opponentFound: "Đã tìm thấy đối thủ",
    secureRoom:
      "Kênh trận đấu đã được bảo mật. Mã phòng được ẩn trong chế độ ghép trận.",
  },
};

function Lobby() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user, attributes, loading: authLoading, logout } = useAuth();
  const { language } = useLanguage();
  const copy = LOBBY_COPY[language] || LOBBY_COPY.en;
  const initialRoomCode = searchParams.get("roomCode") || "";
  const [roomCodeInput, setRoomCodeInput] = useState(initialRoomCode);
  const [room, setRoom] = useState(null);
  const [loading, setLoading] = useState(Boolean(initialRoomCode));
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const [readyLoading, setReadyLoading] = useState(false);
  const [hasPlayedMatchFoundSound, setHasPlayedMatchFoundSound] =
    useState(false);

  const handleLogout = async () => {
    await logout();
    localStorage.removeItem("battleshipSession");
    navigate("/", { replace: true, state: { authEvent: "signed-out" } });
  };

  const [isLightMode, setIsLightMode] = useState(() => 
    document.documentElement.classList.contains('light-mode-active')
  );

  const handleToggleTheme = (event) => {
    const isDark = document.documentElement.classList.contains('light-mode-active');
    
    if (!document.startViewTransition) {
      document.documentElement.classList.toggle('light-mode-active');
      setIsLightMode(isDark);
      return;
    }

    const x = event.clientX;
    const y = event.clientY;
    const endRadius = Math.hypot(
      Math.max(x, innerWidth - x),
      Math.max(y, innerHeight - y)
    );

    const transition = document.startViewTransition(() => {
      document.documentElement.classList.toggle('light-mode-active');
      setIsLightMode(isDark);
    });

    transition.ready.then(() => {
      document.documentElement.animate(
        {
          clipPath: [
            `circle(0px at ${x}px ${y}px)`,
            `circle(${endRadius}px at ${x}px ${y}px)`
          ],
        },
        {
          duration: 700,
          easing: 'ease-in-out',
          pseudoElement: '::view-transition-new(root)',
        }
      );
    });
  };

  const player = useMemo(() => {
    const identity =
      attributes?.preferred_username ||
      attributes?.name ||
      attributes?.given_name ||
      attributes?.nickname ||
      attributes?.email ||
      user?.signInDetails?.loginId ||
      "Commander";

    const baseUserId =
      user?.userId || attributes?.sub || attributes?.email || "guest";

    return {
      userId: getRoomPlayerId(
        baseUserId,
        initialRoomCode || roomCodeInput || "global",
      ),
      baseUserId,
      displayName: identity,
      email: attributes?.email,
      avatarUrl: attributes?.picture || attributes?.avatarUrl,
    };
  }, [attributes, initialRoomCode, roomCodeInput, user]);

  useEffect(() => {
    if (!initialRoomCode) return undefined;

    let cancelled = false;

    const loadRoom = async () => {
      try {
        setLoading(true);
        setError("");
        const nextRoom = await getRoom(initialRoomCode);
        if (!cancelled) {
          setRoom(nextRoom);
        }
      } catch (loadError) {
        if (!cancelled) setError(loadError.message || copy.loadError);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    loadRoom();

    return () => {
      cancelled = true;
    };
  }, [copy.loadError, initialRoomCode]);

  useEffect(() => {
    if (!room?.roomCode) return undefined;

    const timer = window.setInterval(async () => {
      try {
        const nextRoom = await getRoom(room.roomCode);
        setRoom(nextRoom);
        if (nextRoom.status === "DEPLOYING") {
          navigate(`/game?mode=pvp&roomCode=${nextRoom.roomCode}`);
        }
      } catch {
        // Keep the current room visible; user actions will surface errors.
      }
    }, 2000);

    return () => window.clearInterval(timer);
  }, [navigate, room?.roomCode]);

  const handleCreateRoom = async () => {
    try {
      setLoading(true);
      setError("");
      setCopied(false);
      const nextRoom = await createRoom({ difficulty: "easy", player });
      setRoom(nextRoom);
      setRoomCodeInput(nextRoom.roomCode);
      setSearchParams({ roomCode: nextRoom.roomCode });
    } catch (createError) {
      setError(createError.message || copy.createError);
    } finally {
      setLoading(false);
    }
  };

  const handleJoinRoom = async (event) => {
    event.preventDefault();
    if (!roomCodeInput.trim()) return;

    try {
      setLoading(true);
      setError("");
      setCopied(false);
      const nextRoom = await joinRoom({ roomCode: roomCodeInput, player });
      setRoom(nextRoom);
      setRoomCodeInput(nextRoom.roomCode);
      setSearchParams({ roomCode: nextRoom.roomCode });
    } catch (joinError) {
      setError(joinError.message || copy.joinError);
    } finally {
      setLoading(false);
    }
  };

  const handleCopyRoomCode = async () => {
    if (!room?.roomCode) return;

    await navigator.clipboard.writeText(room.roomCode);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  };

  const handleLobbyReady = async () => {
    if (!room?.roomCode) return;

    try {
      setReadyLoading(true);
      setError("");
      const nextRoom = await markLobbyReady({
        roomCode: room.roomCode,
        player,
      });
      setRoom(nextRoom);

      if (nextRoom.status === "DEPLOYING") {
        navigate(`/game?mode=pvp&roomCode=${nextRoom.roomCode}`);
      }
    } catch (readyError) {
      setError(readyError.message || copy.readyError);
    } finally {
      setReadyLoading(false);
    }
  };

  const handleLeaveRoom = async (targetPath = "/") => {
    const roomCode = room?.roomCode;

    if (!roomCode) {
      setRoom(null);
      setSearchParams({});
      navigate(targetPath, { replace: targetPath === "/" });
      return;
    }

    try {
      setLoading(true);
      setError("");
      await leaveRoom({ roomCode, player });
      setRoom(null);
      setRoomCodeInput("");
      setSearchParams({});
      navigate(targetPath, { replace: targetPath === "/" });
    } catch (leaveError) {
      setError(leaveError.message || copy.loadError);
    } finally {
      setLoading(false);
    }
  };

  const handleHeaderNavigate = (targetPath) => {
    handleLeaveRoom(targetPath);
  };

  const currentPlayerInRoom = room?.players?.find(
    (roomPlayer) =>
      roomPlayer.userId === player.userId ||
      (roomPlayer.email && player.email && roomPlayer.email === player.email) ||
      (roomPlayer.baseUserId &&
        roomPlayer.baseUserId !== "guest" &&
        roomPlayer.baseUserId === player.baseUserId),
  );

  const isLobbyReady = Boolean(currentPlayerInRoom?.lobbyReady);
  const playerCount = room?.players?.length || 0;
  const isMatchmakingRoom = Boolean(
    room?.matchmakingMode || searchParams.get("matchmaking") === "1",
  );
  const matchmakingCopy = MATCHMAKING_COPY[language] || MATCHMAKING_COPY.en;
  const matchmakingLabel =
    room?.matchmakingMode === "ranked"
      ? matchmakingCopy.rankedBattle
      : matchmakingCopy.casualBattle;

  const playerSlots = room
    ? [
        ...(room.players || []),
        ...Array.from({ length: Math.max(0, 2 - playerCount) }, (_, index) => ({
          userId: `empty-${index}`,
          displayName: copy.openSlot,
          avatarUrl: "",
          lobbyReady: false,
          isEmpty: true,
        })),
      ]
    : [];

  const otherPlayer = room?.players?.find(
    (p) => p.userId !== currentPlayerInRoom?.userId,
  );
  const isOtherPlayerReady = Boolean(otherPlayer?.lobbyReady);

  // Play explosion sound when match is found in matchmaking room
  useEffect(() => {
    if (isMatchmakingRoom && playerCount >= 2) {
      if (!hasPlayedMatchFoundSound) {
        playSound("explosion");
        setHasPlayedMatchFoundSound(true);
      }
    } else {
      setHasPlayedMatchFoundSound(false);
    }
  }, [playerCount, isMatchmakingRoom, hasPlayedMatchFoundSound]);

  return (
    <div className="lobby-page">
      <CommandHeader
        currentUser={user}
        attributes={attributes}
        authLoading={authLoading}
        onLogout={handleLogout}
        onNavigateRequest={handleHeaderNavigate}
        isLightMode={isLightMode}
        onToggleTheme={handleToggleTheme}
      />

      <main className="lobby-shell">
        {!room ? (
          // State 1: User not in a room
          <section className="lobby-centered-container">
            <div className="lobby-centered-card">
              <h1 className="lobby-centered-title">{copy.title}</h1>
              <p className="lobby-centered-intro">{copy.intro}</p>

              <div className="lobby-action-group">
                <div className="lobby-action-section">
                  <h3>{copy.createTitle}</h3>
                  <p className="lobby-action-desc">{copy.createBody}</p>
                  <button
                    className="lobby-button primary-action"
                    type="button"
                    onClick={handleCreateRoom}
                    disabled={loading}
                  >
                    <span className="material-symbols-outlined">
                      add_circle
                    </span>
                    {loading ? copy.processing : copy.createButton}
                  </button>
                </div>

                <div className="lobby-divider">OR</div>

                <div className="lobby-action-section">
                  <h3>{copy.joinTitle}</h3>
                  <p className="lobby-action-desc">{copy.joinBody}</p>
                  <form
                    onSubmit={handleJoinRoom}
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: "10px",
                    }}
                  >
                    <input
                      className="lobby-input"
                      value={roomCodeInput}
                      onChange={(event) =>
                        setRoomCodeInput(event.target.value.toUpperCase())
                      }
                      placeholder={copy.placeholder}
                      maxLength={8}
                    />
                    <button
                      className="lobby-button secondary"
                      type="submit"
                      disabled={loading || !roomCodeInput.trim()}
                    >
                      <span className="material-symbols-outlined">login</span>
                      {copy.joinButton}
                    </button>
                  </form>
                </div>
              </div>

              {error && <div className="lobby-error">{error}</div>}
            </div>
          </section>
        ) : (
          // State 2 & 3: Room View
          <section
            className={`lobby-room-container ${isMatchmakingRoom ? "is-matchmaking-room" : ""}`}
          >
            {/* Left Column: Player Info */}
            <div className="lobby-panel">
              <h2 className="lobby-panel-title">
                Commanders ({playerCount}/2)
              </h2>
              <div className="lobby-player-list">
                {playerSlots.map((roomPlayer) => (
                  <div
                    className={`lobby-player ${roomPlayer.lobbyReady ? "is-ready" : ""} ${roomPlayer.isEmpty ? "is-empty" : ""}`}
                    key={roomPlayer.userId}
                  >
                    <span className="lobby-player-identity">
                      <span className="lobby-player-avatar">
                        {roomPlayer.avatarUrl ? (
                          <img
                            src={getAvatarCdnUrl(roomPlayer.avatarUrl)}
                            alt=""
                            referrerPolicy="no-referrer"
                            onError={(event) => {
                              event.currentTarget.src = COMMANDER_AVATAR;
                            }}
                          />
                        ) : roomPlayer.isEmpty ? (
                          <span className="material-symbols-outlined">
                            person_add
                          </span>
                        ) : (
                          <img src={COMMANDER_AVATAR} alt="" />
                        )}
                      </span>
                      <span className="lobby-player-name">
                        {roomPlayer.displayName}
                      </span>
                    </span>
                    <span
                      className={`lobby-player-state ${roomPlayer.lobbyReady ? "ready-text" : ""}`}
                    >
                      <i />
                      {roomPlayer.isEmpty
                        ? copy.standby
                        : roomPlayer.lobbyReady
                          ? copy.ready
                          : copy.standby}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Right Column: Actions & Controls */}
            <div
              className={`lobby-panel ${isMatchmakingRoom ? "is-matchmaking" : ""}`}
            >
              {isMatchmakingRoom ? (
                <div className="lobby-matchmaking-display">
                  <span className="lobby-mode-kicker">{matchmakingLabel}</span>
                  <h2>{matchmakingCopy.matchmakingTitle}</h2>
                  <div className="lobby-queue-orb" aria-hidden="true">
                    <span />
                  </div>
                  <p>{matchmakingCopy.secureRoom}</p>
                  <div className="lobby-queue-status">
                    <small>{matchmakingCopy.queueStatus}</small>
                    <strong>
                      {playerCount >= 2
                        ? matchmakingCopy.opponentFound
                        : matchmakingCopy.searchingOpponent}
                    </strong>
                  </div>
                  <button
                    className="lobby-button secondary lobby-leave-queue-button"
                    type="button"
                    disabled={loading}
                    onClick={() => handleLeaveRoom("/")}
                  >
                    <span className="material-symbols-outlined">logout</span>
                    {matchmakingCopy.leaveQueue}
                  </button>
                </div>
              ) : (
                <div className="lobby-room-code-display">
                  <small>Room Code</small>
                  <strong>{room.roomCode}</strong>
                  <div
                    style={{
                      display: "flex",
                      gap: "10px",
                      justifyContent: "center",
                      flexWrap: "wrap",
                    }}
                  >
                    <button
                      className="lobby-button secondary"
                      style={{
                        width: "auto",
                        padding: "0 20px",
                        height: "40px",
                      }}
                      type="button"
                      onClick={handleCopyRoomCode}
                    >
                      <span className="material-symbols-outlined">
                        {copied ? "done" : "content_copy"}
                      </span>
                      {copied ? copy.copied : copy.copy}
                    </button>
                    <button
                      className="lobby-button secondary"
                      style={{
                        width: "auto",
                        padding: "0 20px",
                        height: "40px",
                        borderColor: "rgba(255, 112, 112, 0.4)",
                        color: "#ffb7b7",
                      }}
                      type="button"
                      disabled={loading}
                      onClick={() => handleLeaveRoom("/")}
                    >
                      <span className="material-symbols-outlined">logout</span>
                      {copy.leaveRoom}
                    </button>
                  </div>
                </div>
              )}

              {error && (
                <div className="lobby-error" style={{ marginBottom: "20px" }}>
                  {error}
                </div>
              )}

              {/* Action Area based on State */}
              {playerCount < 2 ? (
                // State 3: Waiting for second player
                <div className="lobby-waiting-state">
                  <span className="material-symbols-outlined">radar</span>
                  <h3>Awaiting Connection</h3>
                  <p>{copy.waitingSecond}</p>
                </div>
              ) : (
                // State 2: Both players present
                <div className="lobby-mobile-sticky-action">
                  {isLobbyReady ? (
                    <div
                      className="lobby-waiting-state"
                      style={{ padding: "20px" }}
                    >
                      <span
                        className="material-symbols-outlined"
                        style={{ fontSize: "32px" }}
                      >
                        hourglass_top
                      </span>
                      <h3 style={{ fontSize: "18px", margin: 0 }}>
                        {copy.waitingMessage}
                      </h3>
                    </div>
                  ) : (
                    <button
                      className="lobby-button primary-action"
                      type="button"
                      disabled={readyLoading}
                      onClick={handleLobbyReady}
                    >
                      <span className="material-symbols-outlined">
                        task_alt
                      </span>
                      {readyLoading ? copy.syncing : copy.ready}
                    </button>
                  )}
                </div>
              )}
            </div>
          </section>
        )}
      </main>
    </div>
  );
}

export default Lobby;
