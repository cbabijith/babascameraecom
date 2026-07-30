// src/store/slice/notificationSlice.ts
import { createAsyncThunk, createSlice, PayloadAction } from "@reduxjs/toolkit";
import type { RootState } from "@/store";
import {
  getNotifications as apiGetNotifications,
  addNotification as apiAddNotification,
} from "@/instances/notificationInstance";
import type { NotificationItem } from "@/types/notification";

// --- helpers (mirror wishlist approach)
type ProductRef = string | { _id?: string; id?: string };
const extractProductId = (product: unknown): string | undefined => {
  if (typeof product === "string") return product;
  if (product && typeof product === "object") {
    const { _id, id } = product as { _id?: string; id?: string };
    return _id ?? id;
  }
  return undefined;
};

const getProductId = (item?: NotificationItem): string | undefined => {
  if (!item) return undefined;
  return extractProductId(item.product);
};

const messageFrom = (e: unknown): string => {
  if (e instanceof Error) return e.message || "";
  if (typeof e === "string") return e;
  try {
    return JSON.stringify(e);
  } catch {
    return "";
  }
};

type NotificationState = {
  byProductId: Record<string, NotificationItem>;
  loading: boolean;
  error: string | null;
  initialized: boolean;
};

const initialState: NotificationState = {
  byProductId: {},
  loading: false,
  error: null,
  initialized: false,
};

// --- thunks
export const fetchNotificationsAsync = createAsyncThunk<NotificationItem[]>(
  "notification/fetchAll",
  async () => {
    const list = await apiGetNotifications();
    return list;
  }
);

export const addNotificationAsync = createAsyncThunk<
  // return populated NotificationItem if we can find it after add
  NotificationItem | { productId: string },
  string,
  { rejectValue: string }
>("notification/add", async (productId, { rejectWithValue }) => {
  try {
    // Create (idempotent server can reply with error if already exists)
    await apiAddNotification(productId);

    // Fetch fresh list to populate store with the item (and to stay consistent)
    const list = await apiGetNotifications();
    const found = list.find((it) => getProductId(it) === productId);
    if (found) return found;

    // Fallback: at least return the productId so UI can reflect state
    return { productId };
  } catch (e: unknown) {
    return rejectWithValue(messageFrom(e) || "Failed to create notification");
  }
});

// --- slice
const notificationSlice = createSlice({
  name: "notification",
  initialState,
  reducers: {
    resetNotifications(state) {
      state.byProductId = {};
      state.error = null;
      state.initialized = false;
    },
  },
  extraReducers: (builder) => {
    builder
      // fetch
      .addCase(fetchNotificationsAsync.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(
        fetchNotificationsAsync.fulfilled,
        (state, action: PayloadAction<NotificationItem[]>) => {
          state.loading = false;
          state.initialized = true;
          const map: Record<string, NotificationItem> = {};
          for (const item of action.payload) {
            const pid = getProductId(item);
            if (pid) map[pid] = item;
          }
          state.byProductId = map;
        }
      )
      .addCase(fetchNotificationsAsync.rejected, (state, action) => {
        state.loading = false;
        state.error =
          (action.error?.message as string) || "Failed to load notifications";
      })

      // add
      .addCase(addNotificationAsync.fulfilled, (state, action) => {
        const payload = action.payload as NotificationItem | { productId: string };
        if ("productId" in payload) {
          // we didn't get the fully populated item; set a lightweight marker
          const pid = payload.productId;
          if (pid && !state.byProductId[pid]) {
            state.byProductId[pid] = {
              _id: `temp-${pid}`,
              user: { _id: "me" },
              product: pid,
              createdAt: new Date().toISOString(),
            };
          }
        } else {
          const pid = getProductId(payload);
          if (pid) state.byProductId[pid] = payload;
        }
      })
      .addCase(addNotificationAsync.rejected, (state, action) => {
        state.error =
          (action.payload as string) ||
          action.error?.message ||
          "Failed to create notification";
      });
  },
});

// --- selectors
export const selectIsNotified =
  (productId: string) =>
  (state: RootState): boolean =>
    Boolean(state.notification.byProductId[productId]);

export const selectNotificationByProduct =
  (productId: string) =>
  (state: RootState): NotificationItem | undefined =>
    state.notification.byProductId[productId];

export const selectNotificationsCount = (state: RootState) =>
  Object.keys(state.notification.byProductId).length;

export const { resetNotifications } = notificationSlice.actions;
export default notificationSlice.reducer;
