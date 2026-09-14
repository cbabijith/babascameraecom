"use client";

import Script from "next/script";
import { useEffect, useRef, useState } from "react";

interface AffordabilitySuiteInstance {
  render: () => void;
}

declare global {
  interface Window {
    RazorpayAffordabilitySuite?: new (config: {
      key: string;
      amount: number;
    }) => AffordabilitySuiteInstance;
  }
}

const AFFORDABILITY_SCRIPT_SRC =
  "https://cdn.razorpay.com/widgets/affordability/affordability.js";

const WIDGET_CONTAINER_ID = "razorpay-affordability-widget";

interface RazorpayAffordabilityWidgetProps {
  /** Product price in rupees; the widget expects the amount in paise. */
  amount: number;
}

export default function RazorpayAffordabilityWidget({
  amount,
}: RazorpayAffordabilityWidgetProps) {
  const key = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID;
  const amountInPaise = Math.round(amount * 100);
  const shouldRender = Boolean(key) && amountInPaise > 0;

  const [scriptReady, setScriptReady] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!scriptReady || !key || amountInPaise <= 0) return;
    const container = containerRef.current;
    if (!container || !window.RazorpayAffordabilitySuite) return;

    // The suite appends into the container, so clear it before rendering
    // again with an updated amount (e.g. after a variant switch).
    container.innerHTML = "";
    const suite = new window.RazorpayAffordabilitySuite({
      key,
      amount: amountInPaise,
    });
    suite.render();
  }, [scriptReady, key, amountInPaise]);

  if (!shouldRender) return null;

  return (
    <>
      <Script
        id="razorpay-affordability-suite"
        src={AFFORDABILITY_SCRIPT_SRC}
        strategy="afterInteractive"
        onReady={() => setScriptReady(true)}
      />
      <div ref={containerRef} id={WIDGET_CONTAINER_ID} />
    </>
  );
}
