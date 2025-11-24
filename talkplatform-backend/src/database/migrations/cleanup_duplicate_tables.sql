-- Script để kiểm tra và xóa bảng trùng (nếu có)
-- CHẠY CẨN THẬN: Backup database trước khi chạy!

-- 1. Kiểm tra các bảng teacher_verification_* và xem có trùng không
SELECT 
    TABLE_NAME,
    TABLE_ROWS,
    CREATE_TIME,
    UPDATE_TIME
FROM information_schema.TABLES
WHERE TABLE_SCHEMA = DATABASE()
AND TABLE_NAME LIKE 'teacher_verification_%'
ORDER BY TABLE_NAME, CREATE_TIME;

-- 2. Kiểm tra xem có bảng nào có tên tương tự không (có thể do migration chạy nhiều lần)
-- Nếu có bảng trùng, bạn sẽ thấy nhiều bảng với cùng tên hoặc tên tương tự

-- 3. Nếu phát hiện bảng trùng, có thể xóa bằng cách:
-- LƯU Ý: Chỉ xóa nếu chắc chắn đó là bảng trùng và không có dữ liệu quan trọng

-- Ví dụ: Nếu có 2 bảng teacher_verification_degree_certificates
-- Bước 1: Kiểm tra dữ liệu trong từng bảng
-- SELECT COUNT(*) FROM `teacher_verification_degree_certificates`;
-- SELECT COUNT(*) FROM `teacher_verification_degree_certificates_old`; -- nếu có

-- Bước 2: Nếu bảng cũ không có dữ liệu hoặc dữ liệu đã được migrate, có thể xóa
-- DROP TABLE IF EXISTS `teacher_verification_degree_certificates_old`;
-- DROP TABLE IF EXISTS `teacher_verification_teaching_certificates_old`;
-- DROP TABLE IF EXISTS `teacher_verification_references_old`;

-- 4. Kiểm tra các cột trong teacher_verifications xem có trùng không
SELECT 
    COLUMN_NAME,
    DATA_TYPE,
    CHARACTER_MAXIMUM_LENGTH,
    IS_NULLABLE,
    COLUMN_DEFAULT
FROM information_schema.COLUMNS
WHERE TABLE_SCHEMA = DATABASE()
AND TABLE_NAME = 'teacher_verifications'
AND COLUMN_NAME IN ('identity_card_front', 'identity_card_back', 'cv_url', 'years_of_experience', 'previous_platforms')
ORDER BY COLUMN_NAME;


