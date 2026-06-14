import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import CommandHeader from "../components/CommandHeader";
import { useAuth } from "../contexts/AuthContext";
import { useLanguage } from "../contexts/LanguageContext";
import { createRoom, getRoom, getRoomPlayerId, joinRoom, markLobbyReady } from "../services/matchService";
import "./HomeHeader.css";
import "./Lobby.css";

const LOBBY_COPY = {
  en: {
    kicker: "Private Command Channel",
    title: "Battle Room",
    intro: "Create a private room or enter a room code to prepare for PvP. When two commanders are present, both must press Ready to enter fleet deployment.",
    createTitle: "Create room",
    createBody: "Open a private command channel, then send the room code to the second player.",
    createButton: "Create room",
    joinTitle: "Join room",
    joinBody: "Paste a received room code. Player status will stay synchronized.",
    joinButton: "Join room",
    processing: "Processing",
    roomStatus: "Room status",
    roomCode: "Room code",
    copy: "Copy",
    copied: "Copied",
    players: "Players",
    ready: "Ready",
    standby: "Standby",
    waitingSecond: "Waiting for the second player. Status refreshes every 5 seconds.",
    readyInstruction: "Both players are present. Press Ready to enter fleet deployment.",
    updated: "Updated:",
    waitTwo: "Waiting for 2 players",
    waitingOpponent: "Waiting opponent",
    syncing: "Syncing",
    empty: "No room selected. Create a new room or enter a room code to begin.",
    openSlot: "Awaiting commander",
    loadError: "Unable to load room information.",
    createError: "Unable to create room.",
    joinError: "Unable to join room.",
    readyError: "Unable to update ready status.",
  },
  vi: {
    kicker: "Kênh chỉ huy riêng",
    title: "Phòng chiến đấu",
    intro: "Tạo phòng riêng hoặc nhập mã phòng để chuẩn bị trận PvP. Khi đủ hai chỉ huy, cả hai bấm Sẵn sàng để vào màn xếp tàu.",
    createTitle: "Tạo phòng",
    createBody: "Mở một kênh riêng, sau đó gửi mã phòng cho người chơi thứ hai.",
    createButton: "Tạo phòng",
    joinTitle: "Vào phòng",
    joinBody: "Dán mã phòng đã nhận. Trạng thái người chơi sẽ được đồng bộ.",
    joinButton: "Vào phòng",
    processing: "Đang xử lý",
    roomStatus: "Trạng thái phòng",
    roomCode: "Mã phòng",
    copy: "Copy",
    copied: "Đã copy",
    players: "Người chơi",
    ready: "Sẵn sàng",
    standby: "Chờ",
    waitingSecond: "Đang chờ người chơi thứ hai. Trạng thái tự cập nhật mỗi 5 giây.",
    readyInstruction: "Đã đủ người chơi. Cả hai bấm Sẵn sàng để vào màn xếp tàu.",
    updated: "Cập nhật:",
    waitTwo: "Chờ đủ 2 người",
    waitingOpponent: "Đang chờ đối thủ",
    syncing: "Đang đồng bộ",
    empty: "Chưa có phòng nào được chọn. Tạo phòng mới hoặc nhập mã phòng để bắt đầu.",
    openSlot: "Đang chờ chỉ huy",
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
  const [lastUpdatedAt, setLastUpdatedAt] = useState("");
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
          setLastUpdatedAt(new Date().toLocaleTimeString());
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
        setLastUpdatedAt(new Date().toLocaleTimeString());
        if (nextRoom.status === "DEPLOYING") {
          navigate(`/game?mode=pvp&roomCode=${nextRoom.roomCode}`);
        }
      } catch {
        // Keep the current room visible; user actions will surface errors.
      }
    }, 5000);

    return () => window.clearInterval(timer);
  }, [navigate, room?.roomCode]);

  const handleCreateRoom = async () => {
    try {
      setLoading(true);
      setError("");
      setCopied(false);
      const nextRoom = await createRoom({ difficulty: "easy", player });
      setRoom(nextRoom);
      setLastUpdatedAt(new Date().toLocaleTimeString());
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

    try {
      setLoading(true);
      setError("");
      setCopied(false);
      const nextRoom = await joinRoom({ roomCode: roomCodeInput, player });
      setRoom(nextRoom);
      setLastUpdatedAt(new Date().toLocaleTimeString());
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
      setLastUpdatedAt(new Date().toLocaleTimeString());

      if (nextRoom.status === "DEPLOYING") {
        navigate(`/game?mode=pvp&roomCode=${nextRoom.roomCode}`);
      }
    } catch (readyError) {
      setError(readyError.message || copy.readyError);
    } finally {
      setReadyLoading(false);
    }
  };

  const currentPlayerInRoom = room?.players?.find((roomPlayer) => (
    roomPlayer.userId === player.userId ||
    (roomPlayer.email && player.email && roomPlayer.email === player.email) ||
    (roomPlayer.baseUserId && roomPlayer.baseUserId === player.baseUserId)
  ));
  const isLobbyReady = Boolean(currentPlayerInRoom?.lobbyReady);
  const playerCount = room?.players?.length || 0;
  const readyCount = room?.players?.filter((roomPlayer) => roomPlayer.lobbyReady).length || 0;
  const readinessPercent = Math.round((readyCount / 2) * 100);
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

  return (
    <div className="lobby-page">
      <CommandHeader
        currentUser={user}
        attributes={attributes}
        authLoading={authLoading}
        onLogout={logout}
      />

      <main className="lobby-shell">
        <section className="lobby-command">
          <div className="lobby-panel lobby-hero">
            <div className="lobby-heading-row">
              <div>
                <span className="lobby-kicker">{copy.kicker}</span>
                <h1 className="lobby-title">{copy.title}</h1>
                <p className="lobby-copy">{copy.intro}</p>
              </div>
              <div className="lobby-radar-badge" aria-hidden="true">
                <span className="material-symbols-outlined">radar</span>
              </div>
            </div>

            <div className="lobby-actions">
              <article className="lobby-card">
                <div className="lobby-card-title">
                  <span className="material-symbols-outlined">add_home</span>
                  <h2>{copy.createTitle}</h2>
                </div>
                <p>{copy.createBody}</p>
                <button className="lobby-button" type="button" onClick={handleCreateRoom} disabled={loading}>
                  <span className="material-symbols-outlined">add_circle</span>
                  {loading ? copy.processing : copy.createButton}
                </button>
              </article>

              <article className="lobby-card">
                <div className="lobby-card-title">
                  <span className="material-symbols-outlined">login</span>
                  <h2>{copy.joinTitle}</h2>
                </div>
                <p>{copy.joinBody}</p>
                <form onSubmit={handleJoinRoom}>
                  <input
                    className="lobby-input"
                    value={roomCodeInput}
                    onChange={(event) => setRoomCodeInput(event.target.value.toUpperCase())}
                    placeholder="ABC123"
                    maxLength={8}
                  />
                  <div style={{ height: 12 }} />
                  <button className="lobby-button secondary" type="submit" disabled={loading || !roomCodeInput.trim()}>
                    <span className="material-symbols-outlined">login</span>
                    {copy.joinButton}
                  </button>
                </form>
              </article>
            </div>

            {error && <div className="lobby-error">{error}</div>}
          </div>

          <aside className="lobby-panel lobby-status">
            <div className="lobby-status-head">
              <span className="lobby-kicker">{copy.roomStatus}</span>
              {room && <span className={`lobby-state-chip is-${String(room.status).toLowerCase()}`}>{room.status}</span>}
            </div>
            {room ? (
              <>
                <div className="lobby-room-code">
                  <div>
                    <small>{copy.roomCode}</small>
                    <strong>{room.roomCode}</strong>
                  </div>
                  <button className="lobby-button secondary" type="button" onClick={handleCopyRoomCode}>
                    <span className="material-symbols-outlined">{copied ? "done" : "content_copy"}</span>
                    {copied ? copy.copied : copy.copy}
                  </button>
                </div>

                <div className="lobby-readiness">
                  <div>
                    <span>{copy.players}</span>
                    <strong>{playerCount}/2</strong>
                  </div>
                  <div>
                    <span>{copy.ready}</span>
                    <strong>{readyCount}/2</strong>
                  </div>
                </div>

                <div className="lobby-progress" aria-hidden="true">
                  <span style={{ width: `${readinessPercent}%` }} />
                </div>

                <div className="lobby-player-list">
                  {playerSlots.map((roomPlayer) => (
                    <div
                      className={`lobby-player ${roomPlayer.lobbyReady ? "is-ready" : ""} ${roomPlayer.isEmpty ? "is-empty" : ""}`}
                      key={roomPlayer.userId}
                    >
                      <span className="lobby-player-name">{roomPlayer.displayName}</span>
                      <span className="lobby-player-state">
                        <i />
                        {roomPlayer.isEmpty ? copy.standby : roomPlayer.lobbyReady ? copy.ready : copy.standby}
                      </span>
                    </div>
                  ))}
                </div>

                <p className="lobby-sync-note">
                  {playerCount < 2 ? copy.waitingSecond : copy.readyInstruction}
                  {lastUpdatedAt && <span> {copy.updated} {lastUpdatedAt}</span>}
                </p>

                <button
                  className="lobby-button"
                  type="button"
                  disabled={playerCount < 2 || readyLoading || isLobbyReady}
                  onClick={handleLobbyReady}
                >
                  <span className="material-symbols-outlined">{isLobbyReady ? "hourglass_top" : "task_alt"}</span>
                  {playerCount < 2
                    ? copy.waitTwo
                    : isLobbyReady
                      ? copy.waitingOpponent
                      : readyLoading
                        ? copy.syncing
                        : copy.ready}
                </button>
              </>
            ) : (
              <p className="lobby-empty">{copy.empty}</p>
            )}
          </aside>
        </section>
      </main>
    </div>
  );
}

export default Lobby;
