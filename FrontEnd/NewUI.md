# 🎮 Phân Tích UI/UX — Màn Hình Game PvP (Battleship Arena)

> **Phạm vi phân tích:** Chỉ tập trung vào hai `pvp-identity-panel is-commander/is-opponent` ở hai bên giao diện, hệ thống speech bubble, và hai bong bóng FAB ở góc dưới (Chat / Event Log). Phần bàn cờ trung tâm và tàu **không nằm trong phạm vi**.

---

## 1. Sơ Đồ Bố Cục Hiện Tại

```
┌─────────────────────────────────────────────────────────────────────┐
│                          HEADER (nav)                               │
├──────────────┬──────────────────────────────────┬───────────────────┤
│              │      game-status banner           │                   │
│  PvpCommander│ ─────────────────────────────── │  PvpOpponent      │
│  Panel       │   [Player Board]  [Enemy Board]  │  Panel            │
│  is-commander│                                  │  is-opponent      │
│  (210px)     │       ← game-board-column →      │  (210px)          │
│              │                                  │                   │
│  - Avatar    │                                  │  - Avatar         │
│  - Tên       │                                  │  - Tên            │
│  - Status    │                                  │  - Status         │
│  - Ships     │                                  │  - Ships          │
│  ↘ Speech    │                                  │  ↙ Speech         │
│    bubble    │                                  │    bubble         │
│    tràn ra → │                                  │ ← tràn ra         │
│              │                                  │                   │
│              │                                  │                   │
└──────────────┴──────────────────────────────────┴───────────────────┘
  💬 FAB [left-24px]                      📋 FAB [right-24px]
  (fixed bottom)                          (fixed bottom)
```

---

## 2. Phân Tích Vấn Đề Hiện Tại

### 2.1 🔴 Vấn Đề Cốt Lõi — Bố Cục 3 Cột Quá Phân Tán

**Triệu chứng:**
- Grid layout `210px | minmax(900px,1fr) | 210px` đẩy hai panel danh tính ra tận hai **mép màn hình**, cách bàn cờ một khoảng lớn.
- Ở màn hình 1440px, hai panel chiếm ~420px → còn lại ~1020px cho bàn cờ. Bàn cờ đã chiếm đủ, nhưng **khoảng trắng giữa panel và bàn cờ tạo cảm giác "trơ"**.
- Mắt người dùng phải di chuyển từ cực trái → trung tâm → cực phải liên tục, gây **mệt mỏi thị giác (visual fatigue)**.

**Nguyên nhân kỹ thuật:**
```css
/* PvpBattlePanels.css */
.pvp-game-main {
  grid-template-columns: 210px minmax(900px, 1fr) 210px; /* ← 3 cột cứng */
}
```

---

### 2.2 🔴 Speech Bubble Tràn Ra Ngoài Panel — Vùng Overlap Mù

**Triệu chứng:**
- `pvp-speech-bubble` có `left: calc(100% + 16px)` — bong bóng chat bắn **sang phải** so với avatar của commander (panel trái).
- `is-opponent .pvp-speech-bubble` có `right: calc(100% + 16px)` — bong bóng chat bắn **sang trái** so với opponent panel (panel phải).
- **Kết quả:** Hai bong bóng chat xuất hiện **ở khu vực giữa bàn cờ**, chồng lên game content.
- Ở màn hình nhỏ hơn hoặc khi bong bóng dài (text chat), nội dung có thể bị clipped hoặc chồng lên grid ô cờ.

**Nguyên nhân kỹ thuật:**
```css
/* PvpBattlePanels.css:88-130 */
.pvp-speech-bubble {
  position: absolute;
  left: calc(100% + 16px); /* ← bắn sang phải, thoát khỏi panel */
}
.pvp-identity-panel.is-opponent .pvp-speech-bubble {
  right: calc(100% + 16px); /* ← bắn sang trái, vào vùng bàn cờ */
}
```

---

### 2.3 🟡 Hai FAB (Floating Action Button) Góc Dưới — UX Không Nhất Quán

**Triệu chứng:**
- `pvp-tool-launcher is-chat` ở `left: 24px, bottom: 22px`.
- `pvp-tool-launcher is-log` ở `right: 24px, bottom: 22px`.
- Hai nút này **không liên quan gì đến hai panel** về mặt vị trí — người dùng phải hiểu rằng nút chat ở góc trái mở panel đầy đủ, trong khi panel trái đã là commander panel.
- Gây **nhầm lẫn mental model**: "Nút chat ở góc trái liên quan đến Commander Panel ở trái?" → Không, nó mở một drawer khác hoàn toàn.
- **Drawer** (`pvp-tool-drawer`) pop lên từ góc, che phủ một phần bàn cờ.

