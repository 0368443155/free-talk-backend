-- Script để kiểm tra và xóa bảng trùng (nếu có)
-- Chạy script này trong MySQL để kiểm tra

-- 1. Kiểm tra các bảng teacher_verification_*
SELECT 
    TABLE_NAME,
    TABLE_ROWS,
    CREATE_TIME
FROM information_schema.TABLES
WHERE TABLE_SCHEMA = DATABASE()
AND TABLE_NAME LIKE 'teacher_verification_%'
ORDER BY TABLE_NAME, CREATE_TIME;

-- 2. Nếu có bảng trùng, xóa các bảng cũ (giữ lại bảng mới nhất)
-- LƯU Ý: Chỉ chạy phần này nếu chắc chắn có bảng trùng và muốn xóa

-- Xóa bảng trùng (nếu có)
-- DROP TABLE IF EXISTS `teacher_verification_degree_certificates_old`;
-- DROP TABLE IF EXISTS `teacher_verification_teaching_certificates_old`;
-- DROP TABLE IF EXISTS `teacher_verification_references_old`;

