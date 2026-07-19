# 💻 Tầng Frontend - Cloud Battleship Arena 🎨

Chào mừng bạn đến với mã nguồn Frontend của **Cloud Battleship Arena**! Thư mục này chứa toàn bộ giao diện người dùng (Client-side) được tối ưu hóa cho trải nghiệm chơi game mượt mà, tốc độ cao và phản hồi theo thời gian thực (Real-time).

---

## 🛠️ Công Nghệ Lõi (Tech Stack)

- **React 19 & Vite ⚡**: Giúp xây dựng giao diện ứng dụng Trang Đơn (SPA) với tốc độ khởi động và HMR (Hot Module Replacement) siêu nhanh.
- **TailwindCSS & Custom CSS 🎨**: Mang lại giao diện thiết kế hiện đại, tùy chỉnh linh hoạt và tương thích hoàn hảo (Responsive) với mọi thiết bị.
- **AWS Amplify (`aws-amplify`) 🔐**: Quản lý luồng xác thực người dùng an toàn thông qua dịch vụ Amazon Cognito.
- **WebSockets 🌐**: Sử dụng giao thức kết nối thời gian thực bằng WebSocket Native để truyền tải hành động (Bắn, Xếp Tàu, Trò chuyện).
- **Howler.js 🔊**: Quản lý âm thanh vòm không gian (Spatial Audio) và các hiệu ứng chiến trường (SFX) chân thực.

---

## ✨ Cấu Trúc Thư Mục Chính

```text
FrontEnd/
├── src/
│   ├── assets/       # Chứa hình ảnh, âm thanh, icon, và huy hiệu Rank.
│   ├── components/   # Các UI Component dùng chung (Nút, Modal, Radar, v.v.).
│   ├── contexts/     # Chứa State Management (AuthContext, LanguageContext, v.v.).
│   ├── pages/        # Các màn hình chính (Sảnh, Đấu trường, Hồ sơ, Đăng nhập).
│   └── App.jsx       # Tệp định tuyến cốt lõi (React Router).
├── package.json      # Danh sách các thư viện phụ thuộc.
└── vite.config.js    # Cấu hình của Vite bundler.
```

---

## 🚀 Hướng Dẫn Khởi Chạy Môi Trường Local

### 1. Yêu cầu hệ thống
- Đã cài đặt **Node.js** (v20+).

### 2. Cài đặt các thư viện (Dependencies)
```bash
npm install
```

### 3. Cấu hình biến môi trường
Vui lòng tạo tệp `.env` tại thư mục `FrontEnd/` (không được đưa lên Github) để liên kết ứng dụng với hạ tầng AWS Backend của bạn. Các tham số chính bao gồm:
```env
VITE_API_URL="<API_GATEWAY_REST_URL>"
VITE_WS_URL="<API_GATEWAY_WEBSOCKET_URL>"
VITE_COGNITO_USER_POOL_ID="<COGNITO_POOL_ID>"
VITE_COGNITO_CLIENT_ID="<COGNITO_CLIENT_ID>"
```
*(Lưu ý: Bạn có thể lấy các giá trị này từ Terminal sau khi Deploy Backend thành công).*

### 4. Khởi chạy Server
```bash
npm run dev
```
Trình duyệt của bạn sẽ tự động mở ứng dụng tại cổng nội bộ (Thường là `http://localhost:5173`).

---

## 🎮 Tính Năng Đặc Biệt Của Frontend
- 🌍 **Đa ngôn ngữ (i18n)**: Hỗ trợ linh hoạt chuyển đổi giữa tiếng Việt và tiếng Anh.
- 📱 **Thiết kế Thích ứng (Responsive Design)**: UI/UX được tinh chỉnh tối đa hóa để vừa vặn hoàn hảo trên giao diện Điện thoại (Mobile) lẫn Máy tính (Desktop).
- 🏆 **Bảng Thành Tích**: Giao diện tiến trình điểm xếp hạng (Rank Point) trực quan với đồ họa bắt mắt.
