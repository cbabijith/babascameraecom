
import type { Metadata } from "next";
import Banner from "@/components/about/Banner";
import LegacyTimeline from "@/components/about/LegacyTimeline";
import PeopleBehind from "@/components/about/PeopleBehind";
import Awards from "@/components/about/Awards";
import StaticContent from "@/components/home/static-content";

export const metadata: Metadata = {
  title: "About • Babas",
  description: "Know our legacy, framed in time.",
};

export default function AboutPage() {
  return (
    <main className="min-h-screen bg-white">
      <Banner />
      <LegacyTimeline />
      <PeopleBehind />
      <Awards />
      <StaticContent />
    </main>
  );
}