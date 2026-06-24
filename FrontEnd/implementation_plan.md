# Kế hoạch triển khai tính năng: "Xưởng Đóng Tàu Tự Do" (Custom Shipyard)

Dựa trên tài liệu thiết kế kỹ thuật, dưới đây là kế hoạch chi tiết từng bước để triển khai tính năng Xưởng Đóng Tàu Tự Do (cho phép người chơi tự vẽ hình dáng tàu). 

Kế hoạch này gồm 5 giai đoạn, đi từ giao diện người dùng (FrontEnd), thuật toán kiểm tra, đồng bộ dữ liệu (BackEnd) và hiệu ứng hình ảnh/bảo mật trong trận đấu.

---

## Giai đoạn 1: Xây dựng UI/UX trên FrontEnd (Giao diện người dùng) - [ĐÃ HOÀN THÀNH]

**Mục tiêu:** Cung cấp cho người chơi công cụ để vẽ tàu và chuyển đổi giữa các chế độ.

1. **Quản lý State:** 
   - Thêm state `isCustomShipyardActive` để theo dõi xem người chơi đang ở chế độ kéo thả truyền thống hay chế độ vẽ tự do.
2. **Cập nhật Giao diện (UI):**
   - **Chế độ Vẽ tự do:** Khi `isCustomShipyardActive == true`, ẩn danh sách tàu mặc định và nút "Tự động sắp xếp".
   - Hiển thị bảng điều khiển vẽ tự do: Hiện số lượng ô còn lại (tổng ngân sách là 15 ô).
   - Thêm nút **"Clear"** để làm sạch bản vẽ hiện tại.
   - Thêm nút **"Toggle"** để chuyển đổi qua lại giữa chế độ vẽ và chế độ kéo thả thông thường.
3. **Vô hiệu hóa kéo thả:** 
   - Đảm bảo tính độc quyền (Mutual Exclusivity): Khi đang ở chế độ vẽ, các sự kiện Drag & Drop của chế độ cũ bị vô hiệu hóa hoàn toàn.
4. **Hỗ trợ thiết bị di động:**
   - Thêm thuộc tính CSS `touch-action: none` vào lưới (grid).
   - Triển khai sự kiện `handleTouchStart` để cho phép thao tác vẽ (vuốt/chạm) mượt mà trên màn hình cảm ứng.

---

## Giai đoạn 2: Thuật toán và Kiểm tra hợp lệ (Client-side Validation) - [ĐÃ HOÀN THÀNH]

**Mục tiêu:** Đảm bảo hạm đội người chơi vẽ ra tuân thủ đúng luật chơi đã đề ra.

1. **Thuật toán gom nhóm:**
   - Cài đặt hàm `getConnectedComponents` sử dụng thuật toán tìm kiếm theo chiều rộng (BFS - Breadth-First Search).
   - Hàm này quét lưới 10x10, nhóm các ô đã được chọn liền kề nhau (theo chiều ngang và dọc, không tính đường chéo) thành các con tàu riêng biệt.
2. **Kiểm tra điều kiện khi "Sẵn sàng":**
   - Khi người chơi bấm "Ready", thực hiện 3 bước kiểm tra bắt buộc:
     - **Điều kiện 1:** Tổng số ô được vẽ trên bàn cờ phải bằng chính xác **15 ô**.
     - **Điều kiện 2:** Tổng số con tàu (số lượng nhóm BFS tìm được) phải nằm trong khoảng **từ 2 đến 4 tàu**.
     - **Điều kiện 3:** Kích thước của mỗi con tàu phải nằm trong khoảng **từ 2 đến 13 ô**.
   - Nếu bất kỳ điều kiện nào bị vi phạm, chặn sự kiện gửi dữ liệu và hiển thị thông báo lỗi/hướng dẫn cụ thể.

---

## Giai đoạn 3: Đóng gói Dữ liệu và Giao thức (FrontEnd -> BackEnd) - [ĐÃ HOÀN THÀNH]

**Mục tiêu:** Dịch bản vẽ của người chơi thành cấu trúc dữ liệu mà BackEnd có thể hiểu được.