---

### 2.4 🟡 Thông Tin Identity Panel Không Thay Đổi Trong Trận — Giá Trị Nhận Thức Thấp

**Trong suốt trận đấu, hai panel hiển thị:**
- Avatar + Tên → **Static**, không thay đổi
- Rank → **Static**
- Status badge (online/your turn) → **Thay đổi**, nhưng nhỏ, khó nhìn
- Ships Afloat count → **Thay đổi**, đây là thông tin có giá trị nhất

**Vấn đề:** Panel chiếm 210px × chiều cao viewport cho thông tin gần như tĩnh. **Tỷ lệ thông tin/diện tích (information density) rất thấp.**

---

### 2.5 🟡 Hai Panel Không Đồng Bộ Với Luồng Trận Đấu

- Trong phase `PLACEMENT`: Người dùng cần tập trung vào **bàn cờ trái** để đặt tàu. Hai panel bên cạnh gây distraction.
- Trong phase `PLAYER_TURN/BOT_TURN`: Người dùng cần nhìn **hai bàn cờ**. Panel bên sườn là thông tin thứ cấp nhưng lại **chiếm vùng nhìn ngoài lề**.

---

### 2.6 🟠 Responsive Breakpoint Thiếu Graceful Degradation

```css
/* PvpBattlePanels.css:630-641 */
@media (max-width: 767px) {
  .pvp-identity-panel,
  .pvp-tool-launcher,
  .pvp-tool-drawer { display: none; } /* ← ẩn hoàn toàn trên mobile */
}
```

Trên mobile, toàn bộ thông tin PvP (tên đối thủ, tàu còn lại, chat, log) bị **ẩn hoàn toàn**. Người dùng mobile mất đi toàn bộ trải nghiệm social của PvP.

---

## 3. Tổng Hợp Ma Trận Vấn Đề

| Vấn Đề | Severity | Impact UX | Khó sửa |
|--------|----------|-----------|---------|
| Bố cục 3 cột — panel 2 bên mép | 🔴 Critical | Phân tán thị giác, mệt mắt | Trung bình |
| Speech bubble tràn vào vùng bàn cờ | 🔴 Critical | Che content game | Thấp |
| FAB không nhất quán mental model | 🟡 Medium | Nhầm lẫn điều hướng | Thấp |
| Information density thấp | 🟡 Medium | Lãng phí không gian | Cao |
| Mobile ẩn hoàn toàn | 🟠 High | Mất tính năng PvP mobile | Trung bình |

---

## 4. Hướng Giải Quyết Đề Xuất

### Phương Án A — **Unified Bottom HUD** ⭐ (Khuyến Nghị)

> *Concept: Thu gọn identity info vào một HUD bar nằm dưới bàn cờ, giải phóng toàn bộ hai bên.*

```
┌─────────────────────────────────────────────────────────────────────┐
│                          HEADER (nav)                               │
├─────────────────────────────────────────────────────────────────────┤
│   [game-status banner — commander + opponent info inline trong đây] │
├──────────────────────────────────────────────────────────────────┤
│                                                                     │
│           [Player Board]          [Enemy Board]                     │
│                                                                     │
│              ← game-board-column (full width) →                     │
│                                                                     │
├─────────────────────────────────────────────────────────────────────┤
│  [👤 CMDR  Rank  ⚓3 afloat]    VS    [👤 OPP  Rank  ⚓2 afloat]   │
│  [💬 Chat Tab]  [📋 Log Tab]                                        │
│  ─────────────────────────────────────────────────────────────      │
│  [Chat messages / Event log panel — scrollable, cố định chiều cao] │
└─────────────────────────────────────────────────────────────────────┘
```

**Chi tiết triển khai:**

#### 4A.1 — Dời Identity Info vào Command Banner

Tích hợp thông tin cả hai commander trực tiếp vào `game-status` banner sẵn có:

```
┌──────────────────────────────────────────────────────────────────┐
│  [Avatar] CMDR TÊN  •  Rank  •  ⚓ 3 tàu  [YOUR TURN 🔵]  VS   │
│  [OPPONENT TURN 🔴]  ⚓ 2 tàu  •  Rank  •  TÊN ĐỐI THỦ [Avatar]│
└──────────────────────────────────────────────────────────────────┘
```

- Avatar nhỏ lại (40px), hiển thị inline thay vì stacked
- Speech bubble xuất hiện bên trên banner thay vì tràn ra hai bên
- Status badge (lượt đi) vẫn prominent

