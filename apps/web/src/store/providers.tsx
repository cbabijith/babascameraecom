// src/store/providers.tsx

"use client";
import { Provider } from "react-redux";
import { store } from "./index";
import AuthInitializer from "@/components/providers/auth-initializer";

export default function ReduxProvider({ children }: { children: React.ReactNode }) {
  return (
    <Provider store={store}>
      <AuthInitializer>
        {children}
      </AuthInitializer>
    </Provider>
  );
}
