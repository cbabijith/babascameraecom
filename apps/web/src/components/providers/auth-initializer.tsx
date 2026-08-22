// src/components/providers/auth-initializer.tsx

"use client"

import { useEffect } from "react"
import { useDispatch } from "react-redux"
import type { AppDispatch } from "@/store"
import { setUser } from "@/store/slice/authSlice"
import { fetchWishlistAsync } from "@/store/slice/wishlistSlice" // ⬅️ updated import
import { fetchCart } from "@/store/slice/cartSlice"
import { initializeAuth } from "@/instances/authInstance"

export default function AuthInitializer({ children }: { children: React.ReactNode }) {
  const dispatch = useDispatch<AppDispatch>()

  useEffect(() => {
    const { token, user } = initializeAuth()

    if (token && user) {
      const transformedUser = {
        id: user.id,
        name: user.name || "",
        email: user.email,
      }

      dispatch(setUser(transformedUser))

      dispatch(fetchWishlistAsync())
      dispatch(fetchCart())
    }
  }, [dispatch])

  return <>{children}</>
}
