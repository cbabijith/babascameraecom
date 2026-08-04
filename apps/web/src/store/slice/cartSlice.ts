// src/store/slice/cartSlice.ts
import { AnyAction, createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import { toast } from 'sonner';
import {
  addToCart,
  getCart,
  incrementCartItem,
  decrementCartItem,
  deleteCartItem,
  checkoutCart,
  createOrder,
} from '@/instances/cartInstance';
import { getAuthToken } from '@/instances/authInstance';
import type { CartItem } from '@/types/cart';
import { createSelector } from "@reduxjs/toolkit";
import type { RootState } from '@/store';

type PaymentMethod = 'RAZORPAY' | 'BANK_TRANSFER';
type CheckoutMode = 'CART' | 'BUY_NOW';
interface BuyNowContext { productId: string; quantity: number; }

interface CheckoutContext {
  mode: CheckoutMode;
  method: PaymentMethod;
  shippingAddressId: string | null;
  buyNow: BuyNowContext | null;
}

interface CartState {
  items: CartItem[];
  loading: boolean;
  error: string | null;
  totalItems: number;
  totalPrice: number;
  checkout: CheckoutContext;
}

const initialState: CartState = {
  items: [],
  loading: true,
  error: null,
  totalItems: 0,
  totalPrice: 0,
   checkout: {
    mode: 'CART',
    method: 'RAZORPAY',
    shippingAddressId: null,
    buyNow: null,
  },
};

/* ---------- helpers ---------- */
const toNumber = (v: unknown) => {
  const n = typeof v === 'number' ? v : typeof v === 'string' ? parseFloat(v) : 0;
  return Number.isFinite(n) ? n : 0;
};
const itemSubtotal = (item: CartItem) =>
  toNumber(item?.product?.price?.salePrice) * (item?.quantity ?? 0);
const recomputeTotals = (state: CartState) => {
  state.totalItems = state.items.reduce((sum, it) => sum + (it?.quantity ?? 0), 0);
  state.totalPrice = state.items.reduce((sum, it) => sum + itemSubtotal(it), 0);
};
const getErrorMessage = (e: unknown, fallback = 'Request failed'): string =>
  e instanceof Error ? e.message : typeof e === 'string' ? e : fallback;

/* ---------- thunks ---------- */

export const fetchCart = createAsyncThunk<
  CartItem[],                      // return type
  void,                            // arg
  { state: RootState; rejectValue: string }
>('cart/fetchCart', async (_, { getState, rejectWithValue }) => {
  try {
    const state = getState();
    const user = state.auth.user;
    if (!user) return [];
    const token = getAuthToken();
    if (!token) return [];

    const items = await getCart();
    return Array.isArray(items) ? items : [];
  } catch (error: unknown) {
    const msg = getErrorMessage(error, 'Failed to fetch cart');
    if (msg.toLowerCase().includes('login') || msg.toLowerCase().includes('token')) {
      return [];
    }
    return rejectWithValue(msg);
  }
});

export const fetchCartSilent = createAsyncThunk<
  CartItem[],
  void,
  { state: RootState; rejectValue: string }
>('cart/fetchCartSilent', async (_, { getState, rejectWithValue }) => {
  try {
    const state = getState();
    const user = state.auth.user;
    if (!user) return [];
    const token = getAuthToken();
    if (!token) return [];

    const items = await getCart();
    return Array.isArray(items) ? items : [];
  } catch (error: unknown) {
    const msg = getErrorMessage(error, 'Failed to fetch cart');
    if (msg.toLowerCase().includes('login') || msg.toLowerCase().includes('token')) {
      return [];
    }
    return rejectWithValue(msg);
  }
});

export const addToCartAsync = createAsyncThunk<
  CartItem,
  string,
  { state: RootState; rejectValue: string }
>('cart/addToCart', async (productId, { getState, rejectWithValue }) => {
  try {
    const state = getState();
    const user = state.auth.user;
    if (!user || !getAuthToken()) {
      const msg = 'Please login to add items to cart';
      toast.error(msg);
      throw new Error(msg);
    }
    const newItem = await addToCart(productId);
    toast.success('Added to cart');
    return newItem;
  } catch (error: unknown) {
    const msg = getErrorMessage(error, 'Failed to add to cart');
    if (!/please login/i.test(msg)) toast.error('Failed to add to cart');
    return rejectWithValue(msg);
  }
});

export const incrementCartAsync = createAsyncThunk<
  CartItem,
  string,
  { rejectValue: string }
>('cart/incrementCart', async (cartItemId, { rejectWithValue }) => {
  try {
    return await incrementCartItem(cartItemId);
  } catch (error: unknown) {
    toast.error('Failed to update quantity');
    return rejectWithValue(getErrorMessage(error, 'Failed to increment quantity'));
  }
});

export const decrementCartAsync = createAsyncThunk<
  CartItem,
  string,
  { rejectValue: string }
>('cart/decrementCart', async (cartItemId, { rejectWithValue }) => {
  try {
    return await decrementCartItem(cartItemId);
  } catch (error: unknown) {
    toast.error('Failed to update quantity');
    return rejectWithValue(getErrorMessage(error, 'Failed to decrement quantity'));
  }
});

export const deleteCartAsync = createAsyncThunk<
  string,
  string,
  { rejectValue: string }
>('cart/deleteCartItem', async (cartItemId, { rejectWithValue }) => {
  try {
    await deleteCartItem(cartItemId);
    toast.success('Item removed from cart');
    return cartItemId;
  } catch (error: unknown) {
    toast.error('Failed to remove item from cart');
    return rejectWithValue(getErrorMessage(error, 'Failed to remove item from cart'));
  }
});

/** NEW: PATCH /cart/checkout/user */
export const checkoutCartAsync = createAsyncThunk<
  boolean,
  void,
  { state: RootState; rejectValue: string }
>('cart/checkout', async (_: void, { getState, rejectWithValue }) => {
  try {
    const state = getState();
    const items: CartItem[] = state.cart.items;
    if (!items?.length) {
      throw new Error('Your cart is empty');
    }
    const res = await checkoutCart();
    toast.success(res?.message || 'Cart checkout successful');
    return true;
  } catch (error: unknown) {
    const msg = getErrorMessage(error, 'Failed to checkout cart');
    toast.error(msg);
    return rejectWithValue(msg);
  }
});

/** NEW: POST /order/user (typed to allow optional transaction) */
type OrderCreateResult = {
  order: unknown;
  transaction?: {
    phonepeGatewayDetails?: { checkoutUrl?: string };
    [k: string]: unknown;
  };
};

export const createOrderAsync = createAsyncThunk<
  OrderCreateResult,                               // return type
  { shippingAddressId: string },                   // arg
  { state: RootState; rejectValue: string }
>('cart/createOrder', async ({ shippingAddressId }, { getState, rejectWithValue }) => {
  try {
    const state = getState();
    const totalOrderPrice = Number(state.cart.totalPrice) || 0;

    if (!shippingAddressId) throw new Error('Select a shipping address');
    if (totalOrderPrice <= 0) throw new Error('Invalid order total');

    // 1) Checkout first (server locks/validates cart)
    await checkoutCart();

    // 2) Create order and get transaction (with checkoutUrl)
    const result = await createOrder({
      totalOrderPrice,
      shippingAddress: shippingAddressId,
    }) as unknown as OrderCreateResult;

    const order = result.order;
    const transaction = result.transaction;

    // Do NOT toast success here yet—redirect to gateway first in the component
    return { order, transaction };
  } catch (error: unknown) {
    const msg = getErrorMessage(error, 'Failed to place order');
    return rejectWithValue(msg);
  }
});

/* ---------- slice ---------- */
const cartSlice = createSlice({
  name: 'cart',
  initialState,
  reducers: {
    clearCart: (state) => {
      state.items = [];
      state.error = null;
      state.totalItems = 0;
      state.totalPrice = 0;
    },
    clearError: (state) => {
      state.error = null;
    },
    cartIdle: (state) => {
      state.loading = false;
    },

    setCheckoutMethod: (state, action: { payload: PaymentMethod }) => {
      state.checkout.method = action.payload;
    },
    setCheckoutAddress: (state, action: { payload: string | null }) => {
      state.checkout.shippingAddressId = action.payload ?? null;
    },
    startBuyNow: (state, action: { payload: { productId: string; quantity?: number } }) => {
      state.checkout.mode = 'BUY_NOW';
      state.checkout.buyNow = {
        productId: action.payload.productId,
        quantity: Math.max(1, action.payload.quantity ?? 1),
      };
    },
    backToCartCheckout: (state) => {
      state.checkout.mode = 'CART';
      state.checkout.buyNow = null;
    },
    clearCheckoutContext: (state) => {
      state.checkout = {
        mode: 'CART',
        method: 'RAZORPAY',
        shippingAddressId: null,
        buyNow: null,
      };
    },

  },
  extraReducers: (builder) => {
    builder
      // fetch
      .addCase(fetchCart.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchCart.fulfilled, (state, action) => {
        state.loading = false;
        state.items = Array.isArray(action.payload) ? action.payload : [];
        state.error = null;
        recomputeTotals(state);
      })
      .addCase(fetchCart.rejected, (state, action) => {
        state.loading = false;
        const msg = (action.payload as string) || '';
        if (msg.toLowerCase().includes('cart is empty')) {
          state.items = [];
          state.error = null;
          recomputeTotals(state);
        } else {
          state.error = msg;
        }
      })
      .addCase(fetchCartSilent.fulfilled, (state, action) => {
        state.items = Array.isArray(action.payload) ? action.payload : [];
        recomputeTotals(state);
      })

      // add
      .addCase(addToCartAsync.pending, (state) => {
        state.error = null;
      })
      .addCase(addToCartAsync.fulfilled, (state, action) => {
        const payload = action.payload as CartItem;
        let idx = state.items.findIndex((i) => i._id === payload._id);
        if (idx >= 0) {
          state.items[idx] = payload;
        } else {
          idx = state.items.findIndex((i) => i.product?._id === payload.product?._id);
          if (idx >= 0) state.items[idx] = payload;
          else state.items.push(payload);
        }
        state.error = null;
        recomputeTotals(state);
      })
      .addCase(addToCartAsync.rejected, (state, action) => {
        state.error = action.payload as string;
      })

      // increment
      .addCase(incrementCartAsync.fulfilled, (state, action) => {
        const idx = state.items.findIndex((i) => i._id === action.payload._id);
        if (idx >= 0) state.items[idx] = action.payload;
        recomputeTotals(state);
      })

      // decrement
      .addCase(decrementCartAsync.fulfilled, (state, action) => {
        const idx = state.items.findIndex((i) => i._id === action.payload._id);
        if (idx >= 0) state.items[idx] = action.payload;
        recomputeTotals(state);
      })

      // delete
      .addCase(deleteCartAsync.fulfilled, (state, action) => {
        state.items = state.items.filter((i) => i._id !== action.payload);
        recomputeTotals(state);
      })
      .addCase(deleteCartAsync.rejected, (state, action) => {
        state.error = action.payload as string;
      })

      // NEW: checkout (no state mutation → avoid unused var warning)
      .addCase(checkoutCartAsync.fulfilled, () => {
        // backend locks cart for order creation
      })

     .addCase(createOrderAsync.fulfilled, (state) => {
        state.items = [];
        state.totalItems = 0;
        state.totalPrice = 0;
        state.error = null;
      })

      .addCase(createOrderAsync.rejected, (state, action) => {
        state.error = action.payload as string;
      })

      
      // logout (use matcher to avoid `as any`)
      .addMatcher(
        (action: AnyAction): action is AnyAction => action.type === 'auth/logout',
        (state) => {
          state.items = [];
          state.error = null;
          state.loading = false;
          state.totalItems = 0;
          state.totalPrice = 0;
          state.checkout = {
            mode: 'CART',
            method: 'RAZORPAY',
            shippingAddressId: null,
            buyNow: null,
          };
        }
      );
      
  },
});

/* ---------- selectors ---------- */
export const selectCartItems = (state: { cart: CartState }) => state.cart.items;
export const selectCartLoading = (state: { cart: CartState }) => state.cart.loading;
export const selectCartError = (state: { cart: CartState }) => state.cart.error;
export const selectCartTotalItems = (state: { cart: CartState }) => state.cart.totalItems;
export const selectCartTotalPrice = (state: { cart: CartState }) => state.cart.totalPrice;
export const selectIsInCart =
  (productId: string) =>
  (state: { cart: CartState }) =>
    state.cart.items.some((item) => item.product?._id === productId);
export const selectCartItemByProductId =
  (productId: string) =>
  (state: { cart: CartState }) =>
    state.cart.items.find((item) => item.product?._id === productId);
  export const selectCartItemsRaw = (state: RootState) => state.cart.items;
export const selectCartTotalItemsRaw = (state: RootState) => state.cart.totalItems;
export const selectCartTotalPriceRaw = (state: RootState) => state.cart.totalPrice;
export const selectActiveCartCount = createSelector([selectCartItemsRaw], (items) => {
  if (!Array.isArray(items)) return 0;
  return items
    .filter((it) => it?.status === "ACTIVE" && it?.product?._id)
    .reduce((n, it) => n + (typeof it?.quantity === "number" ? it.quantity : 1), 0);
});
export const selectCheckoutContext = (state: RootState) => state.cart.checkout;
export const selectCheckoutMethod = (state: RootState) => state.cart.checkout.method;
export const selectCheckoutAddressId = (state: RootState) => state.cart.checkout.shippingAddressId;
export const selectIsBuyNowCheckout = (state: RootState) => state.cart.checkout.mode === 'BUY_NOW';
export const selectBuyNowContext = (state: RootState) => state.cart.checkout.buyNow;


/* ---------- actions & reducer ---------- */
export const { clearCart, clearError, cartIdle, setCheckoutMethod,
  setCheckoutAddress,
  startBuyNow,
  backToCartCheckout,
  clearCheckoutContext, } = cartSlice.actions;
export default cartSlice.reducer;
