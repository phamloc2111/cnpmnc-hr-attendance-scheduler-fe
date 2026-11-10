# SYNC-28 — Trang điểm chuyên cần

Menu Chuyên cần → #/diligence cho MANAGER/ADMIN. Quản lý chỉ thấy nhân viên phụ trách; admin xem tất cả nhân viên. EMPLOYEE không có menu/quyền trang này (phần tự xem thuộc SYNC-32).

Chọn tháng, tìm tên/email, phân trang nhân viên và mở Chi tiết để xem từng lượt chấm vào, thời gian trễ, điểm trừ. Hiển thị rõ điểm tạm tính tháng hiện tại và kết quả tháng đã kết thúc; 90 điểm vẫn đạt. Quy tắc lấy từ API, dùng chung ân hạn 5 phút với phân loại chấm công. Chưa phạt vắng/về sớm/thiếu lượt chấm khi chưa có quy định và luồng giải trình.

Điểm tự tính lại tại backend sau chấm công thành công; trang tải lại mỗi phút, khi focus hoặc bấm Tải lại. Hủy request cũ khi đổi tháng/nhân viên để tránh hiện nhầm dữ liệu. Loading/lỗi/rỗng và retry đều có trạng thái riêng. Không có nút tự sửa điểm hoặc tính số tiền thưởng.

API: GET /diligence?month=YYYY-MM&q=&page=0&size=20; GET /diligence/employees/{id}?month=YYYY-MM&page=0&size=20 qua shared request client, dùng cấu hình local/cloud hiện có. Thời gian hiển thị UTC+7. Không đổi cấu hình Firebase, Goong hoặc repo mobile.
