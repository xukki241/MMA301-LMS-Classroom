import { HttpError } from "./http";

export type ClassOperation = "list" | "detail" | "members" | "create" | "join";

export function classErrorMessage(error: unknown, operation: ClassOperation = "list"): string {
  if (!(error instanceof HttpError)) return "Đã xảy ra lỗi. Vui lòng thử lại.";
  if (error.code === "NETWORK_ERROR") {
    return "Không thể kết nối đến máy chủ. Vui lòng kiểm tra kết nối mạng.";
  }
  if (operation === "join" && (error.code === "ALREADY_JOINED" || error.status === 409)) {
    return "Bạn đã tham gia lớp học này. Hãy làm mới danh sách và mở lớp học.";
  }
  switch (error.status) {
    case 400: return "Dữ liệu không hợp lệ.";
    case 401: return "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.";
    case 403: return "Bạn không có quyền thực hiện thao tác này.";
    case 404: return operation === "join" ? "Mã lớp không hợp lệ." : "Không tìm thấy lớp học.";
    case 409: return "Dữ liệu bị trùng hoặc đã thay đổi. Vui lòng thử lại.";
    case 422:
      return operation === "create" ? "Tên lớp học phải có từ 1 đến 100 ký tự."
        : operation === "join" ? "Mã lớp học phải có đúng 6 ký tự." : "Dữ liệu không hợp lệ.";
    case 429: return "Bạn thao tác quá nhanh. Vui lòng thử lại sau.";
    default:
      return error.status >= 500 ? "Máy chủ đang gặp sự cố. Vui lòng thử lại sau."
        : "Không thể thực hiện thao tác. Vui lòng thử lại.";
  }
}
