# Battle UI Redesign: 3-Column Layout + In-Game Chat

Thiết kế lại giao diện trang Battle để chuyển từ layout 2 cột (boards + log) sang layout 3 cột mới với Chat tích hợp, nhằm chuẩn bị cho tính năng chat trong game PvP.

## User Review Required

> [!IMPORTANT]
> **Chat Backend chưa có**: Hiện tại `matchService.js` chỉ hỗ trợ WebSocket cho các message game (FIRE, QUIT, etc.). Để chat thực sự hoạt động trong PvP, backend cần xử lý message type `CHAT` và `EMOTE`. Trong kế hoạch này, tôi sẽ:
> - Gửi chat/emote qua WebSocket hiện có với `action: "CHAT"` / `action: "EMOTE"`
> - Nhận và hiển thị chat từ đối thủ (nếu backend forward message)
> - Nếu backend chưa hỗ trợ, chat sẽ chỉ hiển thị local + event log

> [!WARNING]
> **Thay đổi layout đáng kể**: Layout chính sẽ thay đổi từ `flex-row` 2 cột sang `grid` 3 cột. Điều này ảnh hưởng toàn bộ responsive design. Mobile sẽ giữ layout stack (1 cột) như hiện tại.

## Open Questions

> [!IMPORTANT]
> 1. **Avatar trong PvP**: `roomPlayer` hiện chỉ có `displayName`, `email`, `userId`. Chưa có `avatarUrl`. Tôi sẽ thêm `avatarUrl` vào `roomPlayer` từ `customAvatarUrl` / `attributes.picture` hiện có. Đối thủ sẽ dùng avatar mặc định (COMMANDER_AVATAR) trừ khi backend gửi avatar URL của đối thủ qua room data.
> 2. **Chat chỉ hiển thị ở chế độ PvP hay cả Bot?**: Dựa theo yêu cầu, chat sẽ hiển thị ở cả 2 mode nhưng chỉ PvP mới gửi được chat thực. Ở mode Bot, cột trái sẽ chỉ hiển thị Event Log (không có input chat).
> 3. **Emote list cụ thể**: Tôi sẽ dùng 12 emoji phổ biến cho tab "Emotions" và 5 icon tàu cho tab "Ships". Bạn có muốn thay đổi danh sách này không?

## Proposed Changes

### Layout Architecture (Tổng quan)

```
┌──────────────────────────────────────────────────────────────┐
│                        HEADER (sticky)                       │
├────────────┬────────────────────────────────┬─────────────────┤
│  LEFT 28%  │         CENTER 52%             │   RIGHT 20%    │
│            │                                │                │
│ [Avatar]   │  ┌──────────┐  ┌──────────┐   │   [Avatar]     │
│ [Name]     │  │ YOUR     │  │ ENEMY    │   │   [Name]       │
│ [Rank]     │  │ FLEET    │  │ WATERS   │   │   [Status]     │
│            │  │          │  │          │   │                │
│ ┌────────┐ │  │  Board   │  │  Board   │   │                │
│ │ Emote  │ │  │          │  │          │   │                │
│ │ Panel  │ │  │          │  │          │   │                │
│ └────────┘ │  └──────────┘  └──────────┘   │                │
│            │                                │                │
│ ┌────────┐ │                                │                │
│ │ Chat & │ │                                │                │
│ │ Event  │ │                                │                │
│ │  Log   │ │                                │                │
│ │        │ │                                │                │
│ │[input] │ │                                │                │
│ └────────┘ │                                │                │
└────────────┴────────────────────────────────┴─────────────────┘
```

---

### Component: Game Page Layout

#### [MODIFY] [Game.jsx](file:///c:/Users/super/OneDrive/Documents/AWS_Cloud_Battleship_Arena/FrontEnd/src/pages/Game.jsx)

**State changes:**
- Thêm state: `chatMessages`, `chatInput`, `activeEmoteTab`, `showEmotePanel`
- Thêm `avatarUrl` vào `roomPlayer` memo
- Import `COMMANDER_AVATAR` constant

