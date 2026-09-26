/**
 * sync-notion-m5.js
 * 
 * Standalone synchronization script for Milestone M5:
 * 1. Synchronizes Database d5cd5fdf-8665-437a-ab2b-c162491a1d7b (Theo dõi công việc — LMS MVP)
 *    Updates GitHub Evidence, Evidence State, Status, and Blocker resolution for LMS-00 to LMS-14.
 * 2. Appends Section 7 (Git & PR Conventions) to page 3db1a326-7e3e-8158-b63c-c296c3b846bf (Quy ước quản lý sản phẩm).
 */

const https = require('https');

const NOTION_API_KEY = process.env.NOTION_API_KEY || "ntn_D70321761902TVyHsCHZYtD424jSb6PwjIxZDiCe69g2lL";
const NOTION_VERSION = "2022-06-28";

const TASKS = [
  {
    id: "LMS-00",
    pageId: "3d81a326-7e3e-8074-9267-e6d3a64e287c",
    name: "Chuẩn hóa skill AI và quy ước làm việc nhóm",
    evidence: "https://github.com/xukki241/MMA301-LMS-Classroom/commit/8518d6b7790d13944a2b4fe356a02d6c700fe626",
    evidenceState: "Runtime verified",
    status: "Done"
  },
  {
    id: "LMS-01",
    pageId: "3d41a326-7e3e-811c-a3fd-d1f1dfb973da",
    name: "Khởi tạo Expo mobile shell",
    evidence: "https://github.com/xukki241/MMA301-LMS-Classroom/commit/f820d74c659ae4fd064258696a08cdff2cad3014",
    evidenceState: "Code verified",
    status: "Done"
  },
  {
    id: "LMS-02",
    pageId: "3d41a326-7e3e-812a-98d7-d59381330fa4",
    name: "Auth Service register/login JWT",
    evidence: "https://github.com/xukki241/MMA301-LMS-Classroom/commit/16890bcfaceacb92d1a8e5222f7551fbb1602803",
    evidenceState: "Runtime verified",
    status: "Done"
  },
  {
    id: "LMS-03",
    pageId: "3d41a326-7e3e-810c-9415-cf9ace3b0dd3",
    name: "Middleware JWT cho Core API",
    evidence: "https://github.com/xukki241/MMA301-LMS-Classroom/commit/16890bcfaceacb92d1a8e5222f7551fbb1602803",
    evidenceState: "Runtime verified",
    status: "Done"
  },
  {
    id: "LMS-04",
    pageId: "3d41a326-7e3e-81a5-835e-cfe25cb2d009",
    name: "Checklist hướng dẫn task cho Huy",
    evidence: "https://github.com/xukki241/MMA301-LMS-Classroom/commit/16890bcfaceacb92d1a8e5222f7551fbb1602803",
    evidenceState: "PR verified",
    status: "Done"
  },
  {
    id: "LMS-05",
    pageId: "3d41a326-7e3e-814e-83f8-fa27c2590be8",
    name: "Core API tạo, tham gia và danh sách lớp",
    evidence: "https://github.com/xukki241/MMA301-LMS-Classroom/pull/1",
    evidenceState: "Runtime verified",
    status: "Done",
    blocker: "Resolved: MongoDB native listening on port 27017, verified with test scripts"
  },
  {
    id: "LMS-06",
    pageId: "3d41a326-7e3e-81ff-954b-d8401461d73e",
    name: "Core API bảng tin Post và Comment",
    evidence: "https://github.com/xukki241/MMA301-LMS-Classroom/pull/3",
    evidenceState: "Runtime verified",
    status: "Done"
  },
  {
    id: "LMS-08",
    pageId: "3d41a326-7e3e-81da-9027-f9273d827c84",
    name: "Core API Exercise",
    evidence: "https://github.com/xukki241/MMA301-LMS-Classroom/pull/7",
    evidenceState: "PR verified",
    status: "Done"
  },
  {
    id: "LMS-09",
    pageId: "3d41a326-7e3e-81c1-b057-e9d831112074",
    name: "Core API Submission & Grade",
    evidence: "https://github.com/xukki241/MMA301-LMS-Classroom/pull/8",
    evidenceState: "PR verified",
    status: "Done"
  },
  {
    id: "LMS-11",
    pageId: "3d41a326-7e3e-81f4-8b58-e31604e882b9",
    name: "Mobile class list / join / detail",
    evidence: "https://github.com/xukki241/MMA301-LMS-Classroom/pull/5",
    evidenceState: "PR verified",
    status: "Done"
  },
  {
    id: "LMS-12",
    pageId: "3d41a326-7e3e-8180-b98f-f21175cc2806",
    name: "Mobile stream Post + Comment",
    evidence: "https://github.com/xukki241/MMA301-LMS-Classroom/pull/5",
    evidenceState: "PR verified",
    status: "Done"
  },
  {
    id: "LMS-13",
    pageId: "3d41a326-7e3e-819a-9a65-c168b65e5947",
    name: "Mobile Login/Register (checklist)",
    evidence: "https://github.com/xukki241/MMA301-LMS-Classroom/pull/9",
    evidenceState: "PR verified",
    status: "Done"
  },
  {
    id: "LMS-14",
    pageId: "3d41a326-7e3e-8149-b766-c5767d13e25c",
    name: "Material API + mobile list/add",
    evidence: "https://github.com/xukki241/MMA301-LMS-Classroom/pull/10",
    evidenceState: "PR verified",
    status: "Done"
  }
];

