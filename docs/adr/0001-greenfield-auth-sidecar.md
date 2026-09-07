# Greenfield scaffold với Auth Service tách riêng

Plan LMS microservices cũ (auth + core + worker + notification + gRPC/Redis/Socket/LocalStack) vượt yêu cầu môn và không phù hợp nhóm 5 người. Quyết định xây lại từ đầu: một app Expo React Native, một Core API (Express) cho nghiệp vụ lớp học, và đúng một Auth Service tách riêng (REST) do một thành viên sở hữu — không thêm service khác ở MVP.
