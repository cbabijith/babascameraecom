import { getMcpConnectToken } from "@babascamera/db";

import {
  addProductImage,
  createProduct,
  getProduct,
  listBrands,
  listCategories,
  removeProductImage,
  searchProducts,
  ToolError,
  updateProduct,
} from "@/lib/mcp/catalog-tools";

/**
 * Storefront MCP server (streamable HTTP, JSON responses) for ChatGPT
 * connectors / Claude custom connectors. Auth model per the store owner's
 * request: possessing the link IS the credential — the token rides in the
 * URL (?token=…) or an Authorization: Bearer header. The token lives in
 * the settings table (see @babascamera/db ensureMcpConnectToken) and can
 * be minted/rotated from the admin panel's /api/admin/mcp/link endpoint.
 */

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const SERVER_INFO = {
  name: "babas-camera-store",
  version: "1.0.0",
};

const CORS_HEADERS: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, Mcp-Session-Id, Mcp-Protocol-Version",
  "Access-Control-Exposed-Headers": "Mcp-Session-Id",
};

function json(body: unknown, status = 200): Response {
  return Response.json(body, {
    status,
    headers: {
      ...CORS_HEADERS,
      "Cache-Control": "no-store",
    },
  });
}

async function authorized(request: Request): Promise<string | null> {
  const url = new URL(request.url);
  const provided =
    url.searchParams.get("token")?.trim() ||
    (request.headers.get("authorization")?.startsWith("Bearer ")
      ? request.headers.get("authorization")!.slice(7).trim()
      : "") ||
    url.searchParams.get("key")?.trim() ||
    "";
  if (!provided) return null;
  const token = await getMcpConnectToken();
  if (!token) return null;
  return provided === token ? token : null;
}

/* ----------------------------- tool registry ----------------------------- */

type ToolHandler = (input: Record<string, unknown>) => Promise<unknown>;

interface ToolDefinition {
  description: string;
  inputSchema: Record<string, unknown>;
  handler: ToolHandler;
}

const str = (description: string) => ({ type: "string", description });
const int = (description: string) => ({ type: "integer", description });
const num = (description: string) => ({ type: "number", description });
const bool = (description: string) => ({ type: "boolean", description });

const TOOLS: Record<string, ToolDefinition> = {
  search_products: {
    description:
      "Search the product catalogue. Returns id, name, sku, price, stock and status for each match.",
    inputSchema: {
      type: "object",
      properties: {
        query: str("Search term matched against product name and SKU."),
        category: str("Filter by category name."),
        brand: str("Filter by brand name."),
        includeInactive: bool("Include deactivated products (default false)."),
        limit: int("Max results 1-100 (default 20)."),
      },
    },
    handler: (input) =>
      searchProducts({
        query: input.query as string | undefined,
        category: input.category as string | undefined,
        brand: input.brand as string | undefined,
        includeInactive: Boolean(input.includeInactive),
        limit: input.limit as number | undefined,
      }),
  },
  get_product: {
    description:
      "Get full product details (description, category, brand, pricing, stock, images) by id or slug.",
    inputSchema: {
      type: "object",
      properties: { idOrSlug: str("Product id or slug (from search_products).") },
      required: ["idOrSlug"],
    },
    handler: (input) => getProduct({ idOrSlug: String(input.idOrSlug) }),
  },
  create_product: {
    description:
      "Add a new product to the store. Images given as public https URLs are imported into the store's media storage automatically. Missing categories/brands are created by name.",
    inputSchema: {
      type: "object",
      properties: {
        name: str("Product name, e.g. 'Nikon Z6 III Body'"),
        price: num("Selling price in INR, e.g. 95000"),
        mrp: num("List/MRP price in INR (defaults to price)"),
        stock: int("Stock quantity (default 0)"),
        sku: str("Optional SKU — generated from the name when omitted"),
        category: str("Category name or id, e.g. 'Cameras'"),
        brand: str("Brand name or id, e.g. 'Nikon'"),
        description: str("Full description"),
        shortDescription: str("One-line summary shown on cards"),
        isFeatured: bool("Feature on the homepage"),
        imageUrls: { type: "array", items: { type: "string" }, description: "Public https image URLs (max 6) to import" },
      },
      required: ["name", "price", "category"],
    },
    handler: (input) =>
      createProduct({
        name: String(input.name ?? ""),
        price: Number(input.price),
        mrp: input.mrp != null ? Number(input.mrp) : undefined,
        stock: input.stock != null ? Number(input.stock) : undefined,
        sku: input.sku as string | undefined,
        category: String(input.category ?? ""),
        brand: (input.brand as string | undefined) ?? undefined,
        description: input.description as string | undefined,
        shortDescription: input.shortDescription as string | undefined,
        isFeatured: input.isFeatured as boolean | undefined,
        imageUrls: (input.imageUrls as string[] | undefined) ?? undefined,
      }),
  },
  update_product: {
    description:
      "Edit an existing product — price, stock, name, description, category, brand, featured, warranty, or deactivate with isActive:false. Returns the updated product.",
    inputSchema: {
      type: "object",
      properties: {
        idOrSlug: str("Product id or slug"),
        name: str("New name"),
        price: num("New selling price (INR)"),
        mrp: num("New MRP (INR)"),
        stock: int("New stock quantity"),
        category: str("New category name or id"),
        brand: str("New brand name or id (empty string clears it)"),
        description: str("New description"),
        shortDescription: str("New one-line summary"),
        warranty: str("Warranty text"),
        isFeatured: bool("Feature on homepage"),
        isActive: bool("true to list, false to hide from the storefront"),
      },
      required: ["idOrSlug"],
    },
    handler: (input) =>
      updateProduct({
        idOrSlug: String(input.idOrSlug),
        name: input.name as string | undefined,
        price: input.price != null ? Number(input.price) : undefined,
        mrp: input.mrp != null ? Number(input.mrp) : undefined,
        stock: input.stock != null ? Number(input.stock) : undefined,
        category: input.category as string | undefined,
        brand: input.brand as string | null | undefined,
        description: input.description as string | undefined,
        shortDescription: input.shortDescription as string | undefined,
        warranty: input.warranty as string | undefined,
        isFeatured: input.isFeatured as boolean | undefined,
        isActive: input.isActive as boolean | undefined,
      }),
  },
  add_product_image: {
    description:
      "Import a public https image URL into the product's gallery (uploaded to the store's own media storage). Defaults to the primary image.",
    inputSchema: {
      type: "object",
      properties: {
        idOrSlug: str("Product id or slug"),
        imageUrl: str("Public https:// image URL"),
        primary: bool("Set as the main image (default true)"),
      },
      required: ["idOrSlug", "imageUrl"],
    },
    handler: (input) =>
      addProductImage({
        idOrSlug: String(input.idOrSlug),
        imageUrl: String(input.imageUrl),
        primary: input.primary as boolean | undefined,
      }),
  },
  remove_product_image: {
    description: "Remove an image from a product's gallery by its exact stored URL (see get_product).",
    inputSchema: {
      type: "object",
      properties: {
        idOrSlug: str("Product id or slug"),
        imageUrl: str("Exact stored image URL from get_product"),
      },
      required: ["idOrSlug", "imageUrl"],
    },
    handler: (input) =>
      removeProductImage({
        idOrSlug: String(input.idOrSlug),
        imageUrl: String(input.imageUrl),
      }),
  },
  list_categories: {
    description: "List product categories (id, name, slug, active).",
    inputSchema: { type: "object", properties: {} },
    handler: () => listCategories(),
  },
  list_brands: {
    description: "List product brands (id, name, slug, active).",
    inputSchema: { type: "object", properties: {} },
    handler: () => listBrands(),
  },
};