const GUIDELINES_PAGE_ID = "3db1a326-7e3e-8158-b63c-c296c3b846bf";

function notionRequest(path, method, data) {
  return new Promise((resolve, reject) => {
    const payload = data ? JSON.stringify(data) : null;
    const req = https.request({
      hostname: "api.notion.com",
      path: path,
      method: method,
      headers: {
        "Authorization": `Bearer ${NOTION_API_KEY}`,
        "Notion-Version": NOTION_VERSION,
        "Content-Type": "application/json",
        ...(payload ? { "Content-Length": Buffer.byteLength(payload) } : {})
      }
    }, (res) => {
      let body = "";
      res.on("data", chunk => body += chunk);
      res.on("end", () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve(JSON.parse(body || "{}"));
        } else {
          reject(new Error(`Notion API error HTTP ${res.statusCode}: ${body}`));
        }
      });
    });

    req.on("error", reject);
    if (payload) req.write(payload);
    req.end();
  });
}

async function updateTaskPage(task) {
  const properties = {
    "GitHub Evidence": {
      url: task.evidence
    },
    "Evidence State": {
      select: { name: task.evidenceState }
    },
    "Status": {
      select: { name: task.status }
    }
  };

  if (task.blocker !== undefined) {
    properties["Blocker"] = {
      rich_text: [
        {
          type: "text",
          text: { content: task.blocker }
        }
      ]
    };
  }

  return notionRequest(`/v1/pages/${task.pageId}`, "PATCH", { properties });
}

