import { createHash } from "node:crypto";
import { env } from "../config/env.js";

/**
 * KHQR generator for Cambodia's Bakong system.
 *
 * KHQR follows the EMVCo "Merchant-Presented QR" spec adapted by the National
 * Bank of Cambodia. A payload is a sequence of Tag–Length–Value (TLV) fields,
 * finished with a CRC-16/CCITT checksum (tag 63).
 *
 * The TLV mechanics and CRC below are standard. The Bakong-specific tags
 * (29 individual / 30 merchant, MCC, currency, etc.) follow the published KHQR
 * spec — if you hit a scan error with a real Bakong wallet, re-verify the
 * merchant-account sub-tags against the current NBC KHQR documentation.
 */

export type KhqrCurrency = "USD" | "KHR";

export interface KhqrParams {
  bakongId: string;          // e.g. "your_name@aclb"
  merchantName: string;      // <= 25 chars
  merchantCity: string;      // <= 15 chars
  mcc?: string;              // ISO 18245, default 5999
  amount?: number;           // omit / 0 → static (re-usable) QR
  currency?: KhqrCurrency;   // default USD
  billNumber?: string;       // invoice number
  storeLabel?: string;
  terminalLabel?: string;
  isMerchant?: boolean;      // true → use tag 30 (merchant) instead of 29 (individual)
  merchantId?: string;       // required when isMerchant
}

/** Build one TLV field: 2-char ID + 2-char zero-padded length + value. */
function tlv(id: string, value: string): string {
  const len = value.length.toString().padStart(2, "0");
  return `${id}${len}${value}`;
}

/** CRC-16/CCITT-FALSE — polynomial 0x1021, initial 0xFFFF. */
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
  // KHR has no minor unit; USD uses two decimals.
  return currency === "KHR" ? String(Math.round(amount)) : amount.toFixed(2);
}

export function generateKhqr(p: KhqrParams): { qr: string; md5: string } {
  const currency: KhqrCurrency = p.currency ?? "USD";
  const currencyCode = currency === "KHR" ? "116" : "840"; // ISO 4217 numeric
  const hasAmount = typeof p.amount === "number" && p.amount > 0;

  // Merchant account information (tag 29 = individual, tag 30 = merchant)
  let accountInfo = tlv("00", p.bakongId);
  if (p.isMerchant && p.merchantId) accountInfo += tlv("01", p.merchantId);
  const accountTag = p.isMerchant ? "30" : "29";

  let payload =
    tlv("00", "01") +                                  // payload format indicator
    tlv("01", hasAmount ? "12" : "11") +               // 12 = dynamic, 11 = static
    tlv(accountTag, accountInfo) +
    tlv("52", p.mcc ?? "5999") +                       // merchant category code
    tlv("53", currencyCode) +                          // transaction currency
    (hasAmount ? tlv("54", formatAmount(p.amount!, currency)) : "") +
    tlv("58", "KH") +                                  // country code
    tlv("59", p.merchantName.slice(0, 25)) +
    tlv("60", p.merchantCity.slice(0, 15));

  // Additional data field template (tag 62)
  let additional = "";
  if (p.billNumber) additional += tlv("01", p.billNumber);
  if (p.storeLabel) additional += tlv("05", p.storeLabel);
  if (p.terminalLabel) additional += tlv("07", p.terminalLabel);
  if (additional) payload += tlv("62", additional);

  // CRC is computed over the whole payload INCLUDING the "6304" tag+length prefix.
  payload += "63" + "04";
  const checksum = crc16(payload);
  const qr = payload + checksum;

  const md5 = createHash("md5").update(qr).digest("hex");
  return { qr, md5 };
}

/** Convenience wrapper that pulls merchant defaults from the environment. */
export function generateInvoiceKhqr(opts: {
  amount: number;
  currency: KhqrCurrency;
  billNumber: string;
}) {
  return generateKhqr({
    bakongId: env.KHQR_BAKONG_ID,
    merchantName: env.KHQR_MERCHANT_NAME,
    merchantCity: env.KHQR_MERCHANT_CITY,
    mcc: env.KHQR_MCC,
    amount: opts.amount,
    currency: opts.currency,
    billNumber: opts.billNumber,
  });
}

/**
 * Ask the Bakong Open API whether a KHQR (identified by the md5 of its payload)
 * has been paid. Requires BAKONG_API_TOKEN. Returns true when settled.
 *
 * Docs: https://api-bakong.nbc.gov.kh  →  POST /v1/check_transaction_by_md5
 */
export async function checkBakongTransaction(md5: string): Promise<{
  paid: boolean;
  raw?: unknown;
}> {
  if (!env.BAKONG_API_TOKEN) {
    // No token configured — caller should treat this as "cannot verify yet".
    return { paid: false, raw: { note: "BAKONG_API_TOKEN not set" } };
  }
  const res = await fetch(`${env.BAKONG_API_URL}/v1/check_transaction_by_md5`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${env.BAKONG_API_TOKEN}`,
    },
    body: JSON.stringify({ md5 }),
  });
  const raw = await res.json().catch(() => ({}));
  // Bakong returns responseCode 0 + data when the transaction is found/settled.
  const paid = (raw as any)?.responseCode === 0 && !!(raw as any)?.data;
  return { paid, raw };
}
