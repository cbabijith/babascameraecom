export interface StorefrontHomeBanner {
  id: string;
  mediaType: "image" | "video";
  desktopMediaUrl: string;
  mobileMediaUrl: string | null;
  posterUrl: string | null;
  altText: string;
  headline: string | null;
  subheading: string | null;
  buttonLabel: string | null;
  destinationUrl: string | null;
  openInNewTab: boolean;
}
