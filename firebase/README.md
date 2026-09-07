# Firebase — chuẩn bị, chưa bật ở MVP

MVP **không** dùng Firebase Auth hay Firestore làm nguồn sự thật. Identity = JWT Auth Service. Domain = MongoDB.

Thư mục này để sẵn khi nhóm build APK / bật Firestore / Crashlytics / App Distribution.

## Việc bạn (Kiên) phải làm trên Console

Những bước này **không làm hộ được** vì cần tài khoản Google của nhóm:

1. Vào [Firebase Console](https://console.firebase.google.com/) → **Add project** tên gợi ý `mma301-lms-classroom`.
2. Tắt Google Analytics nếu không cần (MVP).
3. **Authentication**: để tắt. Không bật Email/Password — JWT nhà làm.
4. **Firestore**: tạo database ở chế độ **production** (rules deny-all trong repo đã khớp). Chưa viết dữ liệu LMS vào đây.
5. **Project settings → Your apps**:
   - Thêm **Android** package `com.mma301.lmsclassroom` khi bắt đầu EAS/APK.
   - Tải `google-services.json` (không commit; đã nằm trong `.gitignore`).
6. Copy `EXPO_PUBLIC_FIREBASE_*` từ Project settings vào `.env` **chỉ khi** bắt đầu tích hợp client SDK.
7. Không bật Blaze trừ khi thực sự cần Cloud Functions / App Distribution trả phí.

## Việc không cần làm lúc này

- Không cài `@react-native-firebase/*` (cần Expo Dev Client, lệch Expo Go).
- Không trỏ Core API vào Firestore.
- APK **không bắt buộc** Firebase: `eas build -p android --profile preview` là đủ để có file cài.

Khi chốt ngày bật Firestore, mở ADR mới (không sửa ADR-0003 bằng im lặng).
