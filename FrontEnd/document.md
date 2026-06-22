# 🚢 TÀI LIỆU HƯỚNG DẪN: TÍNH NĂNG "XƯỞNG ĐÓNG TÀU TỰ DO"

## 1. Giới thiệu tổng quan
Quên đi những mẫu tàu thẳng tắp hay hình vuông nhàm chán! Với tính năng **"Xưởng Đóng Tàu" (Custom Shipyard)**, Cloud Battleship chính thức trao cho bạn quyền lực tối thượng: **Tự do vẽ nên hạm đội của riêng mình.** Bạn muốn một chiếc tàu hình zíc-zắc để đánh lừa đối thủ? Hay một chiếc tàu hình chữ U mỏng manh len lỏi ở các góc bản đồ? Hãy dùng trí tưởng tượng của bạn để biến lưới 10x10 thành bàn cờ tâm lý chiến thực sự!

## 2. Luật thiết kế hạm đội (Các quy tắc vàng)
Mỗi tư lệnh khi bước vào Xưởng Đóng Tàu sẽ được cấp đúng **15 ô linh kiện**. Nhiệm vụ của bạn là phân bổ 15 ô này lên bản đồ 10x10 để tạo thành một hạm đội hợp lệ dựa trên các quy tắc sau:

- **Giới hạn số lượng (2 đến 4 tàu):** Hạm đội của bạn không được quá ít (tối thiểu 2 tàu) nhưng cũng không được phân tán quá vụn vặt (tối đa 4 tàu).
- **Giới hạn kích thước (2 đến 13 ô/tàu):** Một con tàu nhỏ nhất phải chiếm 2 ô. Bạn có thể dồn tài nguyên để đóng một "Siêu Hàng Không Mẫu Hạm" khổng lồ lên tới 13 ô, nhưng hãy cẩn thận vì nó sẽ rất dễ bị bắn trúng!
- **Quy tắc liền kề (Không xếp chéo):** Các ô của cùng một con tàu phải được kết nối liền kề với nhau theo chiều dọc (trên/dưới) hoặc chiều ngang (trái/phải). Không được phép nối các ô theo đường chéo.

## 3. Cơ chế Tâm lý chiến & Gợi ý suy luận (Sương mù chiến tranh)
Để đảm bảo tính công bằng và giữ lại "Linh hồn suy luận logic" của tựa game Battleship, trận đấu sẽ diễn ra với cơ chế thông tin vô cùng đặc biệt:

- **Bí mật hình dáng 100%:** Khi bắt đầu trận đấu, đối thủ sẽ **không thể nhìn thấy** hình dáng những con tàu dị hợm mà bạn vừa vẽ. Bắn trúng 1 ô không có nghĩa là họ biết ô tiếp theo nằm ở hướng nào!
- **Hé lộ manh mối về khối lượng:** Để đối thủ vẫn có cơ sở đếm ô và suy luận, hệ thống sẽ cung cấp thông tin về **số lượng tàu** và **tổng số ô của từng tàu**.
  - *Ví dụ: Hệ thống sẽ thông báo: "Kẻ địch có 3 tàu: Gồm 1 tàu 6 ô, 1 tàu 5 ô và 1 tàu 4 ô".*
- **Vinh danh khi chìm tàu:** Trò "trốn tìm" chỉ kết thúc khi một con tàu bị phá hủy hoàn toàn. Lúc này, **hình dáng thật sự của con tàu sẽ được hiển thị vinh danh trên Bảng thông báo (Match Log)**. Đó là khoảnh khắc đối thủ phải thốt lên: *"Trời ơi, sao lại có cái tàu hình thù kỳ cục thế này!"*

