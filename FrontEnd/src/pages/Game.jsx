import {
  Suspense,
  lazy,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import CommandHeader from "../components/CommandHeader";
import { setPreferredLightMode } from "../utils/themePreference";
import ship1 from "../assets/ships/image/ship-1.webp";
import ship10 from "../assets/ships/image/ship-10.webp";
import ship2 from "../assets/ships/image/ship-2.webp";
import ship3 from "../assets/ships/image/ship-3.webp";
import ship4 from "../assets/ships/image/ship-4.webp";
import ship5 from "../assets/ships/image/ship-5.webp";
import ship6 from "../assets/ships/image/ship-6.webp";
import ship7 from "../assets/ships/image/ship-7.webp";
import ship8 from "../assets/ships/image/ship-8.webp";
import ship9 from "../assets/ships/image/ship-9.webp";
import GameResultModal from "../components/GameResultModal";
import { PvpCommandStrip, PvpCommsPanel } from "../components/PvpBattlePanels";
import { useAuth } from "../contexts/AuthContext";
import { useLanguage } from "../contexts/LanguageContext";
import logoImg from "../assets/logo/logo.webp";
import BattleEffectsLayer from "../game/BattleEffectsLayer";
import {
  canPlaceShip,
  checkVictory,
  createBoard,
  fireAt,
  getConnectedComponents,
  getShipBounds,
  getShipOffsets,
  markWaterAroundSunkShip,
  placeShip,
  placeShipsRandomly,
  SHIP_DEFS,
} from "../game/GameLogic";
import { getBotMove, resetBotAI } from "../game/botAI";
import {
  createRoomSocket,
  getRoom,
  getRoomPlayerId,
  leaveRoom,
  markPlayerReady,
  resetRoomForRematch,
  sendSocketMessage,
} from "../services/matchService";
import { playSound } from "../services/soundService";
import "./GameEffects.css";

const RankUpAnimation = lazy(() => import("../components/RankUpAnimation"));

const BOARD_SIZE = 10;
const CELL_SIZE = 35;
const CELL_GAP = 2;
const COORD_HEADER_HEIGHT = 24;
const SHIP_CELL_PADDING = 0;
const SHIP_IMAGE_SCALE = 1.22;
const L_SHIP_IMAGE_SCALE = 1.15;
const SHIP_IMAGE_OFFSET_X = 6;
const SHIP_IMAGE_OFFSET_Y = -6;
const L_SHIP_IMAGE_OFFSET_X = -20;
const L_SHIP_IMAGE_OFFSET_Y = 6;
const PATROL_IMAGE_OFFSET_X = 6;
const PATROL_IMAGE_OFFSET_Y = 0;
const PATROL_VERTICAL_IMAGE_OFFSET_X = 1.5;
const PATROL_VERTICAL_IMAGE_OFFSET_Y = 8;

// Visual calibration for the two T-shaped sprites. Adjust these values per angle
// without changing the occupied board cells in GameLogic.js.
const T_SHIP_IMAGE_TRANSFORMS = {
  gunboat: {
    // ship-5.png is portrait, so its image needs +90 degrees relative to
    // the board footprint (three horizontal cells with the center cell above).
    0: { x: -2, y: 20, scale: 1.45, rotation: 90 },
    90: { x: -20, y: -4, scale: 1.45, rotation: 180 },
    180: { x: 4, y: -20, scale: 1.45, rotation: 270 },
    270: { x: 20, y: 4, scale: 1.45, rotation: 360 },
  },
  warship: {
    0: { x: 0, y: -8, scale: 1, rotation: 0 },
    90: { x: 8, y: 0, scale: 1, rotation: 90 },
    180: { x: 0, y: 6, scale: 1, rotation: 180 },
    270: { x: -6, y: 0, scale: 1, rotation: 270 },
  },
};
const GRID_SIZE_PX = BOARD_SIZE * CELL_SIZE + (BOARD_SIZE - 1) * CELL_GAP;
const FLEET_CELL_LIMIT = 15;
const FLEET_MIN_SHIPS = 2;
const FLEET_MAX_SHIPS = 4;

const BOT_CUSTOM_FLEETS = [
  [
    {
      id: "custom-bot-1-1",
      label: "Custom 1",
      size: 6,
      baseOffsets: [
        [0, 0],
        [0, 1],
        [0, 2],
        [1, 1],
        [2, 1],
        [2, 2],
      ],
      rotations: [0, 90, 180, 270],
    },
    {
      id: "custom-bot-1-2",
      label: "Custom 2",
      size: 5,
      baseOffsets: [
        [0, 0],
        [1, 0],
        [1, 1],
        [2, 1],
        [3, 1],
      ],
      rotations: [0, 90, 180, 270],
    },
    {
      id: "custom-bot-1-3",
      label: "Custom 3",
      size: 4,
      baseOffsets: [
        [0, 0],
        [0, 1],
        [1, 0],
        [1, 1],
      ],
      rotations: [0, 90, 180, 270],
    },
  ],
  [
    {
      id: "custom-bot-2-1",
      label: "Custom 1",
      size: 7,
      baseOffsets: [
        [0, 1],
        [1, 1],
        [2, 1],
        [3, 1],
        [1, 0],
        [1, 2],
        [2, 0],
      ],
      rotations: [0, 90, 180, 270],
    },
    {
      id: "custom-bot-2-2",
      label: "Custom 2",
      size: 5,
      baseOffsets: [
        [0, 0],
        [0, 1],
        [0, 2],
        [1, 0],
        [2, 0],
      ],
      rotations: [0, 90, 180, 270],
    },
    {
      id: "custom-bot-2-3",
      label: "Custom 3",
      size: 3,
      baseOffsets: [
        [0, 0],
        [1, 0],
        [1, 1],
      ],
      rotations: [0, 90, 180, 270],
    },
  ],
  [
    {
      id: "custom-bot-3-1",
      label: "Custom 1",
      size: 8,
      baseOffsets: [
        [0, 0],
        [0, 1],
        [0, 2],
        [1, 1],
        [2, 1],
        [2, 0],
        [2, 2],
        [3, 1],
      ],
      rotations: [0, 90, 180, 270],
    },
    {
      id: "custom-bot-3-2",
      label: "Custom 2",
      size: 5,
      baseOffsets: [
        [0, 0],
        [0, 1],
        [1, 1],
        [2, 1],
        [2, 2],
      ],
      rotations: [0, 90, 180, 270],
    },
    {
      id: "custom-bot-3-3",
      label: "Custom 3",
      size: 2,
      baseOffsets: [
        [0, 0],
        [0, 1],
      ],
      rotations: [0, 90, 180, 270],
    },
  ],
  [
    {
      id: "custom-bot-4-1",
      label: "Custom 1",
      size: 5,
      baseOffsets: [
        [0, 0],
        [0, 1],
        [0, 2],
        [1, 1],
        [2, 1],
      ],
      rotations: [0, 90, 180, 270],
    },
    {
      id: "custom-bot-4-2",
      label: "Custom 2",
      size: 5,
      baseOffsets: [
        [0, 1],
        [1, 1],
        [1, 0],
        [2, 0],
        [2, 1],
      ],
      rotations: [0, 90, 180, 270],
    },
    {
      id: "custom-bot-4-3",
      label: "Custom 3",
      size: 5,
      baseOffsets: [
        [0, 0],
        [0, 1],
        [1, 0],
        [1, 1],
        [2, 0],
      ],
      rotations: [0, 90, 180, 270],
    },
  ],
];

const getLegalFleetSelections = (shipDefs) => {
  const selections = [];

  const collect = (startIndex, selected) => {
    const totalCells = selected.reduce((total, ship) => total + ship.size, 0);
    if (
      selected.length >= FLEET_MIN_SHIPS &&
      selected.length <= FLEET_MAX_SHIPS &&
      totalCells === FLEET_CELL_LIMIT
    ) {
      selections.push([...selected]);
    }
    if (selected.length >= FLEET_MAX_SHIPS || totalCells >= FLEET_CELL_LIMIT) {
      return;
    }

    for (let index = startIndex; index < shipDefs.length; index += 1) {
      collect(index + 1, [...selected, shipDefs[index]]);
    }
  };

  collect(0, []);
  return selections;
};

const CUSTOM_SHIPYARD_CELL_BUDGET = 15;
const CUSTOM_SHIPYARD_MIN_SHIPS = 2;
const CUSTOM_SHIPYARD_MAX_SHIPS = 4;
const CUSTOM_SHIPYARD_MIN_SHIP_SIZE = 2;
const CUSTOM_SHIPYARD_MAX_SHIP_SIZE = 13;

const GAME_COPY = {
  en: {
    ready: "Ready",
    syncing: "Waiting",
    waitingPlayer: "Waiting player",
    exitTitle: "Leave battle?",
    exitBody:
      "Your current PvP match will be forfeited. The other commander will be declared the winner.",
    stay: "Stay",
    leave: "Leave match",
    opponentLeftTitle: "Victory",
    opponentLeftBody: "Opponent left the battle. Sector secured by default.",
    victoryTitle: "Victory",
    defeatTitle: "Defeat",
    difficultyLabel: "Difficulty",
    difficultyNames: {
      easy: "Recruit (Easy)",
      normal: "Veteran (Normal)",
      hard: "Elite (Hard)",
    },
    pvpVictorySubtitle: "Enemy command channel neutralized.",
    pvpDefeatSubtitle: "Your fleet has been shattered in PvP combat.",
    playAgain: "Play again",
    returnHome: "Return home",
    opponentLeftLog: "Opponent left the battle. Victory secured.",
    waitingFleetLog: "Fleet deployed. Waiting for the opponent fleet.",
    bothReadyLog: "Both commanders are ready. Battle channel is active.",
    unableRefreshReadiness: "Unable to refresh room readiness.",
    unableLeaveCleanly: "Unable to leave room cleanly.",
    unableResetRematch: "Unable to reset room for rematch.",
    youLeftMatch: "You left the match.",
    opponentLeftMatch: "Opponent left the match.",
    timeUp: "Time is up! Turn passes to enemy.",
    yourTurnStarted: "Your turn started.",
    waitingOpponentMove: "Waiting for opponent move through the room channel.",
    enemyThinking: "Enemy is thinking...",
    enemyDestroyedYourShip:
      "Enemy destroyed your ship (size {size}) at {cell}!",
    enemyHitYourShip: "Enemy hit your ship at {cell}!",
    enemyMissedAt: "Enemy missed at {cell}.",
    youDestroyedEnemyShip:
      "You destroyed an enemy ship (size {size}) at {cell}!",
    directHitAt: "Direct hit at {cell}!",
    missedAt: "Missed at {cell}.",
    roomStillConnecting: "Room channel is still connecting. Wait a moment.",
    opponentUnavailable: "Opponent is not available in this room.",
    waitingOpponentTurn: "Waiting for opponent turn.",
    roomReconnecting: "Room channel is reconnecting. Try that shot again.",
    waitingShotResult: "Waiting for opponent shot result...",
    shotTimedOut: "Shot result timed out. Try firing again.",
    roomConnected: "Room channel connected.",
    roomConnectionFailed: "Room channel connection failed.",
    roomNotConfigured: "Room channel is not configured.",
    enemyWatersSynced:
      "Enemy waters synced. Shot results will be verified by opponent fleet.",
    returnedShipStaging: "Returned ship to staging dock.",
    cannotRotateHere: "Cannot rotate here. Area blocked.",
    invalidPlacementReturned:
      "Invalid placement. Ship returned to original position.",
    fleetDeployedReview: "Fleet deployed. Review the formation or press Ready.",
    invalidPlacementPosition: "Invalid placement position.",
    autoArrangedLog:
      "Fleet auto-arranged. Press again for another formation or press Ready.",
    battleInitiated: "Battle initiated!",
    unableMarkReady: "Unable to mark fleet ready.",
    totalTurns: "Total Turns",
    totalShots: "Total Shots",
    hitsMisses: "Hits / Misses",
    accuracy: "Accuracy",
    reason: "Reason",
    rankedResult: "Ranked Result",
    victoryLog: "VICTORY! Enemy fleet destroyed!",
    defeatLog: "DEFEAT! Your fleet was destroyed.",
    sectorSecured: "Sector Secured!",
    fleetAnnihilated: "Fleet Annihilated!",
    customShipyardToggle: "Custom Shipyard",
    customShipyardToggleBack: "Standard Mode",
    customShipyardClear: "Clear",
    customShipyardCellsDetected: "Cells detected",
    customShipyardShipsDetected: "Ships detected",
    customShipyardBudget: "{used}/15 cells used",
    customShipyardHint:
      "Paint your fleet. Tap cells to toggle. Orthogonal adjacency only.",
    customShipyardRuleMinShips: "Need at least 2 ships (connected groups).",
    customShipyardRuleMaxShips: "Max 4 ships (connected groups).",
    customShipyardRuleMinSize: "Each ship must have at least 2 cells.",
    customShipyardRuleMaxSize: "Each ship can have at most 13 cells.",
    customShipyardRuleExact: "Paint exactly 15 cells total.",
    customShipyardReady: "Fleet valid! Press Ready.",
    dragShipsInstructions:
      "Drag ships from staging onto your map. Right-click to rotate.",
    formationCompleteInstructions:
      "Formation complete. Adjust ships, auto-arrange again, or press Ready.",
    moveSelectedShipInstructions:
      "Move the selected ship or right-click to rotate it, then press Ready.",
    selectShipInstructions:
      "Select any ship to move or rotate it, then press Ready.",
    yourTurn: "Your turn! Target enemy waters.",
    enemyFiring: "Enemy is firing! Brace for impact!",
    connectingRoom: "Room {roomCode}: connecting room channel...",
    waitingOpponentFleet:
      "Room {roomCode}: fleet deployed. Waiting for opponent fleet.",
    channelConnected: "Room {roomCode}: battle channel connected.",
    yourTurnPvp: "Room {roomCode}: your turn.",
    opponentTurnPvp: "Room {roomCode}: opponent turn.",
    deployFleet: "Deploy Your Fleet",
    sectorCommand: "Sector Command",
    timeLabel: "Time",
    enemyWatersScan: "Enemy Waters (Scanning...)",
    enemyWaters: "Enemy Waters",
    enemyFleetScan: "Enemy Fleet (Scanning...)",
    enemyFleet: "Enemy Fleet",
    yourFleet: "Your Fleet",
    fleetStaging: "Fleet Staging",
    shipsRemaining: "{count} ships remaining",
    autoArrange: "AUTO ARRANGE",
    deployed: "Deployed",
    cellsLabel: "cells",
    fleetRules: "Fleet: exactly 15 cells, from 2 to 4 ships.",
    fleetFilterAll: "All",
    fleetCellsUsed: "{used}/15 cells",
    fleetShipsUsed: "{used}/4 ships",
    fleetTooManyCells: "The fleet cannot exceed 15 cells.",
    fleetTooManyShips: "The fleet cannot contain more than 4 ships.",
    fleetTooFewShips: "Select at least 2 ships.",
    fleetNeedExactCells: "The fleet must occupy exactly 15 cells.",
    fleetValid: "Fleet formation is valid.",
    commanderPanel: "Commander",
    opponentPanel: "Opponent",
    emotionsTab: "Emotes",
    shipsTab: "Fleet signals",
    chatEventLog: "Chat & event log",
    battleChat: "Chat",
    eventLog: "Log",
    chatPlaceholder: "Send a tactical message...",
    sendChat: "Send message",
    awaitingSignal: "Awaiting battle signals...",
    connectedStatus: "Channel online",
    disconnectedStatus: "Channel offline",
    yourTurnStatus: "Your turn",
    opponentTurnStatus: "Opponent turn",
    deployingStatus: "Deploying fleet",
    readyStatus: "Ready",
    shipsAfloat: "{count} ships afloat",
    unrankedLabel: "UNRANKED",
    shipLabel: "Ship",
    enemyShipSunkAnnouncement: "Enemy {ship} sunk!",
    yourShipSunkAnnouncement: "Your {ship} sunk!",
  },
  vi: {
    ready: "Sẵn sàng",
    syncing: "Đang chờ",
    waitingPlayer: "Chờ người chơi",
    exitTitle: "Thoát trận?",
    exitBody:
      "Trận PvP hiện tại sẽ bị hủy. Đối thủ sẽ được tính thắng vì bạn rời trận.",
    stay: "Ở lại",
    leave: "Thoát trận",
    opponentLeftTitle: "Chiến thắng",
    opponentLeftBody: "Đối thủ đã rời trận. Khu vực đã được bảo toàn.",
    victoryTitle: "Chiến thắng",
    defeatTitle: "Thất bại",
    difficultyLabel: "Độ khó",
    difficultyNames: {
      easy: "Tân binh (Dễ)",
      normal: "Cựu binh (Trung bình)",
      hard: "Tinh nhuệ (Khó)",
    },
    pvpVictorySubtitle: "Kênh chỉ huy đối phương đã bị vô hiệu hóa.",
    pvpDefeatSubtitle: "Hạm đội của bạn đã vỡ trận trong chiến đấu PvP.",
    playAgain: "Chơi lại",
    returnHome: "Về trang chủ",
    opponentLeftLog: "Đối thủ đã rời trận. Bạn giành chiến thắng.",
    waitingFleetLog: "Đã triển khai hạm đội. Đang chờ đối thủ xếp tàu.",
    bothReadyLog: "Cả hai chỉ huy đã sẵn sàng. Kênh chiến đấu đã hoạt động.",
    unableRefreshReadiness: "Không thể cập nhật trạng thái sẵn sàng của phòng.",
    unableLeaveCleanly: "Không thể rời phòng gọn gàng.",
    unableResetRematch: "Không thể đặt lại phòng để tái đấu.",
    youLeftMatch: "Bạn đã rời trận.",
    opponentLeftMatch: "Đối phương đã rời trận.",
    timeUp: "Hết giờ! Lượt chuyển sang đối thủ.",
    yourTurnStarted: "Bắt đầu lượt của bạn.",
    waitingOpponentMove: "Đang chờ đối thủ đi qua kênh phòng.",
    enemyThinking: "Đối thủ đang suy nghĩ...",
    enemyDestroyedYourShip:
      "Đối thủ đã phá hủy tàu của bạn (cỡ {size}) tại {cell}!",
    enemyHitYourShip: "Đối thủ bắn trúng tàu của bạn tại {cell}!",
    enemyMissedAt: "Đối thủ bắn trượt tại {cell}.",
    youDestroyedEnemyShip: "Bạn đã phá hủy tàu địch (cỡ {size}) tại {cell}!",
    directHitAt: "Bắn trúng tại {cell}!",
    missedAt: "Bắn trượt tại {cell}.",
    roomStillConnecting: "Kênh phòng vẫn đang kết nối. Chờ một chút.",
    opponentUnavailable: "Không tìm thấy đối thủ trong phòng này.",
    waitingOpponentTurn: "Đang chờ lượt đối thủ.",
    roomReconnecting: "Kênh phòng đang kết nối lại. Hãy bắn lại.",
    waitingShotResult: "Đang chờ kết quả phát bắn từ đối thủ...",
    shotTimedOut: "Quá thời gian nhận kết quả. Hãy bắn lại.",
    roomConnected: "Đã kết nối kênh phòng.",
    roomConnectionFailed: "Kết nối kênh phòng thất bại.",
    roomNotConfigured: "Kênh phòng chưa được cấu hình.",
    enemyWatersSynced:
      "Đã đồng bộ vùng biển địch. Kết quả bắn sẽ được xác minh bởi hạm đội đối thủ.",
    returnedShipStaging: "Đã đưa tàu về bến chờ.",
    cannotRotateHere: "Không thể xoay tại đây. Khu vực bị chặn.",
    invalidPlacementReturned: "Vị trí không hợp lệ. Tàu đã trở lại vị trí cũ.",
    fleetDeployedReview:
      "Đã triển khai hạm đội. Kiểm tra đội hình hoặc nhấn Sẵn sàng.",
    invalidPlacementPosition: "Vị trí đặt tàu không hợp lệ.",
    autoArrangedLog:
      "Đã tự sắp xếp hạm đội. Nhấn lần nữa để đổi đội hình hoặc nhấn Sẵn sàng.",
    battleInitiated: "Trận chiến bắt đầu!",
    unableMarkReady: "Không thể đánh dấu hạm đội sẵn sàng.",
    totalTurns: "Tổng lượt",
    totalShots: "Tổng phát bắn",
    hitsMisses: "Trúng / Trượt",
    accuracy: "Độ chính xác",
    reason: "Lý do",
    rankedResult: "Kết quả xếp hạng",
    victoryLog: "CHIẾN THẮNG! Hạm đội đối phương đã bị tiêu diệt!",
    defeatLog: "THẤT BẠI! Hạm đội của bạn đã bị tiêu diệt.",
    sectorSecured: "Đánh chiếm quá hay!",
    fleetAnnihilated: "Hạm đội bị tiêu diệt!",
    customShipyardToggle: "Xưởng Đóng Tàu",
    customShipyardToggleBack: "Chế độ thường",
    customShipyardClear: "Xóa",
    customShipyardCellsDetected: "Số ô phát hiện",
    customShipyardShipsDetected: "Số tàu phát hiện",
    customShipyardBudget: "{used}/15 ô đã dùng",
    customShipyardHint:
      "Tô màu hạm đội của bạn. Nhấn ô để bật/tắt. Không đi đường chéo.",
    customShipyardRuleMinShips: "Cần ít nhất 2 tàu (nhóm ô liền nhau).",
    customShipyardRuleMaxShips: "Tối đa 4 tàu (nhóm ô liền nhau).",
    customShipyardRuleMinSize: "Mỗi tàu phải có ít nhất 2 ô.",
    customShipyardRuleMaxSize: "Mỗi tàu tối đa 13 ô.",
    customShipyardRuleExact: "Tô đúng 15 ô tổng cộng.",
    customShipyardReady: "Hạm đội hợp lệ! Nhấn Sẵn sàng.",
    dragShipsInstructions:
      "Kéo tàu từ bến tàu lên bản đồ của bạn. Click chuột phải để xoay.",
    formationCompleteInstructions:
      "Đội hình hoàn tất. Điều chỉnh tàu, tự động sắp xếp lại hoặc nhấn Sẵn sàng.",
    moveSelectedShipInstructions:
      "Di chuyển tàu đã chọn hoặc click chuột phải để xoay, sau đó nhấn Sẵn sàng.",
    selectShipInstructions:
      "Chọn bất kỳ tàu nào để di chuyển hoặc xoay, sau đó nhấn Sẵn sàng.",
    yourTurn: "Lượt của bạn! Nhắm bắn vào vùng biển đối phương.",
    enemyFiring: "Kẻ địch đang bắn! Chuẩn bị tinh thần!",
    connectingRoom: "Phòng {roomCode}: Đang kết nối kênh phòng...",
    waitingOpponentFleet:
      "Phòng {roomCode}: Đã dàn trận. Đang chờ đối thủ dàn trận.",
    channelConnected: "Phòng {roomCode}: Đã kết nối kênh chiến đấu.",
    yourTurnPvp: "Phòng {roomCode}: Lượt của bạn.",
    opponentTurnPvp: "Phòng {roomCode}: Lượt của đối thủ.",
    deployFleet: "Dàn trận hạm đội",
    sectorCommand: "Bộ chỉ huy khu vực",
    timeLabel: "Thời gian",
    enemyWatersScan: "Vùng biển địch (Đang quét...)",
    enemyWaters: "Vùng biển địch",
    enemyFleetScan: "Hạm đội địch (Đang quét...)",
    enemyFleet: "Hạm đội địch",
    yourFleet: "Hạm đội của bạn",
    fleetStaging: "Bến tàu hạm đội",
    shipsRemaining: "Còn lại {count} tàu",
    autoArrange: "TỰ SẮP XẾP",
    deployed: "Đã triển khai",
    cellsLabel: "ô",
    fleetRules: "Hạm đội: đúng 15 ô, từ 2 đến 4 tàu.",
    fleetFilterAll: "Tất cả",
    fleetCellsUsed: "{used}/15 ô",
    fleetShipsUsed: "{used}/4 tàu",
    fleetTooManyCells: "Hạm đội không được vượt quá 15 ô.",
    fleetTooManyShips: "Hạm đội không được có nhiều hơn 4 tàu.",
    fleetTooFewShips: "Hãy chọn ít nhất 2 tàu.",
    fleetNeedExactCells: "Hạm đội phải chiếm đúng 15 ô.",
    fleetValid: "Đội hình hạm đội hợp lệ.",
    commanderPanel: "Chỉ huy",
    opponentPanel: "Đối thủ",
    emotionsTab: "Biểu cảm",
    shipsTab: "Tín hiệu hạm đội",
    chatEventLog: "Chat & nhật ký trận",
    battleChat: "Trò Chuyện",
    eventLog: "Nhật Ký Trận",
    chatPlaceholder: "Gửi thông điệp chiến thuật...",
    sendChat: "Gửi tin nhắn",
    awaitingSignal: "Đang chờ tín hiệu chiến đấu...",
    connectedStatus: "Kênh đang kết nối",
    disconnectedStatus: "Kênh mất kết nối",
    yourTurnStatus: "Lượt của bạn",
    opponentTurnStatus: "Lượt đối thủ",
    deployingStatus: "Đang xếp tàu",
    readyStatus: "Đã sẵn sàng",
    shipsAfloat: "Còn {count} tàu",
    unrankedLabel: "Chưa xếp hạng",
    shipLabel: "Tàu",
    enemyShipSunkAnnouncement: "Tàu {ship} địch chìm!",
    yourShipSunkAnnouncement: "Tàu {ship} của bạn chìm!",
  },
};

const SHIP_SPRITES = {
  carrier: { 0: ship1, 90: ship1, 180: ship1, 270: ship1 },
  patrol: { 0: ship2, 90: ship2, 180: ship2, 270: ship2 },
  zship: { 0: ship4, 90: ship4, 180: ship4, 270: ship4 },
  destroyer: { 0: ship3, 90: ship3, 180: ship3, 270: ship3 },
  gunboat: { 0: ship5, 90: ship5, 180: ship5, 270: ship5 },
  warship: { 0: ship6, 90: ship6, 180: ship6, 270: ship6 },
  cruiser: { 0: ship7, 90: ship7, 180: ship7, 270: ship7 },
  flagship: { 0: ship8, 90: ship8, 180: ship8, 270: ship8 },
  frigate: { 0: ship9, 90: ship9, 180: ship9, 270: ship9 },
  lancer: { 0: ship10, 90: ship10, 180: ship10, 270: ship10 },
};

const resolveSpriteUrl = (sprite) => {
  if (!sprite) return "";
  if (typeof sprite === "string") return sprite;
  if (typeof sprite === "object") return sprite.default || sprite.src || "";
  return "";
};

const rotateOffset = (x, y, rotation) => {
  const normalizedRotation = ((rotation % 360) + 360) % 360;

  if (normalizedRotation === 90) return { x: y, y: -x };
  if (normalizedRotation === 180) return { x: -x, y: -y };
  if (normalizedRotation === 270) return { x: -y, y: x };

  return { x, y };
};

const getAngledShipOffset = (shipTypeId, rotation) => {
  const normalizedRotation = ((rotation % 360) + 360) % 360;

  if (shipTypeId === "destroyer" && normalizedRotation === 90) {
    return { x: -8, y: -20 };
  }

  if (shipTypeId === "destroyer" && normalizedRotation === 270) {
    return { x: 10, y: 20 };
  }

  if (shipTypeId === "zship" && normalizedRotation === 90) {
    return { x: 8, y: 6 };
  }

  if (shipTypeId === "zship" && normalizedRotation === 270) {
    return { x: -8, y: -4 };
  }

  const baseOffsetX =
    shipTypeId === "destroyer" ? L_SHIP_IMAGE_OFFSET_X : SHIP_IMAGE_OFFSET_X;
  const baseOffsetY =
    shipTypeId === "destroyer" ? L_SHIP_IMAGE_OFFSET_Y : SHIP_IMAGE_OFFSET_Y;

  return rotateOffset(baseOffsetX, baseOffsetY, normalizedRotation);
};

const getDefaultTrayRotation = (shipDef) =>
  shipDef.rotations.reduce((bestRotation, candidateRotation) => {
    const bestBounds = getShipBounds(getShipOffsets(shipDef, bestRotation));
    const candidateBounds = getShipBounds(
      getShipOffsets(shipDef, candidateRotation),
    );
    if (candidateBounds.cols > bestBounds.cols) return candidateRotation;
    if (
      candidateBounds.cols === bestBounds.cols &&
      candidateBounds.rows < bestBounds.rows
    ) {
      return candidateRotation;
    }
    return bestRotation;
  }, shipDef.rotations[0]);

const getCenterOffset = (shipDef, rotation) => {
  const offsets = getShipOffsets(shipDef, rotation);
  const bounds = getShipBounds(offsets);
  const centerRow = (bounds.rows - 1) / 2;
  const centerCol = (bounds.cols - 1) / 2;
  const [grabRow, grabCol] = offsets.reduce((closest, offset) => {
    const closestDistance =
      Math.abs(closest[0] - centerRow) + Math.abs(closest[1] - centerCol);
    const offsetDistance =
      Math.abs(offset[0] - centerRow) + Math.abs(offset[1] - centerCol);
    return offsetDistance < closestDistance ? offset : closest;
  }, offsets[0]);
  return { row: grabRow, col: grabCol };
};

const useIsMobile = () => {
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 767);
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 767);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);
  return isMobile;
};

