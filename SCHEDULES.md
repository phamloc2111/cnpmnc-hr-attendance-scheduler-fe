# Lịch làm việc trên web

- Quản lý / quản trị: menu **Lịch làm việc** → **Mẫu ca** → tạo tên, giờ bắt đầu/kết thúc, số phút nghỉ, **số người cần** (ít nhất 1), **vị trí cần** từ danh mục dùng chung và lựa chọn **Ca qua đêm** theo [SS-16](https://hcmut-team-f3ubnuof.atlassian.net/browse/SS-16).
- Quản lý tạo danh mục tại **Vị trí** trước; quản trị chỉ chọn từ danh mục. Xem [POSITIONS.md](POSITIONS.md).
- Ca qua đêm: chỉ bật khi giờ kết thúc nhỏ hơn giờ bắt đầu; nếu chưa bật sẽ báo lỗi. Hai giờ bằng nhau không hợp lệ.
- Danh sách mẫu ca và lựa chọn phân ca hiển thị số người, vị trí cần. Ca cũ chưa khai báo vị trí có nhãn rõ ràng.
- **Phân ca** → tìm và chọn nhân viên đang hoạt động → chọn mẫu ca → ngày bắt đầu → **Lưu phân ca**.
- Xem theo tuần, chuyển tuần hoặc chọn ngày. Danh sách phân trang ở backend, có nút tải lại.
- **Hủy ca** mở hộp thoại xác nhận; sau khi hủy có thể phân lại.
- Nhân viên: menu **Lịch của tôi**, không có thao tác quản lý.
- Hiển thị giờ Việt Nam UTC+7, gồm ngày kết thúc để phân biệt ca qua đêm. Lịch được xếp theo ngày bắt đầu ca.
- Backend kiểm tra quyền và trùng giờ; lỗi được giữ trong biểu mẫu để sửa/thử lại.
- Mẫu ca dùng chung, hiện chỉ tạo và xem. Lịch lặp, nghỉ phép và đổi ca theo yêu cầu chưa nằm trong chức năng này.

API: GET/POST /shift-templates, GET/POST /work-schedules, DELETE /work-schedules/{id}; dùng http client và JWT hiện có. Backend cần migration V6. Request tạo mẫu ca có thêm requiredHeadcount, requiredPositionId và overnight; mobile xem lịch dùng contract hiện có.

Kiểm tra: `npm test`, `npm run build`. `src/features/schedule/SchedulePage.integration.test.tsx` dùng MSW kiểm tra tạo mẫu, phân/hủy ca, phân trang, đổi tuần, ca đêm, lỗi và hết phiên; không gọi backend thật.
