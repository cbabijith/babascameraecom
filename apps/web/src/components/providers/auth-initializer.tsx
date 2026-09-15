"use client"

import { useEffect } from "react"
import { useDispatch } from "react-redux"
import type { AppDispatch } from "@/store"
import { setUser, setAuthInitialized } from "@/store/slice/authSlice"
import { fetchWishlistAsync } from "@/store/slice/wishlistSlice"
import { fetchCart } from "@/store/slice/cartSlice"
import {
  initializeAuth,
  setAuthToken,
  setUserData,
  normalizeApiUser,
} from "@/instances/authInstance"

export default function AuthInitializer({ children }: { children: React.ReactNode }) {
  const dispatch = useDispatch<AppDispatch>()

  useEffect(() => {
    let cancelled = false

    const boot = async () => {
      // 1. Fast path: token + user cached in localStorage (email login, or
      //    any previous visit after either login method).
      const { token, user } = initializeAuth()
      if (token && user) {
        dispatch(setUser({ id: user.id, name: user.name ?? "", email: user.email }))
        dispatch(fetchWishlistAsync())
        dispatch(fetchCart())
        dispatch(setAuthInitialized())
        return
      }

      // 2. Cookie-only session — e.g. the very first page load after a
      //    Google OAuth redirect. The better-auth cookie is set but
      //    localStorage/redux are not, so ask who we are and sync everything.
      try {
        const res = await fetch("/api/auth/get-session", { cache: "no-store" })
        const data = (await res.json().catch(() => null)) as {
          user?: { id?: string; email?: string; name?: string } | null
          session?: { token?: string } | null
        } | null
        const apiUser = data?.user
        const email = apiUser?.email
        if (email && !cancelled) {
          setAuthToken(data?.session?.token || "active-session")
          setUserData(normalizeApiUser({ ...apiUser, email }))
          dispatch(
            setUser({
              id: apiUser.id || "",
              name: apiUser.name ?? "",
              email,
            }),
          )
          dispatch(fetchWishlistAsync())
          dispatch(fetchCart())
        }
      } catch {
        // Offline or transient failure — treat as guest.
      }
      if (!cancelled) dispatch(setAuthInitialized())
    }

    void boot()
    return () => {
      cancelled = true
    }
  }, [dispatch])

  return <>{children}</>
}
