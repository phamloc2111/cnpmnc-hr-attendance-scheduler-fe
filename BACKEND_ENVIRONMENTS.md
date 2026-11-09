# Backend local và cloud

Frontend dùng một HTTP client cho toàn bộ API và ảnh chấm công có xác thực.
Chọn backend bằng lệnh chạy/build, không cần sửa source hoặc nhập lại hai URL
mỗi lần chuyển. Không tự chuyển sang server khác khi request lỗi.

Thêm vào `fe/.env` hoặc `fe/.env.local`, giữ nguyên key Goong đang có:

```dotenv
# npm run dev / npm run build: giữ cách cấu hình hiện tại
VITE_API_BASE_URL=http://localhost:8080

# npm run dev:local / npm run build:local
VITE_API_LOCAL_BASE_URL=http://localhost:8080

# npm run dev:cloud / npm run build:cloud — điền URL cloud thật sau
VITE_API_CLOUD_BASE_URL=
```

| Mục đích | Lệnh |
| --- | --- |
| Web phát triển gọi backend local | `npm run dev:local` |
| Web phát triển gọi backend cloud | `npm run dev:cloud` |
| Build gọi backend local | `npm run build:local` |
| Build gọi backend cloud | `npm run build:cloud` |
| Giữ cấu hình VITE_API_BASE_URL | `npm run dev` / `npm run build` |

Hai chế độ dùng Vite mode `backend-local` và `backend-cloud`. Chế độ local mặc
định `http://localhost:8080`; muốn thử trên điện thoại cùng mạng, dùng IP LAN
máy chạy backend. `localhost` luôn chỉ thiết bị đang mở trình duyệt.

Chế độ cloud bắt buộc có `VITE_API_CLOUD_BASE_URL`, không dùng URL local hay biến
legacy để bù khi bỏ trống. Ví dụ `https://api.example.com` hoặc
`https://api.example.com/api/v1` đều tạo request `/api/v1` đúng một lần.
Hỗ trợ tiền tố triển khai, ví dụ `/hr/api/v1`. URL được trim khoảng trắng/dấu
gạch cuối; phải dùng HTTP/HTTPS, không có user/password, query hoặc fragment.

Khởi động lại Vite sau khi sửa `.env`. Với hosting (ví dụ Vercel), đặt biến môi
trường của frontend và chọn `npm run build:cloud`, rồi redeploy. URL được chốt
lúc build; sửa biến môi trường của hosting mà không build lại sẽ không đổi API
của bản đã deploy. `npm run preview` chỉ phục vụ kết quả build gần nhất, không
chuyển backend. Web HTTPS cần backend HTTPS để tránh mixed content.

Backend đã hỗ trợ `CORS_ALLOWED_ORIGINS`. Cấu hình biến này trên môi trường
backend bằng các origin frontend được phép, phân tách dấu phẩy, ví dụ:

```dotenv
CORS_ALLOWED_ORIGINS=http://localhost:5173,https://hr.example.com
```

Origin gồm scheme, hostname và port, không kèm đường dẫn. Khi đổi CORS, restart
backend. Không cần sửa Java hoặc dùng `*`. Key Goong Maptiles cũng phải cho phép
domain frontend tương ứng trong Goong Console.

`.env`/`.env.local` không được commit. Kiểm thử dùng URL giả và mock HTTP;
không chứng minh backend cloud thật hoạt động khi URL đó chưa được cung cấp.

Tham khảo [Vite environment và modes](https://vite.dev/guide/env-and-mode).
