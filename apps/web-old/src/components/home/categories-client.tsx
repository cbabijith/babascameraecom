// src/components/home/categories-client.tsx
// Client component for Categories interactivity (navigation loading state)
"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { Loader2 } from "lucide-react";
import { getThumbnailUrl } from "@/lib/apiClient";

interface Category {
  _id: string;
  name: string;
  position: number;
  status: string;
  visibility: string;
  image?: {
    key: string;
  };
}

interface CategoriesClientProps {
  categories: Category[];
}

export default function CategoriesClient({ categories }: CategoriesClientProps) {
  const [navigatingId, setNavigatingId] = useState<string | null>(null);

  if (categories.length === 0) return null;

  const Grid = ({ children }: { children: React.ReactNode }) => (
    <div className="grid grid-cols-3 md:grid-cols-6 lg:grid-cols-7 gap-5 md:gap-5 lg:gap-6">
      {children}
    </div>
  );

  return (
    <section className="pt-8 sm:pt-6 lg:pt-6">
      <div className="constrained-width">
        <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-4 sm:mb-6">
          Categories
        </h2>

        <Grid>
          {categories.map((category, index) => {
            const src = category.image?.key
              ? getThumbnailUrl(category.image.key)
              : "/placeholder.svg";
            const busy = navigatingId === category._id;
            const isFirst = index === 0;

            return (
              <Link
                key={category._id}
                href={`/products/category/${category._id}`}
                aria-busy={busy}
                onClick={() => setNavigatingId(category._id)}
                className="flex flex-col items-center w-[88%] mx-auto md:w-full"
                aria-label={`Browse ${category.name}`}
              >
                {/* Media tile */}
                <div className="relative w-full aspect-square rounded-3xl md:rounded-4xl bg-gray-100 group-hover:bg-gray-200 transition-colors">
                  <Image
                    src={src}
                    alt={category.name}
                    fill
                    sizes="(max-width: 640px) 30vw, (max-width: 1024px) 22vw, 12vw"
                    className="object-contain p-3 sm:p-4 lg:p-5 scale-90 md:scale-100"
                    draggable={false}
                    priority={isFirst}
                    fetchPriority={isFirst ? "high" : undefined}
                    loading={isFirst ? "eager" : "lazy"}
                  />
                  {busy && (
                    <div className="absolute inset-0 bg-white/60 grid place-items-center rounded-3xl md:rounded-4xl">
                      <Loader2 className="h-5 w-5 animate-spin text-gray-700" />
                    </div>
                  )}
                </div>

                {/* Label */}
                <span className="mt-3 sm:mt-4 text-[12px] md:text-[18px] leading-[1.15] tracking-normal font-medium text-center text-gray-900 truncate w-full pb-0.5 mb-3 sm:mb-4">
                  {category.name.charAt(0).toUpperCase() + category.name.slice(1)}
                </span>
              </Link>
            );
          })}
        </Grid>
      </div>
    </section>
  );
}
