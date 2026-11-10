# SYNC-25 — Màn đăng ký ca

Nhân viên vào **Đăng ký ca** từ thanh điều hướng trang chủ hoặc Lịch của tôi (`#/registrations`). Quản lý và quản trị không truy cập màn này.

- Mặc định tải tuần kế tiếp từ backend; chọn ngày bất kỳ để xem tuần chứa ngày đó (từ thứ Hai đến Chủ nhật).
- Chọn mẫu ca trong danh mục phân trang, xem tên, giờ, ca qua đêm, vị trí, thời gian nghỉ và làm việc. Lựa chọn được giữ khi chuyển trang; khung “Ca đã chọn” hiển thị toàn bộ bản chọn.
- Bấm **Lưu đăng ký** để lưu, chỉnh sửa hoặc xóa toàn bộ lựa chọn. Giới hạn 100 mẫu ca mỗi tuần.
- Chỉ được chỉnh sửa trong ngày Chủ nhật trước tuần đăng ký, theo giờ Việt Nam. Ngoài thời gian đó hiển thị bản đăng ký đã lưu và chỉ cho xem. Thứ Hai 00:00 là thời điểm đóng cổng.
- Đồng hồ cửa sổ đăng ký dựa trên `serverNow` cộng thời gian trôi qua, không dùng đồng hồ lịch của thiết bị. Giao diện cập nhật mỗi giây và khi quay lại tab; backend luôn kiểm tra lại khi lưu.
- Nếu 409 do dữ liệu thay đổi hoặc cửa sổ đóng: giữ bản chọn trên màn hình, khóa lưu, yêu cầu bấm **Tải lại** để lấy bản mới. Nút Tải lại/đổi tuần thay thế bản chọn chưa lưu bằng dữ liệu máy chủ.
- Lỗi kết nối có nút thử lại; danh mục trống không phải lỗi. Đăng ký là nguyện vọng, không tự tạo lịch phân ca; liên kết **Lịch của tôi** dẫn đến ca được quản lý phân chính thức.

Mẫu dữ liệu hiện tại đăng ký các mẫu ca cho **cả tuần**, chưa chọn ngày cụ thể. Chức năng quản lý mở lại đăng ký cho từng nhân viên được bổ sung ở SYNC-26 (xem bên dưới).

## Kiểm tra

`npm test -- src/features/registration/RegistrationPage.test.tsx` kiểm tra lưu/sửa/xóa, chỉ xem, đóng cổng khi tab chạy nền, giữ bản chọn khi conflict, lựa chọn xuyên trang, đổi tuần, lỗi và danh mục trống, quyền truy cập. `npm run build` kiểm tra TypeScript và bản production.

## SYNC-26 — Quản lý mở/khóa lại

Quản lý vào **Đăng ký ca** trong menu (`#/registrations-management`). Trang chỉ dành cho MANAGER và chỉ hiển thị nhân viên được phân công cho mình; hỗ trợ tìm tên/email, phân trang, chọn tuần, xem số ca đã đăng ký và trạng thái tự động/mở lại/tài khoản khóa.

Mặc định là tuần hiện tại, để xử lý đăng ký vừa đóng sau Chủ nhật. Chọn tuần sau để theo dõi đăng ký tuần tới. Nút **Mở lại** chỉ xuất hiện sau khi cửa sổ tự động đã đóng. Xác nhận mở cho một nhân viên và một tuần; người đó được sửa đến khi quản lý bấm **Khóa lại**. Không mở cho tài khoản đang khóa. Có thể chọn tuần cũ đã đóng nếu cần bổ sung nguyện vọng.

Mở/khóa có hộp xác nhận ghi tên người và khoảng tuần, không tác động ca đã lưu. Nếu quyền vừa thay đổi ở tab khác, hộp xác nhận giữ lỗi và yêu cầu tải lại dữ liệu; không tự thử lại với revision mới. Quản trị và nhân viên không truy cập được trang quản lý.

Màn nhân viên hiển thị **Quản lý đã mở lại đăng ký**, cho phép lưu ngoài giờ tự động khi API trả reopened=true. Nhân viên chọn đúng tuần mà quản lý đã mở rồi bấm Tải lại. Nếu quản lý khóa trong lúc đang chỉnh sửa, lần lưu tiếp theo báo lỗi và giữ bản chọn; tải lại để xem trạng thái mới.

Không tự tạo lịch phân ca hoặc thay đổi quyền của nhân viên khác. Thời gian vẫn theo máy chủ và UTC+7; không thay đổi giờ máy để thử mở lại.
