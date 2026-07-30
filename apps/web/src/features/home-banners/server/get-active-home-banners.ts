import "server-only";

import { and, asc, db, eq, homeBanners, isNull, lte, or, gt } from "@babascamera/db";

import type { StorefrontHomeBanner } from "../types";

export async function getActiveHomeBanners(): Promise<StorefrontHomeBanner[]> {
  const now = new Date();
  return db.select({
    id: homeBanners.id,
    mediaType: homeBanners.mediaType,
    desktopMediaUrl: homeBanners.desktopMediaUrl,
    mobileMediaUrl: homeBanners.mobileMediaUrl,
    posterUrl: homeBanners.posterUrl,
    altText: homeBanners.altText,
    headline: homeBanners.headline,
    subheading: homeBanners.subheading,
    buttonLabel: homeBanners.buttonLabel,
    destinationUrl: homeBanners.destinationUrl,
    openInNewTab: homeBanners.openInNewTab,
  })
    .from(homeBanners)
    .where(and(
      eq(homeBanners.isActive, true),
      or(isNull(homeBanners.startsAt), lte(homeBanners.startsAt, now)),
      or(isNull(homeBanners.endsAt), gt(homeBanners.endsAt, now)),
    ))
    .orderBy(asc(homeBanners.position))
    .limit(5);
}
