# Cloud Battleship Arena - Responsive Design Specification

## 1. Mục tiêu

Tài liệu này mô tả toàn bộ yêu cầu Responsive Design cho dự án Cloud Battleship Arena.

Mục tiêu chính:

* Website phải hoạt động tốt trên Desktop, Tablet và Mobile.
* Không chỉ co giãn giao diện mà phải tối ưu trải nghiệm người dùng trên từng loại thiết bị.
* Mobile phải có cơ chế tương tác riêng phù hợp với màn hình cảm ứng.
* Không được làm ảnh hưởng đến logic hoặc trải nghiệm Desktop hiện có.
* Responsive phải được thiết kế theo hướng Mobile-Friendly và Gameplay-First.

---

# 2. Responsive Breakpoints

## Desktop

```text
>= 1024px
```

Giữ nguyên giao diện hiện tại.

Bao gồm:

* Fleet Staging
* Battle Log bên phải
* Drag & Drop bằng chuột
* Rotate bằng chuột phải hoặc phím R

---

## Tablet

```text
768px - 1023px
```

Bắt đầu tối ưu bố cục.

Có thể:

* Thu nhỏ Fleet Staging
* Battle Log chuyển thành panel thu gọn
* Board ưu tiên hiển thị lớn hơn

---

## Mobile

```text
<= 767px
```

Được xem là một trải nghiệm hoàn toàn riêng.

Không chỉ thu nhỏ Desktop.

Mobile có thể sử dụng layout và interaction khác hoàn toàn Desktop.

---

# 3. Nguyên tắc Responsive

## Ưu tiên Gameplay

Người chơi mở game để:

* Sắp xếp tàu
* Bắn tàu
* Theo dõi kết quả

Không phải để đọc giao diện.

Do đó:

* Board phải là thành phần lớn nhất màn hình.
* Các thành phần phụ phải được thu gọn.

---

## Không tạo trang quá dài

Người dùng không nên:

```text
Mở game
↓
Kéo
↓
Kéo
↓
Kéo
↓
Mới thấy nội dung cần thiết
```

Gameplay phải xuất hiện ngay.

---

## Không ảnh hưởng Desktop

Mọi thay đổi dành cho Mobile phải được tách riêng.

Ví dụ:

```text
Desktop:
Fleet Staging
Battle Log
Keyboard Controls

Mobile:
Auto Deploy
Touch Controls
Compact Battle Log
```

Không được sửa Mobile rồi làm hỏng Desktop.

---

# 4. Home Page Responsive

## Vấn đề cần tránh

Không được để Home trở thành:

```text
Hero

↓

Mode 1

↓

Mode 2

↓

Mode 3

↓

Leaderboard

↓

Service Record
```

vì quá dài.

---

## Deployment Modes

Desktop:

```text
[Bot] [Player] [Room]
```

3 card cùng lúc.

---

Mobile:

Sử dụng Tab System:

```text
[Bot] [Player] [Room]
```

Chỉ hiển thị nội dung của tab đang chọn.

Ví dụ:

```text
Bot
----------------
Thông tin Bot

Difficulty

Battle Now
```

Không hiển thị cả 3 card cùng lúc.

---

## Service Record & Leaderboard

Desktop:

```text
Leaderboard | Service Record
```

2 cột.

---

Mobile:

```text
[My Record] [Top Commanders]
```

Tab chuyển đổi.

Chỉ hiển thị 1 phần tại một thời điểm.

Giảm chiều dài trang.

---

# 5. Game Page Responsive

## Triết lý

Mobile Gameplay phải khác Desktop.

Người dùng Mobile:

* Không có chuột.
* Không có bàn phím.
* Không thể dùng Right Click.
* Không thể dùng phím R.

Do đó cần thiết kế riêng.

---

# 6. Fleet Deployment Phase (Mobile)

## Loại bỏ Fleet Staging

Desktop:

```text
Board
Fleet Staging
Battle Log
```

---

Mobile:

```text
Board
Auto Arrange
```

Fleet Staging không xuất hiện.

Không render Fleet Staging.

Không hiển thị:

* Ship Cards
* Ships Remaining
* Fleet Staging Title

---

## Auto Deploy Fleet

