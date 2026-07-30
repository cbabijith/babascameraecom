import type {
  HomeBanner,
  HomeBannerRecord,
  HomeProduct,
  HomeProductRecord,
  HomeRepository,
  StorefrontHomeSuccess,
} from "../types";
import { safeDestinationUrl, safePublicMediaReference } from "../utils/public-urls";

export const HOME_CATEGORY_LIMIT = 10;
export const HOME_BRAND_LIMIT = 16;
export const HOME_BANNER_LIMIT = 5;

export function isBannerCurrentlyActive(
  banner: Pick<HomeBannerRecord, "isActive" | "startsAt" | "endsAt">,
  now: Date,
): boolean {
  return (
    banner.isActive &&
    (!banner.startsAt || banner.startsAt <= now) &&
    (!banner.endsAt || banner.endsAt > now)
  );
}

function publicBanner(banner: HomeBannerRecord, now: Date): HomeBanner | null {
  if (!isBannerCurrentlyActive(banner, now)) return null;
  const desktopMediaUrl = safePublicMediaReference(banner.desktopMediaUrl);
  const mobileMediaUrl = safePublicMediaReference(banner.mobileMediaUrl);
  const posterUrl = safePublicMediaReference(banner.posterUrl);
  if (!desktopMediaUrl) return null;
  if (banner.mediaType === "image" && !mobileMediaUrl) return null;
  if (banner.mediaType === "video" && !posterUrl) return null;

  return {
    id: banner.id,
    mediaType: banner.mediaType,
    desktopMediaUrl,
    mobileMediaUrl,
    posterUrl,
    altText: banner.altText,
    headline: banner.headline,
    subheading: banner.subheading,
    buttonLabel: banner.buttonLabel,
    destinationUrl: safeDestinationUrl(banner.destinationUrl),
    openInNewTab: banner.openInNewTab,
    position: banner.position,
  };
}

function discountPercent(mrp: string, salePrice: string): number {
  const list = Number(mrp);
  const sale = Number(salePrice);
  if (!Number.isFinite(list) || !Number.isFinite(sale) || list <= 0 || sale >= list) {
    return 0;
  }
  return Math.min(Math.max(Math.round(((list - sale) / list) * 100), 0), 100);
}

export function toPublicHomeProduct(product: HomeProductRecord): HomeProduct | null {
  if (
    !product.isActive ||
    !product.categoryIsActive ||
    product.stock <= 0 ||
    Number(product.salePrice) > Number(product.mrp)
  ) {
    return null;
  }
  const imageUrl = safePublicMediaReference(product.imageUrl);
  return {
    id: product.id,
    name: product.name,
    slug: product.slug,
    brand:
      product.brandName && product.brandSlug
        ? { name: product.brandName, slug: product.brandSlug }
        : null,
    category: {
      name: product.categoryName,
      slug: product.categorySlug,
    },
    image: imageUrl ? { url: imageUrl, altText: product.imageAltText } : null,
    mrp: product.mrp,
    salePrice: product.salePrice,
    discountPercent: discountPercent(product.mrp, product.salePrice),
    availability: "in_stock",
  };
}

function chooseUniqueProducts(
  ids: string[],
  products: Map<string, HomeProduct>,
  used: Set<string>,
  limit: number,
): HomeProduct[] {
  const result: HomeProduct[] = [];
  for (const id of ids) {
    const product = products.get(id);
    if (!product || used.has(id)) continue;
    used.add(id);
    result.push(product);
    if (result.length === limit) break;
  }
  return result;
}

export async function getStorefrontHome(
  repository: HomeRepository,
  options: { sectionLimit: number; now?: Date },
): Promise<StorefrontHomeSuccess> {
  const now = options.now ?? new Date();
  const candidateLimit = Math.min(options.sectionLimit * 4, 48);
  const [bannerRows, categories, brands, candidates] = await Promise.all([
    repository.listBannerCandidates(),
    repository.listCategories(HOME_CATEGORY_LIMIT),
    repository.listBrands(HOME_BRAND_LIMIT),
    repository.listProductCandidates(candidateLimit),
  ]);

  const allIds = [
    ...new Set([
      ...candidates.featured,
      ...candidates.bestSellers,
      ...candidates.newArrivals,
      ...candidates.offers,
    ]),
  ];
  const productRows = await repository.listProductsByIds(allIds);
  const products = new Map<string, HomeProduct>();
  for (const row of productRows) {
    const product = toPublicHomeProduct(row);
    if (product) products.set(product.id, product);
  }

  const used = new Set<string>();
  return {
    success: true,
    data: {
      banners: bannerRows
        .sort((left, right) => left.position - right.position)
        .map((banner) => publicBanner(banner, now))
        .filter((banner): banner is HomeBanner => banner !== null)
        .slice(0, HOME_BANNER_LIMIT),
      categories: categories
        .filter((category) => category.isActive)
        .sort(
          (left, right) => left.position - right.position || left.name.localeCompare(right.name),
        )
        .map(({ isActive: _isActive, ...category }) => category)
        .slice(0, HOME_CATEGORY_LIMIT),
      brands: brands
        .filter((brand) => brand.isActive)
        .sort(
          (left, right) => left.position - right.position || left.name.localeCompare(right.name),
        )
        .map(({ isActive: _isActive, ...brand }) => brand)
        .slice(0, HOME_BRAND_LIMIT),
      productSections: {
        featured: chooseUniqueProducts(candidates.featured, products, used, options.sectionLimit),
        bestSellers: chooseUniqueProducts(
          candidates.bestSellers,
          products,
          used,
          options.sectionLimit,
        ),
        newArrivals: chooseUniqueProducts(
          candidates.newArrivals,
          products,
          used,
          options.sectionLimit,
        ),
        offers: chooseUniqueProducts(candidates.offers, products, used, options.sectionLimit),
      },
    },
    meta: {
      generatedAt: now.toISOString(),
      currency: "INR",
    },
  };
}
