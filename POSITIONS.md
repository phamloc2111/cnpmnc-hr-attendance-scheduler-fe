# Vị trí công việc

Menu **Vị trí** dùng chung toàn hệ thống.

- Quản lý tạo vị trí, ngừng sử dụng và sử dụng lại.
- Quản trị xem danh mục; tạo vị trí cần nhờ quản lý.
- Tạo/sửa nhân viên và tạo mẫu ca chọn vị trí bằng danh sách phân trang, không nhập tên tự do.
- Mẫu ca bắt buộc chọn vị trí; tài khoản nhân viên có thể chưa chọn.
- Vị trí ngừng sử dụng không xuất hiện khi chọn mới. Nhân viên đang có vị trí đó vẫn hiển thị và giữ nguyên được khi sửa thông tin khác.
- Danh mục rỗng, lỗi tải, thử lại và phân trang đều có trạng thái hiển thị.
- Danh sách có tìm kiếm/lọc trạng thái. Đổi trạng thái cần xác nhận.

Backend cần migration V6. Client gửi positionId cho tài khoản và requiredPositionId cho mẫu ca; response vẫn có tên để hiển thị. Phân quyền backend là nguồn quyết định.

Kiểm thử: `npm test`, `npm run build`. Test mới trong `src/features/positions/PositionsPage.integration.test.tsx`, `PositionSelect.integration.test.tsx` và test giữ vị trí cũ trong `src/features/accounts/AccountsPage.integration.test.tsx`. API dùng MSW; chưa thử trên trình duyệt với backend thật trong lần kiểm thử này.
