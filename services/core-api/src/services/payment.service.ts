import crypto from "node:crypto";
import mongoose from "mongoose";
import { env } from "../config/env.js";
import { HttpError } from "../lib/httpError.js";
import type { AuthUser } from "../middleware/requireAuth.js";
import { ClassService } from "./class.service.js";
import { ClassJoinPayment, ClassMember, ClassModel, Material, MaterialUnlock } from "../models/index.js";

/**
 * Signed field allow-list from official sepay-pg-node Checkout.signFields.
 * Order MUST follow Object.keys(fields) insertion order (not a fixed list).
 * AMS Java used a fixed order that does not match the Node SDK / SePay verify.
 */
const SEPAY_SIGN_ALLOW = new Set([
  "merchant",
  "env",
  "operation",
  "payment_method",
  "order_amount",
  "currency",
  "order_invoice_number",
  "order_description",
  "customer_id",
  "agreement_id",
  "agreement_name",
  "agreement_type",
  "agreement_payment_frequency",
  "agreement_amount_per_payment",
  "success_url",
  "error_url",
  "cancel_url",
  "order_id",
]);

export type SePayBankInfo = {
  bankCode: string;
  accountNumber: string;
  accountName: string;
  amount: number;
};

export type SePayCheckout = {
  checkoutUrl: string;
  formFields: Record<string, string>;
  transactionRef: string;
  amount: number;
  demo: boolean;
  materialId: string;
  materialTitle: string;
  bankInfo: SePayBankInfo | null;
};

function sepayEnabled() {
  return Boolean(env.SEPAY_MERCHANT_ID && env.SEPAY_SECRET_KEY && env.SEPAY_CHECKOUT_URL);
}

/**
 * HMAC-SHA256 Base64 — parity with sepay-pg-node Checkout.signFields.
 * Walk Object.keys so insertion order matches the SDK.
 */
function signSePay(fields: Record<string, string>, secret: string): string {
  const parts: string[] = [];
  for (const name of Object.keys(fields)) {
    if (!SEPAY_SIGN_ALLOW.has(name)) continue;
    const value = fields[name];
    if (value === undefined) continue;
    parts.push(`${name}=${value ?? ""}`);
  }
  return crypto.createHmac("sha256", secret).update(parts.join(",")).digest("base64");
}

function bankInfoFor(amount: number): SePayBankInfo | null {
  if (!env.SEPAY_BANK_ACCOUNT || !env.SEPAY_BANK_NAME) return null;
  return {
    bankCode: env.SEPAY_BANK_CODE || "MBBank",
    accountNumber: env.SEPAY_BANK_ACCOUNT,
    accountName: env.SEPAY_BANK_NAME,
    amount: Math.round(amount),
  };
}

async function assertMember(userId: string, classId: string) {
  if (!mongoose.isObjectIdOrHexString(classId)) {
    throw new HttpError(400, "Định dạng ID lớp học không hợp lệ", "INVALID_ID");
  }
  const cls = await ClassModel.findById(classId);
  if (!cls) throw new HttpError(404, "Không tìm thấy lớp học", "CLASS_NOT_FOUND");
  if (cls.teacherId === userId) return cls;
  const membership = await ClassMember.findOne({ classId, userId });
  if (!membership) throw new HttpError(403, "Bạn không phải là thành viên của lớp học này", "FORBIDDEN");
  return cls;
}

function returnBaseUrl(): string {
  // Prefer public/tunnel URL for SePay-signed return callbacks when set;
  // PUBLIC_CORE_URL stays device-reachable for hosted-launch links.
  const base = (env.SEPAY_RETURN_BASE_URL || env.PUBLIC_CORE_URL).replace(/\/$/, "");
  return base;
}

