import { createHash } from "node:crypto";

export type KhqrCurrency = "USD" | "KHR";

export interface KhqrParams {
  bakongId: string;
  merchantName: string;
  merchantCity: string;
  mcc?: string;
  amount?: number;
  currency?: KhqrCurrency;
  billNumber?: string;
  storeLabel?: string;
  terminalLabel?: string;
  isMerchant?: boolean;
  merchantId?: string;
}

function tlv(id: string, value: string): string {
  const len = value.length.toString().padStart(2, "0");
  return `${id}${len}${value}`;
}

function crc16(payload: string): string {
  let crc = 0xffff;
  for (let i = 0; i < payload.length; i++) {
    crc ^= payload.charCodeAt(i) << 8;
    for (let j = 0; j < 8; j++) {
      crc = (crc & 0x8000) !== 0 ? ((crc << 1) ^ 0x1021) : crc << 1;
      crc &= 0xffff;
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, "0");
}

function formatAmount(amount: number, currency: KhqrCurrency): string {
  return currency === "KHR" ? String(Math.round(amount)) : amount.toFixed(2);
}

export function generateKhqr(p: KhqrParams): { qr: string; md5: string } {
  const currency: KhqrCurrency = p.currency ?? "USD";
  const currencyCode = currency === "KHR" ? "116" : "840";
  const hasAmount = typeof p.amount === "number" && p.amount > 0;

  let accountInfo = tlv("00", p.bakongId);
  if (p.isMerchant && p.merchantId) accountInfo += tlv("01", p.merchantId);
  const accountTag = p.isMerchant ? "30" : "29";

  let payload =
    tlv("00", "01") +
    tlv("01", hasAmount ? "12" : "11") +
    tlv(accountTag, accountInfo) +
    tlv("52", p.mcc ?? "5999") +
    tlv("53", currencyCode) +
    (hasAmount ? tlv("54", formatAmount(p.amount!, currency)) : "") +
    tlv("58", "KH") +
    tlv("59", p.merchantName.slice(0, 25)) +
    tlv("60", p.merchantCity.slice(0, 15));

  let additional = "";
  if (p.billNumber) additional += tlv("01", p.billNumber);
  if (p.storeLabel) additional += tlv("05", p.storeLabel);
  if (p.terminalLabel) additional += tlv("07", p.terminalLabel);
  if (additional) payload += tlv("62", additional);

  payload += "63" + "04";
  const checksum = crc16(payload);
  const qr = payload + checksum;
  const md5 = createHash("md5").update(qr).digest("hex");
  return { qr, md5 };
}

export function generateInvoiceKhqr(opts: {
  amount: number;
  currency: KhqrCurrency;
  billNumber: string;
}) {
  return generateKhqr({
    bakongId: process.env.KHQR_BAKONG_ID || "your_name@aclb",
    merchantName: process.env.KHQR_MERCHANT_NAME || "My ERP Store",
    merchantCity: process.env.KHQR_MERCHANT_CITY || "PHNOM PENH",
    mcc: process.env.KHQR_MCC || "5999",
    amount: opts.amount,
    currency: opts.currency,
    billNumber: opts.billNumber,
  });
}

export async function checkBakongTransaction(md5: string): Promise<{
  paid: boolean;
  raw?: unknown;
}> {
  const token = process.env.BAKONG_API_TOKEN;
  if (!token) return { paid: false, raw: { note: "BAKONG_API_TOKEN not set" } };

  const apiUrl = process.env.BAKONG_API_URL || "https://api-bakong.nbc.gov.kh";
  const res = await fetch(`${apiUrl}/v1/check_transaction_by_md5`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({ md5 }),
  });
  const raw = await res.json().catch(() => ({}));
  const paid = (raw as any)?.responseCode === 0 && !!(raw as any)?.data;
  return { paid, raw };
}
