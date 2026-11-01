import type { Request, Response } from "express";
import { PaymentService } from "../services/payment.service.js";

export class PaymentController {
  static async createMaterialCheckout(req: Request, res: Response): Promise<void> {
    const checkout = await PaymentService.createMaterialCheckout(
      req.user!,
      req.params.classId,
      req.params.materialId
    );
    res.status(200).json({ success: true, checkout });
  }

  static async confirmDemo(req: Request, res: Response): Promise<void> {
    const ref = String(req.body?.transactionRef ?? req.body?.ref ?? "");
    const result = await PaymentService.confirmDemoPayment(req.user!, ref);
    res.status(200).json(result);
  }

  static async sepayReturn(req: Request, res: Response): Promise<void> {
    const params = { ...req.query, ...req.body } as Record<string, string | undefined>;
    const result = await PaymentService.processSePayReturn(params);
    const ok = result.activated;
    res
      .status(200)
      .type("html")
      .send(`<!doctype html><html><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/><title>Thanh toán</title>
<style>body{font-family:system-ui,sans-serif;padding:24px;background:#f6f4ef;color:#1a1a1a} .card{background:#fff;border-radius:16px;padding:24px;max-width:420px;margin:40px auto;box-shadow:0 8px 24px #0001} h1{font-size:20px;margin:0 0 8px} p{color:#555;line-height:1.5}</style></head>
<body><div class="card"><h1>${ok ? "Thanh toán thành công" : "Thanh toán chưa hoàn tất"}</h1>
<p>${ok ? "Tài nguyên đã được mở khóa. Bạn có thể đóng trang này và quay lại ứng dụng." : "Giao dịch bị hủy hoặc thất bại. Hãy thử lại trong ứng dụng."}</p>
<p style="font-size:12px;color:#888">Ref: ${result.transactionRef ?? "—"}</p></div></body></html>`);
  }

  static async sepayIpn(req: Request, res: Response): Promise<void> {
    const result = await PaymentService.processSePayIpn((req.body ?? {}) as Record<string, unknown>);
    res.status(200).json(result);
  }

  static async demoCheckoutPage(req: Request, res: Response): Promise<void> {
    const ref = String(req.query.ref ?? "");
    res.status(200).type("html").send(`<!doctype html><html><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/><title>SePay Demo</title>
<style>body{font-family:system-ui,sans-serif;padding:24px;background:#0b3d2e;color:#fff} .card{background:#fff;color:#111;border-radius:16px;padding:24px;max-width:420px;margin:40px auto}
h1{font-size:18px;margin:0 0 8px} p{color:#444;line-height:1.5;font-size:14px} button{width:100%;padding:14px;border:0;border-radius:12px;background:#0b3d2e;color:#fff;font-weight:700;margin-top:16px}
.muted{font-size:12px;color:#777;word-break:break-all}</style></head>
<body><div class="card"><h1>SePay · Chuyển khoản (demo)</h1>
<p>Giống luồng AMS: tạo checkout SePay, chuyển khoản ngân hàng, rồi return để mở khóa tài nguyên.</p>
<p class="muted">Mã đơn: ${ref || "—"}</p>
<form method="GET" action="/payments/sepay/return">
<input type="hidden" name="ref" value="${ref.replace(/"/g, "")}"/>
<input type="hidden" name="result" value="success"/>
<button type="submit">Tôi đã chuyển khoản — mở khóa</button>
</form>
</div></body></html>`);
  }

  /** Auto-POST signed form fields to SePay hosted checkout (RN WebView cannot POST forms). */
  static async hostedLaunchPage(req: Request, res: Response): Promise<void> {
    const ref = String(req.query.ref ?? "");
    const launch = await PaymentService.buildHostedLaunch(ref);
    const inputs = Object.entries(launch.formFields)
      .map(
        ([name, value]) =>
          `<input type="hidden" name="${escapeHtml(name)}" value="${escapeHtml(value)}"/>`
      )
      .join("");
    res.status(200).type("html").send(`<!doctype html><html><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/><title>Chuyển tới SePay</title>
<style>body{font-family:system-ui,sans-serif;padding:24px;background:#f6f4ef;color:#1a1a1a}.card{background:#fff;border-radius:16px;padding:24px;max-width:420px;margin:40px auto;box-shadow:0 8px 24px #0001}h1{font-size:18px;margin:0 0 8px}p{color:#555;line-height:1.5;font-size:14px}</style></head>
<body><div class="card"><h1>Đang mở SePay…</h1>
<p>Mở khóa “${escapeHtml(launch.materialTitle)}” · ${Math.round(launch.amount).toLocaleString("vi-VN")}&nbsp;₫</p>
<p style="font-size:12px;color:#888">Nếu trang không chuyển hướng, bấm nút bên dưới.</p>
<form id="sepay" method="POST" action="${escapeHtml(launch.checkoutUrl)}">${inputs}
<button type="submit" style="width:100%;padding:14px;border:0;border-radius:12px;background:#0b3d2e;color:#fff;font-weight:700;margin-top:12px">Tiếp tục tới SePay</button>
</form></div>
<script>document.getElementById("sepay").submit();</script></body></html>`);
  }
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}