/* ----------------------------- JSON-RPC core ----------------------------- */

function rpcResult(id: unknown, result: unknown): Response {
  return json({ jsonrpc: "2.0", id, result });
}

function rpcError(id: unknown, code: number, message: string): Response {
  return json({ jsonrpc: "2.0", id, error: { code, message } });
}

async function handleRpc(message: {
  id?: unknown;
  method?: string;
  params?: Record<string, unknown>;
}): Promise<Response> {
  const { id, method, params } = message;

  if (method === "initialize") {
    const requested = (params?.protocolVersion as string) || "2025-03-26";
    return rpcResult(id, {
      protocolVersion: requested,
      capabilities: { tools: { listChanged: false } },
      serverInfo: SERVER_INFO,
      instructions:
        "Babas Camera store catalogue. Ask me to list categories/brands, search products, add or edit products, and import product images from URLs. Prices are in INR.",
    });
  }

  if (method === "ping") return rpcResult(id, {});

  if (method === "tools/list") {
    return rpcResult(id, {
      tools: Object.entries(TOOLS).map(([name, tool]) => ({
        name,
        description: tool.description,
        inputSchema: tool.inputSchema,
      })),
    });
  }

  if (method === "tools/call") {
    const toolName = String(params?.name ?? "");
    const tool = TOOLS[toolName];
    if (!tool) {
      return rpcResult(id, {
        content: [{ type: "text", text: `Unknown tool "${toolName}".` }],
        isError: true,
      });
    }
    const args = (params?.arguments as Record<string, unknown>) ?? {};
    try {
      const result = await tool.handler(args);
      return rpcResult(id, {
        content: [
          {
            type: "text",
            text: typeof result === "string" ? result : JSON.stringify(result, null, 2),
          },
        ],
      });
    } catch (error) {
      const message =
        error instanceof ToolError
          ? error.message
          : "The tool failed while running. Check the arguments and try again.";
      if (!(error instanceof ToolError)) {
        console.error("MCP tool failure", { tool: toolName, error });
      }
      return rpcResult(id, {
        content: [{ type: "text", text: message }],
        isError: true,
      });
    }
  }

  if (method?.startsWith("notifications/")) {
    return new Response(null, { status: 202, headers: CORS_HEADERS });
  }

  return rpcError(id, -32601, `Method not found: ${method ?? "(none)"}`);
}

/* ------------------------------- handlers -------------------------------- */

export async function OPTIONS(): Promise<Response> {
  return new Response(null, { status: 204, headers: CORS_HEADERS });
}

export async function GET(request: Request): Promise<Response> {
  if (!(await authorized(request))) {
    return json({ error: "unauthorized" }, 401);
  }
  // Streamable HTTP servers may decline the SSE stream; clients then rely
  // on POST-only JSON exchanges, which is all this server implements.
  return json(
    {
      jsonrpc: "2.0",
      error: {
        code: -32000,
        message: "SSE stream not offered. Send JSON-RPC requests via POST to this URL.",
      },
    },
    405,
  );
}

export async function POST(request: Request): Promise<Response> {
  if (!(await authorized(request))) {
    return json(
      {
        jsonrpc: "2.0",
        id: null,
        error: { code: -32001, message: "Unauthorized. Use the full connector link (?token=…)." },
      },
      401,
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return rpcError(null, -32700, "Parse error: body must be a single JSON-RPC message.");
  }

  // Batch requests are part of JSON-RPC 2.0; handle both shapes.
  if (Array.isArray(body)) {
    const responses: unknown[] = [];
    for (const message of body) {
      const single = await handleRpc(message as Parameters<typeof handleRpc>[0]);
      if (single.status !== 202) responses.push(await single.json());
    }
    return json(responses);
  }

  return handleRpc(body as Parameters<typeof handleRpc>[0]);
}
