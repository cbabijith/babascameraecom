import { NextResponse } from "next/server";
import { listCatalogProducts } from "@/lib/data/storefront";

export async function GET(request: Request) {
  const query = new URL(request.url).searchParams.get("q")?.trim() ?? "";
  if (query.length < 2) return NextResponse.json({ suggestions: [] });
  const products = await listCatalogProducts({ query, limit: 6 });
  return NextResponse.json(
    {
      suggestions: products.map(({ id, name, slug }) => ({ id, name, slug })),
    },
    { headers: { "Cache-Control": "private, max-age=30" } },
  );
}
