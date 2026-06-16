import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import CommandHeader from "../components/CommandHeader";
import { useAuth } from "../contexts/AuthContext";
import { useLanguage } from "../contexts/LanguageContext";
import { createRoom, getRoom, getRoomPlayerId, joinRoom, leaveRoom, markLobbyReady } from "../services/matchService";
import "./HomeHeader.css";
import "./Lobby.css";

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
    ready: "Ready",
    standby: "Standby",
    waitingSecond: "Waiting for a commander to join...",
    waitingMessage: "Waiting for opponent to ready up...",
    startDeployment: "Start Deployment",
    syncing: "Syncing...",
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
    copy: "Copy",
    copied: "Đã copy!",
    leaveRoom: "Rời phòng",
    ready: "Sẵn sàng",
    standby: "Chờ",
    waitingSecond: "Đang chờ chỉ huy thứ hai vào phòng...",
    waitingMessage: "Đang chờ đối thủ sẵn sàng...",
    startDeployment: "Bắt đầu xếp tàu",
    syncing: "Đang đồng bộ...",
    openSlot: "Đang chờ chỉ huy...",
    loadError: "Không thể tải thông tin phòng.",
    createError: "Không thể tạo phòng.",
    joinError: "Không thể vào phòng.",
    readyError: "Không thể cập nhật trạng thái sẵn sàng.",
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

  const player = useMemo(() => {
    const identity =
      attributes?.preferred_username ||
      attributes?.name ||
      attributes?.given_name ||
      attributes?.nickname ||
      attributes?.email ||
      user?.signInDetails?.loginId ||
      "Commander";

    const baseUserId = user?.userId || attributes?.sub || attributes?.email || "guest";

    return {
      userId: getRoomPlayerId(baseUserId, initialRoomCode || roomCodeInput || "global"),
      baseUserId,
      displayName: identity,
      email: attributes?.email,
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
      const nextRoom = await markLobbyReady({ roomCode: room.roomCode, player });
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

  const currentPlayerInRoom = room?.players?.find((roomPlayer) => (
    roomPlayer.userId === player.userId ||
    (roomPlayer.email && player.email && roomPlayer.email === player.email) ||
    (roomPlayer.baseUserId && roomPlayer.baseUserId === player.baseUserId)
  ));
  
  const isLobbyReady = Boolean(currentPlayerInRoom?.lobbyReady);
  const playerCount = room?.players?.length || 0;
  
  const playerSlots = room
    ? [
      ...(room.players || []),
      ...Array.from({ length: Math.max(0, 2 - playerCount) }, (_, index) => ({
        userId: `empty-${index}`,
        displayName: copy.openSlot,
        lobbyReady: false,
        isEmpty: true,
      })),
    ]
    : [];

  const otherPlayer = room?.players?.find(p => p.userId !== currentPlayerInRoom?.userId);
  const isOtherPlayerReady = Boolean(otherPlayer?.lobbyReady);

  return (
    <div className="lobby-page">
      <CommandHeader
        currentUser={user}
        attributes={attributes}
        authLoading={authLoading}
        onLogout={logout}
        onNavigateRequest={handleHeaderNavigate}
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
                    <span className="material-symbols-outlined">add_circle</span>
                    {loading ? copy.processing : copy.createButton}
                  </button>
                </div>
                
                <div className="lobby-divider">OR</div>
                
                <div className="lobby-action-section">
                  <h3>{copy.joinTitle}</h3>
                  <p className="lobby-action-desc">{copy.joinBody}</p>
                  <form onSubmit={handleJoinRoom} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <input
                      className="lobby-input"
                      value={roomCodeInput}
                      onChange={(event) => setRoomCodeInput(event.target.value.toUpperCase())}
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
          <section className="lobby-room-container">
            {/* Left Column: Player Info */}
            <div className="lobby-panel">
              <h2 className="lobby-panel-title">Commanders ({playerCount}/2)</h2>
              <div className="lobby-player-list">
                {playerSlots.map((roomPlayer) => (
                  <div
                    className={`lobby-player ${roomPlayer.lobbyReady ? "is-ready" : ""} ${roomPlayer.isEmpty ? "is-empty" : ""}`}
                    key={roomPlayer.userId}
                  >
                    <span className="lobby-player-name">{roomPlayer.displayName}</span>
                    <span className={`lobby-player-state ${roomPlayer.lobbyReady ? "ready-text" : ""}`}>
                      <i />
                      {roomPlayer.isEmpty ? copy.standby : roomPlayer.lobbyReady ? copy.ready : copy.standby}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Right Column: Actions & Controls */}
            <div className="lobby-panel">
              <div className="lobby-room-code-display">
                <small>Room Code</small>
                <strong>{room.roomCode}</strong>
                <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', flexWrap: 'wrap' }}>
                  <button 
                    className="lobby-button secondary" 
                    style={{ width: 'auto', padding: '0 20px', height: '40px' }} 
                    type="button" 
                    onClick={handleCopyRoomCode}
                  >
                    <span className="material-symbols-outlined">{copied ? "done" : "content_copy"}</span>
                    {copied ? copy.copied : copy.copy}
                  </button>
                  <button 
                    className="lobby-button secondary" 
                    style={{ width: 'auto', padding: '0 20px', height: '40px', borderColor: 'rgba(255, 112, 112, 0.4)', color: '#ffb7b7' }} 
                    type="button" 
                    disabled={loading}
                    onClick={() => handleLeaveRoom("/")}
                  >
                    <span className="material-symbols-outlined">logout</span>
                    {copy.leaveRoom}
                  </button>
                </div>
              </div>

              {error && <div className="lobby-error" style={{ marginBottom: '20px' }}>{error}</div>}

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
                    <div className="lobby-waiting-state" style={{ padding: '20px' }}>
                      <span className="material-symbols-outlined" style={{ fontSize: '32px' }}>hourglass_top</span>
                      <h3 style={{ fontSize: '18px', margin: 0 }}>{copy.waitingMessage}</h3>
                    </div>
                  ) : (
                    <button
                      className="lobby-button primary-action"
                      type="button"
                      disabled={readyLoading}
                      onClick={handleLobbyReady}
                    >
                      <span className="material-symbols-outlined">
                        {isOtherPlayerReady ? "rocket_launch" : "task_alt"}
                      </span>
                      {readyLoading ? copy.syncing : (isOtherPlayerReady ? copy.startDeployment : copy.ready)}
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
