# Một MongoDB, hai database theo service

Database-per-service đầy đủ (hai container) quá nặng cho nhóm 5 và môi trường lab. Shared database một `lms` sẽ buộc Core API đọc bảng User của Auth. Quyết định: một instance Mongo trong Docker, Auth sở hữu `lms_auth.users`, Core sở hữu `lms_core.*`. Core không join User — chỉ tin JWT `sub` / `role`. Firestore không ghi domain LMS cho đến khi có ADR mới.
