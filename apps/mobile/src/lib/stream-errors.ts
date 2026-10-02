import { HttpError } from "./http";

export function streamAccessDenied(error: unknown): boolean {
  return error instanceof HttpError && [401, 403, 404].includes(error.status);
}
export function streamErrorMessage(error: unknown): string {
  if (error instanceof HttpError) {
    if (error.code === "INVALID_RESPONSE") return "Dữ liệu bảng tin chưa hợp lệ. Vui lòng thử lại sau.";
    if (error.code === "TIMEOUT") return "Máy chủ phản hồi quá lâu. Vui lòng thử lại.";
    if (error.status === 0) return "Không thể kết nối máy chủ. Kiểm tra mạng và thử lại.";
    switch (error.status) {
      case 400: return "Yêu cầu không hợp lệ. Vui lòng mở lại lớp học.";
      case 401: return "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.";
      case 403: return "Bạn không có quyền thực hiện thao tác này trong lớp.";
      case 404: return "Lớp học hoặc bài đăng không còn tồn tại.";
      case 409: return "Dữ liệu đã thay đổi. Vui lòng làm mới và thử lại.";
      case 413: return "Nội dung gửi lên quá lớn. Vui lòng rút ngắn nội dung.";
      case 422: return "Nội dung không hợp lệ. Kiểm tra nội dung và giới hạn ký tự.";
      case 429: return "Bạn thao tác quá nhanh. Vui lòng chờ một chút rồi thử lại.";
    }
    if (error.status >= 500) return "Máy chủ đang gặp sự cố. Vui lòng thử lại sau.";
  }
  return "Không thể hoàn tất thao tác. Vui lòng thử lại.";
}