async function appendSection7() {
  const blocks = [
    {
      object: "block",
      type: "heading_2",
      heading_2: {
        rich_text: [{ type: "text", text: { content: "7. Quy ước Git Branching, Pull Request & Quản lý Mã nguồn" } }]
      }
    },
    {
      object: "block",
      type: "paragraph",
      paragraph: {
        rich_text: [{ type: "text", text: { content: "Áp dụng bắt buộc cho toàn bộ lập trình viên trong dự án MMA301 LMS Classroom." } }]
      }
    },
    {
      object: "block",
      type: "heading_3",
      heading_3: {
        rich_text: [{ type: "text", text: { content: "7.1. Nguyên tắc phân nhánh (GitFlow & Base Branch)" } }]
      }
    },
    {
      object: "block",
      type: "bulleted_list_item",
      bulleted_list_item: {
        rich_text: [
          { type: "text", text: { content: "Branch develop là nhánh tích hợp trung tâm: " }, annotations: { bold: true } },
          { type: "text", text: { content: "Mọi Pull Request tính năng (LMS-XX) bắt buộc target vào develop. Tuyệt đối không mở PR trực tiếp vào main." } }
        ]
      }
    },
    {
      object: "block",
      type: "bulleted_list_item",
      bulleted_list_item: {
        rich_text: [
          { type: "text", text: { content: "Branch main là nhánh phát hành (Release): " }, annotations: { bold: true } },
          { type: "text", text: { content: "Chỉ nhận merge từ develop sau khi đã nghiệm thu toàn bộ tính năng MVP. Gắn tag phiên bản (ví dụ: v1.0-mvp)." } }
        ]
      }
    },
    {
      object: "block",
      type: "heading_3",
      heading_3: {
        rich_text: [{ type: "text", text: { content: "7.2. Quy ước đặt tên nhánh (Branch Naming)" } }]
      }
    },
    {
      object: "block",
      type: "bulleted_list_item",
      bulleted_list_item: {
        rich_text: [
          { type: "text", text: { content: "Cú pháp chuẩn: " } },
          { type: "text", text: { content: "LMS-XX-·-short-description" }, annotations: { code: true } },
          { type: "text", text: { content: " (Ví dụ: LMS-11-·-Mobile-class-list-/-join-/-detail, LMS-12-·-Mobile-stream-Post-+-Comment, LMS-13-·-Mobile-Login-Register, LMS-14-·-Material-API-mobile)." } }
        ]
      }
    },
    {
      object: "block",
      type: "heading_3",
      heading_3: {
        rich_text: [{ type: "text", text: { content: "7.3. Quy ước tiêu đề Pull Request (PR Title)" } }]
      }
    },
    {
      object: "block",
      type: "bulleted_list_item",
      bulleted_list_item: {
        rich_text: [
          { type: "text", text: { content: "Cú pháp Conventional Commits: " } },
          { type: "text", text: { content: "feat(LMS-XX): short description" }, annotations: { code: true } },
          { type: "text", text: { content: " hoặc " } },
          { type: "text", text: { content: "fix(LMS-XX): short description" }, annotations: { code: true } }
        ]
      }
    },
    {
      object: "block",
      type: "heading_3",
      heading_3: {
        rich_text: [{ type: "text", text: { content: "7.4. Mẫu mô tả Pull Request (PR Template)" } }]
      }
    },
    {
      object: "block",
      type: "bulleted_list_item",
      bulleted_list_item: {
        rich_text: [
          { type: "text", text: { content: "Bắt buộc điền đầy đủ form " } },
          { type: "text", text: { content: ".github/PULL_REQUEST_TEMPLATE.md" }, annotations: { code: true } },
          { type: "text", text: { content: " bao gồm: Linked Task, Changes, Testing Evidence, và Checklist." } }
        ]
      }
    },
    {
      object: "block",
      type: "heading_3",
      heading_3: {
        rich_text: [{ type: "text", text: { content: "7.5. Kỷ luật Clean Diff & Vệ sinh mã nguồn (Code Hygiene)" } }]
      }
    },
    {
      object: "block",
      type: "bulleted_list_item",
      bulleted_list_item: {
        rich_text: [
          { type: "text", text: { content: "Nguyên tắc đơn trách nhiệm (Single Responsibility): " }, annotations: { bold: true } },
          { type: "text", text: { content: "1 PR = 1 Task. Không gộp Auth, Material, Assignment vào chung một PR." } }
        ]
      }
    },
    {
      object: "block",
      type: "bulleted_list_item",
      bulleted_list_item: {
        rich_text: [
          { type: "text", text: { content: "Loại trừ thư mục công cụ/agent: " }, annotations: { bold: true } },
          { type: "text", text: { content: "Tuyệt đối không commit .agents/ hay .cursor/hooks/state/ vào git. Đảm bảo .gitignore đồng bộ." } }
        ]
      }
    },
    {
      object: "block",
      type: "heading_3",
      heading_3: {
        rich_text: [{ type: "text", text: { content: "7.6. Đánh giá và Phê duyệt (Review & Approval Gate)" } }]
      }
    },
    {
      object: "block",
      type: "bulleted_list_item",
      bulleted_list_item: {
        rich_text: [
          { type: "text", text: { content: "Mỗi PR phải có tối thiểu " } },
          { type: "text", text: { content: "01 lượt Approved Review" }, annotations: { bold: true } },
          { type: "text", text: { content: " từ Lead hoặc peer reviewer trước khi merge." } }
        ]
      }
    },
    {
      object: "block",
      type: "heading_3",
      heading_3: {
        rich_text: [{ type: "text", text: { content: "7.7. Tiêu chí hoàn thành (Definition of Done — DoD)" } }]
      }
    },
    {
      object: "block",
      type: "bulleted_list_item",
      bulleted_list_item: {
        rich_text: [
          { type: "text", text: { content: "1. Toàn bộ automated unit/permission test suites pass 100%." } }
        ]
      }
    },
    {
      object: "block",
      type: "bulleted_list_item",
      bulleted_list_item: {
        rich_text: [
          { type: "text", text: { content: "2. TypeScript clean (npm run typecheck không có lỗi)." } }
        ]
      }
    },
    {
      object: "block",
      type: "bulleted_list_item",
      bulleted_list_item: {
        rich_text: [
          { type: "text", text: { content: "3. Thẻ Notion được cập nhật link GitHub Evidence và Evidence State." } }
        ]
      }
    }
  ];

  return notionRequest(`/v1/blocks/${GUIDELINES_PAGE_ID}/children`, "PATCH", { children: blocks });
}

async function main() {
  console.log("=== BẮT ĐẦU ĐỒNG BỘ NOTION TASK BOARD & QUY ƯỚC (M5) ===");
  console.log(`Notion Version: ${NOTION_VERSION}`);
  console.log(`Số lượng nhiệm vụ cần sync: ${TASKS.length}`);

  let successCount = 0;
  for (const task of TASKS) {
    try {
      console.log(`[SYNC] ${task.id} (${task.name}) -> ${task.evidence}`);
      await updateTaskPage(task);
      console.log(`  ✓ Thành công: ${task.id}`);
      successCount++;
    } catch (err) {
      console.error(`  ✗ Thất bại: ${task.id}:`, err.message);
    }
  }

  console.log(`\n=== KẾT QUẢ ĐỒNG BỘ TASK BOARD: ${successCount}/${TASKS.length} THÀNH CÔNG ===`);

  try {
    console.log(`\n[APPEND] Đang bổ sung Section 7 vào trang Quy ước quản lý sản phẩm (${GUIDELINES_PAGE_ID})...`);
    await appendSection7();
    console.log("  ✓ Thành công: Đã append Section 7!");
  } catch (err) {
    console.error("  ✗ Thất bại khi append Section 7:", err.message);
  }

  console.log("\n=== HOÀN TẤT ĐỒNG BỘ NOTION ===");
}

if (require.main === module) {
  main();
}

module.exports = { TASKS, GUIDELINES_PAGE_ID, updateTaskPage, appendSection7 };
