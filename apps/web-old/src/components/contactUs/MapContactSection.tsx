"use client";

import React from "react";
import ContactShell from "./ContactShell";

const LAT = 8.486830270641086;
const LNG = 76.94803114533138;
const MAPS_EMBED = `https://www.google.com/maps?q=${LAT},${LNG}&z=16&output=embed`;
const MAPS_LINK = `https://www.google.com/maps/dir/?api=1&destination=${LAT},${LNG}`;

export default function MapWithContact() {
  return (
    <section className="relative isolate">
      {/* Visible map iframe */}
      <div className="relative z-0 left-1/2 right-1/2 w-screen -ml-[50vw] h-[300px] sm:h-[340px] md:h-[400px]">
        <a
          href={MAPS_LINK}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Open location in Google Maps"
          className="absolute inset-0 z-[1] md:hidden"
        />

        <iframe
          title="Babas Camera Shop Location"
          src={MAPS_EMBED}
          className="absolute inset-0 h-full w-full border-0 z-0 pointer-events-none md:pointer-events-auto"
          loading="lazy"
        />
      </div>

      {/* Contact card */}
      <div
        className="
          mt-4
          sm:-mt-[44px]
          md:-mt-[72px]
          px-4 sm:px-6 lg:px-8
          relative z-[100]
        "
      >
        <div className="mx-auto max-w-[1560px]">
          <ContactShell />
        </div>
      </div>
    </section>
  );
}