**Layout changes (lines ~3338-3860):**
- Thay thế `<main>` layout từ `flex flex-col lg:flex-row` sang CSS Grid 3 cột
- **Cột trái**: Player info panel mới (avatar + name + emote panel + chat/event log)
- **Cột giữa**: Giữ nguyên 2 boards (chỉ thêm wrapper)
- **Cột phải**: Opponent info panel tối giản (avatar + name + status)
- **Xóa**: Battle Log column cũ (lines 3810-3859) - thay bằng Chat & Event Log trong cột trái

**Chat/Emote functions:**
- `sendChatMessage()`: Gửi chat text qua WebSocket (PvP) hoặc chỉ log local (Bot)
- `sendEmote()`: Gửi emote qua WebSocket
- `handleIncomingChat()`: Xử lý chat message nhận từ đối thủ
- Tích hợp event log (hit/miss/sunk) vào unified chat window với timestamp + color coding

---

### Component: Chat & Event Log Styles

#### [MODIFY] [GameEffects.css](file:///c:/Users/super/OneDrive/Documents/AWS_Cloud_Battleship_Arena/FrontEnd/src/pages/GameEffects.css)

**Thêm styles mới:**

1. **3-Column Grid Layout** (`.game-main` override)
   - `display: grid; grid-template-columns: 280px 1fr 200px;`
   - Responsive: collapse to 1 column on mobile

2. **Left Panel** (`.battle-left-panel`)
   - Frosted glass effect: `backdrop-filter: blur(12px); background: rgba(2,17,30,0.85);`
   - Cyan LED border glow: `border: 1px solid rgba(0,210,255,0.25); box-shadow: 0 0 15px rgba(0,210,255,0.08);`

3. **Player Avatar Card** (`.battle-player-card`)
   - Avatar circular frame with neon ring
   - Player name + rank badge
   
4. **Emote Panel** (`.battle-emote-panel`)
   - 2 tabs: Emotions / Ships
   - Grid layout: `grid-template-columns: repeat(6, 1fr);`
   - Hover glow effects

5. **Chat & Event Log** (`.battle-chat-log`)
   - Unified scrollable window
   - Timestamps: `font-size: 9px; color: rgba(174,228,247,0.5);`
   - Color coding:
     - System events: `color: #ffb24d;` (yellow/orange)
     - Player messages: `color: #00d2ff;` (cyan)  
     - Opponent messages: `color: #ff5d62;` (red/pink)
   - Chat input bar at bottom with send button

6. **Right Panel** (`.battle-right-panel`)
   - Compact opponent avatar + name
   - Turn status indicator
   - Ship count remaining

7. **Mobile overrides**: Hide left/right panels on mobile, keep existing mobile layout

---

### WebSocket Integration

#### [MODIFY] [Game.jsx](file:///c:/Users/super/OneDrive/Documents/AWS_Cloud_Battleship_Arena/FrontEnd/src/pages/Game.jsx)

Trong handler `onMessage` của PvP WebSocket (khoảng line 1960+):
- Thêm case xử lý `action: "CHAT"` → push vào `chatMessages`
- Thêm case xử lý `action: "EMOTE"` → hiển thị emote animation

Khi gửi:
```js
sendSocketMessage(pvpSocketRef.current, {
  action: "CHAT",
  roomCode,
  message: chatInput,
  sender: roomPlayer.displayName,
});
```

---

### Log Integration

Event log entries hiện tại (`logs` state) sẽ được merge vào unified chat/event view:
- Mỗi log entry sẽ thêm `timestamp` field
- Chat messages và event logs sẽ hiển thị xen kẽ theo thời gian
- Event log entries giữ nguyên color coding hiện tại (secondary cho player, error cho enemy, green cho sunk)

## Verification Plan

### Manual Verification
1. Kiểm tra layout 3 cột trên desktop (>= 1024px)
2. Kiểm tra responsive mobile (collapse về 1 cột)
3. Kiểm tra chat input gửi/nhận (local + nếu backend hỗ trợ)
4. Kiểm tra emote panel hiển thị đúng
5. Kiểm tra event log tích hợp (hit/miss/sunk/victory/defeat)
6. Kiểm tra cả 2 mode: PvP và Bot
7. Kiểm tra deployment/placement phase vẫn hoạt động bình thường

### Build Verification
```bash
cd FrontEnd && npm run build
```
