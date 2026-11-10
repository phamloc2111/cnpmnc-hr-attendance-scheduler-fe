# SYNC-25 — Màn đăng ký ca

Nhân viên vào **Đăng ký ca** từ thanh điều hướng trang chủ hoặc Lịch của tôi (`#/registrations`). Quản lý và quản trị không truy cập màn này.

- Mặc định tải tuần kế tiếp từ backend; chọn ngày bất kỳ để xem tuần chứa ngày đó (từ thứ Hai đến Chủ nhật).
- Chọn mẫu ca trong danh mục phân trang, xem tên, giờ, ca qua đêm, vị trí, thời gian nghỉ và làm việc. Lựa chọn được giữ khi chuyển trang; khung “Ca đã chọn” hiển thị toàn bộ bản chọn.
- Bấm **Lưu đăng ký** để lưu, chỉnh sửa hoặc xóa toàn bộ lựa chọn. Giới hạn 100 mẫu ca mỗi tuần.
- Chỉ được chỉnh sửa trong ngày Chủ nhật trước tuần đăng ký, theo giờ Việt Nam. Ngoài thời gian đó hiển thị bản đăng ký đã lưu và chỉ cho xem. Thứ Hai 00:00 là thời điểm đóng cổng.
- Đồng hồ cửa sổ đăng ký dựa trên `serverNow` cộng thời gian trôi qua, không dùng đồng hồ lịch của thiết bị. Giao diện cập nhật mỗi giây và khi quay lại tab; backend luôn kiểm tra lại khi lưu.
- Nếu 409 do dữ liệu thay đổi hoặc cửa sổ đóng: giữ bản chọn trên màn hình, khóa lưu, yêu cầu bấm **Tải lại** để lấy bản mới. Nút Tải lại/đổi tuần thay thế bản chọn chưa lưu bằng dữ liệu máy chủ.
- Lỗi kết nối có nút thử lại; danh mục trống không phải lỗi. Đăng ký là nguyện vọng, không tự tạo lịch phân ca; liên kết **Lịch của tôi** dẫn đến ca được quản lý phân chính thức.

Mẫu dữ liệu hiện tại đăng ký các mẫu ca cho **cả tuần**, chưa chọn ngày cụ thể. Chức năng quản lý mở lại đăng ký cho từng nhân viên thuộc SYNC-26, chưa nằm trong màn này.

## Kiểm tra

`npm test -- src/features/registration/RegistrationPage.test.tsx` kiểm tra lưu/sửa/xóa, chỉ xem, đóng cổng khi tab chạy nền, giữ bản chọn khi conflict, lựa chọn xuyên trang, đổi tuần, lỗi và danh mục trống, quyền truy cập. `npm run build` kiểm tra TypeScript và bản production.
