## Kế hoạch Tối ưu: Upload Avatar bằng Presigned URL
1. Tối ưu Storage (AWS S3) & Bỏ qua việc cập nhật liên tục ở DynamoDB

S3 Bucket: Tạo một bucket lưu trữ ảnh. Cấu hình CORS (Cross-Origin Resource Sharing) để cho phép trình duyệt của client thực hiện lệnh PUT trực tiếp lên S3.

Cơ chế Ghi đè: Đặt tên file theo định dạng chuẩn, ví dụ: avatars/{userId}.jpg. Khi người dùng upload ảnh mới, S3 sẽ tự động ghi đè lên file cũ. Bạn không bao giờ phải lo rác S3.

Mẹo tối ưu DynamoDB: Vì đường dẫn ảnh luôn cố định (ví dụ: https://[tên-bucket].s3.amazonaws.com/avatars/[userId].jpg), bạn không cần phải gọi Lambda update DynamoDB mỗi lần đổi avatar nữa. Đường dẫn này có thể tự suy luận được từ userId ở Frontend, giúp tiết kiệm thêm một nhịp gọi Database!

2. Triển khai Lambda Function (Chỉ làm nhiệm vụ cấp vé)

Nhiệm vụ: Không nhận, không xử lý file ảnh. Lambda chỉ có một nhiệm vụ duy nhất là tạo Presigned URL (đường dẫn tải lên an toàn có thời hạn).

Logic xử lý: Lấy userId từ context xác thực của người dùng. Dùng AWS SDK để tạo một Presigned URL cho phép PUT vào đúng key avatars/{userId}.jpg. Thiết lập thời gian sống (Expiration) cho URL này khoảng 5 phút. Trả URL này về cho client.

3. Cấu hình API Gateway (Trạm kiểm soát vé)

Endpoint: Tạo một REST API nhẹ nhàng: GET /users/avatar-upload-url.

Xác thực (Authentication): Gắn Middleware (hoặc Cognito Authorizer/Lambda Authorizer) vào endpoint này. Đảm bảo chỉ những người dùng đang có Token đăng nhập hợp lệ mới có thể gọi API để xin Presigned URL.

4. Phân quyền IAM (Nguyên tắc đặc quyền tối thiểu)

Quyền của Lambda: Gắn IAM Role cho Lambda chỉ cấp đúng quyền s3:PutObject vào bucket avatar, và giới hạn resource ở mức arn:aws:s3:::tên-bucket/avatars/*.

Bảo mật S3: Đảm bảo bucket không bị Public Write. Chỉ có Presigned URL được ký bởi Lambda mới có quyền ghi đè file.

5. Triển khai ReactJS Frontend (Xử lý UI và luồng Upload)

Giao diện Căn chỉnh (Crop): Khi người dùng chọn ảnh, hiển thị UI để cắt ảnh (dùng thư viện như react-easy-crop). Sau khi cắt, xuất ra một file dạng Blob.

Luồng API 2 bước:

Bước 1: Gọi API GET /users/avatar-upload-url thông qua Axios/Fetch để lấy chuỗi Presigned URL về.

Bước 2: Dùng Axios/Fetch thực hiện HTTP method PUT, nhét thẳng file Blob (ảnh đã cắt) vào Presigned URL vừa nhận được. (Quá trình này upload thẳng từ máy người dùng lên S3, bỏ qua Backend).

Cập nhật UI thông minh: Sau khi Bước 2 báo 200 OK, gán thẳng đường dẫn tĩnh https://.../avatars/{userId}.jpg?t=${Date.now()} vào thẻ <img>. Đoạn ?t=... là chìa khóa để đánh lừa trình duyệt bỏ qua bộ nhớ đệm (cache) và hiển thị ảnh mới nhất ngay lập tức.

Với kế hoạch này, hệ thống của bạn có thể chịu tải hàng ngàn người đổi Avatar cùng lúc mà Lambda và API Gateway vẫn "nhẹ tựa lông hồng", đồng thời chi phí lưu trữ S3 được tối ưu tuyệt đối.