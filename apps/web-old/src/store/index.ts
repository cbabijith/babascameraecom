// src/store/index.ts
import { configureStore } from "@reduxjs/toolkit";
import auth from "./slice/authSlice";
import wishlist from "./slice/wishlistSlice"; 
import cart from "./slice/cartSlice"; 
import categories from "./slice/categorySlice"; 
import apiStatus from "./slice/apiStatusSlice";
import notificationReducer from "@/store/slice/notificationSlice";


export const store = configureStore({
  reducer: { 
    auth,
    wishlist,
    cart,
    categories,
    apiStatus, 
    notification: notificationReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

// Add these typed hooks
import { useDispatch, useSelector, TypedUseSelectorHook } from 'react-redux'
export const useAppDispatch = () => useDispatch<AppDispatch>()
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector