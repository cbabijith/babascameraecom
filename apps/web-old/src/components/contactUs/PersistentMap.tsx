"use client";

import { useEffect, useRef } from "react";

const LAT = 8.486830270641086;
const LNG = 76.94803114533138;
const MAPS_EMBED = `https://www.google.com/maps?q=${LAT},${LNG}&z=16&output=embed`;

export default function PersistentMap() {
  const iframeRef = useRef<HTMLIFrameElement>(null);

  // Ensure it mounts only once
  useEffect(() => {
    if (iframeRef.current) {
      iframeRef.current.src = MAPS_EMBED;
    }
  }, []);

  return (
    <iframe
      ref={iframeRef}
      title="Preloaded Google Map"
      aria-hidden="true"
      tabIndex={-1}
      style={{
        position: "absolute",
        width: "1px",
        height: "1px",
        border: 0,
        left: "-9999px",
        top: "-9999px",
      }}
    />
  );
}
