import { createSlice, type PayloadAction } from "@reduxjs/toolkit";

interface User {
  id: string;
  name: string;
  email: string;
}

interface AuthState {
  user: User | null;
  /**
   * False until the app finishes its boot-time auth check (localStorage and,
   * for cookie-only sessions such as a fresh Google OAuth redirect, the
   * get-session probe). Pages must not render their "please log in" state
   * before this turns true, or returning users see a false logged-out flash.
   */
  initialized: boolean;
}

const initialState: AuthState = {
  user: null,
  initialized: false,
};

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    setUser(state, action: PayloadAction<User>) {
      state.user = action.payload;
    },
    logout(state) {
      state.user = null;
    },
    setAuthInitialized(state) {
      state.initialized = true;
    },
  },
});

export const { setUser, logout, setAuthInitialized } = authSlice.actions;
export default authSlice.reducer;
