# Lịch làm việc trên web

- Quản lý / quản trị: menu **Lịch làm việc** → **Mẫu ca** → tạo tên, giờ bắt đầu, giờ kết thúc và số phút nghỉ.
- **Phân ca** → tìm và chọn nhân viên đang hoạt động → chọn mẫu ca → ngày bắt đầu → **Lưu phân ca**.
- Xem theo tuần, chuyển tuần hoặc chọn ngày. Danh sách phân trang ở backend, có nút tải lại.
- **Hủy ca** mở hộp thoại xác nhận; sau khi hủy có thể phân lại.
- Nhân viên: menu **Lịch của tôi**, không có thao tác quản lý.
- Hiển thị giờ Việt Nam UTC+7, gồm ngày kết thúc để phân biệt ca qua đêm. Lịch được xếp theo ngày bắt đầu ca.
- Backend kiểm tra quyền và trùng giờ; lỗi được giữ trong biểu mẫu để sửa/thử lại.
- Mẫu ca dùng chung, hiện chỉ tạo và xem. Lịch lặp, nghỉ phép và đổi ca theo yêu cầu chưa nằm trong chức năng này.

API: GET/POST /shift-templates, GET/POST /work-schedules, DELETE /work-schedules/{id}; dùng http client và JWT hiện có. Backend cần migration V4.

Kiểm tra: `npm test`, `npm run build`. `src/features/schedule/SchedulePage.integration.test.tsx` dùng MSW kiểm tra tạo mẫu, phân/hủy ca, phân trang, đổi tuần, ca đêm, lỗi và hết phiên; không gọi backend thật.
