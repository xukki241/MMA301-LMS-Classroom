import crypto from "node:crypto";
import mongoose from "mongoose";
import { env } from "../config/env.js";
import { HttpError } from "../lib/httpError.js";
import type { AuthUser } from "../middleware/requireAuth.js";
import { ClassMember, ClassModel, Material, MaterialUnlock } from "../models/index.js";

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

export class PaymentService {
  static async createMaterialCheckout(
    user: AuthUser,
    classId: string,
    materialId: string
  ): Promise<SePayCheckout> {
    if (user.role !== "student") {
      throw new HttpError(403, "Chỉ học sinh cần mở khóa tài nguyên trả phí", "FORBIDDEN");
    }
    await assertMember(user.id, classId);
    if (!mongoose.isObjectIdOrHexString(materialId)) {
      throw new HttpError(400, "Định dạng ID tài liệu không hợp lệ", "INVALID_ID");
    }
    const material = await Material.findOne({ _id: materialId, classId });
    if (!material) throw new HttpError(404, "Không tìm thấy tài liệu", "MATERIAL_NOT_FOUND");

    const amount = Number(material.priceVnd ?? 0);
    if (!Number.isFinite(amount) || amount <= 0) {
      throw new HttpError(400, "Tài liệu này miễn phí, không cần thanh toán", "FREE_MATERIAL");
    }

    const existing = await MaterialUnlock.findOne({ materialId, userId: user.id, status: "success" });
    if (existing) {
      throw new HttpError(400, "Bạn đã mở khóa tài liệu này", "ALREADY_UNLOCKED");
    }

    const txnRef = `SEPAY${Date.now()}-${materialId.slice(-6)}-${user.id.slice(-4)}`;
    const demo = !sepayEnabled();
    const formFields = buildFormFields({
      txnRef,
      amount,
      description: `Mở khóa tài nguyên: ${material.title}`,
      customerId: user.id,
      demo,
    });

    await MaterialUnlock.findOneAndUpdate(
      { materialId, userId: user.id },
      {
        classId,
        materialId,
        userId: user.id,
        amount,
        provider: demo ? "SEPAY_DEMO" : "SEPAY",
        providerRef: txnRef,
        status: "pending",
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
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
      materialId: String(material._id),
      materialTitle: material.title,
      bankInfo: demo ? null : bankInfoFor(amount),
    };
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
    return { success: true, materialId: String(txn.materialId), transactionRef };
  }

  static async processSePayReturn(params: Record<string, string | undefined>) {
    const txnRef = params.ref || params.order_invoice_number || params.order_id;
    const result = params.result || "success";
    if (!txnRef) return { received: true, activated: false };

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

  static async processSePayIpn(body: Record<string, unknown>) {
    const txnRef =
      (typeof body.order_invoice_number === "string" && body.order_invoice_number) ||
      (typeof body.order_id === "string" && body.order_id) ||
      (typeof body.ref === "string" && body.ref) ||
      null;
    if (txnRef) {
      const txn = await MaterialUnlock.findOne({ providerRef: txnRef });
      if (txn) {
        // IPN log-only (giống AMS): return path mới kích hoạt unlock.
        console.info("[SEPAY IPN]", txnRef, txn.status);
      }
    }
    return { received: true };
  }
}
