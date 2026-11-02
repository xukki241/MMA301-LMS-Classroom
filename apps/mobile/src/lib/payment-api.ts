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

const LOOPBACK_HOSTS = new Set(["127.0.0.1", "localhost", "0.0.0.0", "::1", "[::1]"]);

/**
 * Hosted-launch URLs are built from core PUBLIC_CORE_URL (often 127.0.0.1).
 * Remap loopback to EXPO_PUBLIC_CORE_URL so Android emulator / device can open SePay.
 */
export function resolveCheckoutUrl(checkoutUrl: string): string {
  const raw = String(checkoutUrl ?? "").trim();
  if (!raw) return raw;
  try {
    const target = new URL(raw);
    const core = new URL(CORE_URL);
    if (LOOPBACK_HOSTS.has(target.hostname.toLowerCase())) {
      target.protocol = core.protocol;
      target.hostname = core.hostname;
      target.port = core.port;
      return target.toString();
    }
    return raw;
  } catch {
    if (raw.startsWith("/")) {
      return `${CORE_URL.replace(/\/$/, "")}${raw}`;
    }
    return raw;
  }
}

function parseCheckout(raw: unknown, fallbackId = ""): SePayCheckout {
  const obj = asRecord(raw);
  const checkout = asRecord(obj?.checkout) ?? obj;
  if (!checkout) throw new Error("Checkout không hợp lệ");
  return {
    checkoutUrl: resolveCheckoutUrl(String(checkout.checkoutUrl ?? "")),
    formFields: (checkout.formFields as Record<string, string>) ?? {},
    transactionRef: String(checkout.transactionRef ?? ""),
    amount: Number(checkout.amount ?? 0),
    demo: Boolean(checkout.demo),
    materialId: String(checkout.materialId ?? fallbackId),
    materialTitle: String(checkout.materialTitle ?? ""),
    bankInfo: parseBankInfo(checkout.bankInfo),
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
  return parseCheckout(raw, materialId);
}

export async function createClassJoinCheckout(token: string, code: string): Promise<SePayCheckout> {
  const raw = await http<unknown>(`${CORE_URL}/classes/join/checkout`, {
    method: "POST",
    token,
    body: { code: code.trim().toUpperCase() },
  });
  return parseCheckout(raw);
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
