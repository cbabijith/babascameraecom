"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { Copy } from "lucide-react";
import { toast } from "sonner";

interface UPIQRCodeCardProps {
  merchantName?: string;
  vpa: string;
  amountINR?: number | null;
  className?: string;
}

/** ---- Minimal types for qr-code-styling (enough for our usage) ---- */
type ECC = "L" | "M" | "Q" | "H";

interface QRCodeStylingInstance {
  update(options: { data?: string }): void;
  append(element: HTMLElement): void;
}

type QRCodeStylingCtor = new (options: {
  width: number;
  height: number;
  type: "svg" | "canvas";
  data: string;
  dotsOptions?: { color?: string; type?: string };
  cornersSquareOptions?: { type?: string; color?: string };
  cornersDotOptions?: { type?: string; color?: string };
  backgroundOptions?: { color?: string };
  qrOptions?: { errorCorrectionLevel?: ECC };
}) => QRCodeStylingInstance;
/** ------------------------------------------------------------------ */

export default function UPIQRCodeCard({
  merchantName = "M/S.BABA ENTERPRISES PRIVATE LIMITED",
  vpa,
  amountINR = null,
  className = "",
}: UPIQRCodeCardProps) {
  const qrContainerRef = useRef<HTMLDivElement | null>(null);
  const qrRef = useRef<QRCodeStylingInstance | null>(null);
  const [QRCodeStylingMod, setQRCodeStylingMod] = useState<QRCodeStylingCtor | null>(null);

  // Minimal, standards-friendly UPI intent
  const upiUri = useMemo(() => {
    const params = new URLSearchParams({
      pa: vpa.trim(),
      pn: merchantName.trim(),
      cu: "INR",
    });
    if (amountINR && amountINR > 0) params.set("am", amountINR.toFixed(2));
    return `upi://pay?${params.toString()}`;
  }, [vpa, merchantName, amountINR]);

  // Lazy import to avoid SSR issues
  useEffect(() => {
    let mounted = true;
    import("qr-code-styling").then((m) => {
      if (!mounted) return;
      // Support both ESM default and CJS export shapes
      const ctor = (m as { default?: QRCodeStylingCtor }).default ?? (m as unknown as QRCodeStylingCtor);
      setQRCodeStylingMod(() => ctor);
    });
    return () => {
      mounted = false;
    };
  }, []);

  // Create / Update QR (slightly rounded, still high contrast)
  useEffect(() => {
    if (!QRCodeStylingMod || !qrContainerRef.current) return;

    if (qrRef.current) {
      qrRef.current.update({ data: upiUri });
      return;
    }

    const instance = new QRCodeStylingMod({
      width: 280,
      height: 280,
      type: "svg",
      data: upiUri,
      dotsOptions: { color: "#000000", type: "rounded" },
      cornersSquareOptions: { type: "extra-rounded", color: "#000000" },
      cornersDotOptions: { type: "dot", color: "#000000" },
      backgroundOptions: { color: "#FFFFFF" },
      qrOptions: { errorCorrectionLevel: "Q" },
    });

    qrContainerRef.current.innerHTML = "";
    instance.append(qrContainerRef.current);
    qrRef.current = instance;
  }, [QRCodeStylingMod, upiUri]);

  const copyVPA = async () => {
    try {
      await navigator.clipboard.writeText(vpa);
      toast.success("UPI ID copied");
    } catch {
      // no-op
    }
  };

  return (
    <div className={["rounded-xl p-4 bg-white border border-[#E5E7EB]", className].join(" ")}>
      <h3 className="text-[18px] font-semibold text-[#111827] mb-2">UPI QR</h3>
      <p className="text-sm text-[#4B5563] mb-4">
        Pay <span className="font-medium text-[#111827]">{merchantName}</span>
      </p>

      {/* Rounded frame + quiet zone */}
      <div className="flex items-center justify-center">
        <div className="bg-white p-1 border border-[#E5E7EB] rounded-xl" style={{ lineHeight: 0 }}>
          <div className="rounded-lg overflow-hidden">
            <div ref={qrContainerRef} aria-label="UPI QR Code" />
          </div>
        </div>
      </div>

      {/* UPI + optional amount */}
      <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="relative rounded-md border border-[#E5E7EB] p-3 pr-10">
          <div className="text-xs text-[#6B7280]">UPI ID</div>
          <div className="text-sm font-medium break-all">{vpa}</div>
          <button
            type="button"
            onClick={copyVPA}
            aria-label="Copy UPI ID"
            className="absolute right-2 top-1/2 -translate-y-1/2 inline-flex items-center justify-center rounded border border-[#E5E7EB] p-1.5 hover:bg-gray-50"
          >
            <Copy className="h-4 w-4 text-[#111827]" />
          </button>
        </div>

        {amountINR ? (
          <div className="rounded-md border border-[#E5E7EB] p-3">
            <div className="text-xs text-[#6B7280]">Amount</div>
            <div className="text-sm font-medium">₹{amountINR.toFixed(2)}</div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
