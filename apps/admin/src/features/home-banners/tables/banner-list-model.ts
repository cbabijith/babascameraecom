import type { HomeBanner } from "../types";

export function getBannerStatus(banner: HomeBanner, now = Date.now()) {
  if (!banner.isActive) return { label: "Inactive", tone: "neutral" as const };
  if (banner.startsAt && new Date(banner.startsAt).getTime() > now) {
    return { label: "Scheduled", tone: "warning" as const };
  }
  if (banner.endsAt && new Date(banner.endsAt).getTime() <= now) {
    return { label: "Ended", tone: "neutral" as const };
  }
  return { label: "Live", tone: "success" as const };
}
