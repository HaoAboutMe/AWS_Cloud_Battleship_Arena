Tiếp tục tối ưu responsive cho toàn bộ Cloud Battleship Arena.

Vấn đề hiện tại:
- Ở mobile, toàn bộ section bị xếp dọc liên tục.
- Trang Home quá dài, phải kéo xuống nhiều mới thấy leaderboard và service record.
- Header bị chật, logo bị xuống dòng.
- Các card mode chiếm quá nhiều chiều cao.
- Các trang khác cũng cần responsive hoàn chỉnh, không chỉ Home.

Mục tiêu:
Thiết kế responsive hoàn chỉnh cho desktop, tablet, mobile theo hướng tiện dụng, gọn, dễ thao tác, không chỉ đơn giản là stack dọc.

Breakpoint đề xuất:
- Desktop: >= 1024px
- Tablet: 768px - 1023px
- Mobile: <= 767px
- Small mobile: <= 480px

Yêu cầu chung:
1. Dùng mobile-first CSS.
2. Không để nội dung bị tràn ngang.
3. Header luôn gọn, không bị vỡ layout.
4. Button đủ lớn để bấm trên mobile.
5. Font size giảm hợp lý, không quá nhỏ.
6. Card có spacing vừa phải, tránh padding quá dày.
7. Ưu tiên hiển thị nội dung quan trọng trước.
8. Không làm mất style cyber/naval hiện tại.

Trang Home:

1. Header mobile
- Logo không được xuống dòng.
- Có thể rút gọn logo từ:
  “CLOUD BATTLESHIP ARENA”
  thành:
  “BATTLESHIP”
  hoặc dùng icon/logo ngắn trên mobile.
- Gom các icon như theme, notification, settings, profile vào menu hoặc compact actions.
- Header nên sticky top nếu hợp lý.

2. Hero section
- Giảm chiều cao hero trên mobile.
- Title ngắn gọn hơn, font nhỏ hơn.
- Ảnh minh họa không nên quá lớn.
- Có thể đặt ảnh dưới text hoặc ẩn ảnh ở small mobile.
- Hai button Start Mission và Learn Tactics có thể xếp 2 cột nếu đủ rộng, hoặc full-width nếu màn hình nhỏ.

3. Deployment Modes
- Mobile không nên hiển thị 3 card lớn xếp dọc quá dài.
- Chuyển thành tab hoặc segmented control:
  [Bot] [Player] [Room]
- Chỉ hiển thị chi tiết của mode đang chọn.
- Card Play vs Bot là mặc định.
- Khi người dùng chọn tab khác thì đổi nội dung card.
- Như vậy mobile chỉ thấy 1 mode card thay vì 3 card dài.

4. Leaderboard và Service Record
- Không để 2 block dài nối tiếp nhau.
- Trên mobile có thể dùng tab:
  [Top Commanders] [My Record]
- Mặc định hiển thị My Record hoặc Top Commanders.
- Người dùng bấm tab để xem phần còn lại.
- Giảm chiều cao các row leaderboard.
- Service Record chỉ giữ chỉ số chính:
  Total Engagements
  Victories
  Win Rate
  Rank
- Các thông tin phụ có thể collapse.

5. Desktop giữ layout hiện tại
- Desktop vẫn hiển thị 3 deployment mode cards cùng hàng.
- Leaderboard và Service Record vẫn hiển thị dạng 2 cột.
- Không phá layout desktop.

Trang Game:

1. Deploy Fleet phase
- Desktop giữ layout board + staging + battle log.
- Tablet:
  Board chiếm full width.
  Fleet Staging nằm dưới board.
  Battle Log nằm dưới hoặc dạng collapsible.
- Mobile:
  Ưu tiên board trước.
  Fleet Staging chuyển thành horizontal scroll hoặc bottom drawer.
  Battle Log chuyển thành collapsible panel.
  Không để cả 3 block xếp dọc quá dài.

2. Battle phase
- Mobile cần ưu tiên 2 board:
  Player Board
  Enemy Board
- Có thể dùng tab:
  [Enemy Waters] [Your Fleet]
- Enemy Waters là tab mặc định vì người chơi cần bắn.
- Battle Log nằm trong collapsible drawer.
- Action/status bar sticky ở dưới để hiển thị lượt chơi, difficulty, nút quan trọng.

3. Board mobile
- Board phải fit màn hình.
- Dùng:
  width: min(92vw, 420px)
  aspect-ratio: 1 / 1
- Cell tự scale theo board.
- Không hard-code cell size cố định.
- Label A-J và 1-10 vẫn đọc được.

Trang Leaderboard:
- Desktop: table đầy đủ.
- Mobile: đổi table thành card list.
- Mỗi player là một card nhỏ:
  Rank
  Name
  Win rate
  Total matches
- Không dùng table ngang gây overflow.

Trang Profile:
- Desktop: layout 2 cột.
- Mobile: chia thành các section/collapse:
  Account Info
  Stats
  Achievements
  Match History
- Match History trên mobile dùng card list thay vì table.

Yêu cầu kỹ thuật:
- Kiểm tra toàn bộ CSS hard-code width/height.
- Thay bằng:
  max-width
  clamp()
  min()
  grid-template-columns responsive
  flex-wrap
  aspect-ratio
- Không dùng fixed pixel width cho board/card nếu không cần.
- Tạo class utility hoặc CSS variables cho spacing responsive:
  --space-xs
  --space-sm
  --space-md
  --space-lg
- Dùng media queries rõ ràng cho từng breakpoint.
- Nếu đang dùng React component, tách responsive UI bằng CSS trước, chỉ dùng JS state cho tab/collapse khi cần.

Kết quả mong muốn:
- Mobile không còn là một trang dài vô tận.
- Người dùng thấy thông tin chính nhanh hơn.
- Home mobile có tab cho Deployment Modes và Stats.
- Game mobile ưu tiên gameplay, không bị battle log/staging chiếm chỗ.
- Board tự co giãn đẹp trên mọi thiết bị.
- Desktop vẫn giữ bố cục hiện tại.