function buildFormFields(input: {
  txnRef: string;
  amount: number;
  description: string;
  customerId: string;
  demo: boolean;
}): Record<string, string> {
  const base = returnBaseUrl();
  // Match AMS appendRef style: raw ref (no encode) + result on error/cancel.
  const successUrl = `${base}/payments/sepay/return?ref=${input.txnRef}`;
  const errorUrl = `${base}/payments/sepay/return?ref=${input.txnRef}&result=error`;
  const cancelUrl = `${base}/payments/sepay/return?ref=${input.txnRef}&result=cancel`;

  // Field insertion order = sepay-pg-node Object.keys sign order.
  const formFields: Record<string, string> = {
    merchant: env.SEPAY_MERCHANT_ID || "LMS_DEMO",
    operation: "PURCHASE",
    payment_method: "BANK_TRANSFER",
    order_invoice_number: input.txnRef,
    order_amount: String(Math.round(input.amount)),
    currency: "VND",
    order_description: input.description.slice(0, 120),
    success_url: successUrl,
    error_url: errorUrl,
    cancel_url: cancelUrl,
    customer_id: input.customerId,
  };
  if (!input.demo) {
    formFields.signature = signSePay(formFields, env.SEPAY_SECRET_KEY!);
  }
  return formFields;
}

export type PaymentHistoryItem = {
  id: string;
  classId: string;
  className: string;
  materialId: string;
  materialTitle: string;
  studentId: string;
  amount: number;
  provider: string;
  transactionRef: string;
  status: "pending" | "success" | "failed";
  createdAt: string;
  updatedAt: string;
};

export class PaymentService {
  /**
   * Học sinh: giao dịch của chính mình.
   * Giáo viên: mọi giao dịch mở khóa trong lớp mình chủ.
   */
  static async listMyPayments(user: AuthUser): Promise<PaymentHistoryItem[]> {
    let rows;
    if (user.role === "student") {
      rows = await MaterialUnlock.find({ userId: user.id }).sort({ updatedAt: -1, _id: -1 }).lean();
    } else if (user.role === "teacher") {
      const owned = await ClassModel.find({ teacherId: user.id }).select("_id").lean();
      const classIds = owned.map((c) => c._id);
      if (classIds.length === 0) return [];
      rows = await MaterialUnlock.find({ classId: { $in: classIds } }).sort({ updatedAt: -1, _id: -1 }).lean();
    } else {
      throw new HttpError(403, "Không có quyền xem lịch sử giao dịch", "FORBIDDEN");
    }
    if (rows.length === 0) return [];

    const materialIds = [...new Set(rows.map((r) => String(r.materialId)))];
    const classIds = [...new Set(rows.map((r) => String(r.classId)))];
    const [materials, classes] = await Promise.all([
      Material.find({ _id: { $in: materialIds } }).select("_id title").lean(),
      ClassModel.find({ _id: { $in: classIds } }).select("_id name").lean(),
    ]);
    const materialTitle = new Map(materials.map((m) => [String(m._id), m.title]));
    const className = new Map(classes.map((c) => [String(c._id), c.name]));

    return rows.map((row) => ({
      id: String(row._id),
      classId: String(row.classId),
      className: className.get(String(row.classId)) ?? "",
      materialId: String(row.materialId),
      materialTitle: materialTitle.get(String(row.materialId)) ?? "Tài liệu đã xóa",
      studentId: String(row.userId),
      amount: Number(row.amount ?? 0),
      provider: String(row.provider),
      transactionRef: String(row.providerRef),
      status: row.status as PaymentHistoryItem["status"],
      createdAt: (row.createdAt as Date).toISOString(),
      updatedAt: (row.updatedAt as Date).toISOString(),
    }));
  }

  static async createMaterialCheckout(
    _user: AuthUser,
    _classId: string,
    _materialId: string
  ): Promise<SePayCheckout> {
    throw new HttpError(
      400,
      "Tài liệu trong lớp không còn thu phí riêng — chỉ trả phí khi vào lớp.",
      "MATERIAL_UNLOCK_DISABLED",
    );
  }

