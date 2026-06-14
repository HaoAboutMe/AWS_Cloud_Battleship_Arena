# Backend - Cloud Battleship Arena

Backend này là phần serverless chạy trên AWS cho game Battleship.

Hiện tại backend đã có:

- Lambda tạo phòng.
- Lambda vào phòng.
- Lambda xem thông tin phòng.
- DynamoDB lưu phòng chơi.
- WebSocket API nền để làm realtime PvP sau này.

Các tài nguyên AWS được khai báo trong file:

```text
template.yaml
```

## 1. Công cụ cần có

Bạn cần cài:

- Node.js 20
- AWS CLI
- AWS SAM CLI

Kiểm tra:

```bash
node --version
aws --version
sam --version
```

Kiểm tra AWS CLI đã đăng nhập đúng chưa:

```bash
aws sts get-caller-identity
```

Nếu lệnh này trả về `Account`, `UserId`, `Arn` là được.

## 2. Cài dependency

Từ thư mục backend:

```bash
cd C:\Users\super\OneDrive\Documents\AWS_Cloud_Battleship_Arena\BackEnd
npm install
```

## 3. Build backend

Chạy:

```bash
sam build
```

Lệnh này đọc `template.yaml`, gom code Lambda và dependency vào thư mục:

```text
.aws-sam/build
```

Lưu ý: `sam build` chỉ build local, chưa tạo gì trên AWS.

## 4. Deploy lần đầu bằng guided mode

Lần đầu deploy chạy:

```bash
sam deploy --guided
```

Khi SAM hỏi, nhập như sau:

```text
Stack Name [sam-app]: cloud-battleship-backend-dev
AWS Region [ap-southeast-1]: ap-southeast-1
Parameter CorsOrigin [http://localhost:5173]: http://localhost:5173
Confirm changes before deploy [y/N]: y
Allow SAM CLI IAM role creation [Y/n]: y
Disable rollback [y/N]: n
CreateRoomFunction has no authentication. Is this okay? [y/N]: y
JoinRoomFunction has no authentication. Is this okay? [y/N]: y
GetRoomFunction has no authentication. Is this okay? [y/N]: y
ReadyRoomFunction has no authentication. Is this okay? [y/N]: y
LobbyReadyRoomFunction has no authentication. Is this okay? [y/N]: y
Save arguments to configuration file [Y/n]: y
SAM configuration file [samconfig.toml]:
SAM configuration environment [default]:
```

Quan trọng:

- Ở dòng `SAM configuration file [samconfig.toml]:` chỉ **nhấn Enter**, không gõ chữ `Enter`.
- Ở dòng `SAM configuration environment [default]:` cũng chỉ **nhấn Enter**.
- Các API hiện đang để chưa có authentication để test trước. Sau khi frontend nối ổn, có thể thêm Cognito authorizer.

Deploy thành công sẽ thấy:

```text
Successfully created/updated stack - cloud-battleship-backend-dev in ap-southeast-1
```

## 5. Deploy các lần sau

Sau lần đầu, SAM sẽ có file:

```text
samconfig.toml
```

Các lần sau chỉ cần:

```bash
sam build
sam deploy
```

Không cần dùng `--guided` nữa, trừ khi muốn đổi cấu hình deploy.

## 6. Output sau khi deploy

Xem lại output của stack:

```bash
aws cloudformation describe-stacks --stack-name cloud-battleship-backend-dev --region ap-southeast-1 --query "Stacks[0].Outputs" --output table
```

Các output quan trọng:

- `HttpApiUrl`: URL REST API cho frontend.
- `WebSocketUrl`: URL WebSocket realtime.
- `RoomsTableName`: bảng DynamoDB lưu phòng chơi.

Hiện tại project đang dùng:

```text
HttpApiUrl: https://33e3vqkkf1.execute-api.ap-southeast-1.amazonaws.com
WebSocketUrl: wss://a2fcilzddj.execute-api.ap-southeast-1.amazonaws.com/prod
```

Hai URL này đã được thêm vào `FrontEnd/.env`:

```env
VITE_API_BASE_URL=https://33e3vqkkf1.execute-api.ap-southeast-1.amazonaws.com
VITE_WS_BASE_URL=wss://a2fcilzddj.execute-api.ap-southeast-1.amazonaws.com/prod
```

## 7. Test REST API

### Tạo phòng

```bash
curl -X POST "https://33e3vqkkf1.execute-api.ap-southeast-1.amazonaws.com/rooms" ^
  -H "content-type: application/json" ^
  -d "{\"difficulty\":\"easy\",\"player\":{\"userId\":\"u1\",\"displayName\":\"Host\"}}"
```

Kết quả sẽ trả về `roomCode`.

### Vào phòng

Thay `ABC123` bằng `roomCode` thật:

```bash
curl -X POST "https://33e3vqkkf1.execute-api.ap-southeast-1.amazonaws.com/rooms/ABC123/join" ^
  -H "content-type: application/json" ^
  -d "{\"player\":{\"userId\":\"u2\",\"displayName\":\"Guest\"}}"
```

### Xem phòng

```bash
curl "https://33e3vqkkf1.execute-api.ap-southeast-1.amazonaws.com/rooms/ABC123"
```

### Báo đã sẵn sàng

Endpoint này dùng sau khi người chơi đã xếp tàu xong trong màn game.

Thay `ABC123` bằng `roomCode` thật:

```bash
curl -X POST "https://33e3vqkkf1.execute-api.ap-southeast-1.amazonaws.com/rooms/ABC123/ready" ^
  -H "content-type: application/json" ^
  -d "{\"player\":{\"userId\":\"u1\",\"displayName\":\"Host\"},\"board\":{\"status\":\"placed\"}}"
```

### Báo đã sẵn sàng trong phòng chờ

Endpoint này dùng ở Lobby. Khi cả 2 người cùng sẵn sàng, phòng chuyển sang `DEPLOYING` và frontend đưa người chơi vào màn xếp tàu.

```bash
curl -X POST "https://33e3vqkkf1.execute-api.ap-southeast-1.amazonaws.com/rooms/ABC123/lobby-ready" ^
  -H "content-type: application/json" ^
  -d "{\"player\":{\"userId\":\"u1\",\"displayName\":\"Host\"}}"
```

## 8. Test WebSocket

Cài/chạy `wscat` bằng `npx`:

```bash
npx wscat -c "wss://a2fcilzddj.execute-api.ap-southeast-1.amazonaws.com/prod?userId=u1&roomCode=ABC123"
```

Gửi ping:

```json
{ "action": "PING" }
```

Subscribe vào phòng:

```json
{ "action": "SUBSCRIBE_ROOM", "roomCode": "ABC123" }
```

Broadcast trong phòng:

```json
{
  "action": "BROADCAST_ROOM",
  "roomCode": "ABC123",
  "payload": {
    "type": "PLAYER_READY"
  }
}
```

## 9. Bước tiếp theo

Sau khi backend deploy ổn:

1. Tạo frontend service gọi `POST /rooms`.
2. Tạo frontend service gọi `POST /rooms/{roomCode}/join`.
3. Nối WebSocket để hai người chơi thấy trạng thái phòng realtime.
4. Sau đó mới thêm logic đặt tàu, ready, bắn tàu, kiểm tra hit/miss và đồng bộ lượt.
