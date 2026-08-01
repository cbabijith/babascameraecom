"use client"

import { usePathname } from "next/navigation"
import Link from "next/link"
import { ChevronRight } from "lucide-react"

export default function Breadcrumb() {
  const pathname = usePathname()

  // Don't show breadcrumb on home page
  if (!pathname || pathname === "/") return null

  const pathSegments = pathname.split("/").filter(Boolean)

  const breadcrumbItems = [
    { name: "HOME", href: "/" },
    ...pathSegments.map((segment, index) => {
      const href = "/" + pathSegments.slice(0, index + 1).join("/")
      const name = segment.toUpperCase().replace("-", " ")
      return { name, href }
    }),
  ]

  return (
    <nav className="py-3">
      <div className="constrained-width">
        <div className="flex items-center space-x-2 text-sm text-gray-600">
          {breadcrumbItems.map((item, index) => (
            <div key={item.href} className="flex items-center">
              {index > 0 && <ChevronRight className="w-4 h-4 mx-2 text-gray-400" />}
              {index === breadcrumbItems.length - 1 ? (
                <span className="text-gray-900 font-medium">{item.name}</span>
              ) : (
                <Link href={item.href} className="hover:text-red-600 transition-colors">
                  {item.name}
                </Link>
              )}
            </div>
          ))}
        </div>
      </div>
    </nav>
  )
}