  /** Thanh toán phí vào lớp (joinFeeVnd) trước khi ghi danh. */
  static async createClassJoinCheckout(user: AuthUser, code: string): Promise<SePayCheckout & { classId: string }> {
    if (user.role !== "student") {
      throw new HttpError(403, "Chỉ học sinh mới tham gia lớp", "FORBIDDEN");
    }
    const uppercaseCode = code.trim().toUpperCase();
    const cls = await ClassModel.findOne({ code: uppercaseCode });
    if (!cls) throw new HttpError(404, "Không tìm thấy lớp với mã này", "CLASS_NOT_FOUND");

    const existingMember = await ClassMember.findOne({ classId: cls._id, userId: user.id });
    if (existingMember) {
      throw new HttpError(403, "Bạn đã là thành viên của lớp này", "ALREADY_JOINED");
    }

    const amount = Number(cls.joinFeeVnd ?? 0);
    if (!Number.isFinite(amount) || amount <= 0) {
      throw new HttpError(400, "Lớp miễn phí — dùng API join thông thường", "FREE_CLASS");
    }

    const paid = await ClassJoinPayment.findOne({ classId: cls._id, userId: user.id, status: "success" });
    if (paid) {
      await ClassService.enrollAfterPayment(user.id, String(cls._id), user.displayName ?? "");
      throw new HttpError(400, "Bạn đã thanh toán — hãy mở lại danh sách lớp", "ALREADY_PAID");
    }

    const txnRef = `JOIN${Date.now()}-${String(cls._id).slice(-6)}-${user.id.slice(-4)}`;
    const demo = !sepayEnabled();
    const formFields = buildFormFields({
      txnRef,
      amount,
      description: `Phí vào lớp: ${cls.name}`,
      customerId: user.id,
      demo,
    });

    await ClassJoinPayment.findOneAndUpdate(
      { classId: cls._id, userId: user.id },
      {
        classId: cls._id,
        userId: user.id,
        amount,
        displayName: user.displayName ?? "",
        provider: demo ? "SEPAY_DEMO" : "SEPAY",
        providerRef: txnRef,
        status: "pending",
      },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    );

    const base = env.PUBLIC_CORE_URL.replace(/\/$/, "");
    const checkoutUrl = demo
      ? `${base}/payments/sepay/demo-checkout?ref=${encodeURIComponent(txnRef)}`
      : `${base}/payments/sepay/hosted-launch?ref=${encodeURIComponent(txnRef)}`;

    return {
      checkoutUrl,
      formFields,
      transactionRef: txnRef,
      amount,
      demo,
      materialId: String(cls._id),
      materialTitle: cls.name,
      classId: String(cls._id),
      bankInfo: demo ? null : bankInfoFor(amount),
    };
  }

  private static async activateClassJoin(txn: InstanceType<typeof ClassJoinPayment>) {
    if (txn.status !== "success") {
      txn.status = "success";
      await txn.save();
    }
    await ClassService.enrollAfterPayment(txn.userId, String(txn.classId), txn.displayName ?? "");
  }

