import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import { getCategories } from "@/instances/categoryInstance";
import { getProductsByCategory } from "@/instances/productInstance";
import type { Category, Product } from "@/types/product";

const CACHE_KEY = "category_cache_v1";
const TTL_MS = 15 * 60 * 1000;      // 15 minutes
const VERIFY_TIMEOUT_MS = 2500;     // safer than 1200ms
const VERIFY_CONCURRENCY = 8;       // probe in batches

type CategoryState = {
  categories: Category[];
  verifiedIds: string[];
  status: "idle" | "loading" | "succeeded" | "failed";
  error?: string;
  lastLoadedAt?: number;
};

const initialState: CategoryState = {
  categories: [],
  verifiedIds: [],
  status: "idle",
};

type ProductByCategoryResponse = {
  results: Product[];
  totalCount: number;
};

function loadCache():
  | { categories: Category[]; verifiedIds: string[]; at: number }
  | null {
  try {
    const raw = sessionStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed?.at || Date.now() - parsed.at > TTL_MS) return null;
    if (!Array.isArray(parsed.categories) || !Array.isArray(parsed.verifiedIds)) return null;
    return parsed;
  } catch {
    return null;
  }
}

function saveCache(categories: Category[], verifiedIds: string[]) {
  try {
    sessionStorage.setItem(
      CACHE_KEY,
      JSON.stringify({ categories, verifiedIds, at: Date.now() })
    );
  } catch {}
}

function withTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error("timeout")), ms);
    p.then(
      (v) => { clearTimeout(t); resolve(v); },
      (e) => { clearTimeout(t); reject(e); }
    );
  });
}

// Deduplicate multiple components hydrating at once
let inflight: Promise<{ categories: Category[]; verifiedIds: string[] }> | null = null;

export const hydrateCategories = createAsyncThunk(
  "categories/hydrate",
  async () => {
    // 1) Try session cache first
    const cached = loadCache();
    if (cached) return { ...cached };

    // 2) In-flight dedupe
    if (!inflight) {
      inflight = (async () => {
        const all = (await getCategories())
          .filter((c) => c.status === "Active" && c.visibility === "Show")
          .sort((a, b) => a.position - b.position);

        // Probe ALL categories (batched to limit load)
        const verified: string[] = [];
        for (let i = 0; i < all.length; i += VERIFY_CONCURRENCY) {
          const batch = all.slice(i, i + VERIFY_CONCURRENCY);
          const results = await Promise.allSettled(
            batch.map(async (c) => {
              try {
                // pass showToast:false to avoid toast spam during background probes
                const res: ProductByCategoryResponse = await withTimeout(
                    getProductsByCategory(c._id, { limit: 1 }),
                    VERIFY_TIMEOUT_MS
                    );

                    const count =
                    res.totalCount ?? (Array.isArray(res.results) ? res.results.length : 0);
                return count > 0 ? c._id : null;
              } catch {
                return null;
              }
            })
          );
          results.forEach((r) => {
            if (r.status === "fulfilled" && r.value) verified.push(r.value);
          });
        }

        saveCache(all, verified);
        return { categories: all, verifiedIds: Array.from(new Set(verified)) };
      })();
    }

    const { categories, verifiedIds } = await inflight.finally(() => { inflight = null; });
    return { categories, verifiedIds, at: Date.now() };
  },
  {
    // Skip if fresh or already loading
    condition: (_, { getState }) => {
      const { categories } = getState() as { categories: CategoryState };
      if (categories.status === "loading") return false;
      if (categories.lastLoadedAt && Date.now() - categories.lastLoadedAt < TTL_MS) return false;
      return true;
    },
  }
);

const categorySlice = createSlice({
  name: "categories",
  initialState,
  reducers: {
    invalidate(state) {
      state.lastLoadedAt = undefined;
    },
  },
  extraReducers: (b) => {
    b.addCase(hydrateCategories.pending, (s) => { if (s.status === "idle") s.status = "loading"; });
    b.addCase(hydrateCategories.fulfilled, (s, a) => {
      s.categories = a.payload.categories;
      s.verifiedIds = a.payload.verifiedIds;
      s.lastLoadedAt = a.payload.at;
      s.status = "succeeded";
      s.error = undefined;
    });
    b.addCase(hydrateCategories.rejected, (s, a) => {
      s.status = "failed";
      s.error = a.error?.message;
    });
  },
});

export const { invalidate } = categorySlice.actions;
export default categorySlice.reducer;
