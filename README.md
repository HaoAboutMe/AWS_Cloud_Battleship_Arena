# 🚢 Cloud Battleship Arena 🌊

**Cloud Battleship Arena** là một phiên bản hiện đại, hỗ trợ nhiều người chơi theo thời gian thực (Real-time Multiplayer) của tựa game bắn tàu kinh điển (Battleship). Dự án sử dụng kiến trúc **Serverless** mạnh mẽ trên **Amazon Web Services (AWS)** để mang lại khả năng mở rộng cực cao và độ trễ thấp nhất, kết hợp cùng giao diện người dùng sống động, phản hồi nhanh được xây dựng bằng **React**.

---

## 📑 Mục lục
- [🌟 Tổng quan Kiến trúc](#-tổng-quan-kiến-trúc)
- [☁️ Các Dịch vụ AWS Sử dụng](#️-các-dịch-vụ-aws-sử-dụng)
- [💻 Frontend (Máy khách)](#-frontend-máy-khách)
- [⚙️ Backend (API Serverless)](#️-backend-api-serverless)
- [🎮 Logic Trò chơi & Luồng WebSocket](#-logic-trò-chơi--luồng-websocket)
- [🚀 Hướng dẫn Cài đặt](#-hướng-dẫn-cài-đặt)

---

## 🌟 Tổng quan Kiến trúc

Ứng dụng tuân theo hoàn toàn kiến trúc **Serverless** (Không máy chủ) và hướng sự kiện (Event-driven):
1. **Frontend**: Một ứng dụng trang đơn (SPA) giao tiếp với Backend thông qua các API RESTful (để tìm trận, cập nhật hồ sơ, tải ảnh đại diện lên và lấy lịch sử đấu).
2. **Real-time Engine**: Trong quá trình chơi game, thiết bị của người chơi duy trì kết nối liên tục thông qua **WebSockets** để đồng bộ trạng thái trò chơi (ví dụ: khai hỏa, xếp tàu, trò chuyện và kết thúc trận đấu) gần như ngay lập tức.
3. **Backend**: Các hàm **AWS Lambda** đóng vai trò là tầng xử lý tính toán, truy cập an toàn vào **DynamoDB** để lưu trạng thái và thực thi logic game mà không cần phải quản lý hay duy trì bất kỳ máy chủ vật lý nào.

---

## ☁️ Các Dịch vụ AWS Sử dụng

Dự án tận dụng triệt để hệ sinh thái AWS để đảm bảo tính sẵn sàng và hiệu suất tối đa:

- 🔐 **Amazon Cognito**: Xử lý việc xác thực người dùng, quản lý danh tính và đăng ký cực kỳ an toàn. Tích hợp trực tiếp với Frontend thông qua AWS Amplify.
- 🌐 **Amazon API Gateway**:
  - **HTTP APIs**: Cung cấp các endpoint cho các thao tác RESTful (tạo phòng, lấy thông tin hồ sơ, ghép trận).
  - **WebSocket APIs**: Quản lý các kênh giao tiếp hai chiều, liên tục giữa các người chơi trong suốt quá trình đấu trí.
- ⚡ **AWS Lambda**: Thực thi mã nguồn (viết bằng Node.js) cho toàn bộ logic Backend: quản lý kết nối WebSocket, định tuyến tin nhắn, ghép trận và xử lý lịch sử đấu.
- 🗄️ **Amazon DynamoDB**: Cơ sở dữ liệu NoSQL được quản lý hoàn toàn để lưu trữ dữ liệu tốc độ cao (độ trễ siêu thấp) cho các bảng như: `User`, `Rooms`, `Connections`, `ChatMessages`, và `MatchHistory`.
- 🪣 **Amazon S3**: Sử dụng để lưu trữ an toàn các hình ảnh Avatar do người dùng tải lên thông qua cơ chế Pre-signed URL.
- 🏗️ **AWS SAM (Serverless Application Model)**: Framework IaC (Infrastructure as Code) được dùng để định nghĩa, đóng gói và triển khai toàn bộ hạ tầng Backend Serverless.

---

## 💻 Frontend (Máy khách)

Nằm trong thư mục `FrontEnd/`, ứng dụng máy khách được tối ưu hóa cho hiệu năng cao và trải nghiệm người dùng (UX) mượt mà.

### 🛠️ Công nghệ cốt lõi
- **Framework**: React 19 + Vite ⚡
- **Routing**: React Router DOM 🛣️
- **Xác thực**: AWS Amplify (`aws-amplify`) 🛡️
- **Âm thanh/SFX**: Howler.js mang lại trải nghiệm âm thanh chiến trường sống động 🔊
- **Mạng**: WebSockets gốc (Native) cho thời gian thực và Axios cho các yêu cầu HTTP 📡
- **Giao diện**: Custom CSS kết hợp Tailwind, thiết kế Responsive hiển thị đa ngôn ngữ (i18n Context) và nhiều hiệu ứng Animations đẹp mắt ✨

### 🎯 Các tính năng nổi bật
- **Sảnh & Ghép trận**: Tham gia phòng bằng mã (Code) hoặc sử dụng hệ thống ghép trận tự động (Matchmaking).
- **Custom Shipyard (Xưởng tàu)**: Cơ chế kéo thả (Drag-and-drop) hoặc chạm để linh hoạt bố trí hạm đội của bạn.
- **Giao diện Chiến đấu**: Lưới tọa độ và Radar hiển thị Responsive, cho phép ngắm bắn thời gian thực và phản hồi Trúng/Trượt ngay lập tức.
- **Hồ sơ Chỉ huy (Commander Profile)**: Thống kê chi tiết Tổng số trận, Tỷ lệ thắng, Hệ thống Cấp bậc (Rank) kèm thanh tiến trình thăng hạng (Rank Point bar) 📈.
- **Tùy chỉnh Avatar**: Tích hợp công cụ cắt ảnh và tải lên ảnh đại diện cá nhân, lưu trữ an toàn trên AWS S3 🖼️.

---

## ⚙️ Backend (API Serverless)

Nằm trong thư mục `BackEnd/`, cung cấp cơ sở hạ tầng mạnh mẽ để phục vụ các trận đấu Real-time.

### 🛠️ Công nghệ cốt lõi
- **Framework**: AWS SAM (`template.yaml`) 🐿️
- **Môi trường chạy**: Node.js 24.x 🟢
- **Cơ sở dữ liệu**: Amazon DynamoDB 📊

### 🧩 Các Module chức năng
- 🔌 **WebSocket Handlers (`wsConnect`, `wsDisconnect`, `wsMessage`)**: Quản lý việc kết nối của người chơi, định tuyến tin nhắn chat và phát sóng (Broadcast) các bản cập nhật trạng thái trò chơi cho đối thủ.
- 🏠 **Quản lý Phòng & Matchmaking (`createRoom`, `joinRoom`, `matchmakeRoom`)**: Tạo ra các không gian đấu tạm thời cho người chơi, kết hợp với cơ chế TTL (Time To Live) để tự động xóa các phòng trống trên DynamoDB.
- 👤 **Quản lý Người dùng (`createUser`, `getUser`, `updateUsername`, `getAvatarUploadUrl`)**: Đồng bộ thông tin người dùng từ Cognito vào bảng `User` của DynamoDB, cấp phát Pre-signed S3 URL để upload Avatar an toàn, và lấy các thông số thống kê.
- 📜 **Lịch sử đấu (`getMatchHistory`)**: Lưu lại kết quả trận đấu, cập nhật điểm ELO / Rank Points (RP) và phục vụ dữ liệu chi tiết cho bảng hồ sơ của Frontend.

---

## 🎮 Logic Trò chơi & Luồng WebSocket

1. 🔐 **Xác thực**: Người dùng đăng nhập qua Amazon Cognito. AWS Amplify quản lý JWT session token.
2. 🚪 **Tạo/Vào phòng**: Người chơi gọi API Gateway HTTP để lấy một mã phòng (`roomCode`) duy nhất. Đối thủ sẽ dùng mã này để tham gia.
3. 🤝 **Bắt tay WebSocket**: Cả hai kết nối tới API Gateway WebSocket URL. Lambda sẽ ánh xạ `connectionId` của họ với `roomCode` trong DynamoDB.
4. ⚓ **Giai đoạn Xếp tàu (Placement)**: Người chơi sắp xếp hạm đội cục bộ. Khi đã sẵn sàng, tín hiệu `LobbyReady` sẽ được gửi qua mạng.
5. 💥 **Giai đoạn Chiến đấu (Combat)**: Thay phiên nhau gửi tọa độ `FIRE`. WebSocket broadcast (phát) tọa độ đó, Client của người bị bắn sẽ tính toán xem Trúng hay Trượt và phản hồi lại trạng thái kết quả.
6. 🏆 **Kết thúc & Dọn dẹp**: Khi tàu cuối cùng bị chìm, Payload `GAME_OVER` được gửi đi. Backend xác thực kết quả, lưu vào `MatchHistory`, cập nhật thông số vào `User Stats` (DynamoDB) và ngắt kết nối dọn dẹp phòng.

---

## 🚀 Hướng dẫn Cài đặt

### 📋 Yêu cầu hệ thống
- Node.js (v20+)
- AWS CLI & AWS SAM CLI đã được cấu hình Profile với quyền hợp lệ.

### ⚙️ Triển khai Backend
1. Di chuyển vào thư mục `BackEnd/`.
2. Chạy lệnh `sam build` để đóng gói các hàm Lambda.
3. Chạy `sam deploy --guided` để triển khai CloudFormation stack lên tài khoản AWS của bạn.
4. Lấy các thông số trả về như `HttpApiUrl`, `WebSocketUrl` và `AvatarBucket` ở phần Output.

### 🎨 Khởi chạy Frontend
1. Di chuyển vào thư mục `FrontEnd/`.
2. Chạy lệnh `npm install` để cài đặt thư viện.
3. Tạo tệp `.env` (dựa trên `.env.example` nếu có) và cấu hình các endpoint của AWS vừa nhận được ở trên (VD: `VITE_API_URL`, `VITE_WS_URL`, `VITE_COGNITO_USER_POOL_ID`).
4. Chạy lệnh `npm run dev` để khởi động máy chủ Vite chạy ở môi trường cục bộ (Local).

---

> ⚠️ **Lưu ý Bảo mật**: Kho lưu trữ này chứa mã nguồn hạ tầng (IaC) và logic ứng dụng. Tuyệt đối **không** đính kèm, cam kết (commit) hay để lộ bất kỳ khóa truy cập (Access keys) hay các thông tin bảo mật nhạy cảm (Tokens, URLs thực) lên hệ thống quản lý phiên bản (Git). Hãy sử dụng tệp `.env` cục bộ cho việc cấu hình.
