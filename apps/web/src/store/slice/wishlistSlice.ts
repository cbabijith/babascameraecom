// src/store/slice/wishlistSlice.ts
import { createAsyncThunk, createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { RootState } from '@/store';
import {
  addToWishlist as apiAddToWishlist,
  getWishlist as apiGetWishlist,
  removeFromWishlist as apiRemoveFromWishlist,
  type WishlistItem,
} from '@/instances/wishlistInstance';

// --- helpers
const extractProductId = (product: unknown): string | undefined => {
  if (typeof product === 'string') return product;
  if (product && typeof product === 'object') {
    const { _id, id } = product as { _id?: string; id?: string };
    return _id ?? id;
  }
  return undefined;
};

const getProductId = (item: WishlistItem & { product?: unknown }): string | undefined => {
  if (!item) return undefined;
  return extractProductId(item.product);
};

const messageFrom = (e: unknown): string => {
  if (e instanceof Error) return e.message || '';
  if (typeof e === 'string') return e;
  try { return JSON.stringify(e); } catch { return ''; }
};

interface WishlistState {
  byProductId: Record<string, WishlistItem>;
  loading: boolean;
  error: string | null;
  initialized: boolean;
}

const initialState: WishlistState = {
  byProductId: {},
  loading: false,
  error: null,
  initialized: false,
};

// --- thunks
export const fetchWishlistAsync = createAsyncThunk<WishlistItem[]>(
  'wishlist/fetch',
  async () => {
    const items = await apiGetWishlist();
    return items;
  }
);

export const addToWishlistAsync = createAsyncThunk<
  WishlistItem,
  string,
  { rejectValue: string }
>('wishlist/add', async (productId, { rejectWithValue }) => {
  try {
    const item = await apiAddToWishlist(productId);

    // If API returned unpopulated product (string id), fetch once to populate
    const isUnpopulated = typeof (item as { product?: unknown })?.product === 'string';
    if (isUnpopulated) {
      const list = await apiGetWishlist();
      const found = list.find(it => getProductId(it) === productId);
      if (found) return found;
    }

    return item;
  } catch (e: unknown) {
    const msg = messageFrom(e);
    // If server says "already in wishlist", fetch and return the real item
    if (/already in wishlist/i.test(msg)) {
      const list = await apiGetWishlist();
      const found = list.find(it => getProductId(it) === productId);
      if (found) return found;
    }
    return rejectWithValue(msg || 'Failed to add to wishlist');
  }
});

export const removeFromWishlistAsync = createAsyncThunk<
  { productId: string; wishlistId: string },
  { productId: string; wishlistId: string }
>('wishlist/remove', async ({ productId, wishlistId }) => {
  await apiRemoveFromWishlist(wishlistId);
  return { productId, wishlistId };
});

export const toggleWishlistAsync = createAsyncThunk<
  | { type: 'added'; item: WishlistItem }
  | { type: 'removed'; productId: string; wishlistId: string },
  string,
  { state: RootState; rejectValue: string }
>('wishlist/toggle', async (productId, { getState, rejectWithValue }) => {
  const { wishlist } = getState();
  const existing = wishlist.byProductId[productId];

  try {
    if (existing) {
      await apiRemoveFromWishlist((existing as unknown as { _id: string })._id);
      return { type: 'removed', productId, wishlistId: (existing as unknown as { _id: string })._id };
    } else {
      const item = await apiAddToWishlist(productId);
      return { type: 'added', item };
    }
  } catch (e: unknown) {
    const msg = messageFrom(e);
    if (!existing && /already in wishlist/i.test(msg)) {
      const list = await apiGetWishlist();
      const found = list.find(it => getProductId(it) === productId);
      if (found) return { type: 'added', item: found };
    }
    return rejectWithValue(msg || 'Wishlist toggle failed');
  }
});

// --- slice
const wishlistSlice = createSlice({
  name: 'wishlist',
  initialState,
  reducers: {
    resetWishlist(state) {
      state.byProductId = {};
      state.error = null;
      state.initialized = false;
    },
  },
  extraReducers: (builder) => {
    builder
      // fetch
      .addCase(fetchWishlistAsync.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchWishlistAsync.fulfilled, (state, action: PayloadAction<WishlistItem[]>) => {
        state.loading = false;
        state.initialized = true;
        const map: Record<string, WishlistItem> = {};
        for (const item of action.payload) {
          const pid = getProductId(item);
          if (pid) map[pid] = item;
        }
        state.byProductId = map;
      })
      .addCase(fetchWishlistAsync.rejected, (state, action) => {
        state.loading = false;
        state.error = (action.error?.message as string) || 'Failed to load wishlist';
      })

      // add
      .addCase(addToWishlistAsync.fulfilled, (state, action: PayloadAction<WishlistItem>) => {
        const pid = getProductId(action.payload);
        if (pid) state.byProductId[pid] = action.payload;
      })

      // remove
      .addCase(
        removeFromWishlistAsync.fulfilled,
        (state, action: PayloadAction<{ productId: string; wishlistId: string }>) => {
          const { productId } = action.payload;
          const { [productId]: _removed, ...rest } = state.byProductId;
          state.byProductId = rest;
        }
      )

      // toggle
      .addCase(toggleWishlistAsync.fulfilled, (state, action) => {
        const payload = action.payload;
        if (payload.type === 'added') {
          const pid = getProductId(payload.item);
          if (pid) state.byProductId[pid] = payload.item;
        } else {
          const { [payload.productId]: _removed, ...rest } = state.byProductId;
          state.byProductId = rest;
        }
      })
      .addCase(toggleWishlistAsync.rejected, (state, action) => {
        state.error = (action.payload as string) || action.error?.message || 'Wishlist toggle failed';
      });
  },
});

// --- selectors
export const selectIsInWishlist =
  (productId: string) =>
  (state: RootState): boolean =>
    Boolean(state.wishlist.byProductId[productId]);

export const selectWishlistIdByProduct =
  (productId: string) =>
  (state: RootState): string | undefined =>
    (state.wishlist.byProductId[productId] as unknown as { _id?: string })?._id;

export const selectWishlistCount = (state: RootState) =>
  Object.keys(state.wishlist.byProductId).length;

export const { resetWishlist } = wishlistSlice.actions;
export default wishlistSlice.reducer;
