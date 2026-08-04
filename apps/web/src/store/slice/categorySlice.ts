import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import { getCategories } from "@/instances/categoryInstance";
import type { Category } from "@/types/product";

const CACHE_KEY = "category_cache_v1";
const TTL_MS = 15 * 60 * 1000;      // 15 minutes

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

        const verifiedIds = all.map((c) => c._id);
        saveCache(all, verifiedIds);
        return { categories: all, verifiedIds };
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