1. **Trích xuất Tọa độ (hàm `beginBattle`):**
   - Duyệt qua từng con tàu (nhóm ô) được tạo ra từ hàm `getConnectedComponents`.
   - Tìm tọa độ gốc cho mỗi tàu: `minRow` (hàng nhỏ nhất) và `minCol` (cột nhỏ nhất).
2. **Tạo mảng `baseOffsets`:**
   - Với mỗi ô trong tàu, tính toán vị trí tương đối của nó so với tọa độ gốc (offset).
   - Gom các vị trí tương đối này vào mảng `baseOffsets` đại diện cho hình dạng thật của con tàu.
3. **Tương thích ngược (Backward Compatibility):**
   - Đóng gói dữ liệu tàu bao gồm `minRow`, `minCol` và `baseOffsets` để gửi lên máy chủ qua WebSockets/API. Đảm bảo cấu trúc này tương thích hoàn toàn và không làm hỏng logic của chế độ xếp tàu truyền thống.

---

## Giai đoạn 4: Cập nhật BackEnd (Xử lý Tọa độ Động & Độc lập) - [ĐÃ HOÀN THÀNH]

**Mục tiêu:** BackEnd phải hiểu và lưu trữ được hình dáng tự do của các con tàu để kiểm tra Hit/Miss.

1. **Cập nhật Handler (`wsMessage.js` & `roomService.js`):**
   - Sửa đổi hàm `getOccupiedCells` (hàm tính toán các ô bị tàu chiếm dụng).
   - **Logic mới:** Ưu tiên kiểm tra xem tàu có trường `baseOffsets` hay không.
     - Nếu có `baseOffsets` (tàu tự vẽ): Sử dụng mảng này cộng với tọa độ gốc để xác định các ô chiếm dụng.
     - Nếu không có (tàu mặc định/client cũ): Fallback về logic tính toán cũ (dùng chiều dài và góc quay dọc/ngang).
   - Cập nhật hàm `validateFleetBoard` để xử lý phân loại tàu `"custom"`, tính toán kích thước động qua `baseOffsets.length` thay vì tra cứu cứng bảng định nghĩa tĩnh.

---

## Giai đoạn 5: Cơ chế Sương mù chiến tranh & Gợi ý số ô - [ĐÃ HOÀN THÀNH]

**Mục tiêu:** Tạo trải nghiệm trò chơi công bằng, giấu hình dạng tàu của đối thủ và chỉ đưa ra gợi ý gián tiếp về kích thước tàu.

1. **Bảo mật và Ẩn thông tin hạm đội địch:**
   - Triển khai helper `roomSanitizer.js` ở BackEnd để lược bỏ tọa độ (`row: -99`, `col: -99`) và danh sách offset (`baseOffsets: []`) của bất kỳ tàu nào của đối phương vẫn còn nổi (afloat).
   - Tích hợp bộ lọc này vào toàn bộ các API endpoint trả về phòng chơi như `getRoom`, `joinRoom`, `readyRoom`, `lobbyReadyRoom`, ngăn chặn hoàn toàn việc người chơi mở tab Network để xem vị trí tàu địch.
   - Khi một tàu của địch bị chìm hoàn toàn (sunk), thông tin tọa độ thực và hình dáng của con tàu đó sẽ được tiết lộ và đồng bộ về máy khách để vẽ vinh danh (được khoanh vùng đỏ).
2. **Gợi ý số ô & Số lượng tàu đối với Xưởng Đóng Tàu:**
   - Đối với hạm đội vẽ tự do bằng Xưởng Đóng Tàu, UI không hiển thị hình dáng bản đồ ô lưới của tàu đối thủ.
   - Thay vào đó, hạm đội sẽ hiển thị dưới dạng danh sách chữ thể hiện số lượng tàu và số lượng ô của mỗi tàu (ví dụ: `5 ô`, `4 ô`, `4 ô`, `2 ô`) sử dụng ngôn ngữ linh hoạt tùy theo cài đặt của người chơi (tiếng Anh/tiếng Việt).
