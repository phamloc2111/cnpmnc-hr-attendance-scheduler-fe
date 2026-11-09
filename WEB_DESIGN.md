# Giao diện web ShiftSync

Các trang web dùng cùng ngôn ngữ thiết kế với lịch làm việc của nhân viên: Manrope, xanh dương/vàng, nền xám xanh nhạt và thẻ trắng bo góc.

- `src/app/theme.css` chứa token màu và style chung cho đăng nhập, khung quản lý, biểu mẫu, bảng, trạng thái và hộp thoại. File được import sau stylesheet nền trong `main.tsx`.
- `src/app/AppShell.tsx` quản lý điều hướng theo vai trò, trạng thái trang đang mở, thanh tài khoản và menu thu gọn trên màn hình tối đa 900px. Menu hỗ trợ Escape, giữ focus trong menu và trả focus về nút mở khi đóng.
- Trang chủ và lịch nhân viên tiếp tục dùng layout/style riêng hiện có; không bọc thêm header hoặc menu quản lý. Hộp thoại dùng style chung cho toàn bộ ứng dụng.
- Trang quản lý mới nên dùng `workspace`, `page-heading`, `eyebrow`, `account-card`, `table-scroll` và `pagination`. Bảng rộng cuộn bên trong thẻ trên điện thoại, không làm tràn cả trang.
- Dùng `.primary` cho hành động chính và `.danger` cho hành động gây thay đổi cần chú ý. Trạng thái đúng giờ/trễ/vắng giữ màu ngữ nghĩa riêng.
- Không thêm dữ liệu tổng hợp giả để trang trí dashboard. Các thẻ truy cập nhanh chỉ dẫn đến chức năng đang có.

Kiểm tra: `npm test` và `npm run build`. Trước khi publish, kiểm tra đăng nhập, các vai trò, menu mobile, bảng dữ liệu, form dài và các hộp thoại tại 360/768/1440px. Không thay đổi backend hoặc ứng dụng Flutter cho các chỉnh sửa style này.