  /** Rebuild signed SePay form for a pending LIVE txn (auto-POST HTML launch page). */
  static async buildHostedLaunch(txnRef: string): Promise<{
    checkoutUrl: string;
    formFields: Record<string, string>;
    materialTitle: string;
    amount: number;
  }> {
    if (!sepayEnabled()) {
      throw new HttpError(400, "SePay LIVE chưa được cấu hình", "SEPAY_DISABLED");
    }
    if (!txnRef) throw new HttpError(400, "Thiếu mã giao dịch", "MISSING_REF");

    const joinTxn = await ClassJoinPayment.findOne({ providerRef: txnRef, provider: "SEPAY" });
    if (joinTxn) {
      if (joinTxn.status === "success") {
        throw new HttpError(400, "Giao dịch đã hoàn tất", "ALREADY_UNLOCKED");
      }
      const cls = await ClassModel.findById(joinTxn.classId);
      const formFields = buildFormFields({
        txnRef,
        amount: joinTxn.amount,
        description: `Phí vào lớp: ${cls?.name ?? "lớp học"}`,
        customerId: joinTxn.userId,
        demo: false,
      });
      return {
        checkoutUrl: env.SEPAY_CHECKOUT_URL!,
        formFields,
        materialTitle: cls?.name ?? "Phí vào lớp",
        amount: joinTxn.amount,
      };
    }

    const txn = await MaterialUnlock.findOne({ providerRef: txnRef, provider: "SEPAY" });
    if (!txn) throw new HttpError(404, "Không tìm thấy giao dịch", "TXN_NOT_FOUND");
    if (txn.status === "success") {
      throw new HttpError(400, "Giao dịch đã hoàn tất", "ALREADY_UNLOCKED");
    }

    const material = await Material.findById(txn.materialId);
    const formFields = buildFormFields({
      txnRef,
      amount: txn.amount,
      description: `Mở khóa tài nguyên: ${material?.title ?? "tài liệu"}`,
      customerId: txn.userId,
      demo: false,
    });

    return {
      checkoutUrl: env.SEPAY_CHECKOUT_URL!,
      formFields,
      materialTitle: material?.title ?? "Tài nguyên",
      amount: txn.amount,
    };
  }

  static async confirmDemoPayment(user: AuthUser, transactionRef: string) {
    const joinTxn = await ClassJoinPayment.findOne({ providerRef: transactionRef });
    if (joinTxn) {
      if (joinTxn.userId !== user.id && user.role !== "teacher") {
        throw new HttpError(403, "Không thể xác nhận giao dịch của người khác", "FORBIDDEN");
      }
      if (joinTxn.provider !== "SEPAY_DEMO") {
        throw new HttpError(400, "Chỉ xác nhận được giao dịch demo", "NOT_DEMO");
      }
      await this.activateClassJoin(joinTxn);
      return { success: true, classId: String(joinTxn.classId), kind: "class_join", transactionRef };
    }

    const txn = await MaterialUnlock.findOne({ providerRef: transactionRef });
    if (!txn) throw new HttpError(404, "Không tìm thấy giao dịch", "TXN_NOT_FOUND");
    if (txn.userId !== user.id && user.role !== "teacher") {
      throw new HttpError(403, "Không thể xác nhận giao dịch của người khác", "FORBIDDEN");
    }
    if (txn.provider !== "SEPAY_DEMO") {
      throw new HttpError(400, "Chỉ xác nhận được giao dịch demo", "NOT_DEMO");
    }
    txn.status = "success";
    await txn.save();
    return { success: true, materialId: String(txn.materialId), kind: "material", transactionRef };
  }

  static async processSePayReturn(params: Record<string, string | undefined>) {
    const txnRef = params.ref || params.order_invoice_number || params.order_id;
    const result = params.result || "success";
    if (!txnRef) return { received: true, activated: false };

    const joinTxn = await ClassJoinPayment.findOne({ providerRef: txnRef });
    if (joinTxn) {
      if (result === "error" || result === "cancel") {
        if (joinTxn.status !== "success") {
          joinTxn.status = "failed";
          await joinTxn.save();
        }
        return { received: true, activated: false, transactionRef: txnRef };
      }
      await this.activateClassJoin(joinTxn);
      return { received: true, activated: true, transactionRef: txnRef };
    }

    const txn = await MaterialUnlock.findOne({ providerRef: txnRef });
    if (!txn) return { received: true, activated: false };

    if (txn.status !== "success") {
      if (result === "error" || result === "cancel") {
        txn.status = "failed";
      } else {
        txn.status = "success";
      }
      await txn.save();
    }
    return { received: true, activated: txn.status === "success", transactionRef: txnRef };
  }