#### 4A.2 — Panel Chat/Log Gộp Thành Một Tabbable Panel

Thay 2 FAB + 2 drawer riêng biệt, dùng **1 collapsible panel** phía dưới bàn cờ:

```jsx
<section className="pvp-comms-panel">
  <div className="pvp-comms-tabs">
    <button tab="chat">💬 Chiến đấu Chat</button>
    <button tab="log">📋 Nhật ký</button>
    <button tab="emotes">😎 Phản ứng</button>
  </div>
  <div className="pvp-comms-body">
    {/* content of active tab */}
  </div>
</section>
```

- **Không cần FAB** nữa — panel luôn visible nhưng collapsed mặc định (chỉ hiện tab bar)
- User expand bằng cách click tab → panel slide up
- Speech bubble từ emote/chat vẫn hiện nhưng ngay trên avatar trong banner

#### 4A.3 — Speech Bubble Vị Trí Mới

Thay vì `position: absolute; left: calc(100% + 16px)`:
- Bubble xuất hiện **bên trên avatar** (tooltip style, `bottom: 100%`)
- Hoặc xuất hiện **bên trên banner** như một `toast notification` floating

---

### Phương Án B — **Narrow Sidebar + Inline Drawer** (Ít Phá Vỡ)

> *Concept: Giảm width panel từ 210px → 120px, gộp chat/log vào ngay trong panel.*

```
┌───────────┬────────────────────────────────────┬───────────┐
│ CMDR      │     game-status banner             │ OPP       │
│ [Avatar]  │ [Player Board]  [Enemy Board]      │ [Avatar]  │
│ 3 tàu     │                                    │ 2 tàu     │
│ ─────     │                                    │ ─────     │
│ [Chat/Log │                                    │           │
│  inside   │                                    │           │
│  panel]   │                                    │           │
└───────────┴────────────────────────────────────┴───────────┘
```

- Panel thu hẹp còn `120px` → Ít chiếm không gian
- Chat/Log **collapse vào trong** panel trái thay vì dùng FAB
- Speech bubble hiện **bên trên avatar** thay vì tràn sang

---

### Phương Án C — **Overlay Panel từ Header** (Radical, Tham Khảo)

> *Concept: Lấy cảm hứng từ các game như Fortnite/Valorant — info hiện **góc màn hình** nhỏ gọn, không dùng layout column.*

```
┌────────────────────────────────────────────────────────────────┐
│  [CMDR Avatar + name, 3⚓] [Radar icon] [2⚓ name + OPP Avatar]│ ← header mini HUD
│ ─────────────────────────────────────────────────────────────  │
│                                                                 │
│           [Player Board]          [Enemy Board]                 │
│                                                                 │
│           ← full width boards, không cột phụ →                 │
│                                                                 │
│  [💬Chat panel — trái dưới, 300px wide, z-index overlay]       │
│                                         [📋Log — phải dưới]    │
└────────────────────────────────────────────────────────────────┘
```

---

## 5. Bảng So Sánh Phương Án

| Tiêu chí | Hiện tại | Phương Án A (HUD) | Phương Án B (Narrow) | Phương Án C (Overlay) |
|---------|----------|-------------------|----------------------|----------------------|
| Không gian bàn cờ | ❌ Bị thu hẹp | ✅ Tối đa | 🟡 Tốt hơn | ✅ Tối đa |
| Thông tin identity | 🟡 Quá nhiều space | ✅ Compact | ✅ Compact | ✅ Compact |
| Speech bubble | ❌ Tràn bàn cờ | ✅ In-banner | ✅ Above avatar | ✅ Corner overlay |
| Chat/Log UX | 🟡 2 FAB riêng biệt | ✅ 1 tab panel | ✅ Gộp vào sidebar | 🟡 2 drawer |
| Mobile | ❌ Ẩn hoàn toàn | ✅ Banner stays | 🟡 Collapsible | ✅ Collapsible |
| Khối lượng refactor | — | 🟡 Trung bình | 🟢 Nhỏ | 🔴 Lớn |
| Thay đổi layout phá vỡ | — | 🟡 Có | 🟢 Ít | 🔴 Nhiều |

---

## 6. Đề Xuất Ưu Tiên Implementation

### Bước 1 — Quick Wins (Không Phá Vỡ Layout)
1. **Sửa speech bubble position**: Đổi từ `left: calc(100% + 16px)` thành `bottom: calc(100% + 10px); left: 50%; transform: translateX(-50%)` → bubble hiện **trên avatar**, không tràn vào bàn cờ.
2. **Gộp 2 FAB thành 1 FAB**: Một nút duy nhất toggle giữa Chat/Log/Emotes bằng tab, giảm rối.

