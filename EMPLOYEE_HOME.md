# SYNC-18 — Màn hình chính nhân viên

Đăng nhập bằng Nhân viên: trang chủ `/#/employee` hiển thị ca hôm nay theo giờ Việt Nam, ngày làm việc, khung giờ, vị trí, thời gian nghỉ và số phút làm. Dữ liệu lấy từ phân ca thủ công hiện có, không cần thuật toán xếp lịch tự động. API lịch backend bổ sung `requiredPosition` (nullable cho ca cũ).

Nút **Điểm danh** cố định cuối màn hình, có chừa khoảng trống và safe area. Khi có nhiều ca, chọn ca trước khi mở bảng chuẩn bị ảnh Timemark. Ca đã kết thúc không được chọn. Nút vẫn hiển thị nhưng bị khóa khi đang tải, lỗi hoặc chưa có ca. Ca đêm từ hôm trước còn diễn ra vẫn được hiển thị. Dữ liệu tải đủ trang từ hôm trước đến hôm nay; tải lại khi quay về tab và đổi ngày theo Asia/Ho_Chi_Minh.

**Phạm vi:** SYNC-18 xây dựng màn hình và điểm vào luồng điểm danh. Gửi ảnh/ghi nhận điểm danh thuộc SYNC-19; hiện bảng chuẩn bị thông báo rõ chưa ghi nhận lượt điểm danh. Không có API ghi điểm danh hoặc dữ liệu ca giả trên môi trường thật.

## Kiểm thử mẫu

Test MSW `EmployeeHome.integration.test.tsx` dùng ca mẫu thứ Hai **09/11/2026, 07:00–11:00, Thu ngân**, cùng ca đêm, nhiều ca, nhiều trang, rỗng, lỗi và đổi ngày. Không seed dữ liệu vào database thật. Để thử thủ công: quản lý tạo vị trí, tạo mẫu ca rồi phân cho nhân viên vào ngày hiện tại; nhân viên đăng nhập và mở trang chủ.

```powershell
npm test
npm run build
```

Kiểm tra responsive ở 360px, 390px, tablet và desktop: không tràn ngang, danh sách cuộn phía trên nút Điểm danh, ô chọn và nút bấm vẫn chạm được.

## Thêm ra màn hình chính

Bản production cung cấp manifest, icon PNG 192/512, theme color, apple-touch-icon và service worker. Triển khai bằng HTTPS (localhost dùng để thử). Android/Chrome dùng nút cài đặt khi trình duyệt phát beforeinstallprompt hoặc menu **Cài đặt ứng dụng / Thêm vào màn hình chính**. iPhone mở bằng Safari → Chia sẻ → **Thêm vào MH chính**. Khi chạy standalone, ẩn hướng dẫn cài đặt nếu trình duyệt báo trạng thái đó.

Service worker chỉ cache trang mất kết nối chung; không cache token, API, lịch nhân viên hoặc HTML đã đăng nhập. Không hỗ trợ điểm danh offline trong ticket này. Cần kiểm tra cài đặt thực tế trên thiết bị Android/iOS với domain HTTPS.

## Kết quả xác minh 07/11/2026

- Web: 75 test đạt; 13 test riêng cho trang chủ, trạng thái dữ liệu, ca đêm, phân trang, đổi ngày, phân quyền và cài đặt. Build TypeScript/Vite thành công.
- Backend: 106 test đạt, không lỗi hoặc bỏ qua; gồm 2 test mới xác nhận vị trí ca và quyền xem lịch riêng của nhân viên. PostgreSQL Testcontainers độc lập.
- Chrome headless với API mẫu: đạt ở 360/390/768/1280px; không tràn ngang, nút cao 52px luôn thấy ở cuối màn hình, không che phần nội dung cuối khi cuộn hết. Mở bảng chuẩn bị điểm danh thành công.
- Chrome không báo lỗi installability của manifest. Giả lập mất mạng cho cả trang và service worker hiển thị đúng trang offline; không cache API đăng nhập/lịch và không có lỗi runtime. Đây là kiểm tra trình duyệt, chưa thay thế kiểm tra cài đặt trên thiết bị thật.
- Repo Flutter không có thay đổi trong chức năng này.
