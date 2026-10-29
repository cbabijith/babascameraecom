/**
 * RSC-support endpoints for the Vercel storefront.
 *
 * The Next.js server components on Vercel must not touch the database, so
 * these thin routes call the storefront's own server modules (imported from
 * apps/web) here on the backend, where the database lives, and return the
 * exact shapes the web components expect.
 */
import { Hono } from "hono";

import { eq, getDatabase, users } from "@babascamera/db";

import {
  getActiveBrandsServer,
  getActiveBrandsWithProductsServer,
  getBannerDataServer,
  getBrandPageDataServer,
  getCategoriesServer,
  getCategoriesWithProductsServer,
  getCategoryPageDataServer,
  getHeroBannersServer,
  getPopularProductsServer,
  getProductsByCategoryServer,
} from "../../web/src/lib/serverApi.ts";
import { getCatalogProduct, listRelatedProducts } from "../../web/src/features/catalog/services/catalog-service.ts";
import { getWebAuth } from "../../web/src/lib/auth/better-auth.ts";

export const rscRoutes = new Hono();

rscRoutes.get("/banners", async (c) => c.json(await getHeroBannersServer()));
rscRoutes.get("/categories", async (c) => c.json(await getCategoriesServer()));
rscRoutes.get("/popular", async (c) => c.json(await getPopularProductsServer(Number(c.req.query("limit") ?? 10))));
rscRoutes.get("/brands", async (c) => c.json(await getActiveBrandsServer()));
rscRoutes.get("/brands-with-products", async (c) => c.json(await getActiveBrandsWithProductsServer()));
rscRoutes.get("/brand/:id/has-products", async (c) =>
  c.json({ hasProducts: await import("../../web/src/lib/serverApi.ts").then((m) => m.brandHasProductsServer(c.req.param("id"))) }),
);
rscRoutes.get("/products-by-category/:id", async (c) =>
  c.json(await getProductsByCategoryServer(c.req.param("id"), {
    limit: c.req.query("limit") ? Number(c.req.query("limit")) : undefined,
    brand: c.req.query("brand") ?? undefined,
  })),
);
rscRoutes.get("/categories-with-products", async (c) => c.json(await getCategoriesWithProductsServer()));
rscRoutes.get("/category-page/:id", async (c) =>
  c.json(await getCategoryPageDataServer(c.req.param("id"), {
    limit: c.req.query("limit") ? Number(c.req.query("limit")) : undefined,
  })),
);
rscRoutes.get("/brand-page/:id", async (c) =>
  c.json(await getBrandPageDataServer(c.req.param("id"), {
    limit: c.req.query("limit") ? Number(c.req.query("limit")) : undefined,
  })),
);
rscRoutes.get("/banner/:id", async (c) => c.json(await getBannerDataServer(c.req.param("id"))));
rscRoutes.get("/product/:id", async (c) => {
  const product = await getCatalogProduct(c.req.param("id"));
  return c.json({ product });
});
rscRoutes.get("/related/:id", async (c) => {
  const product = await getCatalogProduct(c.req.param("id"));
  if (!product) return c.json({ products: [] });
  const products = await listRelatedProducts(product);
  return c.json({ products });
});

rscRoutes.get("/session", async (c) => {
  try {
    const auth = getWebAuth();
    const session = await auth.api.getSession({ headers: c.req.raw.headers });
    if (!session?.user) return c.json({ user: null });
    const [profile] = await getDatabase()
      .select({
        id: users.id,
        email: users.email,
        name: users.name,
        fullName: users.fullName,
        phone: users.phone,
        emailVerified: users.emailVerified,
        isActive: users.isActive,
        role: users.role,
      })
      .from(users)
      .where(eq(users.id, session.user.id))
      .limit(1);
    if (!profile) return c.json({ user: null });
    return c.json({
      user: {
        id: profile.id,
        email: profile.email,
        name: profile.name ?? profile.fullName ?? profile.email.split("@")[0],
        phone: profile.phone,
        emailVerified: profile.emailVerified,
        isActive: profile.isActive,
        role: profile.role,
      },
    });
  } catch (error) {
    console.error("[rsc/session] failed", error);
    return c.json({ user: null });
  }
});

rscRoutes.get("/settings", async (c) => {
  const mod = await import("../../web/src/lib/data/settings.ts");
  return c.json(await mod.getStoreSettings());
});