### Bước 2 — Panel Redesign (Phương Án B — Ít Rủi Ro)
1. Giảm `grid-template-columns: 120px minmax(900px, 1fr) 120px`.
2. Thu gọn panel: chỉ giữ Avatar (60px) + Tên rút gọn + Ships Afloat count.
3. Gộp Chat/Log vào expansion area bên trong panel trái.

### Bước 3 — Full HUD Redesign (Phương Án A — Tốt Nhất UX)
1. Loại bỏ 2 column panel khỏi grid.
2. Thêm identity strip inline vào `game-status` banner.
3. Thêm `pvp-comms-panel` collapsible bên dưới hai bàn cờ.
4. Mobile: Banner + comms panel hiển thị đầy đủ.

---

## 7. Mockup Wireframe — Phương Án A (Khuyến Nghị)

### Desktop — Phase Trận Đấu (PLAYER_TURN)

```
╔══════════════════════════════════════════════════════════════════╗
║  🚢 Cloud Battleship Arena                    [Leave] [🏠]       ║
╠══════════════════════════════════════════════════════════════════╣
║  [👤 You • Iron • ⚓4] ━━ 🎯 YOUR TURN ━━ [⚓2 • Gold • OPP 👤] ║
║  ↑ Speech bubble if any (inline, above row, animated)            ║
╠══════════════════════════════════════════════════════════════════╣
║                                                                  ║
║        [YOUR FLEET]                [ENEMY WATERS]                ║
║         (bàn cờ)                    (bàn cờ)                     ║
║                                                                  ║
╠══════════════════════════════════════════════════════════════════╣
║  [💬 Chat] [📋 Log] [😎 Emotes]          ← tab bar, luôn hiện   ║
║ ─────────────────────────────────────────────────────────────── ║
║  [Expanded panel khi user click tab — max 200px, scrollable]    ║
║  Input: [______________________________] [Send]                  ║
╚══════════════════════════════════════════════════════════════════╝
```

### Mobile — Phase Trận Đấu

```
╔══════════════════════════════════════════╗
║  🚢 BATTLESHIP            [Leave] [🏠]   ║
╠══════════════════════════════════════════╣
║ [👤 You ⚓4]  🎯 YOUR TURN  [⚓2 OPP 👤] ║
╠══════════════════════════════════════════╣
║          [ENEMY BOARD]                   ║
║          (bàn cờ enemy)                  ║
╠══════════════════════════════════════════╣
║          [YOUR BOARD]                    ║
║          (bàn cờ player)                 ║
╠══════════════════════════════════════════╣
║  [💬]  [📋]  [😎]  ← tab bar compact    ║
╚══════════════════════════════════════════╝
```

---

## 8. Nguyên Tắc UX Áp Dụng

| Nguyên tắc | Áp dụng |
|-----------|---------|
| **Fitts's Law** | Thông tin quan trọng nhất (lượt đi, tàu còn lại) phải gần bàn cờ, không ở mép màn hình |
| **Visual Hierarchy** | Bàn cờ = primary, identity info = secondary, chat = tertiary |
| **Progressive Disclosure** | Chat/Log ẩn mặc định (chỉ tab bar), expand khi cần |
| **Proximity** | Speech bubble phải gần avatar, không tràn vào content khác |
| **Consistency** | Một hệ thống toggle duy nhất (tab panel) thay vì 2 FAB độc lập |
| **Feedback** | Status "YOUR TURN" phải visual nổi bật hơn, nằm gần điểm tương tác |

---

## 9. Tóm Tắt

> **Vấn đề chính:** Thiết kế 3 cột cứng đẩy thông tin identity ra hai mép màn hình — xa khỏi điểm tương tác (bàn cờ). Speech bubble tràn vào vùng bàn cờ. Hệ thống chat/log dùng 2 FAB độc lập không nhất quán với mental model người dùng.

> **Hướng giải quyết tốt nhất (Phương Án A):** Gộp identity info vào một banner strip nằm ngay trên bàn cờ. Gộp Chat/Log/Emotes thành một tab panel collapsible nằm ngay dưới bàn cờ. Speech bubble hiện inline trong banner. Xóa bỏ 2 cột panel 210px và 2 FAB. Kết quả: bàn cờ chiếm toàn bộ width, thông tin PvP tập trung vào một zone liên tục dọc theo trục giữa màn hình.
