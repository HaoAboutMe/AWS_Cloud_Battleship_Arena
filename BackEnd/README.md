# ⚙️ Tầng Backend - Cloud Battleship Arena ☁️

Chào mừng bạn đến với mã nguồn Backend của **Cloud Battleship Arena**. Thư mục này chứa toàn bộ hệ thống cơ sở hạ tầng dưới dạng mã (Infrastructure as Code - IaC) và logic nghiệp vụ được chạy trên môi trường **AWS Serverless**. 

Không cần quản lý bất kỳ một máy chủ vật lý nào, hệ thống tự động mở rộng theo lượng người chơi và cung cấp độ trễ siêu thấp cho game thời gian thực (Real-time).

---

## 🛠️ Công Nghệ Sử Dụng

- **AWS SAM (Serverless Application Model) 🐿️**: Công cụ chính dùng để định nghĩa kiến trúc dưới dạng tệp `template.yaml` và quản lý vòng đời triển khai (Build & Deploy).
- **Node.js 24.x 🟢**: Môi trường thực thi hàm Lambda.
- **Amazon API Gateway 🌐**: Cung cấp giao thức WebSocket cho các hành động Real-time và HTTP (REST) API cho các dữ liệu hồ sơ (Profile), ghép trận (Matchmaking).
- **Amazon DynamoDB 🗄️**: Cơ sở dữ liệu NoSQL được tối ưu tốc độ để lưu trữ dữ liệu người dùng, trạng thái phòng chơi và lịch sử trận đấu.
- **Amazon S3 🪣**: Lưu trữ an toàn tệp tin tĩnh do người chơi tải lên (Ví dụ: Avatar).

---

## 📂 Cấu Trúc Tệp Tin Chính

```text
BackEnd/
├── src/
│   └── handlers/               # Mã nguồn Node.js cho các hàm Lambda
│       ├── wsConnect.js        # Logic khi người chơi kết nối vào Game
│       ├── wsDisconnect.js     # Dọn dẹp trạng thái khi người chơi mất kết nối
│       ├── wsMessage.js        # Nhận tọa độ nã đạn và cập nhật bản đồ
│       ├── createRoom.js       # Khởi tạo phòng chơi
│       └── users/              # Xử lý hồ sơ và lịch sử đấu
├── template.yaml               # Bản thiết kế (Blueprint) của hệ thống AWS
└── samconfig.toml              # Tệp cấu hình tham số cho lệnh triển khai
```

---

## 🚀 Hướng Dẫn Triển Khai Lên AWS

### 1. Yêu cầu trước khi bắt đầu
- Bạn cần có sẵn một tài khoản AWS.
- Cài đặt **AWS CLI** và **AWS SAM CLI**.
- Đã cấu hình xác thực máy tính với AWS (Thông qua lệnh `aws configure`).

### 2. Biên dịch mã nguồn (Build)
Chạy lệnh sau để tải xuống các phần phụ thuộc và chuẩn bị các gói Lambda:
```bash
sam build
```

### 3. Triển khai lên Đám mây (Deploy)
Trong lần đầu tiên, hãy triển khai với chế độ tương tác:
```bash
sam deploy --guided
```
Hệ thống SAM CLI sẽ yêu cầu bạn xác nhận các thông số như Tên Stack, Khu vực (Region). Đặc biệt chú ý cấp quyền tạo các tài nguyên (IAM Roles) theo đúng như yêu cầu của ứng dụng.

### 4. Lấy thông số môi trường cho Frontend
Sau khi quy trình Deploy kết thúc, hãy tìm mục **Outputs** trên màn hình Terminal của bạn. Bạn sẽ tìm thấy các đường dẫn quan trọng cần copy sang tệp `.env` của Frontend:
- `HttpApiUrl`
- `WebSocketUrl`

---

## 🔐 Best Practices & Bảo Mật
- Các API Gateway Route và Lambda đều được thiết lập nguyên tắc phân quyền tối thiểu (Least Privilege Principle) thông qua tệp SAM.
- Dữ liệu rác của những phòng chơi bị bỏ hoang sẽ tự động được dọn dẹp bởi cấu hình TTL (Time-To-Live) cực kỳ hiệu quả của DynamoDB.
- **CẢNH BÁO:** Không đẩy bất kỳ file chứa API Keys hay Secrets thực tế nào lên kho lưu trữ code.
