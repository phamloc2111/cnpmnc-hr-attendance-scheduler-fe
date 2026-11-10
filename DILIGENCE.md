# SYNC-28 — Trang điểm chuyên cần

Menu Chuyên cần ở #/diligence dành cho quản lý và quản trị. Bảng tháng hiển thị điểm 100 ban đầu, ngưỡng thưởng 80, số ngày vắng/quên chấm, giải trình chờ và cờ chuyển xử lý kỷ luật. Điểm đúng 80 vẫn đạt. Mỗi ngày trừ tối đa 20 điểm.

Chi tiết nhân viên hiển thị từng ngày có ca, thành phần điểm, điểm gốc, điểm sau trần và hạn giải trình quên chấm 48 giờ sau ca cuối. Nút Xác minh mở biểu mẫu ghi nhận sự việc nghỉ làm, quên chấm hoặc về sớm đã duyệt. Quản lý nhập căn cứ trong ghi chú; không nhập số điểm. Biểu mẫu đọc revision và lịch sử xác minh từ backend; nếu có người sửa trước sẽ báo xung đột 409. Sau khi lưu, danh sách và điểm tự tải lại.

Trang tiếp tục tải lại mỗi phút, khi focus hoặc bấm Tải lại. Đổi tháng/nhân viên hủy request cũ. API dùng shared request client với cấu hình backend local/cloud hiện có. Mốc thời gian hiển thị theo Việt Nam. Nhân viên tự xem thuộc SYNC-32.
