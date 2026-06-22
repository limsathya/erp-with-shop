import { useEffect, useRef, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Loader2, CheckCircle2, RefreshCw } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { api, apiError } from "@/lib/api";
import { formatMoney } from "@/lib/utils";

interface Props {
  invoiceId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPaid?: () => void;
}

interface KhqrData {
  qr: string;
  md5: string;
  amount: number;
  currency: "USD" | "KHR";
  invoiceNumber: string;
}

export function KhqrDialog({ invoiceId, open, onOpenChange, onPaid }: Props) {
  const { t } = useTranslation();
  const [data, setData] = useState<KhqrData | null>(null);
  const [loading, setLoading] = useState(false);
  const [paid, setPaid] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const generate = async () => {
    if (!invoiceId) return;
    setLoading(true);
    setPaid(false);
    setData(null);
    try {
      const res = await api.post("/payments/khqr", { invoiceId });
      setData(res.data);
    } catch (e) {
      toast.error(apiError(e));
    } finally {
      setLoading(false);
    }
  };

  // Generate a fresh QR whenever the dialog opens.
  useEffect(() => {
    if (open && invoiceId) generate();
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, invoiceId]);

  // Poll for payment status while a QR is on screen.
  useEffect(() => {
    if (!data?.md5 || paid) return;
    pollRef.current = setInterval(async () => {
      try {
        const res = await api.get(`/payments/status/${data.md5}`);
        if (res.data.paid) {
          setPaid(true);
          if (pollRef.current) clearInterval(pollRef.current);
          toast.success(t("payment.paid"));
          onPaid?.();
        }
      } catch {
        /* keep polling */
      }
    }, 4000);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data?.md5, paid]);

  const recordManual = async (method: "CASH" | "CARD") => {
    if (!invoiceId || !data) return;
    try {
      await api.post("/payments/manual", { invoiceId, method, amount: data.amount });
      setPaid(true);
      toast.success(t("payment.paid"));
      onPaid?.();
    } catch (e) {
      toast.error(apiError(e));
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>{t("payment.khqrTitle")}</DialogTitle>
          <DialogDescription>{t("payment.scanInstruction")}</DialogDescription>
        </DialogHeader>

        <div className="flex flex-col items-center gap-4 py-2">
          {loading && <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />}

          {paid && (
            <div className="flex flex-col items-center gap-2 py-6 text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="h-14 w-14" />
              <p className="font-medium">{t("payment.paid")}</p>
            </div>
          )}

          {!loading && !paid && data && (
            <>
              {/* The KHQR "bank note" frame */}
              <div className="rounded-xl border bg-white p-4 shadow-sm">
                <div className="mb-3 flex items-center justify-between gap-6 border-b border-dashed pb-2">
                  <span className="text-base font-bold text-red-600">KHQR</span>
                  <span className="text-xs text-neutral-500">{data.invoiceNumber}</span>
                </div>
                <QRCodeSVG value={data.qr} size={216} level="M" includeMargin={false} />
                <div className="mt-3 border-t border-dashed pt-2 text-center">
                  <div className="text-xs text-neutral-500">{t("payment.amountDue")}</div>
                  <div className="text-xl font-bold text-neutral-900">
                    {formatMoney(data.amount, data.currency)}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                {t("payment.waiting")}
              </div>

              <div className="flex w-full flex-col gap-2 pt-2">
                <Button variant="outline" size="sm" onClick={generate}>
                  <RefreshCw className="mr-1 h-3.5 w-3.5" /> {t("payment.expired")}
                </Button>
                <div className="flex gap-2">
                  <Button variant="secondary" size="sm" className="flex-1" onClick={() => recordManual("CASH")}>
                    {t("payment.cash")}
                  </Button>
                  <Button variant="secondary" size="sm" className="flex-1" onClick={() => recordManual("CARD")}>
                    {t("payment.card")}
                  </Button>
                </div>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
