import { CORE_URL } from "./config";
import { http } from "./http";

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

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : null;
}

function parseBankInfo(value: unknown): SePayBankInfo | null {
  const obj = asRecord(value);
  if (!obj) return null;
  const accountNumber = String(obj.accountNumber ?? "").trim();
  const accountName = String(obj.accountName ?? "").trim();
  if (!accountNumber || !accountName) return null;
  return {
    bankCode: String(obj.bankCode ?? "MBBank"),
    accountNumber,
    accountName,
    amount: Number(obj.amount ?? 0),
  };
}

export async function createMaterialCheckout(
  token: string,
  classId: string,
  materialId: string
): Promise<SePayCheckout> {
  const raw = await http<unknown>(`${CORE_URL}/classes/${classId}/materials/${materialId}/checkout`, {
    method: "POST",
    token,
  });
  const obj = asRecord(raw);
  const checkout = asRecord(obj?.checkout) ?? obj;
  if (!checkout) throw new Error("Checkout không hợp lệ");
  return {
    checkoutUrl: String(checkout.checkoutUrl ?? ""),
    formFields: (checkout.formFields as Record<string, string>) ?? {},
    transactionRef: String(checkout.transactionRef ?? ""),
    amount: Number(checkout.amount ?? 0),
    demo: Boolean(checkout.demo),
    materialId: String(checkout.materialId ?? materialId),
    materialTitle: String(checkout.materialTitle ?? ""),
    bankInfo: parseBankInfo(checkout.bankInfo),
  };
}

export async function confirmDemoPayment(token: string, transactionRef: string) {
  return http<{ success: boolean; materialId: string; transactionRef: string }>(
    `${CORE_URL}/payments/sepay/confirm-demo`,
    { method: "POST", token, body: { transactionRef } }
  );
}

export function formatVnd(amount: number) {
  return new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND", maximumFractionDigits: 0 }).format(
    amount
  );
}
