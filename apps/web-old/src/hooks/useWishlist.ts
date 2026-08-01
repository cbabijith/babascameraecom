// src/hooks/useWishlist.ts
import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import type { RootState, AppDispatch } from '@/store';
import {
  fetchWishlistAsync,
  toggleWishlistAsync,
  selectIsInWishlist,
  selectWishlistIdByProduct,
} from '@/store/slice/wishlistSlice';
import type { WishlistItem } from '@/instances/wishlistInstance';
import { toast } from 'sonner';

export const useWishlist = () => {
  const dispatch = useDispatch<AppDispatch>();

  // slice-derived state
  const user = useSelector((s: RootState) => s.auth.user);
  const loading = useSelector((s: RootState) => s.wishlist.loading);
  const error = useSelector((s: RootState) => s.wishlist.error);
  const initialized = useSelector((s: RootState) => s.wishlist.initialized);

  // array view of the map (typed)
  const items = useSelector((s: RootState) =>
    Object.values(s.wishlist.byProductId)
  ) as WishlistItem[];

  // Initialize wishlist once after login (or when not initialized)
  useEffect(() => {
    if (user && !initialized && !loading) {
      void dispatch(fetchWishlistAsync());
    }
  }, [dispatch, user, initialized, loading]);

  // Helpers (no hooks inside)
  const isInWishlist = (productId: string): boolean =>
    Boolean((items as WishlistItem[]).find((i: WishlistItem) => {
      const p = i.product as unknown;
      return typeof p === 'object' && p !== null && '_id' in p && (p as { _id?: string })._id === productId;
    }));

  const getWishlistId = (productId: string): string | undefined => {
    const found = (items as WishlistItem[]).find((i: WishlistItem) => {
      const p = i.product as unknown;
      return typeof p === 'object' && p !== null && '_id' in p && (p as { _id?: string })._id === productId;
    });
    return found?._id;
  };

  const toggleWishlist = async (productId: string) => {
    try {
      await dispatch(toggleWishlistAsync(productId)).unwrap();
    } catch (error: unknown) {
      const msg =
        typeof error === 'string'
          ? error
          : error instanceof Error
          ? error.message
          : 'Failed to update wishlist';
      toast.error(msg);
    }
  };

  const refreshWishlist = () => {
    if (user) void dispatch(fetchWishlistAsync());
  };

  return {
    items,
    loading,
    error,
    isInWishlist,
    getWishlistId,
    toggleWishlist,
    refreshWishlist,
  };
};

// Hook for a single product's wishlist status
export const useProductWishlist = (productId: string) => {
  const dispatch = useDispatch<AppDispatch>();
  const isInWishlist = useSelector(selectIsInWishlist(productId));
  const wishlistId = useSelector(selectWishlistIdByProduct(productId));

  const toggleWishlist = async () => {
    try {
      await dispatch(toggleWishlistAsync(productId)).unwrap();
    } catch (error: unknown) {
      const msg =
        typeof error === 'string'
          ? error
          : error instanceof Error
          ? error.message
          : 'Failed to update wishlist';
      toast.error(msg);
    }
  };

  return {
    isInWishlist,
    wishlistId,
    toggleWishlist,
  };
};