## 4. Mẹo chiến thuật dành cho Tư lệnh
- **Bẫy tâm lý:** Hãy thử vẽ một con tàu hình dấu thập `+` hoặc hình chữ `L` gập ghềnh. Khi đối thủ bắn trúng 1 ô ở rìa, họ sẽ lãng phí rất nhiều đạn bắn xung quanh vì tưởng đó là tàu đường thẳng.
- **Trứng không để cùng rổ:** Việc tạo ra 1 con tàu 11 ô và 2 con tàu 2 ô sẽ là một canh bạc. Tàu 11 ô rất dễ lộ diện, nhưng 2 chiếc tàu 2 ô lại cực kỳ dễ giấu ở các góc chết của bản đồ.
- **Kết hợp thông tin:** Dưới góc độ người bắn, hãy luôn nhìn vào Bảng thông báo. Nếu bạn biết đối thủ còn một con tàu 7 ô, hãy đếm các khoảng trống trên bản đồ xem khu vực nào đủ rộng để chứa 7 ô liền kề nhau và rải thảm khu vực đó!

---

## 🛠 5. Tài liệu Thiết kế Kỹ thuật (Technical Implementation)

Tính năng **Custom Shipyard** đã được tích hợp thành công trên cả FrontEnd và BackEnd với thiết kế đồng bộ và tối ưu:

### A. Quản lý trạng thái & Giao diện người dùng (UI/UX)
- **Trạng thái `isCustomShipyardActive`:** Theo dõi chế độ vẽ tự do. Khi bật, danh sách tàu mặc định và nút tự động sắp xếp được ẩn đi; thay thế bằng bảng điều khiển vẽ tự do và hướng dẫn luật chơi.
- **Tính độc quyền (Mutual Exclusivity):** Người chơi bắt buộc phải chọn giữa chế độ kéo thả truyền thống (Standard Mode) và chế độ vẽ tự do. Dragging bị vô hiệu hóa khi đang vẽ.
- **Nút "Clear" & "Toggle":** Cho phép xóa nhanh bản vẽ hiện tại hoặc chuyển đổi nhanh lại chế độ thông thường để đảm bảo trải nghiệm liền mạch.

### B. Thuật toán kiểm tra tính hợp lệ (Client-side Validation)
- Sử dụng thuật toán tìm kiếm theo chiều rộng (BFS - Breadth-First Search) thông qua hàm `getConnectedComponents` để nhóm các ô kề cạnh (orthogonal) thành từng con tàu riêng biệt.
- Đảm bảo kiểm tra nghiêm ngặt 3 điều kiện trước khi cho phép sẵn sàng:
  1. Tổng số ô được vẽ bằng đúng **15 ô**.
  2. Số lượng tàu được phát hiện nằm trong khoảng từ **2 đến 4**.
  3. Kích thước của mỗi con tàu nằm trong khoảng từ **2 đến 13 ô**.

### C. Đóng gói dữ liệu & Giao thức BackEnd
- **Hàm `beginBattle`:** Khi người chơi nhấn sẵn sàng, hệ thống sẽ gom nhóm các ô tàu, tính toán tọa độ gốc (minRow, minCol) cho mỗi tàu, và tạo mảng `baseOffsets` đại diện cho hình dạng tương đối của tàu đó.
- **Tương thích ngược (Backward Compatibility):** Cả tàu vẽ tự do và tàu mặc định đều được gửi kèm `baseOffsets` lên máy chủ.
- **BackEnd Handler (`wsMessage.js`):** Hàm `getOccupiedCells` được nâng cấp để ưu tiên xử lý `baseOffsets` động từ client gửi lên. Nếu không có (cho các client cũ), hệ thống sẽ tự động fallback về tính toán góc quay mặc định.

### D. Hiệu ứng đồ họa & Sương mù chiến tranh
- Khi một tàu tự vẽ bị bắn chìm, board-rendering sẽ tự động tô đỏ vùng silhouette thực tế của tàu (`bg-error` / `sunk-ship-silhouette`) để đối thủ biết chính xác hình thù tàu đã bị hạ gục.
- Hỗ trợ đầy đủ tính năng tương tác đa điểm (Touch Events) trên các thiết bị di động thông qua sự kiện `touch-action: none` và bộ điều hướng `handleTouchStart` để mang lại trải nghiệm mượt mà nhất.