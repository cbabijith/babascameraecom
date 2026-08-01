import { createSlice, PayloadAction } from "@reduxjs/toolkit";

export type ApiStatus = "ok" | "degraded" | "down";
interface State {
  status: ApiStatus;
  lastError?: string;
  lastErrorAt?: number;
}

const initialState: State = { status: "ok" };

const apiStatusSlice = createSlice({
  name: "apiStatus",
  initialState,
  reducers: {
    markDown(state, action: PayloadAction<{ message: string }>) {
      state.status = "down";
      state.lastError = action.payload.message;
      state.lastErrorAt = Date.now();
    },
    markDegraded(state, action: PayloadAction<{ message: string }>) {
      state.status = "degraded";
      state.lastError = action.payload.message;
      state.lastErrorAt = Date.now();
    },
    markOk(state) {
      state.status = "ok";
      state.lastError = undefined;
      state.lastErrorAt = undefined;
    },
  },
});

export const { markDown, markDegraded, markOk } = apiStatusSlice.actions;
export default apiStatusSlice.reducer;
