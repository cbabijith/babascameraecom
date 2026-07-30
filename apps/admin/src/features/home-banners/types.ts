import type { HomeBannerMediaType } from "@babascamera/db";

export interface HomeBanner {
  id: string;
  internalName: string;
  mediaType: HomeBannerMediaType;
  desktopMediaUrl: string;
  mobileMediaUrl: string | null;
  posterUrl: string | null;
  altText: string;
  headline: string | null;
  subheading: string | null;
  buttonLabel: string | null;
  destinationUrl: string | null;
  openInNewTab: boolean;
  position: number;
  isActive: boolean;
  startsAt: string | null;
  endsAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface UploadedBannerMedia {
  url: string;
  path: string;
  contentType: string;
}

export interface SignedBannerUpload {
  path: string;
  token: string;
  contentType: "video/mp4";
  maximumBytes: number;
}

export interface HomeBannerInput {
  internalName: string;
  mediaType: HomeBannerMediaType;
  desktopMediaUrl: string;
  mobileMediaUrl: string | null;
  posterUrl: string | null;
  altText: string;
  headline: string | null;
  subheading: string | null;
  buttonLabel: string | null;
  destinationUrl: string | null;
  openInNewTab: boolean;
  isActive: boolean;
  startsAt: Date | null;
  endsAt: Date | null;
}
