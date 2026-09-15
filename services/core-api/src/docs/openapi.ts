export const openApiSpec = {
  openapi: "3.1.0",
  info: {
    title: "MMA301 LMS Classroom - Core API (Nguyen Anh Tu)",
    version: "1.0.0",
    description: `## Tai lieu API Phan he Quan ly Lop hoc (Task LMS-05)

Phu trach: Nguyen Anh Tu  
Email: dambautv2005@gmail.com

---

### Huong dan lay Token va Test truc tiep tren Scalar

De test cac API ben duoi, ban can JWT Bearer Token tuong ung voi vai tro (Teacher hoac Student):

1. **Cach lay Token 1-Click (Tien loi nhat):**
   - Vao nhom API **Authentication & Lay Token** ngay ben duoi.
   - Chon endpoint **POST /docs/tokens/teacher** (danh cho Giao vien) hoac **POST /docs/tokens/student** (danh cho Hoc sinh).
   - Nhan nut **Test Request** (hoac **Send**).
   - Copy toan bo chuoi trong truong \`token\` cua ket qua tra ve.

2. **Cach kich hoat Token tren giao dien:**
   - Nhan nut **Authorize** o goc tren giao dien Scalar.
   - Dan token vua copy vao o gia tri cua **BearerAuth**.
   - Nhan **Save** / **Close**.
   - Tu luc nay, moi request gui tu trinh duyet se tu dong kem header \`Authorization: Bearer <token>\`.

3. **Cach dang nhap qua Auth Service thu cong:**
   - Su dung endpoint **POST /auth/login** voi body:
     - Giao vien: \`{"email": "teacher@lms.local", "password": "Demo123!"}\`
     - Sinh vien: \`{"email": "student@lms.local", "password": "Demo123!"}\`

---

### Tong hop cac Quy tac Nghiep vu va Validate

1. **Phan quyen theo Role:**
   - Giao vien (\`role: teacher\`): Duoc tao lop, xem danh sach lop dang day, cap nhat ten lop do minh tao, xoa lop do minh tao.
   - Sinh vien (\`role: student\`): Duoc xem danh sach lop da tham gia, tham gia lop moi bang ma code 6 ky tu.
   - Thanh vien trong lop (\`roleInClass: teacher | student\`): Duoc xem thong tin chi tiet lop va danh sach thanh vien cua lop do.

2. **Quy tac Validate Input:**
   - \`name\` (Ten lop): Kieu chuoi, do dai tu 1 den 100 ky tu, khong duoc de trong hoac chi chua khoang trang. Tra ve loi 422 neu khong hop le.
   - \`code\` (Ma lop): Chuoi dung 6 ky tu gom chu in hoa va so (A-Z, 0-9). Tra ve loi 422 neu khac 6 ky tu.
   - \`id\` (ID lop): Dinh dang MongoDB ObjectId hop le (chuoi 24 ky tu hex). Tra ve loi 400 neu sai dinh dang.

3. **Dac thu Nghiep vu quan trong:**
   - **Sinh ma ngau nhien duy nhat:** Khi tao lop, he thong tu sinh ma 6 ky tu khong trung lap. Neu trung se tu thu lai toi da 5 lan.
   - **Tu dong ghi nhan chu lop:** Khi giao vien tao lop, he thong tu dong them giao vien do vao bang \`ClassMember\` voi vai tro \`roleInClass: teacher\`.
   - **Kiem tra trung lap khi Join:** Sinh vien da tham gia lop roi thi khong the join lai lan nua (tra ve loi 403 ALREADY_JOINED).
   - **Kiem tra Quyen so huu (Ownership):** Chi giao vien da tao ra lop hoc (\`cls.teacherId === user.id\`) moi co quyen sua ten hoac xoa lop. Giao vien khac khong co quyen (tra ve loi 403 FORBIDDEN).
   - **Xoa theo day chuyen (Cascade Delete):** Khi xoa lop hoc, he thong tu dong xoa toan bo cac ban ghi thanh vien lien quan trong \`ClassMember\` de tranh rac du lieu.`,
  },
  servers: [
    {
      url: "http://localhost:4002",
      description: "Core API Server (Local)",
    },
  ],
  tags: [
    {
      name: "Authentication & Lay Token",
      description: "Cac endpoint ho tro lay JWT Token nhanh de kiem thu",
    },
    {
      name: "Quan ly Lop hoc (LMS-05)",
      description: "Cac API nghiep vu quan ly lop hoc do Nguyen Anh Tu xay dung",
    },
    {
      name: "He thong & Thong tin ca nhan",
      description: "Kiem tra suc khoe Core API va thong tin nguoi dung tu JWT",
    },
  ],
  paths: {
    "/docs/tokens/teacher": {
      post: {
        tags: ["Authentication & Lay Token"],
        summary: "Lay Token Giao vien 1-Click (Demo Teacher)",
        description: `Endpoint tien ich phuc vu viec test API.
Tra ve JWT Token cua tai khoan Giao vien (\`teacher@lms.local\`).
Neu Auth Service (:4001) dang bat, he thong se lay token chuan tu Auth Service. Neu chua bat, he thong se tu ky token hop le bang JWT_SECRET.

Cach dung: Nhan **Test Request**, sau do copy gia tri \`token\` va dan vao nut **Authorize** tren giao dien Scalar.`,
        responses: {
          "200": {
            description: "Lay token thanh cong",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    role: { type: "string", example: "teacher" },
                    email: { type: "string", example: "teacher@lms.local" },
                    token: { type: "string", example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." },
                    huongDanSuDung: { type: "string" },
                  },
                },
              },
            },
          },
        },
      },
    },
    "/docs/tokens/student": {
      post: {
        tags: ["Authentication & Lay Token"],
        summary: "Lay Token Sinh vien 1-Click (Demo Student)",
        description: `Endpoint tien ich phuc vu viec test API.
Tra ve JWT Token cua tai khoan Sinh vien (\`student@lms.local\`).

Cach dung: Nhan **Test Request**, sau do copy gia tri \`token\` va dan vao nut **Authorize** tren giao dien Scalar de kiem thu cac tinh nang Sinh vien (tham gia lop, xem lop da tham gia).`,
        responses: {
          "200": {
            description: "Lay token thanh cong",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    role: { type: "string", example: "student" },
                    email: { type: "string", example: "student@lms.local" },
                    token: { type: "string", example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." },
                    huongDanSuDung: { type: "string" },
                  },
                },
              },
            },
          },
        },
      },
    },
    "/auth/login": {
      post: {
        tags: ["Authentication & Lay Token"],
        summary: "Dang nhap tai khoan qua Auth Service",
        description: `Goi truc tiep den Auth Service de xac thuc email va password.
Tra ve JWT token va thong tin tai khoan.

Tai khoan seed mac dinh:
- Giao vien: \`teacher@lms.local\` / \`Demo123!\`
- Sinh vien: \`student@lms.local\` / \`Demo123!\``,
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["email", "password"],
                properties: {
                  email: { type: "string", format: "email", example: "teacher@lms.local" },
                  password: { type: "string", example: "Demo123!" },
                },
              },
            },
          },
        },
        responses: {
          "200": {
            description: "Dang nhap thanh cong",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    token: { type: "string", example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." },
                    user: {
                      type: "object",
                      properties: {
                        id: { type: "string", example: "66e6b4f73a1b5c0012a40001" },
                        email: { type: "string", example: "teacher@lms.local" },
                        displayName: { type: "string", example: "Demo Teacher" },
                        role: { type: "string", enum: ["teacher", "student"], example: "teacher" },
                      },
                    },
                  },
                },
              },
            },
          },
          "401": {
            description: "Sai email hoac mat khau",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" },
              },
            },
          },
        },
      },
    },
    "/classes": {
      post: {
        tags: ["Quan ly Lop hoc (LMS-05)"],
        summary: "1. Tao lop hoc moi (Chi Giao vien)",
        description: `Tao mot lop hoc moi trong he thong.

**Yeu cau Quyen:**
- Bắt buộc token co \`role: teacher\`. Neu la \`student\` se bi chan voi ma loi **403 FORBIDDEN**.

**Quy tac Validate Body:**
- \`name\`: Bat buoc, kieu chuoi tu 1 den 100 ky tu. Neu de trong hoac vuot qua 100 ky tu se tra ve **422 VALIDATION_ERROR**.

**Dac thu Nghiep vu:**
- He thong tu dong sinh mot ma moi gom 6 ky tu in hoa (chu va so) duy nhat.
- Tu dong tao ban ghi \`ClassMember\` cho chinh giao vien tao lop voi \`roleInClass: "teacher"\`.
- Luu \`teacherId\` cua giao vien vao lop de kiem tra quyen so huu (Ownership) khi sua/xoa.`,
        security: [{ BearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["name"],
                properties: {
                  name: {
                    type: "string",
                    minLength: 1,
                    maxLength: 100,
                    example: "Lap trinh Di dong MMA301",
                    description: "Ten lop hoc (1 - 100 ky tu)",
                  },
                },
              },
            },
          },
        },
        responses: {
          "201": {
            description: "Tao lop hoc thanh cong",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    message: { type: "string", example: "Tao lop hoc thanh cong" },
                    class: { $ref: "#/components/schemas/Class" },
                  },
                },
              },
            },
          },
          "401": { $ref: "#/components/responses/Unauthorized" },
          "403": { $ref: "#/components/responses/ForbiddenTeacherOnly" },
          "422": { $ref: "#/components/responses/ValidationError" },
        },
      },
    },
    "/classes/teaching": {
      get: {
        tags: ["Quan ly Lop hoc (LMS-05)"],
        summary: "2. Danh sach lop dang day (Chi Giao vien)",
        description: `Lay toan bo danh sach lop hoc do chinh giao vien dang dang nhap tao ra.

**Yeu cau Quyen:**
- Bat buoc token co \`role: teacher\`. Neu la \`student\` se tra ve **403 FORBIDDEN**.

**Dac thu Nghiep vu:**
- Loc trong co so du lieu theo dieu kien \`teacherId === user.id\`.
- Ket qua duoc sap xep theo thoi gian tao moi nhat len dau.`,
        security: [{ BearerAuth: [] }],
        responses: {
          "200": {
            description: "Danh sach lop dang day",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    classes: {
                      type: "array",
                      items: { $ref: "#/components/schemas/Class" },
                    },
                  },
                },
              },
            },
          },
          "401": { $ref: "#/components/responses/Unauthorized" },
          "403": { $ref: "#/components/responses/ForbiddenTeacherOnly" },
        },
      },
    },
    "/classes/enrolled": {
      get: {
        tags: ["Quan ly Lop hoc (LMS-05)"],
        summary: "3. Danh sach lop da tham gia (Chi Sinh vien)",
        description: `Lay toan bo danh sach cac lop hoc ma sinh vien dang dang nhap da tham gia.

**Yeu cau Quyen:**
- Bat buoc token co \`role: student\`. Neu la \`teacher\` se tra ve **403 FORBIDDEN**.

**Dac thu Nghiep vu:**
- Tra cuu trong bang \`ClassMember\` voi \`userId === user.id\` va \`roleInClass: "student"\`.
- Sau do lay day du thong tin chi tiet cua tung lop hoc tuong ung.`,
        security: [{ BearerAuth: [] }],
        responses: {
          "200": {
            description: "Danh sach lop hoc da tham gia",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    classes: {
                      type: "array",
                      items: { $ref: "#/components/schemas/Class" },
                    },
                  },
                },
              },
            },
          },
          "401": { $ref: "#/components/responses/Unauthorized" },
          "403": { $ref: "#/components/responses/ForbiddenStudentOnly" },
        },
      },
    },
    "/classes/join": {
      post: {
        tags: ["Quan ly Lop hoc (LMS-05)"],
        summary: "4. Tham gia lop bang ma moi (Chi Sinh vien)",
        description: `Sinh vien nhap ma code 6 ky tu de tham gia vao lop hoc.

**Yeu cau Quyen:**
- Bat buoc token co \`role: student\`. Neu la \`teacher\` se tra ve **403 FORBIDDEN**.

**Quy tac Validate Body:**
- \`code\`: Bat buoc, kieu chuoi dung 6 ky tu. He thong tu dong chuyen thanh chu in hoa (uppercase). Sai dinh dang tra ve **422 VALIDATION_ERROR**.

**Dac thu Nghiep vu:**
- Kiem tra ma lop co ton tai hay khong. Neu khong ton tai tra ve **404 CLASS_NOT_FOUND**.
- Kiem tra xem sinh vien da la thanh vien cua lop nay chua. Neu da tham gia roi se tra ve **403 ALREADY_JOINED**.
- Khi hop le, he thong them ban ghi vao \`ClassMember\` voi \`roleInClass: "student"\`.`,
        security: [{ BearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["code"],
                properties: {
                  code: {
                    type: "string",
                    minLength: 6,
                    maxLength: 6,
                    example: "A8K92Z",
                    description: "Ma moi 6 ky tu in hoa (vi du: A8K92Z)",
                  },
                },
              },
            },
          },
        },
        responses: {
          "200": {
            description: "Tham gia lop hoc thanh cong",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    message: { type: "string", example: "Tham gia lop hoc thanh cong" },
                    class: { $ref: "#/components/schemas/Class" },
                    membership: { $ref: "#/components/schemas/ClassMember" },
                  },
                },
              },
            },
          },
          "401": { $ref: "#/components/responses/Unauthorized" },
          "403": {
            description: "Da la thanh vien cua lop hoac nguoi goi khong phai la Sinh vien",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" },
              },
            },
          },
          "404": {
            description: "Khong tim thay lop hoc voi ma code da nhap",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" },
              },
            },
          },
          "422": { $ref: "#/components/responses/ValidationError" },
        },
      },
    },
    "/classes/{id}": {
      get: {
        tags: ["Quan ly Lop hoc (LMS-05)"],
        summary: "5. Xem chi tiet lop hoc (Thanh vien trong lop)",
        description: `Xem thong tin chi tiet cua mot lop hoc.

**Yeu cau Quyen:**
- Nguoi goi (Teacher hoac Student) bat buoc phai la thanh vien da tham gia lop hoc nay.
- Neu nguoi dung chua tham gia lop se tra ve ma loi **403 FORBIDDEN** (\`Ban khong phai la thanh vien cua lop hoc nay\`).

**Quy tac Validate Param:**
- \`id\`: Bat buoc la MongoDB ObjectId hop le (chuoi 24 ky tu hex). Neu truyen chuoi bat ky khong hop le se tra ve **400 INVALID_ID**.

**Dac thu Nghiep vu:**
- Kiem tra su ton tai cua lop trong database (neu bi xoa tra ve **404 CLASS_NOT_FOUND**).
- Phan hoi tra ve bao gom thong tin lop va truong \`roleInClass\` ('teacher' hoac 'student') de phia Frontend biet nguoi dung dang la giao vien hay hoc sinh trong lop do.`,
        security: [{ BearerAuth: [] }],
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            description: "MongoDB ObjectId cua lop hoc (24 ky tu hex)",
            schema: { type: "string", example: "66e6b4f73a1b5c0012a45678" },
          },
        ],
        responses: {
          "200": {
            description: "Thong tin chi tiet lop hoc",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    class: { $ref: "#/components/schemas/Class" },
                    roleInClass: { type: "string", enum: ["teacher", "student"], example: "teacher" },
                  },
                },
              },
            },
          },
          "400": { $ref: "#/components/responses/InvalidId" },
          "401": { $ref: "#/components/responses/Unauthorized" },
          "403": { $ref: "#/components/responses/ForbiddenNotMember" },
          "404": { $ref: "#/components/responses/NotFound" },
        },
      },
      patch: {
        tags: ["Quan ly Lop hoc (LMS-05)"],
        summary: "7. Cap nhat ten lop (Chi Giao vien tao lop)",
        description: `Thay doi ten cua mot lop hoc.

**Yeu cau Quyen & Kiem tra So huu (Ownership Check):**
- Nguoi goi bat buoc phai la Giao vien (\`role: teacher\`).
- **QUAN TRONG:** Giao vien do phai la nguoi truc tiep tao ra lop hoc nay (\`cls.teacherId === user.id\`). Giao vien khac trong he thong khong duoc phep sua lop cua nguoi khac (tra ve **403 FORBIDDEN**).

**Quy tac Validate:**
- \`id\`: MongoDB ObjectId hop le. Neu sai tra ve **400 INVALID_ID**.
- \`name\` (Body): Chuoi tu 1 den 100 ky tu. Neu de trong tra ve **422 VALIDATION_ERROR**.`,
        security: [{ BearerAuth: [] }],
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            description: "MongoDB ObjectId cua lop hoc",
            schema: { type: "string", example: "66e6b4f73a1b5c0012a45678" },
          },
        ],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["name"],
                properties: {
                  name: {
                    type: "string",
                    minLength: 1,
                    maxLength: 100,
                    example: "Lap trinh Di dong MMA301 - Hoc ky 2",
                    description: "Ten moi cua lop hoc",
                  },
                },
              },
            },
          },
        },
        responses: {
          "200": {
            description: "Cap nhat thanh cong",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    message: { type: "string", example: "Cap nhat lop hoc thanh cong" },
                    class: { $ref: "#/components/schemas/Class" },
                  },
                },
              },
            },
          },
          "400": { $ref: "#/components/responses/InvalidId" },
          "401": { $ref: "#/components/responses/Unauthorized" },
          "403": { $ref: "#/components/responses/ForbiddenOwnerOnly" },
          "404": { $ref: "#/components/responses/NotFound" },
          "422": { $ref: "#/components/responses/ValidationError" },
        },
      },
      delete: {
        tags: ["Quan ly Lop hoc (LMS-05)"],
        summary: "8. Xoa lop hoc (Chi Giao vien tao lop)",
        description: `Xoa hoan toan mot lop hoc khoi he thong.

**Yeu cau Quyen & Kiem tra So huu (Ownership Check):**
- Bat buoc la Giao vien tao lop (\`teacherId === user.id\`).
- Neu giao vien khac hoac sinh vien goi se bi tu choi voi ma loi **403 FORBIDDEN**.

**Quy tac Validate Param:**
- \`id\`: MongoDB ObjectId hop le. Sai dinh dang tra ve **400 INVALID_ID**.

**Dac thu Nghiep vu (Cascade Delete):**
- He thong se xoa ban ghi trong bang \`Class\`.
- Dong thoi tu dong xoa toan bo cac ban ghi thanh vien lien quan trong bang \`ClassMember\` (Cascade Delete) de khong de lai du lieu rac.`,
        security: [{ BearerAuth: [] }],
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            description: "MongoDB ObjectId cua lop hoc",
            schema: { type: "string", example: "66e6b4f73a1b5c0012a45678" },
          },
        ],
        responses: {
          "200": {
            description: "Xoa lop hoc thanh cong",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    message: { type: "string", example: "Xoa lop hoc thanh cong" },
                  },
                },
              },
            },
          },
          "400": { $ref: "#/components/responses/InvalidId" },
          "401": { $ref: "#/components/responses/Unauthorized" },
          "403": { $ref: "#/components/responses/ForbiddenOwnerOnly" },
          "404": { $ref: "#/components/responses/NotFound" },
        },
      },
    },
    "/classes/{id}/members": {
      get: {
        tags: ["Quan ly Lop hoc (LMS-05)"],
        summary: "6. Danh sach thanh vien trong lop (Thanh vien trong lop)",
        description: `Lay toan bo danh sach thanh vien (bao gom ca Giao vien va Sinh vien) cua lop hoc do.

**Yeu cau Quyen:**
- Nguoi goi bat buoc phai la thanh vien thuoc lop hoc do (\`ClassMember\`). Neu chua tham gia se tra ve **403 FORBIDDEN**.

**Quy tac Validate Param:**
- \`id\`: MongoDB ObjectId hop le (24 ky tu hex). Sai dinh dang tra ve **400 INVALID_ID**.

**Dac thu Nghiep vu:**
- Danh sach thanh vien duoc sap xep theo thoi gian tham gia tu truoc den sau (\`createdAt: 1\`).`,
        security: [{ BearerAuth: [] }],
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            description: "MongoDB ObjectId cua lop hoc",
            schema: { type: "string", example: "66e6b4f73a1b5c0012a45678" },
          },
        ],
        responses: {
          "200": {
            description: "Danh sach thanh vien trong lop",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    members: {
                      type: "array",
                      items: { $ref: "#/components/schemas/ClassMember" },
                    },
                  },
                },
              },
            },
          },
          "400": { $ref: "#/components/responses/InvalidId" },
          "401": { $ref: "#/components/responses/Unauthorized" },
          "403": { $ref: "#/components/responses/ForbiddenNotMember" },
          "404": { $ref: "#/components/responses/NotFound" },
        },
      },
    },
    "/health": {
      get: {
        tags: ["He thong & Thong tin ca nhan"],
        summary: "Kiem tra trang thai song Core API",
        description: "Kiem tra trang thai hoat dong cua Core API va ket noi co so du lieu MongoDB.",
        responses: {
          "200": {
            description: "He thong hoat dong binh thuong",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    status: { type: "string", example: "ok" },
                    service: { type: "string", example: "core-api" },
                    mongo: { type: "string", example: "connected" },
                  },
                },
              },
            },
          },
        },
      },
    },
    "/me": {
      get: {
        tags: ["He thong & Thong tin ca nhan"],
        summary: "Xem thong tin nguoi dung tu Token",
        description: "Giai ma token hien tai va tra ve thong tin sub (User ID), email, role.",
        security: [{ BearerAuth: [] }],
        responses: {
          "200": {
            description: "Thong tin payload nguoi dung",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    user: {
                      type: "object",
                      properties: {
                        id: { type: "string", example: "66e6b4f73a1b5c0012a40001" },
                        email: { type: "string", example: "teacher@lms.local" },
                        role: { type: "string", enum: ["teacher", "student"], example: "teacher" },
                      },
                    },
                  },
                },
              },
            },
          },
          "401": { $ref: "#/components/responses/Unauthorized" },
        },
      },
    },
  },
  components: {
    securitySchemes: {
      BearerAuth: {
        type: "http",
        scheme: "bearer",
        bearerFormat: "JWT",
        description: "Dan JWT Token vao day. Ban co the lay token bang cach goi endpoint POST /docs/tokens/teacher hoac POST /docs/tokens/student.",
      },
    },
    schemas: {
      Class: {
        type: "object",
        properties: {
          _id: { type: "string", example: "66e6b4f73a1b5c0012a45678", description: "MongoDB ObjectId" },
          name: { type: "string", example: "Lap trinh Di dong MMA301", description: "Ten lop hoc" },
          code: { type: "string", example: "A8K92Z", description: "Ma moi 6 ky tu in hoa duy nhat" },
          teacherId: { type: "string", example: "66e6b4f73a1b5c0012a40001", description: "ID giao vien so huu" },
          createdAt: { type: "string", format: "date-time" },
          updatedAt: { type: "string", format: "date-time" },
        },
      },
      ClassMember: {
        type: "object",
        properties: {
          _id: { type: "string", example: "66e6b4f73a1b5c0012a49999" },
          classId: { type: "string", example: "66e6b4f73a1b5c0012a45678" },
          userId: { type: "string", example: "66e6b4f73a1b5c0012a40002" },
          roleInClass: { type: "string", enum: ["teacher", "student"], example: "student" },
          createdAt: { type: "string", format: "date-time" },
          updatedAt: { type: "string", format: "date-time" },
        },
      },
      ErrorResponse: {
        type: "object",
        properties: {
          error: {
            type: "object",
            properties: {
              code: { type: "string", example: "FORBIDDEN" },
              message: { type: "string", example: "Chi giao vien moi co the tao lop hoc" },
            },
          },
        },
      },
    },
    responses: {
      Unauthorized: {
        description: "401 UNAUTHENTICATED / INVALID_TOKEN: Chua truyen token hoac token khong hop le / het han",
        content: {
          "application/json": {
            schema: { $ref: "#/components/schemas/ErrorResponse" },
          },
        },
      },
      ForbiddenTeacherOnly: {
        description: "403 FORBIDDEN: Chi giao vien moi co quyen thuc hien thao tac nay",
        content: {
          "application/json": {
            schema: { $ref: "#/components/schemas/ErrorResponse" },
          },
        },
      },
      ForbiddenStudentOnly: {
        description: "403 FORBIDDEN: Chi hoc sinh moi co quyen thuc hien thao tac nay",
        content: {
          "application/json": {
            schema: { $ref: "#/components/schemas/ErrorResponse" },
          },
        },
      },
      ForbiddenOwnerOnly: {
        description: "403 FORBIDDEN: Chi giao vien tao ra lop hoc nay moi co quyen cap nhat hoac xoa",
        content: {
          "application/json": {
            schema: { $ref: "#/components/schemas/ErrorResponse" },
          },
        },
      },
      ForbiddenNotMember: {
        description: "403 FORBIDDEN: Ban khong phai la thanh vien cua lop hoc nay",
        content: {
          "application/json": {
            schema: { $ref: "#/components/schemas/ErrorResponse" },
          },
        },
      },
      NotFound: {
        description: "404 NOT_FOUND: Khong tim thay ban ghi tuong ung trong co so du lieu",
        content: {
          "application/json": {
            schema: { $ref: "#/components/schemas/ErrorResponse" },
          },
        },
      },
      InvalidId: {
        description: "400 INVALID_ID: Dinh dang ID khong phai la MongoDB ObjectId hop le (24 ky tu hex)",
        content: {
          "application/json": {
            schema: { $ref: "#/components/schemas/ErrorResponse" },
          },
        },
      },
      ValidationError: {
        description: "422 VALIDATION_ERROR: Du lieu truyen vao body khong thoa man dieu kien kiem tra Zod",
        content: {
          "application/json": {
            schema: { $ref: "#/components/schemas/ErrorResponse" },
          },
        },
      },
    },
  },
};