Khi vào màn hình Placement trên Mobile:

Toàn bộ tàu được đặt sẵn lên board.

Người chơi chỉ cần điều chỉnh.

Không cần kéo tàu từ Fleet Staging.

---

# 7. Mobile Ship Interaction

## Tap

Tap vào tàu:

```text
Rotate Ship
```

---

## Hold + Drag

Giữ và kéo:

```text
Move Ship
```

---

## Không dùng nút Rotate

Mobile không cần:

```text
Rotate Button
```

Toàn bộ xoay được thực hiện bằng Tap.

---

## Không dùng Keyboard

Mobile không sử dụng:

```text
R Key
Right Click
Keyboard Shortcut
```

---

# 8. Ship Placement Preview

Khi kéo tàu:

Phải hiển thị Preview.

---

## Valid Placement

Màu xanh.

---

## Invalid Placement

Màu đỏ.

---

## Release

Nếu hợp lệ:

```text
Đặt tàu
```

Nếu không hợp lệ:

```text
Trả về vị trí cũ
```

---

# 9. Board Requirements

## Cell luôn vuông

Mọi kích thước màn hình:

```text
Cell Width == Cell Height
```

Không được xuất hiện:

```text
Rectangle Cells
```

---

## Board luôn vuông

```css
aspect-ratio: 1 / 1;
```

---

## Không Overflow

Board không được:

* Tràn ngang
* Bị cắt
* Xuất hiện thanh scroll ngang

---

# 10. Ship Rendering Requirements

## Bắt buộc

Tàu phải khớp với số ô thực tế.

---

Carrier

```text
5 ô
```

Hiển thị đúng 5 ô.

---

Destroyer

```text
4 ô
```

Hiển thị đúng 4 ô.

---

Z Ship

```text
4 ô
```

Hiển thị đúng 4 ô.

---

Patrol

```text
2 ô
```

Hiển thị đúng 2 ô.

---

## Không được

* Quá lớn
* Quá nhỏ
* Tràn khỏi board
* Lệch khỏi ô
* Sai kích thước khi xoay

---

## Rotation

Khi xoay:

* Kích thước không đổi
* Không bị phóng to
* Không bị thu nhỏ
* Không lệch vị trí

---

# 11. Auto Arrange

Phải luôn tồn tại trên mọi thiết bị.

Mobile:

```text
[ Auto Arrange ]
```

Desktop:

```text
[ Auto Arrange ]
```

Giữ nguyên.

---

# 12. Battle Log Responsive

## Mục tiêu

Battle Log không được làm tăng chiều dài trang.

---

## Desktop

Hiển thị:

```text
Battle Log bên phải
```

Giữ nguyên.

---

## Mobile

Không hiển thị Battle Log dạng block lớn.

Thay thế bằng:

```text
Floating Log Button
```

Ví dụ:

```text
📋
```

---

Khi bấm:

Mở:

```text
Bottom Sheet
```

hoặc

```text
Modal
```

---

Chiều cao tối đa:

```text
40-45vh
```

---

Hiển thị:

```text
5-10 log gần nhất
```

---

Mặc định đóng.

Không chiếm layout.

---

# 13. Performance Requirements

Responsive không được làm giảm hiệu năng.

---

## Mobile

Giảm:

* Blur
* Heavy Shadow
* Animation
* Background Effects

---

## Board

Không render lại toàn bộ 100 ô mỗi frame.

---

## Ship Preview

Update theo Cell.

Không update theo từng Pixel.

---

# 14. Success Criteria

Responsive được xem là hoàn thành khi:

✅ Home không còn quá dài.

✅ Mobile không còn Fleet Staging.

✅ Mobile có Auto Deploy Fleet.

✅ Tap để xoay.

✅ Hold + Drag để di chuyển.

✅ Preview hoạt động.

✅ Battle Log không chiếm layout.

✅ Board luôn vuông.

✅ Cell luôn vuông.

✅ Tàu khớp với số ô thực tế.

✅ Desktop không bị ảnh hưởng bởi các thay đổi Mobile.

✅ Chạy ổn trên:

* Chrome Responsive Mode
* Android Emulator
* Điện thoại Android thực tế
* Tablet
* Desktop

```
```
