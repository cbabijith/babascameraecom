// Route manifest: the storefront's Next API route modules mapped onto Hono
// paths verbatim. Update by hand when apps/web/src/app/api/** changes:
//   [id]      -> :id
//   [...path] -> *          (wildcardParam: "path")
// Next.js-specific imports inside those modules are shimmed via preload.ts.

import * as r0 from "../../web/src/app/api/payments/razorpay/verify/route.ts";
import * as r1 from "../../web/src/app/api/storefront/home/route.ts";
import * as r2 from "../../web/src/app/api/storefront/contact/route.ts";
import * as r3 from "../../web/src/app/api/storefront/auth/sign-up/route.ts";
import * as r4 from "../../web/src/app/api/storefront/auth/google/route.ts";
import * as r5 from "../../web/src/app/api/storefront/auth/forgot-password/route.ts";
import * as r6 from "../../web/src/app/api/storefront/auth/reset-password/route.ts";
import * as r7 from "../../web/src/app/api/storefront/auth/sign-in/route.ts";
import * as r8 from "../../web/src/app/api/storefront/auth/sign-out/route.ts";
import * as r9 from "../../web/src/app/api/storefront/legacy/[...path]/route.ts";
import * as r10 from "../../web/src/app/api/storefront/checkout/route.ts";
import * as r11 from "../../web/src/app/api/storefront/cart-summary/route.ts";
import * as r12 from "../../web/src/app/api/storefront/cart/coupon/route.ts";
import * as r13 from "../../web/src/app/api/storefront/cart/items/route.ts";
import * as r14 from "../../web/src/app/api/storefront/newsletter/route.ts";
import * as r15 from "../../web/src/app/api/storefront/account/profile/route.ts";
import * as r16 from "../../web/src/app/api/storefront/account/addresses/route.ts";
import * as r17 from "../../web/src/app/api/storefront/account/addresses/[id]/route.ts";
import * as r18 from "../../web/src/app/api/storefront/account/addresses/[id]/default/route.ts";
import * as r19 from "../../web/src/app/api/storefront/wishlist/toggle/route.ts";
import * as r20 from "../../web/src/app/api/storefront/reviews/route.ts";
import * as r21 from "../../web/src/app/api/auth/[...all]/route.ts";
import * as r22 from "../../web/src/app/api/auth/error/route.ts";
import * as r23 from "../../web/src/app/api/health/route.ts";
import * as r24 from "../../web/src/app/api/health/live/route.ts";
import * as r25 from "../../web/src/app/api/internal/jobs/route.ts";
import * as r26 from "../../web/src/app/api/mcp/route.ts";
import * as r27 from "../../web/src/app/api/search/suggestions/route.ts";
import * as r28 from "../../web/src/app/api/orders/[id]/invoice/route.ts";
import * as r29 from "../../web/src/app/api/webhooks/razorpay/route.ts";
import * as r30 from "../../web/src/app/api/media/[...path]/route.ts";

export interface PortedRoute {
  url: string;
  honoPath: string;
  wildcardParam: string | null;
  module: Record<string, unknown>;
}

export const portedRoutes: PortedRoute[] = [
  { url: "/api/payments/razorpay/verify", honoPath: "/api/payments/razorpay/verify", wildcardParam: null, module: r0 },
  { url: "/api/storefront/home", honoPath: "/api/storefront/home", wildcardParam: null, module: r1 },
  { url: "/api/storefront/contact", honoPath: "/api/storefront/contact", wildcardParam: null, module: r2 },
  { url: "/api/storefront/auth/sign-up", honoPath: "/api/storefront/auth/sign-up", wildcardParam: null, module: r3 },
  { url: "/api/storefront/auth/google", honoPath: "/api/storefront/auth/google", wildcardParam: null, module: r4 },
  { url: "/api/storefront/auth/forgot-password", honoPath: "/api/storefront/auth/forgot-password", wildcardParam: null, module: r5 },
  { url: "/api/storefront/auth/reset-password", honoPath: "/api/storefront/auth/reset-password", wildcardParam: null, module: r6 },
  { url: "/api/storefront/auth/sign-in", honoPath: "/api/storefront/auth/sign-in", wildcardParam: null, module: r7 },
  { url: "/api/storefront/auth/sign-out", honoPath: "/api/storefront/auth/sign-out", wildcardParam: null, module: r8 },
  { url: "/api/storefront/legacy/*", honoPath: "/api/storefront/legacy/*", wildcardParam: "path", module: r9 },
  { url: "/api/storefront/checkout", honoPath: "/api/storefront/checkout", wildcardParam: null, module: r10 },
  { url: "/api/storefront/cart-summary", honoPath: "/api/storefront/cart-summary", wildcardParam: null, module: r11 },
  { url: "/api/storefront/cart/coupon", honoPath: "/api/storefront/cart/coupon", wildcardParam: null, module: r12 },
  { url: "/api/storefront/cart/items", honoPath: "/api/storefront/cart/items", wildcardParam: null, module: r13 },
  { url: "/api/storefront/newsletter", honoPath: "/api/storefront/newsletter", wildcardParam: null, module: r14 },
  { url: "/api/storefront/account/profile", honoPath: "/api/storefront/account/profile", wildcardParam: null, module: r15 },
  { url: "/api/storefront/account/addresses", honoPath: "/api/storefront/account/addresses", wildcardParam: null, module: r16 },
  { url: "/api/storefront/account/addresses/:id", honoPath: "/api/storefront/account/addresses/:id", wildcardParam: null, module: r17 },
  { url: "/api/storefront/account/addresses/:id/default", honoPath: "/api/storefront/account/addresses/:id/default", wildcardParam: null, module: r18 },
  { url: "/api/storefront/wishlist/toggle", honoPath: "/api/storefront/wishlist/toggle", wildcardParam: null, module: r19 },
  { url: "/api/storefront/reviews", honoPath: "/api/storefront/reviews", wildcardParam: null, module: r20 },
  { url: "/api/auth/*", honoPath: "/api/auth/*", wildcardParam: "all", module: r21 },
  { url: "/api/auth/error", honoPath: "/api/auth/error", wildcardParam: null, module: r22 },
  { url: "/api/health", honoPath: "/api/health", wildcardParam: null, module: r23 },
  { url: "/api/health/live", honoPath: "/api/health/live", wildcardParam: null, module: r24 },
  { url: "/api/internal/jobs", honoPath: "/api/internal/jobs", wildcardParam: null, module: r25 },
  { url: "/api/mcp", honoPath: "/api/mcp", wildcardParam: null, module: r26 },
  { url: "/api/search/suggestions", honoPath: "/api/search/suggestions", wildcardParam: null, module: r27 },
  { url: "/api/orders/:id/invoice", honoPath: "/api/orders/:id/invoice", wildcardParam: null, module: r28 },
  { url: "/api/webhooks/razorpay", honoPath: "/api/webhooks/razorpay", wildcardParam: null, module: r29 },
  { url: "/api/media/*", honoPath: "/api/media/*", wildcardParam: "path", module: r30 },
];
