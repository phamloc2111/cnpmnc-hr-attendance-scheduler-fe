# SYNC-27 — Push trên web/PWA

Nhân viên → chuông **Thông báo** trên trang chủ → **Bật thông báo**. Chỉ xin quyền từ thao tác bấm trực tiếp, không tự mở hộp xin quyền khi vào trang. Có Tắt thông báo và Gửi thử. Push foreground hiển thị banner; khi web chạy nền/đóng tab, service worker hiển thị thông báo hệ thống.

## Firebase Web config

Firebase Console → Project settings → General → Web app → SDK setup and configuration. Thêm Web app nếu chưa có. Trong `fe/.env` hoặc env của Vercel:

```dotenv
VITE_FIREBASE_API_KEY=<apiKey>
VITE_FIREBASE_PROJECT_ID=<projectId>
VITE_FIREBASE_MESSAGING_SENDER_ID=<messagingSenderId>
VITE_FIREBASE_APP_ID=<appId>
VITE_FIREBASE_VAPID_KEY=<Web Push certificate public key>
```

VAPID public key lấy từ Project settings → Cloud Messaging → Web configuration → Web Push certificates → Generate key pair (hoặc dùng public key hiện có). Đây là public config cho trình duyệt, **không phải service account private key**. Backend và frontend phải cùng project. Với project cũ, kiểm tra FCM Registration API đã được bật nếu getToken thất bại.

Khởi động lại Vite sau khi sửa `.env`; trên Vercel cần redeploy vì config được nhúng lúc build, gồm cả worker. Khi thiếu config, giao diện giải thích đang chờ thiết lập; các chức năng lịch/chấm công vẫn hoạt động.

## HTTPS và iOS

- Chrome Android cần HTTPS và người dùng cho phép notifications. Localhost dùng được cho phát triển trên máy tính; HTTP qua IP LAN không phải secure context.
- iPhone/iPad cần iOS/iPadOS 16.4 trở lên. Safari → Chia sẻ → Thêm vào Màn hình chính; mở app từ icon đó rồi bấm Bật thông báo. Chỉ mở tab Safari trên iPhone chưa đủ. Nếu đã chặn quyền, hướng dẫn mở lại trong cài đặt; không lặp lại hộp xin quyền.
- Cấu hình backend HTTPS qua base URL cloud hiện có; cho phép origin frontend trong CORS_ALLOWED_ORIGINS. Firebase không thay đổi cơ chế đăng nhập JWT.

## Worker và quyền riêng tư

`firebase-worker.js` được Vite bundle thành `/sw.js` dạng classic IIFE, không tải SDK từ CDN. Dev server cũng phục vụ worker được bundle. Worker giữ cơ chế offline cũ: chỉ cache offline.html, không cache API/dữ liệu xác thực. Worker mới dùng skipWaiting + clients.claim để cập nhật bản offline cũ; getToken dùng chung worker này, không tạo worker thứ hai.

Thông báo data-only chứa employeeId, title/body, tuần, expiry và tag. Worker kiểm tra binding IndexedDB, bỏ push hết hạn hoặc thuộc người khác. Click chỉ mở URL nội bộ với `registrationWeek=YYYY-MM-DD` (thứ Hai) và `#/registrations`, kể cả khi tuần mặc định đã thay đổi. Không dùng URL bên ngoài do payload cung cấp.

Consent và token được lưu cho tài khoản đã bật trên browser profile. Khi đổi tài khoản, xóa binding cũ thay vì tự đồng ý cho tài khoản mới; logout thu hồi token và xóa binding trước. Token refresh khi vào lại app nếu đã đồng ý, không xin lại quyền. Có generation guard để request hoàn tất muộn sau logout không tự bật lại.

## Test

`npm test` và `npm run build`. Test mock Firebase/API, không gửi thật. Kiểm tra xin quyền từ click, từ chối/chặn, iOS chưa cài PWA, lỗi config, bật/tắt/gửi thử, foreground sau khi vừa bật, đổi tài khoản, logout đang lấy token; test worker recipient/expiry/tag/deep link.

Kiểm tra thật sau deploy: đăng nhập nhân viên, bấm chuông → Bật thông báo → Gửi thử. Khi đang mở app sẽ thấy banner; chuyển app nền rồi gửi thử từ thiết bị tương ứng để kiểm tra thông báo hệ thống. Kiểm tra riêng Chrome Android và Safari iOS 16.4+ trên thiết bị thật; giả lập desktop không thay thế được kiểm tra iOS.

Nguồn: https://firebase.google.com/docs/cloud-messaging/web/receive-messages, https://firebase.blog/posts/2023/08/fcm-for-safari.