function Game() {
  const location = useLocation();
  const navigate = useNavigate();
  const {
    user,
    attributes,
    checkAuth,
    customAvatarUrl,
    logout,
    loading: authLoading,
  } = useAuth();
  const { language } = useLanguage();
  const copy = GAME_COPY[language] || GAME_COPY.en;
  const formatCopy = useCallback(
    (key, fallback, values = {}) => {
      let text = copy[key] || fallback || "";
      Object.entries(values).forEach(([name, value]) => {
        text = text.replaceAll(`{${name}}`, String(value));
      });
      return text;
    },
    [copy],
  );

  // Force re-render of transient visual states when returning to tab
  const [visibilityTrigger, setVisibilityTrigger] = useState(0);

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        setVisibilityTrigger((prev) => prev + 1);
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () =>
      document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, []);
  const isMobile = useIsMobile();
  const searchParams = new URLSearchParams(location.search);
  const isPvpMode = searchParams.get("mode") === "pvp";
  const roomCode = searchParams.get("roomCode") || "";
  const [difficulty, setDifficulty] = useState("easy");

  const [isLightMode, setIsLightMode] = useState(() =>
    document.documentElement.classList.contains("light-mode-active"),
  );

  const toggleTheme = useCallback(
    (e) => {
      const nextLightMode = !isLightMode;

      if (!document.startViewTransition) {
        setPreferredLightMode(nextLightMode);
        setIsLightMode(nextLightMode);
        return;
      }

      const x = e.clientX;
      const y = e.clientY;
      const endRadius = Math.hypot(
        Math.max(x, window.innerWidth - x),
        Math.max(y, window.innerHeight - y),
      );

      const transition = document.startViewTransition(() => {
        setPreferredLightMode(nextLightMode);
        setIsLightMode(nextLightMode);
      });

      transition.ready.then(() => {
        document.documentElement.animate(
          {
            clipPath: [
              `circle(0px at ${x}px ${y}px)`,
              `circle(${endRadius}px at ${x}px ${y}px)`,
            ],
          },
          {
            duration: 700,
            easing: "ease-in-out",
            pseudoElement: "::view-transition-new(root)",
          },
        );
      });
    },
    [isLightMode],
  );

  const [gameState, setGameState] = useState("PLACEMENT"); // PLACEMENT, READY, PLAYER_TURN, BOT_TURN, GAME_OVER
  const [isCustomShipyardActive, setIsCustomShipyardActive] = useState(false);
  const [activeShipBrush, setActiveShipBrush] = useState(1);
  const [customDrawBoard, setCustomDrawBoard] = useState(() => createBoard());
  const [customShipyardValidation, setCustomShipyardValidation] = useState("");
  const [playerBoard, setPlayerBoard] = useState(createBoard());
  const [enemyBoard, setEnemyBoard] = useState(createBoard());

  // Placement State
  const shipsToPlace = SHIP_DEFS;
  const [fleetSizeFilter, setFleetSizeFilter] = useState("all");
  const [fleetRuleMessage, setFleetRuleMessage] = useState("");
  const [currentShipIndex, setCurrentShipIndex] = useState(0);
  const [rotation, setRotation] = useState(0);
  const [hoverCell, setHoverCell] = useState(null);
  const [selectedShip, setSelectedShip] = useState(null);
  const [draggedShip, setDraggedShip] = useState(null);
  const [dragPointer, setDragPointer] = useState(null);
  const [originalPlacement, setOriginalPlacement] = useState(null);
  const [invalidRotationPreview, setInvalidRotationPreview] = useState(null);
  const [unplacedShipIds, setUnplacedShipIds] = useState(() =>
    SHIP_DEFS.map((ship) => ship.id),
  );
  const [trayRotations, setTrayRotations] = useState(() =>
    Object.fromEntries(
      SHIP_DEFS.map((ship) => [ship.id, getDefaultTrayRotation(ship)]),
    ),
  );
  const placedFleetDefs = useMemo(() => {
    const placedTypeIds = new Set(
      playerBoard
        .flat()
        .filter((cell) => cell.hasShip && cell.shipTypeId)
        .map((cell) => cell.shipTypeId),
    );
    return SHIP_DEFS.filter((ship) => placedTypeIds.has(ship.id));
  }, [playerBoard]);
  const enemyFleetDefs = useMemo(() => {
    const enemyTypeIds = new Set(
      enemyBoard
        .flat()
        .filter((cell) => cell.hasShip && cell.shipTypeId)
        .map((cell) => cell.shipTypeId),
    );
    return SHIP_DEFS.filter((ship) => enemyTypeIds.has(ship.id));
  }, [enemyBoard]);
  const placedFleetCellCount = placedFleetDefs.reduce(
    (total, ship) => total + ship.size,
    0,
  );
  const placedFleetShipCount = placedFleetDefs.length;
  const isFleetValid =
    placedFleetCellCount === FLEET_CELL_LIMIT &&
    placedFleetShipCount >= FLEET_MIN_SHIPS &&
    placedFleetShipCount <= FLEET_MAX_SHIPS;

  // Custom Shipyard validation
  const customDrawCellCount = customDrawBoard
    .flat()
    .filter((c) => c.hasShip).length;
  const customBrushCounts = [1, 2, 3, 4].map(
    (brushId) =>
      customDrawBoard
        .flat()
        .filter((c) => c.hasShip && c.shipBrushId === brushId).length,
  );
  const customComponents = isCustomShipyardActive
    ? getConnectedComponents(customDrawBoard)
    : [];
  const isCustomFleetValid =
    isCustomShipyardActive &&
    (() => {
      if (customDrawCellCount !== CUSTOM_SHIPYARD_CELL_BUDGET) return false;
      if (customComponents.length < CUSTOM_SHIPYARD_MIN_SHIPS) return false;
      if (customComponents.length > CUSTOM_SHIPYARD_MAX_SHIPS) return false;
      if (
        customComponents.some(
          (comp) => comp.length < CUSTOM_SHIPYARD_MIN_SHIP_SIZE,
        )
      )
        return false;
      if (
        customComponents.some(
          (comp) => comp.length > CUSTOM_SHIPYARD_MAX_SHIP_SIZE,
        )
      )
        return false;
      return true;
    })();

  const getCustomShipyardMessage = () => {
    if (customDrawCellCount === 0)
      return copy.customShipyardHint || "Paint your fleet.";
    if (customDrawCellCount > CUSTOM_SHIPYARD_CELL_BUDGET)
      return copy.customShipyardRuleExact || "Paint exactly 15 cells total.";
    if (customDrawCellCount < CUSTOM_SHIPYARD_CELL_BUDGET)
      return (copy.customShipyardBudget || "{used}/15 cells used").replace(
        "{used}",
        customDrawCellCount,
      );
    // Exactly 15 cells
    if (customComponents.length < CUSTOM_SHIPYARD_MIN_SHIPS)
      return copy.customShipyardRuleMinShips || "Need at least 2 ships.";
    if (customComponents.length > CUSTOM_SHIPYARD_MAX_SHIPS)
      return copy.customShipyardRuleMaxShips || "Max 4 ships.";
    if (customComponents.some((c) => c.length < CUSTOM_SHIPYARD_MIN_SHIP_SIZE))
      return (
        copy.customShipyardRuleMinSize ||
        "Each ship must have at least 2 cells."
      );
    if (customComponents.some((c) => c.length > CUSTOM_SHIPYARD_MAX_SHIP_SIZE))
      return (
        copy.customShipyardRuleMaxSize || "Each ship can have at most 13 cells."
      );
    return copy.customShipyardReady || "Fleet valid! Press Ready.";
  };
  const fleetGuidanceMessage =
    fleetRuleMessage ||
    (placedFleetShipCount === 0
      ? ""
      : placedFleetShipCount < FLEET_MIN_SHIPS
        ? copy.fleetTooFewShips
        : placedFleetCellCount !== FLEET_CELL_LIMIT
          ? copy.fleetNeedExactCells
          : isFleetValid
            ? copy.fleetValid
            : "");
  const filteredDockShips =
    fleetSizeFilter === "all"
      ? shipsToPlace
      : shipsToPlace.filter((ship) => ship.size === fleetSizeFilter);
  const fleetSizeOptions = useMemo(
    () =>
      [...new Set(SHIP_DEFS.map((ship) => ship.size))].sort((a, b) => a - b),
    [],
  );

  // Game State
  const [turnTimer, setTurnTimer] = useState(30);
  const [logs, setLogs] = useState([]);
  const [winner, setWinner] = useState(null); // 'PLAYER' | 'BOT'
  const [isShotResolving, setIsShotResolving] = useState(false);
  const shotLockRef = useRef(false);

  // Statistics
  const [stats, setStats] = useState({
    turns: 0,
    shots: 0,
    hits: 0,
    misses: 0,
    shipsDestroyed: 0,
  });
  const statsRef = useRef(stats);
  const [enemyShipsSunk, setEnemyShipsSunk] = useState([]);
  const [enemySunkShipIds, setEnemySunkShipIds] = useState([]);
  const [playerShipsSunk, setPlayerShipsSunk] = useState([]);
  const [sunkEffect, setSunkEffect] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [touchData, setTouchData] = useState(null);
  const [showMobileLog, setShowMobileLog] = useState(false);
  const [activeBattleTab, setActiveBattleTab] = useState("enemy");
  const [pvpRoom, setPvpRoom] = useState(null);
  const [pvpReadyLoading, setPvpReadyLoading] = useState(false);
  const [pvpSocketReady, setPvpSocketReady] = useState(false);
  const [pvpTurnUserId, setPvpTurnUserId] = useState("");
  const [pvpFleetSubmitted, setPvpFleetSubmitted] = useState(false);
  const [exitPromptOpen, setExitPromptOpen] = useState(false);
  const [pendingExitTarget, setPendingExitTarget] = useState("/");
  const [gameOverReason, setGameOverReason] = useState("");
  const [gameOverSubMessage, setGameOverSubMessage] = useState("");
  const [rematchLoading, setRematchLoading] = useState(false);
  const [chatMessages, setChatMessages] = useState([]);
  const latestPlayerSignal = useMemo(
    () =>
      [...chatMessages]
        .reverse()
        .find((message) => message.side === "player") || null,
    [chatMessages],
  );
  const latestOpponentSignal = useMemo(
    () =>
      [...chatMessages]
        .reverse()
        .find((message) => message.side === "opponent") || null,
    [chatMessages],
  );
  const [returnHomeLoading] = useState(false);
  const [rankedResult, setRankedResult] = useState(null);
  const [showRankUpAnimation, setShowRankUpAnimation] = useState(false);

  const logContainerRef = useRef(null);
  const timerRef = useRef(null);
  const dragSkipClickRef = useRef(false);
  const playerEffectsRef = useRef(null);
  const enemyEffectsRef = useRef(null);
  const playerBoardRef = useRef(null);
  const pvpSocketRef = useRef(null);
  const pvpInProgressLoggedRef = useRef(false);
  const pvpEnemyBoardLoadedRef = useRef(false);
  const pvpProcessedShotIdsRef = useRef(new Set());
  const playerBoardStateRef = useRef(playerBoard);
  const enemyBoardStateRef = useRef(enemyBoard);
  const pvpRoomRef = useRef(pvpRoom);
  const roomPlayerRef = useRef(null);
  const pvpExitSentRef = useRef(false);
  const pvpFleetSubmittedRef = useRef(false);
  const activePvpShotIdRef = useRef("");
  const pvpShotTimeoutRef = useRef(null);
  const matchStartedAtRef = useRef(null);
  const applyPvpShotResultRef = useRef(null);
  const handleOpponentLeftRef = useRef(null);
  // Ref theo dõi gameState để dùng trong async callbacks (tránh stale closure)
  const gameStateRef = useRef("PLACEMENT");
  const currentShip = shipsToPlace[currentShipIndex];
  const isWaitingForOpponentFleet =
    isPvpMode && pvpFleetSubmitted && pvpRoom?.status !== "IN_PROGRESS";
  const isPlacementLocked = isWaitingForOpponentFleet;
  const addLog = useCallback((msg, type = "info") => {
    setLogs((prev) => [
      ...prev,
      {
        id: Date.now() + Math.random(),
        msg,
        type,
        timestamp: new Date().toISOString(),
      },
    ]);
  }, []);
  const playerSunkShipTypeIds = playerBoard
    .flat()
    .filter((cell) => cell.shipRoot && playerShipsSunk.includes(cell.shipId))
    .map((cell) => cell.shipTypeId);
  const roomPlayer = useMemo(() => {
    const displayName =
      attributes?.preferred_username ||
      attributes?.name ||
      attributes?.given_name ||
      attributes?.nickname ||
      attributes?.email ||
      user?.signInDetails?.loginId ||
      "Commander";

    console.log("USER", user);
    console.log("ATTRIBUTES", attributes);
    const baseUserId =
      user?.userId || attributes?.sub || attributes?.email || "guest";

    return {
      userId: getRoomPlayerId(baseUserId, roomCode || "global"),
      baseUserId,
      displayName,
      email: attributes?.email,
      avatarUrl:
        customAvatarUrl || attributes?.picture || attributes?.avatarUrl || "",
      rank: attributes?.rank || "",
    };
  }, [
    attributes?.email,
    attributes?.given_name,
    attributes?.name,
    attributes?.nickname,
    attributes?.preferred_username,
    attributes?.sub,
    attributes?.avatarUrl,
    attributes?.picture,
    attributes?.rank,
    customAvatarUrl,
    roomCode,
    user?.signInDetails?.loginId,
    user?.userId,
  ]);

  useEffect(() => {
    playerBoardStateRef.current = playerBoard;
  }, [playerBoard]);

  useEffect(() => {
    enemyBoardStateRef.current = enemyBoard;
  }, [enemyBoard]);

  useEffect(() => {
    pvpRoomRef.current = pvpRoom;
  }, [pvpRoom]);

  useEffect(() => {
    statsRef.current = stats;
  }, [stats]);

  useEffect(() => {
    pvpFleetSubmittedRef.current = pvpFleetSubmitted;
  }, [pvpFleetSubmitted]);

  useEffect(() => {
    roomPlayerRef.current = roomPlayer;
  }, [roomPlayer]);

  useEffect(() => {
    gameStateRef.current = gameState;
  }, [gameState]);

  useEffect(
    () => () => {
      if (pvpShotTimeoutRef.current) {
        window.clearTimeout(pvpShotTimeoutRef.current);
        pvpShotTimeoutRef.current = null;
      }
    },
    [],
  );

  useEffect(() => {
    pvpEnemyBoardLoadedRef.current = false;
  }, [roomCode]);

  const renderFleetStatus = (
    fleetDefs,
    sunkShipTypeIds,
    isScanning = false,
    isCustom = false,
    customShips = [],
  ) => (
    <div className="fleet-image-panel">
      <div
        className="fleet-image-list"
        style={{
          "--fleet-count": Math.max(
            1,
            isCustom ? customShips.length : fleetDefs.length,
          ),
          display: "grid",
          gridTemplateColumns: `repeat(${isCustom ? customShips.length : fleetDefs.length}, 1fr)`,
          gap: "5px",
          height: "32px",
        }}
      >
        {!isScanning &&
          !isCustom &&
          fleetDefs.map((ship) => {
            const isSunk = sunkShipTypeIds.includes(ship.id);
            let offsets = getShipOffsets(ship, ship.rotations[0]);
            const isStraightVertical =
              offsets.length >= 3 &&
              new Set(offsets.map(([, col]) => col)).size === 1;
            if (isStraightVertical && ship.rotations.includes(90)) {
              offsets = getShipOffsets(ship, 90);
            }
            const rowCount = Math.max(...offsets.map(([row]) => row)) + 1;
            const colCount = Math.max(...offsets.map(([, col]) => col)) + 1;

            return (
              <div
                key={ship.id}
                className={`fleet-shape-item ${isSunk ? "is-sunk" : ""}`}
                title={ship.label}
              >
                <span
                  className="fleet-shape-grid"
                  style={{
                    gridTemplateColumns: `repeat(${colCount}, 6px)`,
                    gridTemplateRows: `repeat(${rowCount}, 6px)`,
                  }}
                >
                  {offsets.map(([row, col]) => (
                    <span
                      key={`${row}-${col}`}
                      className="fleet-shape-cell"
                      style={{
                        gridRow: row + 1,
                        gridColumn: col + 1,
                      }}
                    />
                  ))}
                </span>
              </div>
            );
          })}

        {!isScanning &&
          isCustom &&
          customShips.map((ship) => (
            <div
              key={ship.id}
              className={`fleet-shape-item ${ship.isSunk ? "is-sunk" : ""}`}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                padding: "2px 6px",
                height: "32px",
              }}
            >
              <span
                style={{
                  fontSize: "13px",
                  fontWeight: "bold",
                  color: ship.isSunk
                    ? "var(--shipyard-sunk-text, #ff6a42)"
                    : "var(--shipyard-active-text, #91ebff)",
                  textShadow: ship.isSunk
                    ? "var(--shipyard-sunk-glow, 0 0 4px #ff3c1f)"
                    : "var(--shipyard-active-glow, 0 0 4px rgba(81, 224, 255, 0.9))",
                  textDecoration: ship.isSunk ? "line-through" : "none",
                  textAlign: "center",
                  whiteSpace: "nowrap",
                }}
              >
                {ship.size} {copy.cellsLabel || "cells"}
              </span>
            </div>
          ))}

        {isScanning && (
          <span className="enemy-fleet-scanning">Scanning...</span>
        )}
      </div>
    </div>
  );

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const diff = params.get("difficulty") || "easy";
    setDifficulty(diff);
    resetBotAI();
  }, [location]);

  useEffect(() => {
    if (gameState === "PLAYER_TURN") {
      setActiveBattleTab("enemy");
    } else if (gameState === "BOT_TURN" || gameState === "GAME_OVER") {
      setActiveBattleTab("fleet");
    }
  }, [gameState]);

  useEffect(() => {
    if (logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
  }, [logs]);

  useEffect(() => {
    // Poll ngay khi vào PvP mode (không phụ thuộc gameState)
    // để load enemy board kịp thời khi room chuyển sang IN_PROGRESS
    if (!isPvpMode || !roomCode) return undefined;

    let cancelled = false;
    const pollRoom = async () => {
      // Dừng poll khi game đã kết thúc
      if (gameStateRef.current === "GAME_OVER") return;

      try {
        const nextRoom = await getRoom(
          roomCode,
          roomPlayerRef.current?.userId || roomPlayer?.userId,
        );
        if (cancelled) return;

        setPvpRoom(nextRoom);
        if (
          nextRoom.status === "IN_PROGRESS" &&
          !pvpInProgressLoggedRef.current
        ) {
          pvpInProgressLoggedRef.current = true;
          setPvpFleetSubmitted(true);
          setGameState("PLAYER_TURN");
          setTurnTimer(30);
          addLog(copy.bothReadyLog, "info");
        }
      } catch {
        if (!cancelled) {
          addLog(copy.unableRefreshReadiness, "warning");
        }
      }
    };

    pollRoom();
    const timer = window.setInterval(pollRoom, 3000);

    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [addLog, copy.bothReadyLog, isPvpMode, roomCode]);

  const triggerSunkEffect = (boardSide, shipTypeId, shipId, cells) => {
    const shipDef = shipsToPlace.find((ship) => ship.id === shipTypeId);
    const token = Date.now() + Math.random();

    setSunkEffect({
      boardSide,
      shipTypeId,
      shipId,
      shipLabel: shipDef?.label || "Ship",
      cells,
      token,
    });
    const effects =
      boardSide === "enemy"
        ? enemyEffectsRef.current
        : playerEffectsRef.current;
    playSound("sunk", { minGap: 650 });
    effects?.playSunk(cells, shipId);
    window.requestAnimationFrame(() => effects?.animateBanner());

    window.setTimeout(() => {
      setSunkEffect((current) => (current?.token === token ? null : current));
    }, 2400);
  };

  const cloneBoard = (board) =>
    board.map((row) => row.map((cell) => ({ ...cell })));

  const getRoomPlayerKey = (player) => {
    const rawKey = player?.userId || player?.baseUserId || player?.email || "";
    return rawKey.split(":")[0];
  };

  const isSameRoomPlayer = (left, right) => {
    if (!left || !right) return false;
    if (left.userId && right.userId && left.userId === right.userId)
      return true;
    if (
      left.baseUserId &&
      right.baseUserId &&
      left.baseUserId !== "guest" &&
      left.baseUserId === right.baseUserId
    )
      return true;
    if (left.email && right.email && left.email === right.email) return true;
    return false;
  };

  const getOpponentPlayer = (
    room = pvpRoomRef.current,
    player = roomPlayerRef.current,
  ) =>
    (room?.players || []).find(
      (candidate) => !isSameRoomPlayer(candidate, player),
    ) || null;

  const getCurrentRoomPlayer = (
    room = pvpRoomRef.current,
    player = roomPlayerRef.current,
  ) =>
    (room?.players || []).find((candidate) =>
      isSameRoomPlayer(candidate, player),
    ) || player;

  const currentBattlePlayer = getCurrentRoomPlayer(pvpRoom, roomPlayer);
  const opponentBattlePlayer = getOpponentPlayer(pvpRoom, roomPlayer);
  const opponentFleetStatusDefs = useMemo(() => {
    const opponentTypeIds = new Set(
      (opponentBattlePlayer?.board?.ships || [])
        .map((ship) => ship.shipTypeId)
        .filter(Boolean),
    );
    return SHIP_DEFS.filter((ship) => opponentTypeIds.has(ship.id));
  }, [opponentBattlePlayer]);

  const playerCustomShips = useMemo(() => {
    if (isPvpMode) {
      const pShips = currentBattlePlayer?.board?.ships || [];
      const customPShips = pShips.filter(
        (s) =>
          s.shipTypeId === "custom" || String(s.shipId).startsWith("custom"),
      );
      if (customPShips.length > 0) {
        return customPShips.map((s) => ({
          id: s.shipId,
          size: s.baseOffsets?.length || s.size || 0,
          isSunk: playerShipsSunk.includes(s.shipId),
        }));
      }
    } else {
      const extracted = playerBoard.flat().reduce((acc, cell) => {
        if (
          cell.hasShip &&
          cell.shipId &&
          (cell.shipTypeId === "custom" ||
            String(cell.shipId).startsWith("custom"))
        ) {
          acc[cell.shipId] = cell.shipLength || 0;
        }
        return acc;
      }, {});
      const list = Object.entries(extracted).map(([id, size]) => ({
        id,
        size,
        isSunk: playerShipsSunk.includes(id),
      }));
      if (list.length > 0) return list;
    }

    if (isCustomShipyardActive) {
      const comps = getConnectedComponents(customDrawBoard);
      return comps.map((cells, idx) => ({
        id: `custom-${idx}`,
        size: cells.length,
        isSunk: false,
      }));
    }
    return [];
  }, [
    isPvpMode,
    currentBattlePlayer,
    playerShipsSunk,
    playerBoard,
    isCustomShipyardActive,
    customDrawBoard,
  ]);

  const enemyCustomShips = useMemo(() => {
    if (isPvpMode) {
      const eShips = opponentBattlePlayer?.board?.ships || [];
      const customEShips = eShips.filter(
        (s) =>
          s.shipTypeId === "custom" || String(s.shipId).startsWith("custom"),
      );
      return customEShips.map((s) => ({
        id: s.shipId,
        size: s.size || s.baseOffsets?.length || 0,
        isSunk: enemySunkShipIds.includes(s.shipId),
      }));
    } else {
      const extracted = enemyBoard.flat().reduce((acc, cell) => {
        if (
          cell.hasShip &&
          cell.shipId &&
          (cell.shipTypeId === "custom" ||
            String(cell.shipId).startsWith("custom"))
        ) {
          acc[cell.shipId] = cell.shipLength || 0;
        }
        return acc;
      }, {});
      return Object.entries(extracted).map(([id, size]) => ({
        id,
        size,
        isSunk: enemySunkShipIds.includes(id),
      }));
    }
  }, [isPvpMode, opponentBattlePlayer, enemySunkShipIds, enemyBoard]);

  const appendChatMessage = useCallback((message) => {
    if (!message?.messageId) return;
    setChatMessages((current) => {
      if (current.some((entry) => entry.messageId === message.messageId)) {
        return current;
      }
      return [...current, message].slice(-80);
    });
  }, []);

  const sendPvpSignal = useCallback(
    ({ kind, value }) => {
      if (!isPvpMode || !roomCode || !value) return false;

      const sender = roomPlayerRef.current || roomPlayer;
      const messageId = crypto.randomUUID();
      const sentAt = new Date().toISOString();
      const payload = {
        action: kind === "emote" ? "EMOTE" : "CHAT",
        roomCode,
        messageId,
        message:
          kind === "chat" ? String(value).trim().slice(0, 180) : undefined,
        emote: kind === "emote" ? String(value).slice(0, 16) : undefined,
      };
      const sent = sendSocketMessage(pvpSocketRef.current, payload);
      if (!sent) return false;

      appendChatMessage({
        messageId,
        kind,
        value: kind === "chat" ? payload.message : payload.emote,
        senderUserId: getRoomPlayerKey(sender),
        senderName: sender?.displayName || "Commander",
        side: "player",
        sentAt,
      });
      return true;
    },
    [appendChatMessage, isPvpMode, roomCode, roomPlayer],
  );

  const releaseShotLock = useCallback((shotId = "") => {
    if (
      shotId &&
      activePvpShotIdRef.current &&
      activePvpShotIdRef.current !== shotId
    )
      return;

    if (pvpShotTimeoutRef.current) {
      window.clearTimeout(pvpShotTimeoutRef.current);
      pvpShotTimeoutRef.current = null;
    }

    activePvpShotIdRef.current = "";
    shotLockRef.current = false;
    setIsShotResolving(false);
  }, []);

  const shouldConfirmPvpExit = useCallback(
    () =>
      isPvpMode &&
      Boolean(roomCode) &&
      gameStateRef.current !== "GAME_OVER" &&
      (pvpRoomRef.current?.status === "IN_PROGRESS" ||
        pvpFleetSubmittedRef.current ||
        gameStateRef.current === "PLACEMENT" ||
        gameStateRef.current === "READY" ||
        gameStateRef.current === "PLAYER_TURN" ||
        gameStateRef.current === "BOT_TURN"),
    [isPvpMode, roomCode],
  );

  const notifyPvpExit = useCallback(() => {
    if (!isPvpMode || !roomCode || pvpExitSentRef.current) return;

    const currentPlayer = getCurrentRoomPlayer();
    const currentPlayerId = getRoomPlayerKey(currentPlayer);
    if (!currentPlayerId) return;

    pvpExitSentRef.current = true;
    sendSocketMessage(pvpSocketRef.current, {
      action: "QUIT",
      roomCode,
    });
  }, [isPvpMode, roomCode]);

  const leavePvpRoomCleanly = useCallback(
    async ({ keepalive = false } = {}) => {
      if (!isPvpMode || !roomCode) return;

      const currentPlayer = getCurrentRoomPlayer();
      if (!getRoomPlayerKey(currentPlayer)) return;

      if (keepalive) {
        const apiBaseUrl = import.meta.env.VITE_API_BASE_URL;
        if (!apiBaseUrl) return;

        fetch(`${apiBaseUrl}/rooms/${encodeURIComponent(roomCode)}/leave`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ player: currentPlayer }),
          keepalive: true,
        }).catch(() => {});
        return;
      }

      await leaveRoom({ roomCode, player: currentPlayer });
    },
    [isPvpMode, roomCode],
  );

  const requestGameExit = useCallback(
    (target = "/") => {
      if (!shouldConfirmPvpExit()) {
        navigate(target);
        return;
      }

      setPendingExitTarget(target);
      setExitPromptOpen(true);
    },
    [navigate, shouldConfirmPvpExit],
  );

  const handleLogout = useCallback(async () => {
    try {
      localStorage.removeItem("battleshipSession");
      if (isPvpMode) {
        await leaveRoom({
          roomCode: searchParams.get("room"),
          player: currentBattlePlayer || roomPlayer,
        });
      }
      navigate("/", { replace: true, state: { authEvent: "signed-out" } });
      await logout();
    } catch (err) {
      console.error("Logout failed:", err);
    }
  }, [
    isPvpMode,
    searchParams,
    currentBattlePlayer,
    roomPlayer,
    navigate,
    logout,
  ]);

  const handleHeaderNavigation = useCallback(
    (targetPath) => {
      if (!shouldConfirmPvpExit()) {
        navigate(targetPath);
        return;
      }
      requestGameExit(targetPath);
    },
    [shouldConfirmPvpExit, navigate, requestGameExit],
  );

  const confirmGameExit = useCallback(async () => {
    notifyPvpExit();
    try {
      await leavePvpRoomCleanly();
    } catch (leaveError) {
      addLog(leaveError.message || copy.unableLeaveCleanly, "warning");
    }
    setExitPromptOpen(false);

    // Instead of navigate, we set Game Over state for player A
    gameStateRef.current = "GAME_OVER";
    setGameOverReason("player_left");
    setGameOverSubMessage("youLeftMatch");
    setGameState("GAME_OVER");
    setWinner("BOT"); // This triggers a Lose popup (since winner !== "PLAYER")
    releaseShotLock();
    playSound("defeat", { minGap: 1000 });
    addLog(copy.youLeftMatch, "warning");
    setShowModal(true);
  }, [addLog, leavePvpRoomCleanly, notifyPvpExit, releaseShotLock]);

  const handlePlayAgain = useCallback(async () => {
    setRankedResult(null);
    setShowRankUpAnimation(false);
    setShowModal(false);

    if (!isPvpMode || !roomCode) {
      const nextSearch = new URLSearchParams();
      nextSearch.set("difficulty", difficulty);
      nextSearch.set("restart", String(Date.now()));
      window.location.assign(`/game?${nextSearch.toString()}`);
      return;
    }

    try {
      setRematchLoading(true);
      if (
        gameOverReason === "opponent_left" ||
        gameOverReason === "player_left"
      ) {
        void leavePvpRoomCleanly().catch((leaveError) => {
          console.warn(leaveError.message || "Unable to leave room cleanly.");
        });
        navigate("/lobby");
        return;
      }
      await resetRoomForRematch({ roomCode, player: roomPlayer });
      navigate(`/lobby?roomCode=${roomCode}`);
    } catch (rematchError) {
      setShowModal(true);
      addLog(rematchError.message || copy.unableResetRematch, "warning");
    } finally {
      setRematchLoading(false);
    }
  }, [
    addLog,
    difficulty,
    gameOverReason,
    isPvpMode,
    leavePvpRoomCleanly,
    navigate,
    roomCode,
    roomPlayer,
  ]);

  const handleReturnHome = useCallback(async () => {
    setShowModal(false);

    if (isPvpMode && roomCode && gameStateRef.current === "GAME_OVER") {
      void leavePvpRoomCleanly().catch((leaveError) => {
        console.warn(leaveError.message || "Unable to leave room cleanly.");
      });
    }

    navigate("/");
  }, [isPvpMode, leavePvpRoomCleanly, navigate, roomCode]);

  useEffect(() => {
    if (!isPvpMode) return undefined;

    const handleBeforeUnload = (event) => {
      if (!shouldConfirmPvpExit()) return;
      event.preventDefault();
      event.returnValue = "";
    };

    const handlePageHide = () => {
      if (shouldConfirmPvpExit()) {
        notifyPvpExit();
        leavePvpRoomCleanly({ keepalive: true });
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    window.addEventListener("pagehide", handlePageHide);

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
      window.removeEventListener("pagehide", handlePageHide);
    };
  }, [isPvpMode, leavePvpRoomCleanly, notifyPvpExit, shouldConfirmPvpExit]);

  const revealSunkShipOnBoard = (board, shotResult, sunkCells = []) => {
    const shipCells = sunkCells
      .filter(
        (cell) => Number.isInteger(cell?.row) && Number.isInteger(cell?.col),
      )
      .sort((left, right) => left.row - right.row || left.col - right.col);

    if (!shipCells.length) return;

    const shipDef = shipsToPlace.find(
      (candidate) => candidate.id === shotResult.shipTypeId,
    );
    const shipId =
      shotResult.shipId || `enemy-sunk-${shipCells[0].row}-${shipCells[0].col}`;
    const fallbackRotation = shipDef?.rotations?.[0] ?? 0;
    const minRow = Math.min(...shipCells.map((cell) => cell.row));
    const minCol = Math.min(...shipCells.map((cell) => cell.col));
    const cellKey = (cell) => `${cell.row - minRow}:${cell.col - minCol}`;
    const normalizedCellSet = new Set(shipCells.map(cellKey));

    const matchedRotation =
      shipDef?.rotations.find((candidateRotation) => {
        const offsets = getShipOffsets(shipDef, candidateRotation);
        if (offsets.length !== shipCells.length) return false;
        return offsets.every(([rowOffset, colOffset]) =>
          normalizedCellSet.has(`${rowOffset}:${colOffset}`),
        );
      }) ?? fallbackRotation;

    const offsets = shipDef
      ? getShipOffsets(shipDef, matchedRotation)
      : shipCells.map((cell) => [cell.row - minRow, cell.col - minCol]);
    const bounds = getShipBounds(offsets);
    const rootOffset = offsets[0] || [0, 0];
    const rootRow = minRow + rootOffset[0];
    const rootCol = minCol + rootOffset[1];

    board.forEach((row) => {
      row.forEach((cell) => {
        if (cell.shipId === shipId) {
          cell.shipRoot = false;
          cell.shipBounds = null;
        }
      });
    });

    shipCells.forEach(({ row, col }) => {
      const cell = board[row]?.[col];
      if (!cell) return;
      cell.isHit = true;
      cell.autoMarked = false;
      cell.hasShip = true;
      cell.shipId = shipId;
      cell.shipTypeId = shotResult.shipTypeId || shipDef?.id || null;
      cell.shipLength =
        shotResult.shipLength || shipDef?.size || shipCells.length;
      cell.shipRotation = matchedRotation;
      cell.shipOriginRow = minRow;
      cell.shipOriginCol = minCol;
      cell.shipRoot = row === rootRow && col === rootCol;
      cell.shipBounds = cell.shipRoot ? bounds : null;

      const opponentShip = opponentBattlePlayer?.board?.ships?.find((ship) => {
        const shipRow = ship.row;
        const shipCol = ship.col;
        return ship.baseOffsets?.some(
          ([dr, dc]) => shipRow + dr === row && shipCol + dc === col,
        );
      });
      if (opponentShip?.shipBrushId) {
        cell.shipBrushId = opponentShip.shipBrushId;
      }
    });
  };

  const getPvpStatusText = () => {
    if (!pvpSocketReady)
      return (
        copy.connectingRoom || "Room {roomCode}: connecting room channel..."
      ).replace("{roomCode}", roomCode);
    if (pvpRoom?.status !== "IN_PROGRESS")
      return (
        copy.waitingOpponentFleet ||
        "Room {roomCode}: fleet deployed. Waiting for opponent fleet."
      ).replace("{roomCode}", roomCode);

    const currentPlayerId = getRoomPlayerKey(
      getCurrentRoomPlayer(pvpRoom, roomPlayer),
    );
    if (!pvpTurnUserId)
      return (
        copy.channelConnected || "Room {roomCode}: battle channel connected."
      ).replace("{roomCode}", roomCode);
    return pvpTurnUserId === currentPlayerId
      ? (copy.yourTurnPvp || "Room {roomCode}: your turn.").replace(
          "{roomCode}",
          roomCode,
        )
      : (copy.opponentTurnPvp || "Room {roomCode}: opponent turn.").replace(
          "{roomCode}",
          roomCode,
        );
  };

  const getInstructionText = (isShort) => {
    if (gameState === "PLACEMENT") {
      if (!isFleetValid) {
        return isShort
          ? (language === "vi" ? "Kéo tàu vào bản đồ" : "Drag ships to map")
          : (copy.dragShipsInstructions || "Drag ships from staging onto your map. Right-click to rotate.");
      } else {
        return isShort
          ? (language === "vi" ? "Bấm Sẵn sàng để đấu" : "Press Ready to battle")
          : (copy.formationCompleteInstructions || "Formation complete. Adjust ships, auto-arrange again, or press Ready.");
      }
    }
    if (gameState === "READY") {
      if (selectedShip) {
        return isShort
          ? (language === "vi" ? "Di chuyển/Xoay tàu" : "Move or rotate ship")
          : (copy.moveSelectedShipInstructions || "Move the selected ship or right-click to rotate it, then press Ready.");
      } else {
        return isShort
          ? (language === "vi" ? "Chọn tàu để chỉnh" : "Select ship to adjust")
          : (copy.selectShipInstructions || "Select any ship to move or rotate it, then press Ready.");
      }
    }
    return "";
  };

  const clearShipFromBoard = (board, shipId) => {
    board.forEach((row) => {
      row.forEach((cell) => {
        if (cell.shipId !== shipId) return;

        cell.hasShip = false;
        cell.shipId = null;
        cell.shipTypeId = null;
        cell.shipRotation = null;
        cell.shipLength = null;
        cell.shipRoot = false;
        cell.shipBounds = null;
        cell.shipOriginRow = null;
        cell.shipOriginCol = null;
      });
    });
  };

  const removeShipById = (board, shipId) => {
    clearShipFromBoard(board, shipId);
  };

  const getPlacedShipSelectionByTypeId = (shipTypeId, board = playerBoard) => {
    for (let r = 0; r < BOARD_SIZE; r++) {
      for (let c = 0; c < BOARD_SIZE; c++) {
        const cell = board[r][c];
        if (cell.hasShip && cell.shipTypeId === shipTypeId) {
          return getPlacedShipSelection(cell, board);
        }
      }
    }
    return null;
  };

  const returnShipToStaging = useCallback(
    (shipId, shipTypeId) => {
      if (isPlacementLocked) return;
      if (gameState !== "PLACEMENT" && gameState !== "READY") return;

      setPlayerBoard((prevBoard) => {
        const newBoard = cloneBoard(prevBoard);
        clearShipFromBoard(newBoard, shipId);
        return newBoard;
      });

      setUnplacedShipIds((current) => {
        if (current.includes(shipTypeId)) return current;
        const newUnplaced = [...current, shipTypeId];
        return newUnplaced.sort((a, b) => {
          const idxA = SHIP_DEFS.findIndex((d) => d.id === a);
          const idxB = SHIP_DEFS.findIndex((d) => d.id === b);
          return idxA - idxB;
        });
      });
      setFleetRuleMessage("");

      if (selectedShip && selectedShip.shipId === shipId) {
        setSelectedShip(null);
      }
      if (draggedShip && draggedShip.shipId === shipId) {
        setDraggedShip(null);
        setDragPointer(null);
        setHoverCell(null);
      }
      addLog(copy.returnedShipStaging, "info");
    },
    [isPlacementLocked, gameState, selectedShip, draggedShip, addLog],
  );

  const getRootCellForShip = (board, shipId) => {
    for (const row of board) {
      for (const cell of row) {
        if (cell.shipId === shipId && cell.shipRoot) return cell;
      }
    }
    return null;
  };

  const getRootCellAtOrigin = (board, row, col) => {
    for (const boardRow of board) {
      for (const cell of boardRow) {
        if (
          cell.shipRoot &&
          cell.shipOriginRow === row &&
          cell.shipOriginCol === col
        ) {
          return cell;
        }
      }
    }
    return null;
  };

  const getShipDefById = (shipTypeId) =>
    shipsToPlace.find((ship) => ship.id === shipTypeId);

  const getPlacedShipSelection = (cell, board = playerBoard) => {
    if (!cell.hasShip) return null;

    const shipDef = getShipDefById(cell.shipTypeId);
    const rootCell = getRootCellForShip(board, cell.shipId);
    if (!shipDef || !rootCell) return null;

    return {
      shipId: cell.shipId,
      shipDef,
      rotation: cell.shipRotation,
      row: rootCell.shipOriginRow ?? rootCell.row,
      col: rootCell.shipOriginCol ?? rootCell.col,
    };
  };

  const getPlacedShipSelectionAt = (row, col, board = playerBoard) => {
    if (invalidRotationPreview) {
      const isInsideInvalidShip = getShipOffsets(
        invalidRotationPreview.shipDef,
        invalidRotationPreview.rotation,
      ).some(
        ([dr, dc]) =>
          invalidRotationPreview.row + dr === row &&
          invalidRotationPreview.col + dc === col,
      );

      if (
        isInsideInvalidShip ||
        board[row][col].shipId === invalidRotationPreview.shipId
      ) {
        return invalidRotationPreview;
      }

      return null;
    }

    const directSelection = getPlacedShipSelection(board[row][col], board);
    if (directSelection) return directSelection;

    for (const boardRow of board) {
      for (const cell of boardRow) {
        if (!cell.shipRoot || !cell.shipBounds) continue;

        const originRow = cell.shipOriginRow ?? cell.row;
        const originCol = cell.shipOriginCol ?? cell.col;
        const insideBounds =
          row >= originRow &&
          row < originRow + cell.shipBounds.rows &&
          col >= originCol &&
          col < originCol + cell.shipBounds.cols;

        if (insideBounds) {
          const shipDef = getShipDefById(cell.shipTypeId);
          if (!shipDef) return null;

          return {
            shipId: cell.shipId,
            shipDef,
            rotation: cell.shipRotation,
            row: originRow,
            col: originCol,
          };
        }
      }
    }

    return null;
  };

  const selectPlacedShip = (cell, board = playerBoard) => {
    const placedShip = getPlacedShipSelection(cell, board);
    if (!placedShip) return;

    setSelectedShip(placedShip);
    setRotation(placedShip.rotation);
  };

  const movePlacedShipTo = (
    targetRow,
    targetCol,
    shipToMove = selectedShip,
    skipUIUpdate = false,
  ) => {
    if (!shipToMove) return false;

    const newBoard = cloneBoard(playerBoard);
    clearShipFromBoard(newBoard, shipToMove.shipId);

    if (
      !canPlaceShip(
        newBoard,
        targetRow,
        targetCol,
        shipToMove.shipDef,
        shipToMove.rotation,
      )
    ) {
      if (!skipUIUpdate) {
        const invalidPlacement = {
          ...shipToMove,
          row: targetRow,
          col: targetCol,
        };
        setInvalidRotationPreview(invalidPlacement);
        setSelectedShip(invalidPlacement);
        setHoverCell(null);
      }
      return false;
    }

    placeShip(
      newBoard,
      targetRow,
      targetCol,
      shipToMove.shipDef,
      shipToMove.rotation,
    );
    const newRootCell = getRootCellAtOrigin(newBoard, targetRow, targetCol);
    if (!newRootCell) return false;
    const newShipId = newRootCell.shipId;
    const updatedShip = {
      ...shipToMove,
      shipId: newShipId,
      row: targetRow,
      col: targetCol,
    };

    setPlayerBoard(newBoard);
    setSelectedShip(null);
    setHoverCell(null);
    setInvalidRotationPreview(null);
    setRotation(updatedShip.rotation);
    return true;
  };

  const rotatePlacedShipSafely = useCallback(
    (shipToRotate) => {
      if (!shipToRotate) return;

      setPlayerBoard((prevBoard) => {
        const boardWithoutShip = cloneBoard(prevBoard);
        removeShipById(boardWithoutShip, shipToRotate.shipId);

        const rotations = shipToRotate.shipDef.rotations;
        const idx = rotations.indexOf(shipToRotate.rotation);
        const nextRotation = rotations[(idx + 1) % rotations.length];

        const currentCenterOffset = getCenterOffset(
          shipToRotate.shipDef,
          shipToRotate.rotation,
        );
        const nextCenterOffset = getCenterOffset(
          shipToRotate.shipDef,
          nextRotation,
        );

        const nextRow =
          shipToRotate.row + currentCenterOffset.row - nextCenterOffset.row;
        const nextCol =
          shipToRotate.col + currentCenterOffset.col - nextCenterOffset.col;

        const canRotate = canPlaceShip(
          boardWithoutShip,
          nextRow,
          nextCol,
          shipToRotate.shipDef,
          nextRotation,
        );

        if (!canRotate) {
          addLog(copy.cannotRotateHere, "warning");
          setDraggedShip(null);
          setDragPointer(null);
          setHoverCell(null);
          setInvalidRotationPreview(null);
          return prevBoard; // Return original board untouched
        }

        placeShip(
          boardWithoutShip,
          nextRow,
          nextCol,
          shipToRotate.shipDef,
          nextRotation,
        );

        const newRootCell = getRootCellAtOrigin(
          boardWithoutShip,
          nextRow,
          nextCol,
        );

        setInvalidRotationPreview(null);
        if (newRootCell) {
          setSelectedShip({
            ...shipToRotate,
            shipId: newRootCell.shipId,
            rotation: nextRotation,
            row: nextRow,
            col: nextCol,
          });
        }
        setRotation(nextRotation);
        return boardWithoutShip;
      });
    },
    [addLog],
  );

  const rotatePlacedShip = useCallback((shipToRotate) => {
    if (!shipToRotate) return;

    const rotations = shipToRotate.shipDef.rotations;
    const idx = rotations.indexOf(shipToRotate.rotation);
    const nextRotation = rotations[(idx + 1) % rotations.length];

    const currentCenterOffset = getCenterOffset(
      shipToRotate.shipDef,
      shipToRotate.rotation,
    );
    const nextCenterOffset = getCenterOffset(
      shipToRotate.shipDef,
      nextRotation,
    );

    const nextRow =
      shipToRotate.row + currentCenterOffset.row - nextCenterOffset.row;
    const nextCol =
      shipToRotate.col + currentCenterOffset.col - nextCenterOffset.col;

    setPlayerBoard((prevBoard) => {
      const newBoard = cloneBoard(prevBoard);
      clearShipFromBoard(newBoard, shipToRotate.shipId);

      if (
        !canPlaceShip(
          newBoard,
          nextRow,
          nextCol,
          shipToRotate.shipDef,
          nextRotation,
        )
      ) {
        const invalidPlacement = {
          ...shipToRotate,
          rotation: nextRotation,
          row: nextRow,
          col: nextCol,
        };
        setInvalidRotationPreview(invalidPlacement);
        setSelectedShip(invalidPlacement);
        setRotation(nextRotation);
        return prevBoard;
      }

      placeShip(newBoard, nextRow, nextCol, shipToRotate.shipDef, nextRotation);
      const newRootCell = getRootCellAtOrigin(newBoard, nextRow, nextCol);
      if (!newRootCell) return prevBoard;

      setInvalidRotationPreview(null);
      setSelectedShip({
        ...shipToRotate,
        shipId: newRootCell.shipId,
        rotation: nextRotation,
        row: nextRow,
        col: nextCol,
      });
      setRotation(nextRotation);
      return newBoard;
    });
  }, []);

  const rotateShip = useCallback(() => {
    if (isPlacementLocked) return;
    if (gameState !== "PLACEMENT" && gameState !== "READY") return;

    setDraggedShip((prev) => {
      if (prev) {
        const rotations = prev.shipDef.rotations;
        const idx = rotations.indexOf(prev.rotation);
        const nextRotation = rotations[(idx + 1) % rotations.length];
        const newCenter = getCenterOffset(prev.shipDef, nextRotation);
        return {
          ...prev,
          rotation: nextRotation,
          grabOffset: newCenter,
          pointerOffset: {
            x: newCenter.col * (CELL_SIZE + CELL_GAP) + CELL_SIZE / 2,
            y: newCenter.row * (CELL_SIZE + CELL_GAP) + CELL_SIZE / 2,
          },
        };
      }
      return prev;
    });
  }, [gameState, isPlacementLocked]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "r" || e.key === "R") {
        e.preventDefault();
        rotateShip();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [rotateShip]);

  useEffect(() => {
    if (currentShip) {
      setRotation(currentShip.rotations[0]);
    }
  }, [currentShipIndex]);

  // Timer Tick
  useEffect(() => {
    if (isPvpMode) return undefined;

    if (gameState === "PLAYER_TURN") {
      timerRef.current = setInterval(() => {
        setTurnTimer((prev) => {
          if (prev <= 1) {
            clearInterval(timerRef.current);
            addLog(copy.timeUp, "warning");
            startBotTurn();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      clearInterval(timerRef.current);
    }
    return () => clearInterval(timerRef.current);
  }, [gameState, isPvpMode]);

  const saveMatchStats = useCallback(
    (isVictory) => {
      const key = "battleshipStats";
      let savedStats = JSON.parse(localStorage.getItem(key)) || {
        totalMatches: 0,
        wins: 0,
        losses: 0,
        totalShots: 0,
        totalHits: 0,
      };

      savedStats.totalMatches += 1;
      if (isVictory) savedStats.wins += 1;
      else savedStats.losses += 1;

      const latestStats = statsRef.current || stats;
      savedStats.totalShots += latestStats.shots;
      savedStats.totalHits += latestStats.hits;

      localStorage.setItem(key, JSON.stringify(savedStats));
    },
    [stats],
  );

  const endGame = useCallback(
    (isPlayerVictory) => {
      if (gameStateRef.current === "GAME_OVER") return;
      setGameOverReason("");
      gameStateRef.current = "GAME_OVER";
      setGameState("GAME_OVER");
      setWinner(isPlayerVictory ? "PLAYER" : "BOT");
      releaseShotLock();
      playSound(isPlayerVictory ? "victory" : "defeat", { minGap: 1000 });
      addLog(
        isPlayerVictory
          ? copy.victoryLog || "VICTORY! Enemy fleet destroyed!"
          : copy.defeatLog || "DEFEAT! Your fleet was destroyed.",
        isPlayerVictory ? "victory" : "defeat",
      );
      saveMatchStats(isPlayerVictory);
      setTimeout(() => setShowModal(true), 1500);
    },
    [addLog, copy.victoryLog, copy.defeatLog, releaseShotLock, saveMatchStats],
  );

  const handleOpponentLeft = useCallback(() => {
    gameStateRef.current = "GAME_OVER";
    setGameOverReason("opponent_left");
    setGameOverSubMessage("opponentLeftMatch");
    setGameState("GAME_OVER");
    setWinner("PLAYER");
    releaseShotLock();
    playSound("victory", { minGap: 1000 });
    addLog(copy.opponentLeftLog, "victory");
    saveMatchStats(true);
    window.setTimeout(() => setShowModal(true), 450);
  }, [addLog, copy.opponentLeftLog, releaseShotLock, saveMatchStats]);

  useEffect(() => {
    handleOpponentLeftRef.current = handleOpponentLeft;
  }, [handleOpponentLeft]);

  const startPlayerTurn = () => {
    shotLockRef.current = false;
    setIsShotResolving(false);
    setGameState("PLAYER_TURN");
    setTurnTimer(30);
    addLog(copy.yourTurnStarted, "info");
    setStats((prev) => ({ ...prev, turns: prev.turns + 1 }));
  };

  const startBotTurn = () => {
    if (isPvpMode) {
      setGameState("PLAYER_TURN");
      addLog(copy.waitingOpponentMove, "info");
      return;
    }

    setGameState("BOT_TURN");
    addLog(copy.enemyThinking, "info");

    // Random delay for bot thinking 700ms - 1200ms
    const delay = Math.floor(Math.random() * 500) + 700;
    setTimeout(() => {
      performBotMove();
    }, delay);
  };

  const performBotMove = () => {
    if (isPvpMode) return;
    if (gameState === "GAME_OVER") return;

    setPlayerBoard((prevBoard) => {
      const newPlayerBoard = [
        ...prevBoard.map((row) => [...row.map((c) => ({ ...c }))]),
      ];
      const botShot = getBotMove(newPlayerBoard, difficulty);
      const cell = newPlayerBoard[botShot.row][botShot.col];

      const colLetter = String.fromCharCode(65 + botShot.col);
      const rowNum = botShot.row + 1;
      const cellName = `${colLetter}${rowNum}`;

      if (cell.hasShip) {
        if (botShot.result && botShot.result.isSunk) {
          const sunkCells = markWaterAroundSunkShip(
            newPlayerBoard,
            botShot.result.shipId,
          );
          setPlayerShipsSunk((prev) =>
            prev.includes(botShot.result.shipId)
              ? prev
              : [...prev, botShot.result.shipId],
          );
          window.requestAnimationFrame(() => {
            playSound("hit", { minGap: 90 });
            playerEffectsRef.current?.playHit(botShot.row, botShot.col);
            triggerSunkEffect(
              "player",
              botShot.result.shipTypeId,
              botShot.result.shipId,
              sunkCells,
            );
          });
          addLog(
            formatCopy(
              "enemyDestroyedYourShip",
              "Enemy destroyed your ship (size {size}) at {cell}!",
              {
                size: botShot.result.shipLength,
                cell: cellName,
              },
            ),
            "defeat",
          );
        } else {
          window.requestAnimationFrame(() => {
            playSound("hit", { minGap: 90 });
            playerEffectsRef.current?.playHit(botShot.row, botShot.col);
          });
          addLog(
            formatCopy("enemyHitYourShip", "Enemy hit your ship at {cell}!", {
              cell: cellName,
            }),
            "enemy_hit",
          );
        }

        if (checkVictory(newPlayerBoard)) {
          endGame(false);
        } else {
          // Bot gets another turn
          const delay = Math.floor(Math.random() * 500) + 700;
          setTimeout(() => performBotMove(), delay);
        }
      } else {
        window.requestAnimationFrame(() => {
          playSound("miss", { minGap: 90 });
          playerEffectsRef.current?.playMiss(botShot.row, botShot.col);
        });
        addLog(
          formatCopy("enemyMissedAt", "Enemy missed at {cell}.", {
            cell: cellName,
          }),
          "enemy_miss",
        );
        setTimeout(() => startPlayerTurn(), 800);
      }

      return newPlayerBoard;
    });
  };

  const resolvePvpShotOnBoard = ({
    board,
    row,
    col,
    boardSide,
    isOutgoing,
  }) => {
    const nextBoard = cloneBoard(board);
    let sunkCells = [];

    if (nextBoard[row]?.[col]?.isHit && !nextBoard[row][col].autoMarked) {
      return { board: nextBoard, ignored: true };
    }

    const shotResult = fireAt(nextBoard, row, col);
    const colLetter = String.fromCharCode(65 + col);
    const rowNum = row + 1;
    const cellName = `${colLetter}${rowNum}`;
    const effectsRef =
      boardSide === "enemy" ? enemyEffectsRef : playerEffectsRef;

    if (shotResult.result === "HIT") {
      if (shotResult.isSunk) {
        sunkCells = markWaterAroundSunkShip(
          nextBoard,
          shotResult.shipId,
          false,
        );
        if (boardSide === "enemy") {
          setStats((prev) => ({
            ...prev,
            shipsDestroyed: prev.shipsDestroyed + 1,
          }));
          setEnemyShipsSunk((prev) =>
            prev.includes(shotResult.shipTypeId)
              ? prev
              : [...prev, shotResult.shipTypeId],
          );
          setEnemySunkShipIds((prev) =>
            prev.includes(shotResult.shipId)
              ? prev
              : [...prev, shotResult.shipId],
          );
          addLog(
            formatCopy(
              "youDestroyedEnemyShip",
              "You destroyed an enemy ship (size {size}) at {cell}!",
              {
                size: shotResult.shipLength,
                cell: cellName,
              },
            ),
            "destroy",
          );
        } else {
          setPlayerShipsSunk((prev) =>
            prev.includes(shotResult.shipId)
              ? prev
              : [...prev, shotResult.shipId],
          );
          addLog(
            formatCopy(
              "enemyDestroyedYourShip",
              "Enemy destroyed your ship (size {size}) at {cell}!",
              {
                size: shotResult.shipLength,
                cell: cellName,
              },
            ),
            "defeat",
          );
        }
        window.requestAnimationFrame(() => {
          playSound("hit", { minGap: 90 });
          effectsRef.current?.playHit(row, col);
          triggerSunkEffect(
            boardSide,
            shotResult.shipTypeId,
            shotResult.shipId,
            sunkCells,
          );
        });
      } else {
        window.requestAnimationFrame(() => {
          playSound("hit", { minGap: 90 });
          effectsRef.current?.playHit(row, col);
        });
        addLog(
          isOutgoing
            ? formatCopy("directHitAt", "Direct hit at {cell}!", {
                cell: cellName,
              })
            : formatCopy("enemyHitYourShip", "Enemy hit your ship at {cell}!", {
                cell: cellName,
              }),
          isOutgoing ? "player_hit" : "enemy_hit",
        );
      }
    } else if (shotResult.result === "MISS") {
      window.requestAnimationFrame(() => {
        playSound("miss", { minGap: 90 });
        effectsRef.current?.playMiss(row, col);
      });
      addLog(
        isOutgoing
          ? formatCopy("missedAt", "Missed at {cell}.", { cell: cellName })
          : formatCopy("enemyMissedAt", "Enemy missed at {cell}.", {
              cell: cellName,
            }),
        isOutgoing ? "player_miss" : "enemy_miss",
      );
    }

    return {
      board: nextBoard,
      shotResult,
      sunkCells,
      isVictory: checkVictory(nextBoard),
    };
  };

  const applyPvpShotResult = (payload) => {
    const currentPlayer = getCurrentRoomPlayer();
    const currentPlayerId = getRoomPlayerKey(currentPlayer);
    const isShooter = payload.shooterUserId === currentPlayerId;

    if (isShooter && payload.shotId !== activePvpShotIdRef.current) return;

    const row = payload.row;
    const col = payload.col;
    const shotResult = payload.shotResult || { result: payload.result };
    const colLetter = String.fromCharCode(65 + col);
    const rowNum = row + 1;
    const cellName = `${colLetter}${rowNum}`;

    if (isShooter) {
      setEnemyBoard((prevBoard) => {
        const nextBoard = cloneBoard(prevBoard);
        const cell = nextBoard[row]?.[col];
        if (!cell) return prevBoard;

        cell.isHit = true;
        cell.autoMarked = false;

        if (shotResult.result === "HIT") {
          cell.hasShip = true;
          cell.shipId = shotResult.shipId || `enemy-hit-${payload.shotId}`;
          cell.shipTypeId = shotResult.shipTypeId || null;
          cell.shipLength = shotResult.shipLength || null;

          const opponentShip = opponentBattlePlayer?.board?.ships?.find(
            (ship) => {
              const shipRow = ship.row;
              const shipCol = ship.col;
              return ship.baseOffsets?.some(
                ([dr, dc]) => shipRow + dr === row && shipCol + dc === col,
              );
            },
          );
          if (opponentShip?.shipBrushId) {
            cell.shipBrushId = opponentShip.shipBrushId;
          }

          if (shotResult.isSunk && Array.isArray(payload.sunkCells)) {
            revealSunkShipOnBoard(nextBoard, shotResult, payload.sunkCells);
          }
        }

        return nextBoard;
      });

      if (shotResult.result === "HIT") {
        setStats((prev) => {
          const next = {
            ...prev,
            hits: prev.hits + 1,
            shipsDestroyed: shotResult.isSunk
              ? prev.shipsDestroyed + 1
              : prev.shipsDestroyed,
          };
          statsRef.current = next;
          return next;
        });

        if (shotResult.isSunk) {
          setEnemyShipsSunk((prev) =>
            prev.includes(shotResult.shipTypeId)
              ? prev
              : [...prev, shotResult.shipTypeId],
          );
          setEnemySunkShipIds((prev) =>
            prev.includes(shotResult.shipId)
              ? prev
              : [...prev, shotResult.shipId],
          );
          window.requestAnimationFrame(() => {
            playSound("hit", { minGap: 90 });
            enemyEffectsRef.current?.playHit(row, col);
            triggerSunkEffect(
              "enemy",
              shotResult.shipTypeId,
              shotResult.shipId,
              payload.sunkCells || [],
            );
          });
          addLog(
            formatCopy(
              "youDestroyedEnemyShip",
              "You destroyed an enemy ship (size {size}) at {cell}!",
              {
                size: shotResult.shipLength,
                cell: cellName,
              },
            ),
            "destroy",
          );
        } else {
          window.requestAnimationFrame(() => {
            playSound("hit", { minGap: 90 });
            enemyEffectsRef.current?.playHit(row, col);
          });
          addLog(
            formatCopy("directHitAt", "Direct hit at {cell}!", {
              cell: cellName,
            }),
            "player_hit",
          );
        }
      } else {
        setStats((prev) => {
          const next = { ...prev, misses: prev.misses + 1 };
          statsRef.current = next;
          return next;
        });
        window.requestAnimationFrame(() => {
          playSound("miss", { minGap: 90 });
          enemyEffectsRef.current?.playMiss(row, col);
        });
        addLog(
          formatCopy("missedAt", "Missed at {cell}.", { cell: cellName }),
          "player_miss",
        );
      }
    } else {
      // Target player: opponent shot us
      setPlayerBoard((prevBoard) => {
        const nextBoard = cloneBoard(prevBoard);
        const cell = nextBoard[row]?.[col];
        if (!cell) return prevBoard;

        cell.isHit = true;
        cell.autoMarked = false;

        if (shotResult.result === "HIT") {
          if (shotResult.isSunk && shotResult.shipId) {
            markWaterAroundSunkShip(nextBoard, shotResult.shipId, true);
          }
        }

        return nextBoard;
      });

      if (shotResult.result === "HIT") {
        if (shotResult.isSunk) {
          setPlayerShipsSunk((prev) =>
            prev.includes(shotResult.shipId)
              ? prev
              : [...prev, shotResult.shipId],
          );
          window.requestAnimationFrame(() => {
            playSound("hit", { minGap: 90 });
            playerEffectsRef.current?.playHit(row, col);
            triggerSunkEffect(
              "player",
              shotResult.shipTypeId,
              shotResult.shipId,
              payload.sunkCells || [],
            );
          });
          addLog(
            formatCopy(
              "enemyDestroyedYourShip",
              "Enemy destroyed your ship (size {size}) at {cell}!",
              {
                size: shotResult.shipLength,
                cell: cellName,
              },
            ),
            "defeat",
          );
        } else {
          window.requestAnimationFrame(() => {
            playSound("hit", { minGap: 90 });
            playerEffectsRef.current?.playHit(row, col);
          });
          addLog(
            formatCopy("enemyHitYourShip", "Enemy hit your ship at {cell}!", {
              cell: cellName,
            }),
            "enemy_hit",
          );
        }
      } else {
        window.requestAnimationFrame(() => {
          playSound("miss", { minGap: 90 });
          playerEffectsRef.current?.playMiss(row, col);
        });
        addLog(
          formatCopy("enemyMissedAt", "Enemy missed at {cell}.", {
            cell: cellName,
          }),
          "enemy_miss",
        );
      }
    }

    setPvpTurnUserId(payload.nextTurnUserId);
    if (isShooter) {
      releaseShotLock(payload.shotId);
    } else {
      releaseShotLock();
    }
  };

  const firePvpShot = (row, col) => {
    const currentRoom = pvpRoomRef.current;
    const currentPlayer = getCurrentRoomPlayer(currentRoom);
    const opponentPlayer = getOpponentPlayer(currentRoom);
    const currentPlayerId = getRoomPlayerKey(currentPlayer);
    const opponentPlayerId = getRoomPlayerKey(opponentPlayer);

    if (!pvpSocketReady || currentRoom?.status !== "IN_PROGRESS") {
      addLog(copy.roomStillConnecting, "warning");
      return;
    }

    if (!opponentPlayerId) {
      addLog(copy.opponentUnavailable, "warning");
      return;
    }

    if (pvpTurnUserId && pvpTurnUserId !== currentPlayerId) {
      addLog(copy.waitingOpponentTurn, "warning");
      return;
    }

    if (
      enemyBoardStateRef.current[row][col].isHit &&
      !enemyBoardStateRef.current[row][col].autoMarked
    )
      return;

    shotLockRef.current = true;
    setIsShotResolving(true);
    setStats((prev) => {
      const next = { ...prev, shots: prev.shots + 1 };
      statsRef.current = next;
      return next;
    });

    const shotId = crypto.randomUUID();
    activePvpShotIdRef.current = shotId;
    const sent = sendSocketMessage(pvpSocketRef.current, {
      action: "SHOOT",
      roomCode,
      shotId,
      row,
      col,
    });

    if (!sent) {
      setStats((prev) => {
        const next = { ...prev, shots: Math.max(0, prev.shots - 1) };
        statsRef.current = next;
        return next;
      });
      releaseShotLock(shotId);
      addLog(copy.roomReconnecting, "warning");
      return;
    }

    window.setTimeout(() => {
      if (!shotLockRef.current || activePvpShotIdRef.current !== shotId) return;
      addLog(copy.waitingShotResult, "info");
    }, 800);

    pvpShotTimeoutRef.current = window.setTimeout(() => {
      if (!shotLockRef.current || activePvpShotIdRef.current !== shotId) return;
      releaseShotLock(shotId);
      addLog(copy.shotTimedOut, "warning");
    }, 12000);
  };

  applyPvpShotResultRef.current = applyPvpShotResult;

  useEffect(() => {
    if (!isPvpMode || !roomCode) return undefined;

    const socketUserId = getRoomPlayerKey(roomPlayerRef.current || roomPlayer);
    let socket;
    try {
      socket = createRoomSocket({
        roomCode,
        userId: socketUserId,
        onOpen: () => {
          pvpSocketRef.current = socket;
          setPvpSocketReady(true);
          sendSocketMessage(socket, {
            action: "SUBSCRIBE_ROOM",
            roomCode,
          });
          addLog(copy.roomConnected, "info");
        },
        onMessage: async (message) => {
          if (message.type === "ROOM_SUBSCRIBED") {
            setPvpSocketReady(true);
            return;
          }

          if (message.type === "ROOM_CHAT_HISTORY") {
            const currentUserId = String(socketUserId || "").split(":")[0];
            (message.messages || []).forEach((entry) => {
              const senderUserId = String(entry.senderUserId || "").split(
                ":",
              )[0];
              appendChatMessage({
                messageId: entry.messageId,
                kind: entry.type === "PVP_EMOTE" ? "emote" : "chat",
                value: entry.type === "PVP_EMOTE" ? entry.emote : entry.message,
                senderUserId: entry.senderUserId,
                senderName: entry.senderName || "Commander",
                side: senderUserId === currentUserId ? "player" : "opponent",
                sentAt: entry.sentAt || new Date().toISOString(),
              });
            });
            return;
          }

          if (message.type !== "ROOM_EVENT") return;
          const payload = message.payload || {};
          if (payload.type === "PVP_CHAT" || payload.type === "PVP_EMOTE") {
            appendChatMessage({
              messageId: payload.messageId,
              kind: payload.type === "PVP_EMOTE" ? "emote" : "chat",
              value:
                payload.type === "PVP_EMOTE" ? payload.emote : payload.message,
              senderUserId: payload.senderUserId,
              senderName: payload.senderName || "Opponent",
              side: "opponent",
              sentAt: payload.sentAt || new Date().toISOString(),
            });
          }
          if (payload.type === "PVP_SHOT_RESULT") {
            applyPvpShotResultRef.current?.(payload);
          }
          if (payload.type === "GAME_OVER") {
            const currentPlayerId = getRoomPlayerKey(getCurrentRoomPlayer());
            const isVictory = payload.winnerId === currentPlayerId;

            // If game is over during placement/ready, it means the opponent aborted the match.
            // (Player A who clicked exit would already have gameState = "GAME_OVER")
            if (
              gameStateRef.current === "PLACEMENT" ||
              gameStateRef.current === "READY"
            ) {
              handleOpponentLeftRef.current?.();
              return;
            }

            if (payload.rankedResult) {
              const result = payload.rankedResult;
              const currentResult = isVictory ? result.winner : result.loser;
              if (currentResult) {
                setRankedResult(currentResult);
                await checkAuth?.();
                if (currentResult.promoted) {
                  setShowRankUpAnimation(true);
                }
              }
            }
            endGame(isVictory);
          }
          if (payload.type === "PVP_PLAYER_LEFT") {
            const currentPlayerId = getRoomPlayerKey(getCurrentRoomPlayer());
            if (payload.playerId && payload.playerId !== currentPlayerId) {
              handleOpponentLeftRef.current?.();
            }
          }
        },
        onClose: () => {
          setPvpSocketReady(false);
          if (pvpSocketRef.current === socket) {
            pvpSocketRef.current = null;
          }
        },
        onError: () => {
          setPvpSocketReady(false);
          addLog(copy.roomConnectionFailed, "warning");
        },
      });
      pvpSocketRef.current = socket;
    } catch (socketError) {
      setPvpSocketReady(false);
      addLog(socketError.message || copy.roomNotConfigured, "warning");
    }

    return () => {
      setPvpSocketReady(false);
      if (socket && socket.readyState <= WebSocket.OPEN) {
        socket.close();
      }
      if (pvpSocketRef.current === socket) {
        pvpSocketRef.current = null;
      }
    };
  }, [addLog, appendChatMessage, isPvpMode, roomCode, roomPlayer.userId]);

  useEffect(() => {
    if (!isPvpMode || pvpRoom?.status !== "IN_PROGRESS") return;

    if (!pvpEnemyBoardLoadedRef.current) {
      pvpEnemyBoardLoadedRef.current = true;
      setEnemyBoard(createBoard());
      matchStartedAtRef.current = new Date().toISOString();
      addLog(copy.enemyWatersSynced, "info");
    }

    // Xác định người đi trước (players[0] là host)
    const starterPlayer = pvpRoom.players?.[0];
    const initialTurnId = pvpRoom.currentTurnUserId
      ? pvpRoom.currentTurnUserId.split(":")[0]
      : getRoomPlayerKey(starterPlayer);
    setPvpTurnUserId(initialTurnId);
  }, [addLog, isPvpMode, pvpRoom, roomPlayer]);

  const handleEnemyCellClick = (r, c) => {
    if (gameState !== "PLAYER_TURN") return;
    if (isPvpMode) {
      firePvpShot(r, c);
      return;
    }
    if (shotLockRef.current) return;

    // We only check this to prevent obvious double clicks on already hit cells
    if (enemyBoard[r][c].isHit && !enemyBoard[r][c].autoMarked) return;

    shotLockRef.current = true;
    setIsShotResolving(true);

    clearInterval(timerRef.current);

    setEnemyBoard((prevBoard) => {
      if (prevBoard[r][c].isHit && !prevBoard[r][c].autoMarked)
        return prevBoard;

      const newEnemyBoard = [
        ...prevBoard.map((row) => [...row.map((c) => ({ ...c }))]),
      ];
      if (newEnemyBoard[r][c].autoMarked) {
        newEnemyBoard[r][c].isHit = false;
        newEnemyBoard[r][c].autoMarked = false;
      }
      const shotResult = fireAt(newEnemyBoard, r, c);

      const colLetter = String.fromCharCode(65 + c);
      const rowNum = r + 1;
      const cellName = `${colLetter}${rowNum}`;

      setStats((prev) => ({ ...prev, shots: prev.shots + 1 }));

      if (shotResult.result === "HIT") {
        setStats((prev) => ({ ...prev, hits: prev.hits + 1 }));
        if (shotResult.isSunk) {
          const sunkCells = markWaterAroundSunkShip(
            newEnemyBoard,
            shotResult.shipId,
            false,
          );
          setStats((prev) => ({
            ...prev,
            shipsDestroyed: prev.shipsDestroyed + 1,
          }));
          setEnemyShipsSunk((prev) => [...prev, shotResult.shipTypeId]);
          setEnemySunkShipIds((prev) =>
            prev.includes(shotResult.shipId)
              ? prev
              : [...prev, shotResult.shipId],
          );
          window.requestAnimationFrame(() => {
            playSound("hit", { minGap: 90 });
            enemyEffectsRef.current?.playHit(r, c);
            triggerSunkEffect(
              "enemy",
              shotResult.shipTypeId,
              shotResult.shipId,
              sunkCells,
            );
          });
          addLog(
            formatCopy(
              "youDestroyedEnemyShip",
              "You destroyed an enemy ship (size {size}) at {cell}!",
              {
                size: shotResult.shipLength,
                cell: cellName,
              },
            ),
            "destroy",
          );
        } else {
          window.requestAnimationFrame(() => {
            playSound("hit", { minGap: 90 });
            enemyEffectsRef.current?.playHit(r, c);
          });
          addLog(
            formatCopy("directHitAt", "Direct hit at {cell}!", {
              cell: cellName,
            }),
            "player_hit",
          );
        }

        if (checkVictory(newEnemyBoard)) {
          endGame(true);
        } else {
          // Extra turn for player
          setTimeout(() => startPlayerTurn(), 250);
        }
      } else {
        window.requestAnimationFrame(() => {
          playSound("miss", { minGap: 90 });
          enemyEffectsRef.current?.playMiss(r, c);
        });
        setStats((prev) => ({ ...prev, misses: prev.misses + 1 }));
        addLog(
          formatCopy("missedAt", "Missed at {cell}.", { cell: cellName }),
          "player_miss",
        );
        setTimeout(() => startBotTurn(), 800);
      }

      return newEnemyBoard;
    });
  };

  const handlePlayerCellHover = (r, c) => {
    if (isPlacementLocked) return;
    if (gameState === "PLACEMENT" || gameState === "READY") {
      setHoverCell({ r, c });
      if (invalidRotationPreview) {
        setInvalidRotationPreview(null);
      }
    }
  };

  useEffect(() => {
    if (!draggedShip) return undefined;

    const updateDragPointer = (event) => {
      let clientX, clientY;
      if (event.touches) {
        if (!isMobile) {
          event.preventDefault();
          clientX = event.touches[0].clientX;
          clientY = event.touches[0].clientY;
          setDragPointer({ x: clientX, y: clientY });
        }
      } else {
        clientX = event.clientX;
        clientY = event.clientY;
        setDragPointer({ x: clientX, y: clientY });
      }

      if (isMobile && playerBoardRef.current && draggedShip) {
        const rect = playerBoardRef.current.getBoundingClientRect();
        if (
          clientX >= rect.left &&
          clientX <= rect.right &&
          clientY >= rect.top &&
          clientY <= rect.bottom
        ) {
          const cellSize = rect.width / 10;
          const c = Math.floor((clientX - rect.left) / cellSize);
          const r = Math.floor((clientY - rect.top) / cellSize);
          if (r >= 0 && r < BOARD_SIZE && c >= 0 && c < BOARD_SIZE) {
            setHoverCell({ r, c });
          } else {
            setHoverCell(null);
          }
        } else {
          setHoverCell(null);
        }
      }
    };

    const handleTouchDrop = (event) => {
      if (!isMobile || !draggedShip || !originalPlacement) return;
      document.body.style.overflow = "";
      document.documentElement.style.overflow = "";

      const touch = event.changedTouches[0];
      let dropHoverCell = null;
      if (playerBoardRef.current) {
        const rect = playerBoardRef.current.getBoundingClientRect();
        const clientX = touch.clientX;
        const clientY = touch.clientY;
        if (
          clientX >= rect.left &&
          clientX <= rect.right &&
          clientY >= rect.top &&
          clientY <= rect.bottom
        ) {
          const cellSize = rect.width / 10;
          const c = Math.floor((clientX - rect.left) / cellSize);
          const r = Math.floor((clientY - rect.top) / cellSize);
          if (r >= 0 && r < BOARD_SIZE && c >= 0 && c < BOARD_SIZE) {
            dropHoverCell = { r, c };
          }
        }
      }

      if (dropHoverCell) {
        const targetRow = dropHoverCell.r - draggedShip.grabOffset.row;
        const targetCol = dropHoverCell.c - draggedShip.grabOffset.col;

        setPlayerBoard((prevBoard) => {
          const newBoard = cloneBoard(prevBoard);
          // clear any remaining original instances of this ship before place
          removeShipById(newBoard, originalPlacement.shipId);

          if (
            canPlaceShip(
              newBoard,
              targetRow,
              targetCol,
              draggedShip.shipDef,
              draggedShip.rotation,
            )
          ) {
            placeShip(
              newBoard,
              targetRow,
              targetCol,
              draggedShip.shipDef,
              draggedShip.rotation,
            );
          } else {
            placeShip(
              newBoard,
              originalPlacement.row,
              originalPlacement.col,
              originalPlacement.shipDef,
              originalPlacement.rotation,
            );
            addLog(copy.invalidPlacementReturned, "warning");
          }
          return newBoard;
        });
      } else {
        // Cancel drag
        setPlayerBoard((prevBoard) => {
          const newBoard = cloneBoard(prevBoard);
          removeShipById(newBoard, originalPlacement.shipId);
          placeShip(
            newBoard,
            originalPlacement.row,
            originalPlacement.col,
            originalPlacement.shipDef,
            originalPlacement.rotation,
          );
          return newBoard;
        });
      }

      setDraggedShip(null);
      setDragPointer(null);
      setTouchData(null);
      setOriginalPlacement(null);
      setHoverCell(null);
    };

    document.addEventListener("mousemove", updateDragPointer);
    document.addEventListener("touchmove", updateDragPointer, {
      passive: false,
    });
    document.addEventListener("touchend", handleTouchDrop);

    return () => {
      document.removeEventListener("mousemove", updateDragPointer);
      document.removeEventListener("touchmove", updateDragPointer);
      document.removeEventListener("touchend", handleTouchDrop);
      document.body.style.overflow = "";
      document.documentElement.style.overflow = "";
    };
  }, [draggedShip, isMobile]);

  const handlePlayerCellClick = (event, r, c) => {
    if (isPlacementLocked) return;
    if (gameState !== "PLACEMENT" && gameState !== "READY") return;

    if (draggedShip) {
      const targetRow = r - draggedShip.grabOffset.row;
      const targetCol = c - draggedShip.grabOffset.col;
      if (draggedShip.fromTray) {
        const newBoard = cloneBoard(playerBoard);
        if (
          canPlaceShip(
            newBoard,
            targetRow,
            targetCol,
            draggedShip.shipDef,
            draggedShip.rotation,
          )
        ) {
          placeShip(
            newBoard,
            targetRow,
            targetCol,
            draggedShip.shipDef,
            draggedShip.rotation,
          );
          setPlayerBoard(newBoard);
          setUnplacedShipIds((current) =>
            current.filter((id) => id !== draggedShip.shipDef.id),
          );
          const nextShipCount = placedFleetShipCount + 1;
          const nextCellCount = placedFleetCellCount + draggedShip.shipDef.size;
          if (
            nextCellCount === FLEET_CELL_LIMIT &&
            nextShipCount >= FLEET_MIN_SHIPS &&
            nextShipCount <= FLEET_MAX_SHIPS
          ) {
            setFleetRuleMessage(copy.fleetValid);
            addLog(copy.fleetDeployedReview, "info");
          } else {
            setFleetRuleMessage("");
          }
          setDraggedShip(null);
          setDragPointer(null);
          setHoverCell(null);
        } else {
          // Invalid placement, do nothing
          addLog(copy.invalidPlacementPosition, "warning");
        }
      } else {
        const success = movePlacedShipTo(
          targetRow,
          targetCol,
          draggedShip,
          true,
        );
        if (success) {
          setDraggedShip(null);
          setDragPointer(null);
        } else {
          addLog(copy.invalidPlacementPosition, "warning");
        }
      }
      return;
    }

    const placedShip = getPlacedShipSelectionAt(r, c);
    if (placedShip) {
      if (isMobile) {
        return;
      }

      const newCenter = getCenterOffset(
        placedShip.shipDef,
        placedShip.rotation,
      );
      const shipToDrag = {
        ...placedShip,
        grabOffset: newCenter,
        pointerOffset: {
          x: newCenter.col * (CELL_SIZE + CELL_GAP) + CELL_SIZE / 2,
          y: newCenter.row * (CELL_SIZE + CELL_GAP) + CELL_SIZE / 2,
        },
      };

      const newBoard = cloneBoard(playerBoard);
      clearShipFromBoard(newBoard, placedShip.shipId);
      setPlayerBoard(newBoard);

      setSelectedShip(placedShip);
      setRotation(placedShip.rotation);
      setDraggedShip(shipToDrag);
      setDragPointer({ x: event.clientX, y: event.clientY });
    }
  };

  const handlePlayerCellDoubleClick = (event, r, c) => {
    if (isPlacementLocked) return;
    if (gameState !== "PLACEMENT" && gameState !== "READY") return;

    const cell = playerBoard[r][c];
    if (cell && cell.hasShip && cell.shipId) {
      returnShipToStaging(cell.shipId, cell.shipTypeId);
    }
  };

  const handleDockClick = () => {
    if (isPlacementLocked) return;
    if (gameState !== "PLACEMENT" && gameState !== "READY") return;

    if (draggedShip && !draggedShip.fromTray) {
      returnShipToStaging(draggedShip.shipId, draggedShip.shipDef.id);
    }
  };

  const handlePlayerCellContextMenu = (event, r, c) => {
    event.preventDefault();
    event.stopPropagation();

    if (isPlacementLocked) return;
    if (gameState !== "PLACEMENT" && gameState !== "READY") return;

    if (draggedShip) {
      rotateShip();
      return;
    }

    const placedShip = getPlacedShipSelectionAt(r, c);
    if (!placedShip) return;

    rotatePlacedShip(placedShip);
  };

  const handleTouchStart = (e, r, c) => {
    if (isPlacementLocked) return;
    if (!isMobile || (gameState !== "PLACEMENT" && gameState !== "READY"))
      return;
    const placedShip = getPlacedShipSelectionAt(r, c);
    if (!placedShip) return;

    setTouchData({
      x: e.touches[0].clientX,
      y: e.touches[0].clientY,
      ship: placedShip,
      startTime: Date.now(),
      r,
      c,
      moved: false,
    });
  };

  const handleTouchMove = (e) => {
    if (isPlacementLocked) return;
    if (
      !isMobile ||
      !touchData ||
      draggedShip ||
      (gameState !== "PLACEMENT" && gameState !== "READY")
    )
      return;

    const dx = e.touches[0].clientX - touchData.x;
    const dy = e.touches[0].clientY - touchData.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    if (distance >= 8 && !touchData.moved) {
      setTouchData((prev) => ({ ...prev, moved: true }));

      document.body.style.overflow = "hidden";
      document.documentElement.style.overflow = "hidden";

      const placedShip = touchData.ship;
      const grabRowOffset = touchData.r - placedShip.row;
      const grabColOffset = touchData.c - placedShip.col;

      setOriginalPlacement({
        shipId: placedShip.shipId,
        shipDef: placedShip.shipDef,
        row: placedShip.row,
        col: placedShip.col,
        rotation: placedShip.rotation,
      });

      let cellStep = CELL_SIZE + CELL_GAP;
      if (playerBoardRef.current) {
        const rect = playerBoardRef.current.getBoundingClientRect();
        cellStep = rect.width / 10;
      }

      const shipToDrag = {
        ...placedShip,
        grabOffset: { row: grabRowOffset, col: grabColOffset },
        pointerOffset: {
          x: grabColOffset * cellStep + cellStep / 2,
          y: grabRowOffset * cellStep + cellStep / 2,
        },
      };

      const newBoard = cloneBoard(playerBoard);
      clearShipFromBoard(newBoard, placedShip.shipId);
      setPlayerBoard(newBoard);

      setSelectedShip(placedShip);
      setRotation(placedShip.rotation);
      setDraggedShip(shipToDrag);
      setDragPointer({ x: e.touches[0].clientX, y: e.touches[0].clientY });
    }
  };

  const handleTouchEnd = (e, r, c) => {
    if (isPlacementLocked) return;
    if (!isMobile || !touchData) return;

    if (draggedShip) {
      setTouchData(null);
      return;
    }

    const duration = Date.now() - touchData.startTime;

    if (!touchData.moved && duration < 200) {
      rotatePlacedShipSafely(touchData.ship);
    }
    setTouchData(null);
  };

  const handleTrayShipClick = (event, shipDef) => {
    if (isPlacementLocked) return;
    if (gameState !== "PLACEMENT") return;
    event.preventDefault();

    if (placedFleetShipCount >= FLEET_MAX_SHIPS) {
      setFleetRuleMessage(copy.fleetTooManyShips);
      addLog(copy.fleetTooManyShips, "warning");
      return;
    }
    if (placedFleetCellCount + shipDef.size > FLEET_CELL_LIMIT) {
      setFleetRuleMessage(copy.fleetTooManyCells);
      addLog(copy.fleetTooManyCells, "warning");
      return;
    }

    if (draggedShip && draggedShip.shipId === `tray-${shipDef.id}`) {
      rotateShip();

      setTrayRotations((prev) => {
        const currentRot = prev[shipDef.id] ?? shipDef.rotations[0];
        const nextRot =
          shipDef.rotations[
            (shipDef.rotations.indexOf(currentRot) + 1) %
              shipDef.rotations.length
          ];
        return {
          ...prev,
          [shipDef.id]: nextRot,
        };
      });

      return; // Already dragging this ship
    }

    // Restore previously picked ship back to the board if it was picked from the board
    if (draggedShip && !draggedShip.fromTray) {
      setPlayerBoard((prev) => {
        const newBoard = cloneBoard(prev);
        placeShip(
          newBoard,
          draggedShip.row,
          draggedShip.col,
          draggedShip.shipDef,
          draggedShip.rotation,
        );
        return newBoard;
      });
    }
    const rotation = trayRotations[shipDef.id] ?? shipDef.rotations[0];
    const newCenter = getCenterOffset(shipDef, rotation);

    setSelectedShip(null);
    setInvalidRotationPreview(null);
    setDraggedShip({
      fromTray: true,
      shipId: `tray-${shipDef.id}`,
      shipDef,
      rotation,
      row: 0,
      col: 0,
      grabOffset: newCenter,
      pointerOffset: {
        x: newCenter.col * (CELL_SIZE + CELL_GAP) + CELL_SIZE / 2,
        y: newCenter.row * (CELL_SIZE + CELL_GAP) + CELL_SIZE / 2,
      },
    });
    setDragPointer({ x: event.clientX, y: event.clientY });
    setFleetRuleMessage("");
  };

  const handleTrayShipContextMenu = (event, shipDef) => {
    event.preventDefault();
    if (isPlacementLocked) return;
    const rotations = shipDef.rotations;
    const currentRotation = trayRotations[shipDef.id] ?? rotations[0];
    const currentIndex = rotations.indexOf(currentRotation);
    setTrayRotations((current) => ({
      ...current,
      [shipDef.id]: rotations[(currentIndex + 1) % rotations.length],
    }));
  };

  // === Giai đoạn 1: Custom Shipyard handlers ===
  const isCustomPaintingRef = useRef(false); // drag-to-paint state
  const customPaintValueRef = useRef(true); // true = paint ON, false = paint OFF

  const applyCustomCellPaint = (r, c) => {
    if (isPlacementLocked) return;
    if (gameState !== "PLACEMENT" && gameState !== "READY") return;
    setCustomDrawBoard((prev) => {
      const currentCell = prev[r][c];
      const isTryingToPaint = customPaintValueRef.current;

      if (isTryingToPaint) {
        if (currentCell.hasShip && currentCell.shipBrushId === activeShipBrush)
          return prev;
        const currentBrushCellsList = prev
          .flat()
          .filter(
            (cell) => cell.hasShip && cell.shipBrushId === activeShipBrush,
          );
        if (
          currentBrushCellsList.length > 0 &&
          currentCell.shipBrushId !== activeShipBrush
        ) {
          const isAdjacent = currentBrushCellsList.some(
            (cell) => Math.abs(cell.row - r) + Math.abs(cell.col - c) === 1,
          );
          if (!isAdjacent) return prev;
        }
        const totalPaintedCells = prev
          .flat()
          .filter((cell) => cell.hasShip).length;
        const currentBrushCells = currentBrushCellsList.length;
        const isNewCell = !currentCell.hasShip;
        if (isNewCell && totalPaintedCells >= 15) return prev;
        if (
          currentBrushCells >= 13 &&
          currentCell.shipBrushId !== activeShipBrush
        )
          return prev;
      }

      const next = prev.map((row) => row.map((cell) => ({ ...cell })));
      next[r][c].hasShip = isTryingToPaint;
      next[r][c].shipBrushId = isTryingToPaint ? activeShipBrush : null;
      return next;
    });
  };

  const handleCustomCellClick = (r, c) => {
    if (isPlacementLocked) return;
    if (gameState !== "PLACEMENT" && gameState !== "READY") return;
    setCustomDrawBoard((prev) => {
      const currentCell = prev[r][c];
      const isSameBrush =
        currentCell.hasShip && currentCell.shipBrushId === activeShipBrush;
      const isTryingToPaint = !isSameBrush;

      if (isTryingToPaint) {
        const currentBrushCellsList = prev
          .flat()
          .filter(
            (cell) => cell.hasShip && cell.shipBrushId === activeShipBrush,
          );
        if (
          currentBrushCellsList.length > 0 &&
          currentCell.shipBrushId !== activeShipBrush
        ) {
          const isAdjacent = currentBrushCellsList.some(
            (cell) => Math.abs(cell.row - r) + Math.abs(cell.col - c) === 1,
          );
          if (!isAdjacent) return prev;
        }
        const totalPaintedCells = prev
          .flat()
          .filter((cell) => cell.hasShip).length;
        const currentBrushCells = currentBrushCellsList.length;
        const isNewCell = !currentCell.hasShip;
        if (isNewCell && totalPaintedCells >= 15) return prev;
        if (
          currentBrushCells >= 13 &&
          currentCell.shipBrushId !== activeShipBrush
        )
          return prev;
      }

      const next = prev.map((row) => row.map((cell) => ({ ...cell })));
      next[r][c].hasShip = isTryingToPaint;
      next[r][c].shipBrushId = isTryingToPaint ? activeShipBrush : null;
      return next;
    });
  };

  const handleCustomCellMouseDown = (e, r, c) => {
    if (isPlacementLocked || isMobile) return;
    if (gameState !== "PLACEMENT" && gameState !== "READY") return;
    e.preventDefault();
    setCustomDrawBoard((prev) => {
      const currentCell = prev[r][c];
      const isSameBrush =
        currentCell.hasShip && currentCell.shipBrushId === activeShipBrush;
      customPaintValueRef.current = !isSameBrush;

      if (customPaintValueRef.current) {
        const currentBrushCellsList = prev
          .flat()
          .filter(
            (cell) => cell.hasShip && cell.shipBrushId === activeShipBrush,
          );
        if (
          currentBrushCellsList.length > 0 &&
          currentCell.shipBrushId !== activeShipBrush
        ) {
          const isAdjacent = currentBrushCellsList.some(
            (cell) => Math.abs(cell.row - r) + Math.abs(cell.col - c) === 1,
          );
          if (!isAdjacent) return prev;
        }
        const totalPaintedCells = prev
          .flat()
          .filter((cell) => cell.hasShip).length;
        const currentBrushCells = currentBrushCellsList.length;
        const isNewCell = !currentCell.hasShip;
        if (isNewCell && totalPaintedCells >= 15) return prev;
        if (
          currentBrushCells >= 13 &&
          currentCell.shipBrushId !== activeShipBrush
        )
          return prev;
      }

      const next = prev.map((row) => row.map((cell) => ({ ...cell })));
      next[r][c].hasShip = customPaintValueRef.current;
      next[r][c].shipBrushId = customPaintValueRef.current
        ? activeShipBrush
        : null;
      return next;
    });
    isCustomPaintingRef.current = true;
  };

  const handleCustomCellMouseEnter = (r, c) => {
    if (!isCustomPaintingRef.current || isPlacementLocked || isMobile) return;
    applyCustomCellPaint(r, c);
  };

  // Touch-based drag painting on the main board
  const handleCustomBoardTouchStart = (e, r, c) => {
    if (isPlacementLocked) return;
    if (gameState !== "PLACEMENT" && gameState !== "READY") return;
    e.preventDefault();
    setCustomDrawBoard((prev) => {
      const currentCell = prev[r][c];
      const isSameBrush =
        currentCell.hasShip && currentCell.shipBrushId === activeShipBrush;
      customPaintValueRef.current = !isSameBrush;

      if (customPaintValueRef.current) {
        const currentBrushCellsList = prev
          .flat()
          .filter(
            (cell) => cell.hasShip && cell.shipBrushId === activeShipBrush,
          );
        if (
          currentBrushCellsList.length > 0 &&
          currentCell.shipBrushId !== activeShipBrush
        ) {
          const isAdjacent = currentBrushCellsList.some(
            (cell) => Math.abs(cell.row - r) + Math.abs(cell.col - c) === 1,
          );
          if (!isAdjacent) return prev;
        }
        const totalPaintedCells = prev
          .flat()
          .filter((cell) => cell.hasShip).length;
        const currentBrushCells = currentBrushCellsList.length;
        const isNewCell = !currentCell.hasShip;
        if (isNewCell && totalPaintedCells >= 15) return prev;
        if (
          currentBrushCells >= 13 &&
          currentCell.shipBrushId !== activeShipBrush
        )
          return prev;
      }

      const next = prev.map((row) => row.map((cell) => ({ ...cell })));
      next[r][c].hasShip = customPaintValueRef.current;
      next[r][c].shipBrushId = customPaintValueRef.current
        ? activeShipBrush
        : null;
      return next;
    });
    isCustomPaintingRef.current = true;
  };

  const handleCustomBoardTouchMove = (e, boardRef) => {
    if (!isCustomPaintingRef.current || !boardRef?.current) return;
    e.preventDefault();
    const touch = e.touches[0];
    const rect = boardRef.current.getBoundingClientRect();
    const cellSize = rect.width / 10;
    const c = Math.floor((touch.clientX - rect.left) / cellSize);
    const r = Math.floor((touch.clientY - rect.top) / cellSize);
    if (r >= 0 && r < BOARD_SIZE && c >= 0 && c < BOARD_SIZE) {
      applyCustomCellPaint(r, c);
    }
  };

  const stopCustomPainting = () => {
    isCustomPaintingRef.current = false;
  };

  const toggleCustomShipyard = () => {
    if (isPlacementLocked) return;
    const next = !isCustomShipyardActive;
    setIsCustomShipyardActive(next);
    isCustomPaintingRef.current = false;
    if (next) {
      // Switching TO custom mode: clear standard board & tray
      setCustomDrawBoard(createBoard());
      setPlayerBoard(createBoard());
      setUnplacedShipIds(SHIP_DEFS.map((s) => s.id));
      setDraggedShip(null);
      setDragPointer(null);
      setSelectedShip(null);
      setHoverCell(null);
      setInvalidRotationPreview(null);
      setFleetRuleMessage("");
    } else {
      // Switching BACK to standard mode: clear custom draw
      setPlayerBoard(createBoard());
      setUnplacedShipIds(SHIP_DEFS.map((s) => s.id));
      setFleetRuleMessage("");
    }
  };

  const clearCustomDraw = () => {
    if (isPlacementLocked) return;
    setCustomDrawBoard(createBoard());
  };

  const autoArrangeFleet = () => {
    if (isPlacementLocked) return;
    const legalSelections = getLegalFleetSelections(shipsToPlace);
    const selectedFleet =
      legalSelections[Math.floor(Math.random() * legalSelections.length)];
    if (!selectedFleet) {
      setFleetRuleMessage(copy.fleetNeedExactCells);
      addLog(copy.fleetNeedExactCells, "warning");
      return;
    }

    const arrangedBoard = createBoard();
    placeShipsRandomly(arrangedBoard, selectedFleet);
    setPlayerBoard(arrangedBoard);
    const selectedIds = new Set(selectedFleet.map((ship) => ship.id));
    setUnplacedShipIds(
      shipsToPlace
        .filter((ship) => !selectedIds.has(ship.id))
        .map((ship) => ship.id),
    );
    setSelectedShip(null);
    setDraggedShip(null);
    setDragPointer(null);
    setHoverCell(null);
    setInvalidRotationPreview(null);
    setFleetRuleMessage(copy.fleetValid);
    addLog(copy.autoArrangedLog, "info");
  };

  const beginBattle = async () => {
    // === Custom Shipyard mode ===
    if (isCustomShipyardActive) {
      if (!isCustomFleetValid) {
        addLog(getCustomShipyardMessage(), "warning");
        return;
      }
      if (isWaitingForOpponentFleet) return;
      playSound("click", { minGap: 250 });

      // Extract BFS ships and build baseOffsets payload
      const components = getConnectedComponents(customDrawBoard);
      const customShipsPayload = components.map((cells, idx) => {
        const minRow = Math.min(...cells.map((c) => c.row));
        const minCol = Math.min(...cells.map((c) => c.col));
        const baseOffsets = cells.map((c) => [c.row - minRow, c.col - minCol]);
        const brushId = customDrawBoard[minRow][minCol].shipBrushId;
        return {
          shipId: `custom-${idx}-${Date.now()}`,
          shipTypeId: "custom",
          row: minRow,
          col: minCol,
          rotation: 0,
          baseOffsets,
          shipBrushId: brushId,
        };
      });

      if (isPvpMode) {
        try {
          setPvpReadyLoading(true);
          const board = {
            placedAt: new Date().toISOString(),
            ships: customShipsPayload,
          };
          const nextRoom = await markPlayerReady({
            roomCode,
            player: roomPlayer,
            board,
          });
          setPvpRoom(nextRoom);
          setPvpFleetSubmitted(true);

          // Apply custom board as player board
          const newPlayerBoard = createBoard();
          components.forEach((cells, idx) => {
            const shipId = `custom-${idx}`;
            const minRow = Math.min(...cells.map((c) => c.row));
            const minCol = Math.min(...cells.map((c) => c.col));
            const offsets = cells.map((c) => [c.row - minRow, c.col - minCol]);
            const bounds = getShipBounds(offsets);
            cells.forEach(({ row, col }) => {
              newPlayerBoard[row][col].hasShip = true;
              newPlayerBoard[row][col].shipId = shipId;
              newPlayerBoard[row][col].shipTypeId = "custom";
              newPlayerBoard[row][col].shipRotation = 0;
              newPlayerBoard[row][col].shipOriginRow = minRow;
              newPlayerBoard[row][col].shipOriginCol = minCol;
              newPlayerBoard[row][col].shipLength = cells.length;
              newPlayerBoard[row][col].shipBrushId =
                customDrawBoard[row][col].shipBrushId;
            });
            newPlayerBoard[minRow][minCol].shipRoot = true;
            newPlayerBoard[minRow][minCol].shipBounds = bounds;
            newPlayerBoard[minRow][minCol].shipBrushId =
              customDrawBoard[minRow][minCol].shipBrushId;
          });
          setPlayerBoard(newPlayerBoard);

          if (nextRoom.status === "IN_PROGRESS") {
            setGameState("PLAYER_TURN");
            setTurnTimer(30);
          } else {
            setGameState("PLACEMENT");
          }
          addLog(
            nextRoom.status === "IN_PROGRESS"
              ? copy.bothReadyLog
              : copy.waitingFleetLog,
            "info",
          );
        } catch (readyError) {
          addLog(readyError.message || copy.unableMarkReady, "warning");
        } finally {
          setPvpReadyLoading(false);
        }
        return;
      }

      // Single-player: apply custom board as player board
      const newPlayerBoard = createBoard();
      components.forEach((cells, idx) => {
        const shipId = idx + 1;
        const minRow = Math.min(...cells.map((c) => c.row));
        const minCol = Math.min(...cells.map((c) => c.col));
        const offsets = cells.map((c) => [c.row - minRow, c.col - minCol]);
        const bounds = getShipBounds(offsets);
        cells.forEach(({ row, col }) => {
          newPlayerBoard[row][col].hasShip = true;
          newPlayerBoard[row][col].shipId = shipId;
          newPlayerBoard[row][col].shipTypeId = "custom";
          newPlayerBoard[row][col].shipRotation = 0;
          newPlayerBoard[row][col].shipOriginRow = minRow;
          newPlayerBoard[row][col].shipOriginCol = minCol;
          newPlayerBoard[row][col].shipLength = cells.length;
          newPlayerBoard[row][col].shipBrushId =
            customDrawBoard[row][col].shipBrushId;
        });
        newPlayerBoard[minRow][minCol].shipRoot = true;
        newPlayerBoard[minRow][minCol].shipBounds = bounds;
        newPlayerBoard[minRow][minCol].shipBrushId =
          customDrawBoard[minRow][minCol].shipBrushId;
      });
      setPlayerBoard(newPlayerBoard);

      // Build enemy board based on difficulty and shipyard rules
      let selectedFleet;
      if (difficulty === "easy" || difficulty === "normal") {
        // Bot is NOT allowed to use shipyard, choose random standard fleet
        const legalSelections = getLegalFleetSelections(SHIP_DEFS);
        selectedFleet =
          legalSelections[Math.floor(Math.random() * legalSelections.length)];
      } else {
        const botFleetIndex = Math.floor(
          Math.random() * BOT_CUSTOM_FLEETS.length,
        );
        selectedFleet = BOT_CUSTOM_FLEETS[botFleetIndex];
      }

      const newEnemyBoard = createBoard();
      placeShipsRandomly(newEnemyBoard, selectedFleet);
      setEnemyBoard(newEnemyBoard);
      setGameState("PLAYER_TURN");
      setTurnTimer(30);
      addLog(copy.battleInitiated, "info");
      addLog(copy.yourTurnStarted, "info");
      setStats((prev) => ({ ...prev, turns: 1 }));
      return;
    }

    // === Standard mode ===
    if (!isFleetValid || invalidRotationPreview || draggedShip) {
      const validationMessage =
        placedFleetShipCount < FLEET_MIN_SHIPS
          ? copy.fleetTooFewShips
          : placedFleetCellCount !== FLEET_CELL_LIMIT
            ? copy.fleetNeedExactCells
            : copy.fleetTooManyShips;
      setFleetRuleMessage(validationMessage);
      addLog(validationMessage, "warning");
      return;
    }
    if (isWaitingForOpponentFleet) return;
    playSound("click", { minGap: 250 });

    if (isPvpMode) {
      try {
        setPvpReadyLoading(true);
        // Encode baseOffsets for every ship (Giai đoạn 3 - backward compatible)
        const board = {
          placedAt: new Date().toISOString(),
          ships: playerBoard
            .flat()
            .filter((cell) => cell.shipRoot)
            .map((cell) => {
              const shipDef = SHIP_DEFS.find((d) => d.id === cell.shipTypeId);
              const originRow =
                cell.shipOriginRow !== null && cell.shipOriginRow !== undefined
                  ? cell.shipOriginRow
                  : cell.row;
              const originCol =
                cell.shipOriginCol !== null && cell.shipOriginCol !== undefined
                  ? cell.shipOriginCol
                  : cell.col;
              const baseOffsets = shipDef
                ? getShipOffsets(shipDef, cell.shipRotation)
                : [];
              return {
                shipId: cell.shipId,
                shipTypeId: cell.shipTypeId,
                row: originRow,
                col: originCol,
                rotation: cell.shipRotation,
                baseOffsets,
              };
            }),
        };
        console.log("Payload sent to server:", board.ships);
        const nextRoom = await markPlayerReady({
          roomCode,
          player: roomPlayer,
          board,
        });
        setPvpRoom(nextRoom);
        setPvpFleetSubmitted(true);
        setSelectedShip(null);
        setHoverCell(null);
        setDraggedShip(null);
        setDragPointer(null);
        setInvalidRotationPreview(null);
        if (nextRoom.status === "IN_PROGRESS") {
          setGameState("PLAYER_TURN");
          setTurnTimer(30);
        } else {
          setGameState("PLACEMENT");
        }
        addLog(
          nextRoom.status === "IN_PROGRESS"
            ? copy.bothReadyLog
            : copy.waitingFleetLog,
          "info",
        );
      } catch (readyError) {
        addLog(readyError.message || copy.unableMarkReady, "warning");
      } finally {
        setPvpReadyLoading(false);
      }
      return;
    }

    const newEnemyBoard = [
      ...enemyBoard.map((row) => [...row.map((c) => ({ ...c }))]),
    ];
    const botFleetSelections = getLegalFleetSelections(SHIP_DEFS);
    const botFleet =
      botFleetSelections[Math.floor(Math.random() * botFleetSelections.length)];
    placeShipsRandomly(newEnemyBoard, botFleet);
    setEnemyBoard(newEnemyBoard);
    setSelectedShip(null);
    setHoverCell(null);
    setGameState("PLAYER_TURN");
    setTurnTimer(30);
    addLog(copy.battleInitiated, "info");
    addLog(copy.yourTurnStarted, "info");
    setStats((prev) => ({ ...prev, turns: 1 }));
  };

  const getShipSpriteUrl = (cell) => {
    if (!cell.shipRoot) return "";
    const sprite = SHIP_SPRITES[cell.shipTypeId]?.[cell.shipRotation];
    return resolveSpriteUrl(sprite);
  };

  const getShipOverlayStyle = (cell) => {
    if (!cell.shipBounds) return null;
    const originCol = cell.shipOriginCol ?? cell.col;
    const originRow = cell.shipOriginRow ?? cell.row;

    return {
      position: "absolute",
      left: `calc(${originCol} * (var(--cell-size) + var(--cell-gap)) + ${SHIP_CELL_PADDING}px)`,
      top: `calc(${originRow} * (var(--cell-size) + var(--cell-gap)) + ${SHIP_CELL_PADDING}px)`,
      width: `calc(${cell.shipBounds.cols} * var(--cell-size) + ${cell.shipBounds.cols - 1} * var(--cell-gap) - ${SHIP_CELL_PADDING * 2}px)`,
      height: `calc(${cell.shipBounds.rows} * var(--cell-size) + ${cell.shipBounds.rows - 1} * var(--cell-gap) - ${SHIP_CELL_PADDING * 2}px)`,
      overflow: "hidden",
      filter: "drop-shadow(0 0 6px rgba(0, 0, 0, 0.45))",
    };
  };

  const getShipImageStyle = (cell) => {
    if (!cell.shipBounds) return null;
    const rotationDeg = cell.shipRotation || 0;
    const quarterTurn = rotationDeg === 90 || rotationDeg === 270;
    const isAngledShip =
      cell.shipTypeId === "destroyer" || cell.shipTypeId === "zship";
    const tShipTransform =
      T_SHIP_IMAGE_TRANSFORMS[cell.shipTypeId]?.[rotationDeg] || null;
    const tShipImageRotation = tShipTransform
      ? ((tShipTransform.rotation % 360) + 360) % 360
      : 0;
    const tShipImageQuarterTurn =
      tShipImageRotation === 90 || tShipImageRotation === 270;

    // Ships that need the cover+dimension-swap treatment (portrait source images)
    // carrier & patrol: stored as portrait, natural placement is horizontal → need +90°
    // cruiser & frigate: stored as portrait, natural placement is vertical → no +90°
    const isStraightShip =
      cell.shipTypeId === "carrier" ||
      cell.shipTypeId === "patrol" ||
      cell.shipTypeId === "cruiser" ||
      cell.shipTypeId === "frigate";

    const usesVerticalSourceImage =
      cell.shipTypeId === "carrier" || cell.shipTypeId === "patrol";
    const straightImageRotation = usesVerticalSourceImage
      ? rotationDeg + 90
      : rotationDeg;
    const isLShip = cell.shipTypeId === "destroyer";
    let offsetX = 0;
    let offsetY = 0;
    if (isAngledShip) {
      const rotatedOffset = getAngledShipOffset(cell.shipTypeId, rotationDeg);
      offsetX = rotatedOffset.x;
      offsetY = rotatedOffset.y;
    } else if (cell.shipTypeId === "lancer") {
      const normRot = ((rotationDeg % 360) + 360) % 360;
      if (normRot === 0) {
        offsetX = -16;
        offsetY = 6;
      } else if (normRot === 90) {
        offsetX = -4;
        offsetY = -15;
      } else if (normRot === 180) {
        offsetX = 18;
        offsetY = -4;
      } else if (normRot === 270) {
        offsetX = 6;
        offsetY = 16;
      }
    }

    // Per-ship scale overrides for ships that appear too small on the board
    const SHIP_SCALE_OVERRIDES = {
      cruiser: 1.1,
      frigate: 1.1,
      lancer: 1.28,
    };

    const scale = SHIP_SCALE_OVERRIDES[cell.shipTypeId]
      ? SHIP_SCALE_OVERRIDES[cell.shipTypeId]
      : isLShip
        ? L_SHIP_IMAGE_SCALE
        : isAngledShip
          ? SHIP_IMAGE_SCALE
          : 1;

    const wCalc = `calc(${cell.shipBounds.cols} * var(--cell-size) + ${cell.shipBounds.cols - 1} * var(--cell-gap))`;
    const hCalc = `calc(${cell.shipBounds.rows} * var(--cell-size) + ${cell.shipBounds.rows - 1} * var(--cell-gap))`;

    if (isStraightShip) {
      const straightQuarterTurn =
        straightImageRotation === 90 || straightImageRotation === 270;
      const shipScale =
        SHIP_SCALE_OVERRIDES[cell.shipTypeId] ||
        (cell.shipTypeId === "patrol" ? 1.5 : 1);
      const patrolOffsetsByRotation = {
        0: { x: PATROL_IMAGE_OFFSET_X, y: PATROL_IMAGE_OFFSET_Y },
        90: {
          x: PATROL_VERTICAL_IMAGE_OFFSET_X,
          y: PATROL_VERTICAL_IMAGE_OFFSET_Y,
        },
        180: { x: -PATROL_IMAGE_OFFSET_X, y: -PATROL_IMAGE_OFFSET_Y },
        270: {
          x: -PATROL_VERTICAL_IMAGE_OFFSET_X,
          y: -PATROL_VERTICAL_IMAGE_OFFSET_Y,
        },
      };
      const patrolOffset =
        patrolOffsetsByRotation[rotationDeg] || patrolOffsetsByRotation[0];
      const straightOffsetX = cell.shipTypeId === "patrol" ? patrolOffset.x : 0;
      const straightOffsetY = cell.shipTypeId === "patrol" ? patrolOffset.y : 0;
      // Per-ship objectPosition to crop white/transparent edges in source images
      const SHIP_OBJECT_POSITION = {
        cruiser: straightQuarterTurn ? "center 35%" : "center 35%",
        frigate: "center",
      };
      const objectPosition = SHIP_OBJECT_POSITION[cell.shipTypeId] || "center";
      return {
        position: "absolute",
        left: straightQuarterTurn ? `calc((${wCalc} - ${hCalc}) / 2)` : "0",
        top: straightQuarterTurn ? `calc((${hCalc} - ${wCalc}) / 2)` : "0",
        width: straightQuarterTurn ? hCalc : "100%",
        height: straightQuarterTurn ? wCalc : "100%",
        objectFit: "cover",
        objectPosition,
        transform: `translate(${straightOffsetX}px, ${straightOffsetY}px) rotate(${straightImageRotation}deg) scale(${shipScale})`,
        transformOrigin: "center",
        imageRendering: "auto",
        maxWidth: "none",
      };
    }

    return {
      position: "absolute",
      left: tShipTransform
        ? tShipImageQuarterTurn
          ? `calc((${wCalc} - ${hCalc}) / 2)`
          : "0"
        : quarterTurn
          ? `calc((${wCalc} - ${hCalc}) / 2)`
          : "0",
      top: tShipTransform
        ? tShipImageQuarterTurn
          ? `calc((${hCalc} - ${wCalc}) / 2)`
          : "0"
        : quarterTurn
          ? `calc((${hCalc} - ${wCalc}) / 2)`
          : "0",
      width: tShipTransform
        ? tShipImageQuarterTurn
          ? hCalc
          : "100%"
        : quarterTurn
          ? hCalc
          : "100%",
      height: tShipTransform
        ? tShipImageQuarterTurn
          ? wCalc
          : "100%"
        : quarterTurn
          ? wCalc
          : "100%",
      objectFit: tShipTransform ? "contain" : isAngledShip ? "cover" : "fill",
      objectPosition: "center",
      transform: tShipTransform
        ? `translate(${tShipTransform.x}px, ${tShipTransform.y}px) rotate(${tShipTransform.rotation}deg) scale(${tShipTransform.scale})`
        : `translate(${offsetX}px, ${offsetY}px) rotate(${rotationDeg}deg) scale(${scale})`,
      transformOrigin: "center",
      maxWidth: "none",
    };
  };

  const getFallbackShipCells = (board, shipId) => {
    const cells = [];
    board.forEach((row) => {
      row.forEach((cell) => {
        if (cell.shipId === shipId) cells.push(cell);
      });
    });
    return cells;
  };

  const renderBoard = (board, isEnemy, boardSide) => {
    const letters = ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J"];
    const previewShip = currentShip;
    const previewRotation = rotation;
    let placementOffsets = null;
    let canPlace = false;

    if (
      !isEnemy &&
      hoverCell &&
      (gameState === "PLACEMENT" || gameState === "READY")
    ) {
      const movingShip = draggedShip || selectedShip;

      if (movingShip) {
        const rootRow = draggedShip
          ? hoverCell.r - draggedShip.grabOffset.row
          : hoverCell.r;
        const rootCol = draggedShip
          ? hoverCell.c - draggedShip.grabOffset.col
          : hoverCell.c;
        const previewBoard = cloneBoard(board);

        clearShipFromBoard(previewBoard, movingShip.shipId);
        placementOffsets = getShipOffsets(
          movingShip.shipDef,
          movingShip.rotation,
        ).map(([dr, dc]) => ({ r: rootRow + dr, c: rootCol + dc }));
        canPlace = canPlaceShip(
          previewBoard,
          rootRow,
          rootCol,
          movingShip.shipDef,
          movingShip.rotation,
        );
      }
    }

    if (
      !isEnemy &&
      (gameState === "PLACEMENT" || gameState === "READY") &&
      invalidRotationPreview &&
      !draggedShip
    ) {
      placementOffsets = getShipOffsets(
        invalidRotationPreview.shipDef,
        invalidRotationPreview.rotation,
      ).map(([dr, dc]) => ({
        r: invalidRotationPreview.row + dr,
        c: invalidRotationPreview.col + dc,
      }));
      canPlace = false;
    }

    const shipOverlays = [];
    const hitOverlays = [];
    const smokeCells = [];
    let dragGhostOverlay = null;
    const sunkShipIds = isEnemy ? enemySunkShipIds : playerShipsSunk;
    const showAllShips = !isEnemy || gameState === "GAME_OVER";
    if (showAllShips || sunkShipIds.length > 0) {
      board.forEach((row) => {
        row.forEach((cell) => {
          if (!cell.shipRoot) return;
          const isShipSunk = sunkShipIds.includes(cell.shipId);
          if (!showAllShips && !isShipSunk) return;

          const spriteUrl = getShipSpriteUrl(cell);
          const overlayStyle = getShipOverlayStyle(cell);
          const imageStyle = getShipImageStyle(cell);
          if (!overlayStyle) return;
          shipOverlays.push(
            <div
              key={`ship-${cell.shipId}`}
              data-board-side={boardSide}
              data-ship-id={cell.shipId}
              className={`pointer-events-none ship-overlay ${
                isShipSunk ? "ship-sunk-silhouette" : ""
              } ${!isShipSunk ? "ship-afloat" : ""} ${
                draggedShip?.shipId === cell.shipId ? "ship-drag-source" : ""
              } ${
                invalidRotationPreview?.shipId === cell.shipId
                  ? "ship-invalid-source"
                  : ""
              }`}
              style={overlayStyle}
            >
              {spriteUrl ? (
                <img src={spriteUrl} alt="" style={imageStyle} />
              ) : (
                getFallbackShipCells(board, cell.shipId).map((shipCell) => (
                  <div
                    key={`${cell.shipId}-${shipCell.row}-${shipCell.col}`}
                    className={`absolute ocean-cell ${shipCell.shipBrushId ? `custom-painted-cell-${shipCell.shipBrushId}` : "bg-secondary/30 border border-secondary/40"}`}
                    style={{
                      left: `calc(${shipCell.col - (cell.shipOriginCol ?? cell.col)} * (var(--cell-size) + var(--cell-gap)))`,
                      top: `calc(${shipCell.row - (cell.shipOriginRow ?? cell.row)} * (var(--cell-size) + var(--cell-gap)))`,
                      width: `var(--cell-size)`,
                      height: `var(--cell-size)`,
                    }}
                  />
                ))
              )}
            </div>,
          );
        });
      });
    }

    if (
      !isEnemy &&
      (gameState === "PLACEMENT" || gameState === "READY") &&
      invalidRotationPreview &&
      !draggedShip
    ) {
      const invalidOffsets = getShipOffsets(
        invalidRotationPreview.shipDef,
        invalidRotationPreview.rotation,
      );
      const invalidBounds = getShipBounds(invalidOffsets);
      const invalidCell = {
        row: invalidRotationPreview.row,
        col: invalidRotationPreview.col,
        shipTypeId: invalidRotationPreview.shipDef.id,
        shipRotation: invalidRotationPreview.rotation,
        shipBounds: invalidBounds,
        shipOriginRow: invalidRotationPreview.row,
        shipOriginCol: invalidRotationPreview.col,
      };
      const invalidSpriteUrl = resolveSpriteUrl(
        SHIP_SPRITES[invalidRotationPreview.shipDef.id]?.[
          invalidRotationPreview.rotation
        ],
      );

      if (invalidSpriteUrl) {
        shipOverlays.push(
          <div
            key={`invalid-ship-${invalidRotationPreview.shipId}`}
            className="pointer-events-none ship-overlay ship-invalid-placement"
            style={getShipOverlayStyle(invalidCell)}
          >
            <img
              src={invalidSpriteUrl}
              alt=""
              style={getShipImageStyle(invalidCell)}
            />
          </div>,
        );
      }
    }

    if (
      !isEnemy &&
      (gameState === "PLACEMENT" || gameState === "READY") &&
      draggedShip &&
      dragPointer
    ) {
      const offsets = getShipOffsets(draggedShip.shipDef, draggedShip.rotation);
      const bounds = getShipBounds(offsets);
      const ghostCell = {
        row: 0,
        col: 0,
        shipTypeId: draggedShip.shipDef.id,
        shipRotation: draggedShip.rotation,
        shipBounds: bounds,
      };
      const ghostImageStyle = getShipImageStyle(ghostCell);
      const ghostSpriteUrl = resolveSpriteUrl(
        SHIP_SPRITES[draggedShip.shipDef.id]?.[draggedShip.rotation],
      );
      const ghostWidth = `calc(${bounds.cols} * var(--cell-size) + ${bounds.cols - 1} * var(--cell-gap))`;
      const ghostHeight = `calc(${bounds.rows} * var(--cell-size) + ${bounds.rows - 1} * var(--cell-gap))`;
      const isSnappedToBoard = Boolean(hoverCell && placementOffsets?.length);
      const snappedRootRow = isSnappedToBoard
        ? hoverCell.r - draggedShip.grabOffset.row
        : 0;
      const snappedRootCol = isSnappedToBoard
        ? hoverCell.c - draggedShip.grabOffset.col
        : 0;

      if (ghostSpriteUrl) {
        dragGhostOverlay = (
          <div
            className={`ship-drag-ghost ${canPlace ? "is-valid" : "is-invalid"}`}
            style={{
              position: isSnappedToBoard ? "absolute" : "fixed",
              left: isSnappedToBoard
                ? `calc(${snappedRootCol} * (var(--cell-size) + var(--cell-gap)))`
                : `${dragPointer.x - draggedShip.pointerOffset.x}px`,
              top: isSnappedToBoard
                ? `calc(${snappedRootRow} * (var(--cell-size) + var(--cell-gap)))`
                : `${dragPointer.y - draggedShip.pointerOffset.y}px`,
              width: ghostWidth,
              height: ghostHeight,
              overflow: "hidden",
            }}
          >
            <img src={ghostSpriteUrl} alt="" style={ghostImageStyle} />
          </div>
        );
      }
    }

    board.forEach((row) => {
      row.forEach((cell) => {
        if (!cell.isHit) return;

        if (cell.hasShip) {
          // Hit on a ship cell → smoke + red hit mark
          smokeCells.push({ row: cell.row, col: cell.col });
          hitOverlays.push(
            <div
              key={`hit-${cell.row}-${cell.col}-${visibilityTrigger}`}
              className="shot-effect shot-hit"
              style={{
                left: `calc(${cell.col} * (var(--cell-size) + var(--cell-gap)))`,
                top: `calc(${cell.row} * (var(--cell-size) + var(--cell-gap)))`,
                right: "auto",
                bottom: "auto",
                width: `var(--cell-size)`,
                height: `var(--cell-size)`,
              }}
              aria-hidden="true"
            >
              <span className="hit-static-mark" />
            </div>,
          );
        } else if (!cell.autoMarked) {
          // Miss on an empty cell → blue miss dot (rendered at z-40 to appear above ship overlays at z-20)
          hitOverlays.push(
            <div
              key={`miss-${cell.row}-${cell.col}-${visibilityTrigger}`}
              className="shot-effect shot-miss"
              style={{
                left: `calc(${cell.col} * (var(--cell-size) + var(--cell-gap)))`,
                top: `calc(${cell.row} * (var(--cell-size) + var(--cell-gap)))`,
                right: "auto",
                bottom: "auto",
                width: `var(--cell-size)`,
                height: `var(--cell-size)`,
              }}
              aria-hidden="true"
            >
              <span className="miss-dot" />
            </div>,
          );
        }
      });
    });

    return (
      <div
        className={`battle-coordinate-grid select-none grid ${isPvpMode ? "is-pvp" : ""}`}
        style={{
          gridTemplateColumns: `24px var(--label-gap, 6px) repeat(${BOARD_SIZE}, var(--cell-size))`,
          gridTemplateRows: `24px var(--label-gap, 6px) repeat(${BOARD_SIZE}, var(--cell-size))`,
          gap: `var(--cell-gap)`,
          touchAction: "none",
          overscrollBehaviorY: "contain",
        }}
      >
        {/* Column Headers (A-J) */}
        {letters.map((l, colIndex) => (
          <div
            key={l}
            className="coordinate-label coordinate-label-column flex items-center justify-center text-secondary/70 font-bold text-xs"
            style={{
              gridRow: 1,
              gridColumn: colIndex + 3,
            }}
          >
            {l}
          </div>
        ))}

        {/* Row Headers (1-10) */}
        {Array.from({ length: BOARD_SIZE }).map((_, rowIndex) => (
          <div
            key={rowIndex}
            className="coordinate-label coordinate-label-row flex items-center justify-center text-secondary/70 font-bold text-xs"
            style={{
              gridRow: rowIndex + 3,
              gridColumn: 1,
            }}
          >
            {rowIndex + 1}
          </div>
        ))}

        {/* Board Surface */}
        <div
          ref={boardSide === "player" ? playerBoardRef : null}
          className={`ocean-board-surface relative ${isMobile && (gameState === "PLACEMENT" || gameState === "READY") ? "touch-none" : ""} ${isEnemy && isShotResolving ? "pointer-events-none" : ""}`}
          style={{
            gridColumn: `3 / ${BOARD_SIZE + 3}`,
            gridRow: `3 / ${BOARD_SIZE + 3}`,
            width: `var(--board-size)`,
            height: `var(--board-size)`,
          }}
        >
          <div className="absolute inset-0 z-20 pointer-events-none">
            {shipOverlays}
          </div>
          <div className="absolute inset-0 z-30 pointer-events-none">
            {dragGhostOverlay}
          </div>
          <div className="absolute inset-0 z-40 pointer-events-none">
            {hitOverlays}
          </div>
          <BattleEffectsLayer
            ref={boardSide === "enemy" ? enemyEffectsRef : playerEffectsRef}
            width={GRID_SIZE_PX}
            height={GRID_SIZE_PX}
            cellSize={CELL_SIZE}
            cellGap={CELL_GAP}
            boardSide={boardSide}
            smokeCells={smokeCells}
            isLightMode={isLightMode}
          />
          <div
            className="relative z-10 grid"
            style={{
              gridTemplateColumns: `repeat(${BOARD_SIZE}, var(--cell-size))`,
              gridAutoRows: `var(--cell-size)`,
              gap: `var(--cell-gap)`,
            }}
          >
            {/* In custom mode: render customDrawBoard on the main player grid */}
            {(!isEnemy && isCustomShipyardActive
              ? customDrawBoard
              : board
            ).flatMap((row, r) =>
              row.map((cell, c) => {
                // --- Custom Shipyard paint mode ---
                if (!isEnemy && isCustomShipyardActive) {
                  const isPainted = cell.hasShip;
                  return (
                    <div
                      key={`${r}-${c}`}
                      data-row={r}
                      data-col={c}
                      onMouseDown={(e) => handleCustomCellMouseDown(e, r, c)}
                      onMouseEnter={() => handleCustomCellMouseEnter(r, c)}
                      onMouseUp={stopCustomPainting}
                      onTouchStart={(e) => handleCustomBoardTouchStart(e, r, c)}
                      onTouchMove={(e) =>
                        handleCustomBoardTouchMove(e, playerBoardRef)
                      }
                      onTouchEnd={stopCustomPainting}
                      className={`ocean-cell relative overflow-visible ${isPlacementLocked ? "cursor-default" : "cursor-crosshair"} ${!isPainted ? "" : `custom-painted-cell-${cell.shipBrushId}`}`}
                      style={{
                        transition:
                          "background 0.1s, border 0.1s, box-shadow 0.1s",
                        userSelect: "none",
                        touchAction: "none",
                      }}
                    />
                  );
                }

                // --- Standard mode ---
                const isHovered = placementOffsets
                  ? placementOffsets.some((pos) => pos.r === r && pos.c === c)
                  : false;
                const isCellHit = cell.isHit;
                const isCellMiss = isCellHit && !cell.hasShip;
                const isSunkShipCell =
                  cell.hasShip && sunkShipIds.includes(cell.shipId);
                const playerCellBg = cell.hasShip ? "bg-transparent" : "";
                const baseCellBg = isEnemy
                  ? isSunkShipCell
                    ? "bg-transparent"
                    : "bg-surface-container hover:bg-white/10"
                  : playerCellBg;
                const isDraggableShipCell =
                  !isEnemy &&
                  (gameState === "PLACEMENT" || gameState === "READY") &&
                  cell.hasShip;
                const cursorClass = draggedShip
                  ? "cursor-grabbing"
                  : isDraggableShipCell
                    ? "cursor-grab"
                    : "cursor-pointer";

                const showBrush = cell.shipBrushId && (!isEnemy || cell.isHit);

                return (
                  <div
                    key={`${r}-${c}`}
                    data-row={r}
                    data-col={c}
                    onMouseEnter={() => !isEnemy && handlePlayerCellHover(r, c)}
                    onMouseLeave={() => !isEnemy && setHoverCell(null)}
                    onContextMenu={(event) =>
                      !isEnemy && handlePlayerCellContextMenu(event, r, c)
                    }
                    onClick={(event) =>
                      isEnemy
                        ? handleEnemyCellClick(r, c)
                        : handlePlayerCellClick(event, r, c)
                    }
                    onDoubleClick={(event) =>
                      !isEnemy && handlePlayerCellDoubleClick(event, r, c)
                    }
                    onTouchStart={(event) =>
                      !isEnemy && handleTouchStart(event, r, c)
                    }
                    onTouchMove={(event) => !isEnemy && handleTouchMove(event)}
                    onTouchEnd={(event) =>
                      !isEnemy && handleTouchEnd(event, r, c)
                    }
                    className={`ocean-cell relative ${cursorClass} overflow-visible transition-all duration-300 ${baseCellBg} ${!isEnemy && cell.hasShip ? "player-ship-cell" : ""} ${showBrush ? `custom-painted-cell-${cell.shipBrushId}` : ""} ${
                      isHovered
                        ? canPlace && !invalidRotationPreview
                          ? "drag-target-cell-valid"
                          : "drag-target-cell-invalid"
                        : ""
                    }`}
                  >
                    {/* Miss dots are now rendered as overlays at z-40 (hitOverlays) to appear above ship overlays at z-20 */}
                  </div>
                );
              }),
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="game-shell bg-background text-on-background font-body-md min-h-screen selection:bg-secondary/30 flex flex-col">
      <CommandHeader
        currentUser={user}
        attributes={attributes}
        authLoading={authLoading}
        isLightMode={isLightMode}
        onToggleTheme={toggleTheme}
        onLogout={handleLogout}
        onNavigateRequest={handleHeaderNavigation}
        hideNav={true}
        customActions={
          <div
            className="game-header-actions"
            style={{
              display: "flex",
              alignItems: "center",
              gap: "12px",
              marginRight: "12px",
            }}
          >
            {isPvpMode ? (
              <button
                onClick={(event) => {
                  if (!shouldConfirmPvpExit()) {
                    navigate("/");
                    return;
                  }
                  event.preventDefault();
                  requestGameExit("/");
                }}
                className="pvp-leave-match-button"
              >
                <span className="material-symbols-outlined" aria-hidden="true">
                  logout
                </span>
                <span>{copy.leave || "Leave Match"}</span>
              </button>
            ) : (
              <>
                <span className="game-header-difficulty">
                  {copy.difficultyLabel}:{" "}
                  {copy.difficultyNames?.[difficulty] || difficulty}
                </span>
                <button
                  onClick={() => requestGameExit("/")}
                  className="pvp-leave-match-button game-exit-button"
                >
                  <span
                    className="material-symbols-outlined"
                    aria-hidden="true"
                  >
                    logout
                  </span>
                  <span>{copy.leave || "Leave Match"}</span>
                </button>
              </>
            )}
          </div>
        }
      />

      <main
        className={`game-main flex-1 w-full max-w-[1440px] mx-auto px-gutter flex flex-col lg:flex-row gap-4 pb-20 lg:pb-0 ${isPvpMode ? "pvp-game-main" : ""} ${gameState === "PLACEMENT" || gameState === "READY" ? "is-deploying" : ""}`}
      >
        {/* Boards Section */}
        <div className="game-board-column flex-1 flex flex-col lg:w-[70%] lg:flex-none transition-all">
          {/* PvP Command Strip — replaces two side panels and game-status */}
          {isPvpMode && (
            <div
              className="sticky z-40 lg:static bg-background/95 lg:bg-transparent pb-2 lg:pb-0 pt-2 lg:pt-0 backdrop-blur-md lg:backdrop-blur-none -mx-gutter px-gutter lg:mx-0 lg:px-0"
              style={{ top: "76px" }}
            >
              <PvpCommandStrip
                myPlayer={currentBattlePlayer || roomPlayer}
                myRankLabel={
                  (currentBattlePlayer?.rank &&
                  currentBattlePlayer.rank.toLowerCase() !== "unranked"
                    ? currentBattlePlayer.rank
                    : null) ||
                  (attributes?.rank &&
                  attributes.rank.toLowerCase() !== "unranked"
                    ? attributes.rank
                    : null) ||
                  copy.unrankedLabel
                }
                myIsConnected={pvpSocketReady}
                myIsMyTurn={
                  pvpTurnUserId ===
                  getRoomPlayerKey(currentBattlePlayer || roomPlayer)
                }
                myIsDeploying={
                  gameState === "PLACEMENT" || gameState === "READY"
                }
                myIsReady={
                  (gameState === "PLACEMENT" || gameState === "READY") &&
                  Boolean(currentBattlePlayer?.fleetReady)
                }
                myShipsAfloat={Math.max(
                  0,
                  placedFleetDefs.length - playerSunkShipTypeIds.length,
                )}
                oppPlayer={opponentBattlePlayer}
                oppRankLabel={
                  (opponentBattlePlayer?.rank &&
                  opponentBattlePlayer.rank.toLowerCase() !== "unranked"
                    ? opponentBattlePlayer.rank
                    : null) || copy.unrankedLabel
                }
                oppIsConnected={Boolean(opponentBattlePlayer) && pvpSocketReady}
                oppIsTheirTurn={
                  Boolean(opponentBattlePlayer) &&
                  pvpTurnUserId === getRoomPlayerKey(opponentBattlePlayer)
                }
                oppIsDeploying={
                  gameState === "PLACEMENT" || gameState === "READY"
                }
                oppIsReady={
                  (gameState === "PLACEMENT" || gameState === "READY") &&
                  Boolean(opponentBattlePlayer?.fleetReady)
                }
                oppShipsAfloat={Math.max(
                  0,
                  (opponentBattlePlayer?.board?.ships?.length ||
                    enemyFleetDefs.length) - enemyShipsSunk.length,
                )}
                statusTextNode={
                  <>
                    {gameState === "PLACEMENT" &&
                      (isWaitingForOpponentFleet
                        ? copy.waitingFleetLog
                        : !isFleetValid
                          ? copy.dragShipsInstructions ||
                            "Drag ships from staging onto your map. Right-click to rotate."
                          : copy.formationCompleteInstructions ||
                            "Formation complete. Adjust ships, auto-arrange again, or press Ready.")}
                    {gameState === "READY" &&
                      (selectedShip
                        ? copy.moveSelectedShipInstructions ||
                          "Move the selected ship or right-click to rotate it, then press Ready."
                        : copy.selectShipInstructions ||
                          "Select any ship to move or rotate it, then press Ready.")}
                    {gameState === "PLAYER_TURN" && (
                      <span className="text-secondary glow-text">
                        {getPvpStatusText()}
                      </span>
                    )}
                    {gameState === "BOT_TURN" && (
                      <span className="text-error">
                        {copy.enemyFiring ||
                          "Enemy is firing! Brace for impact!"}
                      </span>
                    )}
                    {gameState === "GAME_OVER" &&
                      (winner === "PLAYER" ? (
                        <span className="text-green-400">
                          {copy.sectorSecured || "Sector Secured!"}
                        </span>
                      ) : (
                        <span className="text-error">
                          {copy.fleetAnnihilated || "Fleet Annihilated!"}
                        </span>
                      ))}
                  </>
                }
                actionButtonNode={
                  (gameState === "PLACEMENT" || gameState === "READY") && (
                    <button
                      onClick={beginBattle}
                      disabled={
                        (isCustomShipyardActive
                          ? !isCustomFleetValid
                          : !isFleetValid ||
                            Boolean(invalidRotationPreview) ||
                            Boolean(draggedShip)) ||
                        pvpReadyLoading ||
                        isWaitingForOpponentFleet
                      }
                      className={`game-ready-btn font-bold px-4 py-1.5 md:px-8 md:py-2 text-sm md:text-base rounded-sm transition-all tracking-widest ${
                        (isCustomShipyardActive
                          ? !isCustomFleetValid
                          : !isFleetValid ||
                            invalidRotationPreview ||
                            draggedShip) ||
                        pvpReadyLoading ||
                        isWaitingForOpponentFleet
                          ? "bg-surface-container text-on-surface-variant/40 cursor-not-allowed opacity-50"
                          : "is-valid-ready bg-secondary text-on-secondary-fixed hover:bg-secondary-container active:scale-95"
                      }`}
                    >
                      {pvpReadyLoading
                        ? copy.syncing
                        : isWaitingForOpponentFleet
                          ? copy.waitingPlayer
                          : copy.ready}
                    </button>
                  )
                }
                copy={copy}
              />
            </div>
          )}
          {/* Status Header — Only for Single Player Modes */}
          {!isPvpMode && (
            <div className="game-status glass-card rounded-xl border border-white/10 flex flex-row md:grid md:grid-cols-3 gap-3 md:gap-0 items-center justify-between w-full mb-2 p-3 md:p-4">
              {/* Left Column: Sector Command Title */}
              <div className="hidden md:flex w-full md:w-auto flex-col justify-center items-start">
                <h2 className="font-display-lg text-sm md:text-lg uppercase tracking-widest text-on-surface leading-none text-left">
                  {gameState === "PLACEMENT" || gameState === "READY"
                    ? copy.deployFleet || "Deploy Your Fleet"
                    : copy.sectorCommand || "Sector Command"}
                </h2>
              </div>

              {/* Center Column: Turn Indicator Badge */}
              <div className="flex-1 md:flex-none flex justify-start md:justify-center items-center">
                {(gameState === "PLACEMENT" || gameState === "READY") && (
                  <span className="turn-badge-deploying">
                    {getInstructionText(isMobile)}
                  </span>
                )}
                {gameState === "PLAYER_TURN" && (
                  <span className="turn-badge-player">
                    {language === "vi" ? "Lượt của bạn" : "Your Turn"}
                  </span>
                )}
                {gameState === "BOT_TURN" && (
                  <span className="turn-badge-bot">
                    {language === "vi" ? "Lượt của máy" : "Enemy Turn"}
                  </span>
                )}
                {gameState === "GAME_OVER" &&
                  (winner === "PLAYER" ? (
                    <span className="turn-badge-victory">
                      {language === "vi" ? "Chiến thắng" : "Victory"}
                    </span>
                  ) : (
                    <span className="turn-badge-defeat">
                      {language === "vi" ? "Thất bại" : "Defeat"}
                    </span>
                  ))}
              </div>

              {/* Right Column: Action Button or Time */}
              <div className="flex-none flex justify-end items-center ml-2 md:ml-0 md:w-auto">
                {(gameState === "PLACEMENT" || gameState === "READY") && (
                  <button
                    onClick={beginBattle}
                    disabled={
                      isCustomShipyardActive
                        ? !isCustomFleetValid
                        : !isFleetValid ||
                          Boolean(invalidRotationPreview) ||
                          Boolean(draggedShip)
                    }
                    className={`game-ready-btn font-bold px-4 py-1.5 md:px-8 md:py-2 text-sm md:text-base rounded-sm transition-all tracking-widest ${
                      isCustomShipyardActive
                        ? !isCustomFleetValid
                        : !isFleetValid || invalidRotationPreview || draggedShip
                          ? "bg-surface-container text-on-surface-variant/40 cursor-not-allowed opacity-50"
                          : "is-valid-ready bg-secondary text-on-secondary-fixed hover:bg-secondary-container active:scale-95"
                    }`}
                  >
                    {copy.ready}
                  </button>
                )}
                {(gameState === "PLAYER_TURN" || gameState === "BOT_TURN") && (
                  <div className="text-right">
                    <span className="text-[10px] text-on-surface-variant uppercase font-bold tracking-widest block leading-none mb-1">
                      {copy.timeLabel || "Time"}
                    </span>
                    <div
                      className={`text-xl md:text-3xl font-black leading-none ${turnTimer <= 10 ? "timer-pulse-red animate-pulse" : "text-secondary"}`}
                    >
                      {turnTimer}s
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Battle Tabs for Mobile */}
          {isMobile && gameState !== "PLACEMENT" && gameState !== "READY" && (
            <div className="flex w-full justify-center gap-3 mb-3 px-4">
              <button
                onClick={() => setActiveBattleTab("enemy")}
                className={`mobile-battle-tab flex-1 ${
                  activeBattleTab === "enemy"
                    ? "is-active-enemy"
                    : "is-inactive"
                }`}
              >
                {(isPvpMode ? copy.enemyFleet : copy.enemyWaters) ||
                  "ENEMY WATERS"}
              </button>
              <button
                onClick={() => setActiveBattleTab("fleet")}
                className={`mobile-battle-tab flex-1 ${
                  activeBattleTab === "fleet"
                    ? "is-active-fleet"
                    : "is-inactive"
                }`}
              >
                {copy.yourFleet || "YOUR FLEET"}
              </button>
            </div>
          )}

          <div
            className={`game-boards flex ${isMobile && isCustomShipyardActive && gameState === "PLACEMENT" ? "flex-col-reverse" : "flex-col"} lg:flex-row justify-center items-center lg:items-start w-full relative`}
          >
            {/* Player Board */}
            <div
              className={`battle-board-section flex flex-col items-center ${isMobile && gameState !== "PLACEMENT" && gameState !== "READY" && activeBattleTab !== "fleet" ? "hidden lg:flex" : ""}`}
            >
              {isMobile &&
                !isCustomShipyardActive &&
                (gameState === "PLACEMENT" || gameState === "READY") && (
                  <div className="flex flex-col w-full max-w-[430px] mb-2 lg:hidden">
                    <div
                      className="mobile-fleet-tray flex overflow-x-auto overflow-y-hidden py-1 gap-2 w-full snap-x"
                      style={{
                        "--cell-size": "16px",
                        "--cell-gap": "1px",
                      }}
                    >
                      {filteredDockShips.map((shipDef) => {
                        const isPlaced = !unplacedShipIds.includes(shipDef.id);
                        const trayRotation =
                          trayRotations[shipDef.id] ?? shipDef.rotations[0];
                        const trayOffsets = getShipOffsets(
                          shipDef,
                          trayRotation,
                        );
                        const trayBounds = getShipBounds(trayOffsets);
                        const trayCell = {
                          row: 0,
                          col: 0,
                          shipTypeId: shipDef.id,
                          shipRotation: trayRotation,
                          shipBounds: trayBounds,
                        };
                        const mCellSize = 16;
                        const mCellGap = 1;
                        const trayWidth =
                          trayBounds.cols * mCellSize +
                          (trayBounds.cols - 1) * mCellGap;
                        const trayHeight =
                          trayBounds.rows * mCellSize +
                          (trayBounds.rows - 1) * mCellGap;
                        const spriteUrl = resolveSpriteUrl(
                          SHIP_SPRITES[shipDef.id]?.[trayRotation],
                        );
                        const activeShipTypeId =
                          draggedShip?.shipDef?.id || selectedShip?.shipDef?.id;
                        const isActive = activeShipTypeId === shipDef.id;

                        return (
                          <div
                            key={shipDef.id}
                            className={`deployment-ship-card deployment-${shipDef.id} flex-shrink-0 w-[120px] snap-center p-2 ${isPlaced ? "is-placed" : ""} ${isPlacementLocked ? "is-locked" : ""}`}
                            style={{
                              opacity: isActive ? 1 : 0.85,
                              transform: isActive ? "translateY(-2px)" : "none",
                              boxShadow: isActive
                                ? "0 4px 12px rgba(142, 235, 255, 0.4)"
                                : "none",
                              borderColor: isActive
                                ? "rgba(142, 235, 255, 0.8)"
                                : "",
                              transition: "all 0.2s ease",
                            }}
                            onClick={(event) => {
                              event.stopPropagation();
                              if (!isPlaced) {
                                handleTrayShipClick(event, shipDef);
                              } else {
                                const placedShip =
                                  getPlacedShipSelectionByTypeId(shipDef.id);
                                if (placedShip) {
                                  returnShipToStaging(
                                    placedShip.shipId,
                                    shipDef.id,
                                  );
                                }
                              }
                            }}
                          >
                            <div
                              className="deployment-ship-meta"
                              style={{ marginBottom: "6px" }}
                            >
                              <span className="deployment-ship-label text-[11px] font-bold text-[#a5e7ff]">
                                {shipDef.label}
                              </span>
                              <span className="deployment-ship-size text-[10px] text-white/50">
                                {shipDef.size} {copy.cellsLabel || "cells"}
                              </span>
                            </div>
                            <div className="deployment-ship-stage flex items-center justify-center min-h-[24px]">
                              {!isPlaced && spriteUrl ? (
                                <div
                                  className="deployment-ship-preview pointer-events-none"
                                  style={{
                                    width: `${trayWidth}px`,
                                    height: `${trayHeight}px`,
                                  }}
                                >
                                  <img
                                    src={spriteUrl}
                                    alt={shipDef.label}
                                    style={getShipImageStyle(trayCell)}
                                  />
                                </div>
                              ) : (
                                <span className="deployment-placed-mark text-[10px] font-bold text-[#22c55e] uppercase tracking-wider">
                                  {copy.deployed || "Deployed"}
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    <div className="flex justify-between items-center px-3 mt-1 mb-2">
                      <div className="text-[11px] text-white/50 tracking-wide">
                        <span
                          className={`font-bold mr-1 ${placedFleetCellCount > FLEET_CELL_LIMIT ? "text-red-500" : "text-white/90"}`}
                        >
                          {placedFleetCellCount}
                        </span>
                        / {FLEET_CELL_LIMIT} {copy.cellsLabel || "ô"}
                      </div>
                      <div className="text-[11px] text-white/50 tracking-wide">
                        <span
                          className={`font-bold mr-1 ${placedFleetShipCount > FLEET_MAX_SHIPS ? "text-red-500" : "text-white/90"}`}
                        >
                          {placedFleetShipCount}
                        </span>
                        / {FLEET_MAX_SHIPS}{" "}
                        {copy.fleetShipsUsed
                          ? copy.fleetShipsUsed.split(" ")[1]
                          : "tàu"}
                      </div>
                    </div>

                    <div className="flex gap-2 w-full px-2">
                      <button
                        onClick={autoArrangeFleet}
                        className="flex-1 auto-arrange-button is-orange"
                        disabled={isPlacementLocked}
                      >
                        <span className="material-symbols-outlined text-[15px]">
                          auto_fix_high
                        </span>{" "}
                        {copy.autoArrange || "TỰ SẮP XẾP"}
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleCustomShipyard();
                        }}
                        className="flex-1 auto-arrange-button"
                        disabled={isPlacementLocked}
                      >
                        <span className="material-symbols-outlined text-[15px]">
                          brush
                        </span>{" "}
                        {copy.customShipyardToggle || "Xưởng Đóng Tàu"}
                      </button>
                    </div>
                  </div>
                )}

              <div className="board-heading">
                {!isMobile && (
                  <h3 className="font-bold text-secondary tracking-widest uppercase mb-1">
                    {copy.yourFleet || "Your Fleet"}
                  </h3>
                )}
                {gameState !== "PLACEMENT" ? (
                  renderFleetStatus(
                    placedFleetDefs,
                    playerSunkShipTypeIds,
                    false,
                    playerCustomShips.length > 0,
                    playerCustomShips,
                  )
                ) : (
                  <div
                    className="fleet-image-panel fleet-image-panel-placeholder hidden lg:block"
                    aria-hidden="true"
                  />
                )}
              </div>

              {renderBoard(playerBoard, false, "player")}
            </div>

            {/* Enemy Board */}
            <div
              className={`battle-board-section flex flex-col items-center ${isMobile && gameState === "PLACEMENT" && !isCustomShipyardActive ? "hidden lg:flex" : ""} ${isMobile && gameState !== "PLACEMENT" && gameState !== "READY" && activeBattleTab !== "enemy" ? "hidden lg:flex" : ""}`}
            >
              {gameState === "PLACEMENT" ? (
                isCustomShipyardActive ? (
                  /* === Custom Shipyard Validation Panel === */
                  <div
                    className="deployment-dock is-custom-shipyard"
                    style={{
                      "--cell-size": `${CELL_SIZE}px`,
                      "--cell-gap": `${CELL_GAP}px`,
                      display: "flex",
                      flexDirection: "column",
                    }}
                  >
                    <div
                      className="deployment-dock-heading !hidden md:!flex"
                      style={{ marginBottom: "8px" }}
                    >
                      <h3
                        className="font-bold tracking-widest uppercase"
                        style={{ color: "#a5e7ff" }}
                      >
                        {copy.customShipyardToggle || "Custom Shipyard"}
                      </h3>
                    </div>

                    {/* Scrollable diagnostic panel content */}
                    <div
                      style={{
                        flex: 1,
                        overflowY: "auto",
                        display: "flex",
                        flexDirection: "column",
                        gap: "10px",
                        paddingRight: "2px",
                      }}
                    >
                      {/* Brush Toolbar */}
                      <div className="flex gap-2 w-full px-2">
                        {[1, 2, 3, 4].map((brushId) => {
                          const count = customBrushCounts[brushId - 1];
                          const isActive = activeShipBrush === brushId;
                          const isInvalid =
                            count > 0 &&
                            (count < CUSTOM_SHIPYARD_MIN_SHIP_SIZE ||
                              count > CUSTOM_SHIPYARD_MAX_SHIP_SIZE);
                          const colors = [
                            "#4ea8de",
                            "#4ade80",
                            "#fbbf24",
                            "#c084fc",
                          ];
                          const brushColor = colors[brushId - 1];
                          return (
                            <button
                              key={brushId}
                              onClick={(e) => {
                                e.stopPropagation();
                                setActiveShipBrush(brushId);
                              }}
                              className={`custom-shipyard-brush-btn flex-1 flex flex-col items-center justify-center py-1 transition-all brush-${brushId} ${isActive ? "is-active-brush" : ""} ${isInvalid ? "is-invalid-brush" : ""}`}
                              style={{
                                "--brush-color": brushColor,
                              }}
                            >
                              <span
                                className="custom-shipyard-brush-label"
                                style={{
                                  fontSize: "10px",
                                  fontWeight: "bold",
                                }}
                              >
                                Tàu {brushId}
                              </span>
                              <span
                                className="custom-shipyard-brush-count"
                                style={{
                                  fontSize: "9px",
                                }}
                              >
                                {count} {copy.cellsLabel || "ô"}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                      <div
                        className="fleet-rule-panel"
                        style={{
                          margin: 0,
                          padding: "10px",
                          display: "flex",
                          flexDirection: "column",
                          gap: "8px",
                        }}
                      >
                        <div className="grid grid-cols-2 md:grid-cols-1 gap-2 md:gap-[6px] w-full items-start md:items-start">
                          {/* Cells Detected */}
                          <div className="order-1 md:order-1 flex flex-col items-start gap-0">
                            <div className="flex items-baseline gap-[6px]">
                              <span
                                style={{
                                  fontSize: "11px",
                                  color: "rgba(255,255,255,0.4)",
                                }}
                              >
                                {copy.customShipyardCellsDetected ||
                                  "Cells detected"}
                                :
                              </span>
                              <span
                                style={{
                                  fontSize: "13px",
                                  fontWeight: "bold",
                                  color:
                                    customDrawCellCount >
                                    CUSTOM_SHIPYARD_CELL_BUDGET
                                      ? "#ef4444"
                                      : customDrawCellCount ===
                                          CUSTOM_SHIPYARD_CELL_BUDGET
                                        ? "#22c55e"
                                        : "#a5e7ff",
                                }}
                              >
                                {customDrawCellCount}/
                                {CUSTOM_SHIPYARD_CELL_BUDGET}
                              </span>
                            </div>
                            <span
                              style={{
                                fontSize: "9px",
                                color: "rgba(255,255,255,0.3)",
                                fontStyle: "italic",
                                marginTop: "2px",
                              }}
                            >
                              (
                              {copy.customShipyardRuleExact ||
                                "Paint exactly 15 cells total."}
                              )
                            </span>
                          </div>

                          {/* Progress Bar */}
                          <div
                            className="order-3 md:order-2 col-span-2 md:col-span-1 w-full h-2 rounded-md bg-black/30 border border-[#75dfff]/30 overflow-hidden"
                            style={{
                              boxShadow: "inset 0 1px 3px rgba(0,0,0,0.6)",
                            }}
                          >
                            <div
                              className="custom-shipyard-progress"
                              style={{
                                height: "100%",
                                borderRadius: "6px",
                                width: `${Math.min(100, (customDrawCellCount / CUSTOM_SHIPYARD_CELL_BUDGET) * 100)}%`,
                                background:
                                  customDrawCellCount >
                                  CUSTOM_SHIPYARD_CELL_BUDGET
                                    ? "#ef4444"
                                    : customDrawCellCount ===
                                          CUSTOM_SHIPYARD_CELL_BUDGET &&
                                        isCustomFleetValid
                                      ? "#22c55e"
                                      : "#a5e7ff",
                                transition: "width 0.2s, background 0.2s",
                              }}
                            />
                          </div>

                          {/* Ships Detected */}
                          <div className="order-2 md:order-3 flex items-baseline gap-[6px] justify-end md:justify-start">
                            <span
                              style={{
                                fontSize: "11px",
                                color: "rgba(255,255,255,0.4)",
                              }}
                            >
                              {copy.customShipyardShipsDetected ||
                                "Ships detected"}
                              :
                            </span>
                            <span
                              style={{
                                fontSize: "13px",
                                fontWeight: "bold",
                                color:
                                  customComponents.length >=
                                    CUSTOM_SHIPYARD_MIN_SHIPS &&
                                  customComponents.length <=
                                    CUSTOM_SHIPYARD_MAX_SHIPS
                                    ? "#22c55e"
                                    : customComponents.length > 0
                                      ? "#ef4444"
                                      : "#a5e7ff",
                              }}
                            >
                              {customComponents.length}/
                              {CUSTOM_SHIPYARD_MAX_SHIPS}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Validation message */}
                      <div
                        className={`fleet-rule-message ${isCustomFleetValid ? "is-valid" : customDrawCellCount > 0 ? "is-invalid" : ""}`}
                        style={{ minHeight: "32px", margin: 0 }}
                      >
                        {getCustomShipyardMessage()}
                      </div>

                      {/* Ship size breakdown chips */}
                      {customComponents.length > 0 && (
                        <div
                          style={{
                            display: "flex",
                            flexWrap: "wrap",
                            gap: "6px",
                            marginTop: "2px",
                          }}
                        >
                          {customComponents.map((comp, idx) => {
                            const sz = comp.length;
                            const ok =
                              sz >= CUSTOM_SHIPYARD_MIN_SHIP_SIZE &&
                              sz <= CUSTOM_SHIPYARD_MAX_SHIP_SIZE;
                            const brushId =
                              customDrawBoard[comp[0].row][comp[0].col]
                                .shipBrushId;
                            const colors = {
                              1: {
                                main: "#4ea8de",
                                bg: "rgba(78,168,222,0.1)",
                                border: "rgba(78,168,222,0.3)",
                              },
                              2: {
                                main: "#4ade80",
                                bg: "rgba(74,222,128,0.1)",
                                border: "rgba(74,222,128,0.3)",
                              },
                              3: {
                                main: "#fbbf24",
                                bg: "rgba(251,191,36,0.1)",
                                border: "rgba(251,191,36,0.3)",
                              },
                              4: {
                                main: "#c084fc",
                                bg: "rgba(192,132,252,0.1)",
                                border: "rgba(192,132,252,0.3)",
                              },
                            };
                            const theme = colors[brushId] || colors[1];
                            return (
                              <span
                                key={idx}
                                style={{
                                  fontSize: "10px",
                                  fontWeight: "bold",
                                  padding: "3px 8px",
                                  borderRadius: "6px",
                                  border: `1px solid ${ok ? theme.main : "#ef4444"}`,
                                  background: ok
                                    ? theme.bg
                                    : "rgba(239,68,68,0.15)",
                                  backdropFilter: "blur(4px)",
                                  WebkitBackdropFilter: "blur(4px)",
                                  boxShadow: `2px 2px 0 ${ok ? theme.main : "#ef4444"}`,
                                  color: ok ? theme.main : "#ff958c",
                                }}
                              >
                                {copy.shipLabel || "Ship"} {brushId}: {sz}{" "}
                                {copy.cellsLabel || "cells"}
                              </span>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    {/* Action buttons - grouped and side by side */}
                    <div
                      style={{ display: "flex", gap: "8px", marginTop: "12px" }}
                    >
                      <button
                        type="button"
                        className="auto-arrange-button"
                        onClick={clearCustomDraw}
                        disabled={
                          isPlacementLocked || customDrawCellCount === 0
                        }
                        style={{
                          margin: 0,
                          flex: 1,
                          minHeight: "36px",
                          padding: "6px 12px",
                        }}
                      >
                        <span
                          className="material-symbols-outlined"
                          style={{ fontSize: "18px" }}
                          aria-hidden="true"
                        >
                          clear_all
                        </span>
                        <span style={{ fontSize: "11px" }}>
                          {copy.customShipyardClear || "Clear"}
                        </span>
                      </button>
                      <button
                        type="button"
                        className="auto-arrange-button"
                        style={{
                          margin: 0,
                          flex: 1.2,
                          minHeight: "36px",
                          padding: "6px 12px",
                        }}
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleCustomShipyard();
                        }}
                        disabled={isPlacementLocked}
                      >
                        <span
                          className="material-symbols-outlined"
                          style={{ fontSize: "18px" }}
                          aria-hidden="true"
                        >
                          arrow_back
                        </span>
                        <span style={{ fontSize: "11px" }}>
                          {copy.customShipyardToggleBack || "Standard"}
                        </span>
                      </button>
                    </div>
                  </div>
                ) : (
                  <div
                    className="deployment-dock"
                    style={{
                      "--cell-size": `${CELL_SIZE}px`,
                      "--cell-gap": `${CELL_GAP}px`,
                    }}
                    onClick={handleDockClick}
                  >
                    <div className="deployment-dock-heading">
                      <h3 className="font-bold text-error tracking-widest uppercase">
                        {copy.fleetStaging || "Fleet Staging"}
                      </h3>
                      <div
                        className="fleet-size-filters"
                        aria-label="Fleet size filters"
                      >
                        <button
                          type="button"
                          className={
                            fleetSizeFilter === "all" ? "is-active" : ""
                          }
                          onClick={(event) => {
                            event.stopPropagation();
                            setFleetSizeFilter("all");
                          }}
                        >
                          {copy.fleetFilterAll}
                        </button>
                        {fleetSizeOptions.map((size) => (
                          <button
                            key={size}
                            type="button"
                            className={
                              fleetSizeFilter === size ? "is-active" : ""
                            }
                            onClick={(event) => {
                              event.stopPropagation();
                              setFleetSizeFilter(size);
                            }}
                          >
                            {size} {copy.cellsLabel}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="fleet-rule-panel">
                      <span>{copy.fleetRules}</span>
                      <strong
                        className={
                          placedFleetCellCount > FLEET_CELL_LIMIT
                            ? "is-invalid"
                            : ""
                        }
                      >
                        {copy.fleetCellsUsed.replace(
                          "{used}",
                          placedFleetCellCount,
                        )}
                      </strong>
                      <strong
                        className={
                          placedFleetShipCount > FLEET_MAX_SHIPS
                            ? "is-invalid"
                            : ""
                        }
                      >
                        {copy.fleetShipsUsed.replace(
                          "{used}",
                          placedFleetShipCount,
                        )}
                      </strong>
                    </div>
                    {fleetGuidanceMessage && (
                      <div
                        className={`fleet-rule-message ${isFleetValid ? "is-valid" : "is-invalid"}`}
                      >
                        {fleetGuidanceMessage}
                      </div>
                    )}
                    <div className="deployment-ship-grid hidden lg:grid">
                      {filteredDockShips.map((shipDef) => {
                        const isPlaced = !unplacedShipIds.includes(shipDef.id);
                        const trayRotation =
                          trayRotations[shipDef.id] ?? shipDef.rotations[0];
                        const trayOffsets = getShipOffsets(
                          shipDef,
                          trayRotation,
                        );
                        const trayBounds = getShipBounds(trayOffsets);
                        const trayCell = {
                          row: 0,
                          col: 0,
                          shipTypeId: shipDef.id,
                          shipRotation: trayRotation,
                          shipBounds: trayBounds,
                        };
                        const trayWidth =
                          trayBounds.cols * CELL_SIZE +
                          (trayBounds.cols - 1) * CELL_GAP;
                        const trayHeight =
                          trayBounds.rows * CELL_SIZE +
                          (trayBounds.rows - 1) * CELL_GAP;
                        const spriteUrl = resolveSpriteUrl(
                          SHIP_SPRITES[shipDef.id]?.[trayRotation],
                        );

                        return (
                          <div
                            key={shipDef.id}
                            className={`deployment-ship-card deployment-${shipDef.id} ${
                              isPlaced ? "is-placed" : ""
                            } ${isPlacementLocked ? "is-locked" : ""}`}
                            onClick={(event) => {
                              event.stopPropagation();
                              if (!isPlaced) {
                                handleTrayShipClick(event, shipDef);
                              } else {
                                const placedShip =
                                  getPlacedShipSelectionByTypeId(shipDef.id);
                                if (placedShip) {
                                  returnShipToStaging(
                                    placedShip.shipId,
                                    shipDef.id,
                                  );
                                }
                              }
                            }}
                            onContextMenu={(event) => {
                              if (!isPlaced)
                                handleTrayShipContextMenu(event, shipDef);
                              else event.preventDefault();
                            }}
                          >
                            <div className="deployment-ship-meta">
                              <span className="deployment-ship-label">
                                {shipDef.label}
                              </span>
                              <span className="deployment-ship-size">
                                {shipDef.size} {copy.cellsLabel || "cells"}
                              </span>
                              <span
                                className="deployment-footprint"
                                style={{
                                  gridTemplateColumns: `repeat(${trayBounds.cols}, 7px)`,
                                  gridTemplateRows: `repeat(${trayBounds.rows}, 7px)`,
                                }}
                                aria-label={`${shipDef.label} occupies ${shipDef.size} ${copy.cellsLabel || "cells"}`}
                              >
                                {trayOffsets.map(([row, col]) => (
                                  <span
                                    key={`${row}-${col}`}
                                    className="deployment-footprint-cell"
                                    style={{
                                      gridRow: row + 1,
                                      gridColumn: col + 1,
                                    }}
                                  />
                                ))}
                              </span>
                            </div>
                            <div className="deployment-ship-stage">
                              {!isPlaced && spriteUrl ? (
                                <div
                                  className="deployment-ship-preview"
                                  style={{
                                    width: `${trayWidth}px`,
                                    height: `${trayHeight}px`,
                                  }}
                                >
                                  <img
                                    src={spriteUrl}
                                    alt={shipDef.label}
                                    style={getShipImageStyle(trayCell)}
                                  />
                                </div>
                              ) : (
                                <span className="deployment-placed-mark">
                                  {copy.deployed || "Deployed"}
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    <button
                      type="button"
                      className="auto-arrange-button is-orange"
                      onClick={autoArrangeFleet}
                      disabled={isPlacementLocked}
                    >
                      <span
                        className="material-symbols-outlined"
                        aria-hidden="true"
                      >
                        auto_fix_high
                      </span>
                      {copy.autoArrange || "AUTO ARRANGE"}
                    </button>
                    {/* Custom Shipyard Toggle Button */}
                    <button
                      type="button"
                      className="auto-arrange-button"
                      style={{
                        marginTop: "6px",
                      }}
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleCustomShipyard();
                      }}
                      disabled={isPlacementLocked}
                    >
                      <span
                        className="material-symbols-outlined"
                        aria-hidden="true"
                      >
                        brush
                      </span>
                      {copy.customShipyardToggle || "Custom Shipyard"}
                    </button>
                  </div>
                )
              ) : (
                <>
                  <div className="board-heading enemy-board-heading">
                    {(!isMobile ||
                      gameState === "PLACEMENT" ||
                      gameState === "READY") && (
                      <h3 className="font-bold text-error tracking-widest uppercase mb-1">
                        {gameState === "READY"
                          ? isPvpMode
                            ? copy.enemyFleetScan || "Enemy Fleet (Scanning...)"
                            : copy.enemyWatersScan ||
                              "Enemy Waters (Scanning...)"
                          : isPvpMode
                            ? copy.enemyFleet || "Enemy Fleet"
                            : copy.enemyWaters || "Enemy Waters"}
                      </h3>
                    )}

                    {renderFleetStatus(
                      isPvpMode ? opponentFleetStatusDefs : enemyFleetDefs,
                      enemyShipsSunk,
                      gameState === "READY",
                      enemyCustomShips.length > 0,
                      enemyCustomShips,
                    )}
                  </div>

                  <div
                    className={`transition-opacity duration-700 ${gameState === "READY" ? "opacity-20 pointer-events-none" : "opacity-100"}`}
                  >
                    {renderBoard(enemyBoard, true, "enemy")}
                  </div>
                </>
              )}
            </div>

            {sunkEffect && (
              <div
                className={`sunk-announcement ${
                  sunkEffect.boardSide === "enemy"
                    ? "sunk-announcement-victory"
                    : "sunk-announcement-danger"
                }`}
              >
                <span className="sunk-announcement-line" />
                <strong>
                  {formatCopy(
                    sunkEffect.boardSide === "enemy"
                      ? "enemyShipSunkAnnouncement"
                      : "yourShipSunkAnnouncement",
                    sunkEffect.boardSide === "enemy"
                      ? "Enemy {ship} sunk!"
                      : "Your {ship} sunk!",
                    { ship: sunkEffect.shipLabel },
                  ).toUpperCase()}
                </strong>
                <span className="sunk-announcement-line" />
              </div>
            )}
          </div>

          {/* Mini Battle Log for Mobile */}
          {isMobile && gameState !== "PLACEMENT" && gameState !== "READY" && (
            <div className="mobile-mini-battle-log mx-4">
              <div
                className={`mini-turn-status text-center ${
                  gameState === "PLAYER_TURN"
                    ? "text-secondary shadow-secondary/50 drop-shadow-md"
                    : gameState === "BOT_TURN"
                      ? "text-error shadow-error/50 drop-shadow-md"
                      : "text-yellow-400"
                }`}
              >
                {gameState === "PLAYER_TURN"
                  ? "YOUR TURN"
                  : gameState === "BOT_TURN"
                    ? "ENEMY TURN"
                    : "GAME OVER"}
              </div>

              <div className="mini-log-list flex flex-col gap-1 items-center text-on-surface-variant mt-2">
                {logs
                  .filter((log) =>
                    [
                      "player_hit",
                      "player_miss",
                      "enemy_hit",
                      "enemy_miss",
                      "destroy",
                    ].includes(log.type),
                  )
                  .slice(-2)
                  .map((log) => (
                    <div
                      key={log.id}
                      className="mini-log-item truncate w-full text-center"
                    >
                      {log.msg}
                    </div>
                  ))}
              </div>
            </div>
          )}
        </div>

        {/* Comms Panel — Right Sidebar / Bottom Sheet on Mobile */}
        <aside className="pvp-sidebar-column w-full fixed bottom-0 left-0 right-0 z-[100] lg:static lg:w-[30%] lg:flex-none flex flex-col transition-all lg:h-[calc(100vh-120px)] lg:min-h-0 max-h-[60vh] lg:max-h-none bg-surface/95 lg:bg-transparent backdrop-blur-xl lg:backdrop-blur-none border-t border-white/10 lg:border-none shadow-[0_-10px_40px_rgba(0,0,0,0.5)] lg:shadow-none pb-safe">
          <PvpCommsPanel
            myPlayer={currentBattlePlayer || roomPlayer}
            oppPlayer={opponentBattlePlayer}
            isConnected={isPvpMode ? pvpSocketReady : true}
            logs={logs}
            chatMessages={chatMessages}
            copy={copy}
            language={language}
            isPveMode={!isPvpMode}
            onSendChat={(message) =>
              isPvpMode && sendPvpSignal({ kind: "chat", value: message })
            }
            onSendEmote={(emote) =>
              isPvpMode && sendPvpSignal({ kind: "emote", value: emote })
            }
          />
        </aside>
      </main>

      {exitPromptOpen && (
        <div className="fixed inset-0 z-[210] flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-fade-in">
          <div className="game-exit-dialog max-w-md w-full p-7 text-center">
            <span className="material-symbols-outlined text-[56px] text-error drop-shadow-[0_0_18px_rgba(255,87,87,0.45)]">
              warning
            </span>
            <h2 className="font-display-lg text-3xl mt-3 mb-3 uppercase tracking-widest text-on-surface">
              {copy.exitTitle}
            </h2>
            <p className="text-on-surface-variant text-sm leading-6 mb-6">
              {copy.exitBody}
            </p>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setExitPromptOpen(false)}
                className="flex-1 btn-stay"
              >
                {copy.stay}
              </button>
              <button
                type="button"
                onClick={confirmGameExit}
                className="flex-1 btn-leave"
              >
                {copy.leave}
              </button>
            </div>
          </div>
        </div>
      )}

      <GameResultModal
        showModal={showModal}
        winner={winner}
        gameOverReason={gameOverReason}
        subMessage={gameOverSubMessage}
        copy={copy}
        difficulty={difficulty}
        isPvpMode={isPvpMode}
        stats={stats}
        rankedResult={rankedResult}
        handlePlayAgain={handlePlayAgain}
        rematchLoading={rematchLoading}
        handleReturnHome={handleReturnHome}
        returnHomeLoading={returnHomeLoading}
      />
      {showRankUpAnimation && rankedResult?.promoted && (
        <Suspense fallback={null}>
          <RankUpAnimation
            oldRank={rankedResult.oldRank}
            newRank={rankedResult.newRank}
            onComplete={() => setShowRankUpAnimation(false)}
          />
        </Suspense>
      )}
    </div>
  );
}

export default Game;
