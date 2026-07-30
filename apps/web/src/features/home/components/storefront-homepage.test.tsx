import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import type { StorefrontHomeData } from "../types";
import { autoplayAllowed, HomeBannerCarousel } from "./home-banner-carousel";
import { StorefrontHomepage } from "./storefront-homepage";

const emptyData: StorefrontHomeData = {
  banners: [],
  categories: [],
  brands: [],
  productSections: {
    featured: [],
    bestSellers: [],
    newArrivals: [],
    offers: [],
  },
};

const product = {
  id: "00000000-0000-4000-8000-000000000001",
  name: "Cinema Camera",
  slug: "cinema-camera",
  brand: { name: "Sony", slug: "sony" },
  category: { name: "Cameras", slug: "cameras" },
  image: { url: "/product/camera.png", altText: "Sony cinema camera" },
  mrp: "1000.00",
  salePrice: "800.00",
  discountPercent: 20,
  availability: "in_stock" as const,
};

describe("storefront homepage components", () => {
  it("renders returned sections and hides empty headings", () => {
    const html = renderToStaticMarkup(
      <StorefrontHomepage
        data={{
          ...emptyData,
          productSections: { ...emptyData.productSections, featured: [product] },
        }}
      />,
    );
    expect(html).toContain("Featured gear");
    expect(html).toContain("Cinema Camera");
    expect(html).toContain("20% off");
    expect(html).not.toContain("Best sellers");
    expect(html).not.toContain("New arrivals");
  });

  it("renders a useful state when every optional section is empty", () => {
    const html = renderToStaticMarkup(<StorefrontHomepage data={emptyData} />);
    expect(html).toContain("Our latest gear is being prepared");
    expect(html).not.toContain("Shop by category");
  });

  it("renders accessible carousel controls and responsive image sources", () => {
    const banners = [
      {
        id: "00000000-0000-4000-8000-000000000002",
        mediaType: "image" as const,
        desktopMediaUrl: "/desktop.webp",
        mobileMediaUrl: "/mobile.webp",
        posterUrl: null,
        altText: "Camera offer",
        headline: null,
        subheading: null,
        buttonLabel: null,
        destinationUrl: null,
        openInNewTab: false,
        position: 0,
      },
      {
        id: "00000000-0000-4000-8000-000000000003",
        mediaType: "video" as const,
        desktopMediaUrl: "/desktop.mp4",
        mobileMediaUrl: "/mobile.mp4",
        posterUrl: "/poster.webp",
        altText: "Camera film",
        headline: null,
        subheading: null,
        buttonLabel: null,
        destinationUrl: null,
        openInNewTab: false,
        position: 1,
      },
    ];
    const html = renderToStaticMarkup(<HomeBannerCarousel banners={banners} />);
    expect(html).toContain('aria-label="Previous banner"');
    expect(html).toContain('aria-label="Next banner"');
    expect(html).toContain('media="(max-width: 639px)"');
    expect(html).toContain("/mobile.webp");
    expect(html).not.toContain("<video");
  });

  it("disables automatic motion for reduced-motion and data-saving users", () => {
    expect(autoplayAllowed(false, false)).toBe(true);
    expect(autoplayAllowed(true, false)).toBe(false);
    expect(autoplayAllowed(false, true)).toBe(false);
  });
});
