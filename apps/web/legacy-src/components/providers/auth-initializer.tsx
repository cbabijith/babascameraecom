// src/components/providers/auth-initializer.tsx

"use client"

import { useEffect } from "react"
import { useDispatch } from "react-redux"
import { AppDispatch } from "@/store"
import { logout, setUser } from "@/store/slice/authSlice"
import { fetchWishlistAsync } from "@/store/slice/wishlistSlice" // ⬅️ updated import
import { fetchCart } from "@/store/slice/cartSlice"
import { initializeAuth, onAuthStateChange } from "@/instances/authInstance"

export default function AuthInitializer({ children }: { children: React.ReactNode }) {
  const dispatch = useDispatch<AppDispatch>()

  useEffect(() => {
    let active = true

    const syncUser = async () => {
      const { user } = await initializeAuth()
      if (!active) return
      if (user) {
        dispatch(setUser({ id: user.id, name: user.name || "", email: user.email }))
        dispatch(fetchWishlistAsync())
        dispatch(fetchCart())
      } else {
        dispatch(logout())
      }
    }

    void syncUser()
    const { data: subscription } = onAuthStateChange((_event, _session, user) => {
      if (!active) return
      if (user) {
        dispatch(setUser({ id: user.id, name: user.name || "", email: user.email }))
        dispatch(fetchWishlistAsync())
        dispatch(fetchCart())
      } else {
        dispatch(logout())
      }
    })

    return () => {
      active = false
      subscription.subscription.unsubscribe()
    }
  }, [dispatch])

  return <>{children}</>
}
