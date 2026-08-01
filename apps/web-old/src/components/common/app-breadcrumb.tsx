"use client";

import { Fragment } from "react";
import Link from "next/link";
import {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";

type Crumb = { label: string; href?: string };
export interface AppBreadcrumbProps {
  items: Crumb[];
  className?: string;
}

export default function AppBreadcrumb({ items, className }: AppBreadcrumbProps) {
  const lastIndex = items.length - 1;

  return (
    <Breadcrumb className={className}>
      <BreadcrumbList className="text-[12px] leading-none tracking-[2px]">
        {items.map((item, idx) => {
          const isLast = idx === lastIndex;
          const keyBase = `${item.label}-${idx}`;

          return (
            // ✅ Key goes on the Fragment (the element returned by .map)
            <Fragment key={`crumb-${keyBase}`}>
              <BreadcrumbItem>
                {isLast ? (
                  <BreadcrumbPage className="text-[#E72429]" style={{ fontWeight: 650 }}>
                    {item.label}
                  </BreadcrumbPage>
                ) : item.href ? (
                  <BreadcrumbLink asChild className="font-medium">
                    <Link href={item.href}>{item.label}</Link>
                  </BreadcrumbLink>
                ) : (
                  <span className="font-medium">{item.label}</span>
                )}
              </BreadcrumbItem>

              {/* Separator is a sibling <li>, not nested */}
              {!isLast && <BreadcrumbSeparator />}
            </Fragment>
          );
        })}
      </BreadcrumbList>
    </Breadcrumb>
  );
}