  /**
   * SePay PG Instant Payment Notification.
   * Docs: POST JSON + header `X-Secret-Key` when merchant auth = Secret Key.
   * https://developer.sepay.vn/en/cong-thanh-toan/IPN
   */
  static async processSePayIpn(
    body: Record<string, unknown>,
    headers: { secretKeyHeader?: string | null } = {}
  ) {
    assertSePayIpnSecret(headers.secretKeyHeader);

    const notificationType =
      typeof body.notification_type === "string" ? body.notification_type : "";
    const order = isPlainObject(body.order) ? body.order : null;
    const txnRef = extractIpnInvoiceNumber(body, order);

    if (!txnRef) {
      console.info("[SEPAY IPN] missing invoice number", { notificationType });
      return { success: true, received: true, activated: false };
    }

    const joinTxn = await ClassJoinPayment.findOne({ providerRef: txnRef });
    if (joinTxn) {
      if (notificationType === "TRANSACTION_VOID") {
        if (joinTxn.status !== "failed") {
          joinTxn.status = "failed";
          await joinTxn.save();
        }
        return { success: true, received: true, activated: false, transactionRef: txnRef };
      }
      if (joinTxn.status !== "success") {
        await this.activateClassJoin(joinTxn);
      }
      console.info("[SEPAY IPN] class join", txnRef, joinTxn.classId);
      return { success: true, received: true, activated: true, transactionRef: txnRef };
    }

    const txn = await MaterialUnlock.findOne({ providerRef: txnRef });
    if (!txn) {
      console.info("[SEPAY IPN] unknown ref", txnRef, notificationType);
      // Acknowledge so SePay does not retry forever for stale/demo refs.
      return { success: true, received: true, activated: false, transactionRef: txnRef };
    }

    if (notificationType === "TRANSACTION_VOID") {
      if (txn.status !== "failed") {
        txn.status = "failed";
        await txn.save();
      }
      console.info("[SEPAY IPN] void", txnRef);
      return { success: true, received: true, activated: false, transactionRef: txnRef };
    }

    const paid =
      notificationType === "ORDER_PAID" ||
      notificationType === "" ||
      (typeof order?.order_status === "string" &&
        ["CAPTURED", "APPROVED", "PAID", "SUCCESS"].includes(order.order_status.toUpperCase()));

    if (!paid) {
      console.info("[SEPAY IPN] ignored", txnRef, notificationType, order?.order_status);
      return { success: true, received: true, activated: txn.status === "success", transactionRef: txnRef };
    }

    const ipnAmount = parseIpnAmount(order?.order_amount ?? body.order_amount);
    if (ipnAmount != null && Math.round(ipnAmount) !== Math.round(txn.amount)) {
      console.warn("[SEPAY IPN] amount mismatch", {
        txnRef,
        expected: txn.amount,
        got: ipnAmount,
      });
      throw new HttpError(400, "Số tiền IPN không khớp đơn", "IPN_AMOUNT_MISMATCH");
    }

    if (txn.status !== "success") {
      txn.status = "success";
      await txn.save();
    }
    console.info("[SEPAY IPN] unlocked", txnRef, txn.materialId);
    return {
      success: true,
      received: true,
      activated: true,
      transactionRef: txnRef,
      materialId: String(txn.materialId),
    };
  }
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function extractIpnInvoiceNumber(
  body: Record<string, unknown>,
  order: Record<string, unknown> | null
): string | null {
  const candidates = [
    order?.order_invoice_number,
    order?.order_id,
    body.order_invoice_number,
    body.order_id,
    body.ref,
  ];
  for (const value of candidates) {
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return null;
}

function parseIpnAmount(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim()) {
    const n = Number(value);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

function assertSePayIpnSecret(headerValue?: string | null) {
  const expected = env.SEPAY_SECRET_KEY;
  if (!expected) return; // demo / unset — accept (local smoke without LIVE keys)

  const provided = headerValue?.trim() ?? "";
  if (!provided || !timingSafeEqualString(provided, expected)) {
    throw new HttpError(401, "IPN secret không hợp lệ", "IPN_UNAUTHORIZED");
  }
}

function timingSafeEqualString(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) {
    // Constant-time-ish reject when lengths differ.
    crypto.timingSafeEqual(bufA, bufA);
    return false;
  }
  return crypto.timingSafeEqual(bufA, bufB);
}
