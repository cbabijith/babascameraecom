// src/app/(main)/products/search/page.tsx

import SearchResults from "@/components/search/search-results"
import type { Metadata } from "next"

interface SearchPageProps {
  searchParams?: Promise<{
    q?: string
    page?: string
  }>
}

export default async function SearchPage({ searchParams }: SearchPageProps) {
  const params = await searchParams
  const query = params?.q || ""
  const page = parseInt(params?.page || "1")
  
  return <SearchResults query={query} page={page} />
}

export async function generateMetadata({ searchParams }: SearchPageProps): Promise<Metadata> {
  const params = await searchParams
  const query = params?.q || ""
  
  return {
    title: query ? `Search results for "${query}" - Babas Photo Store` : 'Search - Babas Photo Store',
    description: `Search results for photography equipment and accessories`,
  }
}
