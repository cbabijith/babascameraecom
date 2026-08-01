"use client";

import Image from "next/image";
import Link from "next/link";
import OrderCard from "./OrderCard";
import type { Order } from "@/types/order";

export type OrdersTab = "Orders" | "Cancelled Orders";

function EmptyState({
  title,
  desc,
  img,
}: {
  title: string;
  desc: string;
  img: string;
}) {
  return (
    <div className="rounded-xl border bg-white">
      <div className="p-5 sm:p-6">
        <div className="flex min-h-[320px] sm:min-h-[380px] flex-col items-center justify-center px-4 sm:px-6 text-center">
          <h2 className="mb-2 text-xl sm:text-2xl font-semibold">{title}</h2>
          <p className="mb-6 sm:mb-8 max-w-xl text-sm text-muted-foreground">{desc}</p>
          <Image
            src={img}
            alt={title}
            width={304}
            height={227}
            className="mb-6 sm:mb-8 opacity-70 w-[75%] max-w-[340px] h-auto"
          />
          <Link
            href="/products"
            className="inline-flex items-center justify-center rounded-md text-sm font-semibold text-white shadow hover:opacity-95 w-full sm:w-[240px] h-10"
            style={{ backgroundColor: "#E72429" }}
          >
            Explore Items
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function OrdersList({
  tab,
  data,
}: {
  tab: OrdersTab;
  data: Order[];
}) {
  let list = data;

  // ✅ Compare against UI union (UPPERCASE)
  if (tab === "Orders") {
    list = data.filter((o) => o.orderStatus !== "CANCELLED");
  } else if (tab === "Cancelled Orders") {
    list = data.filter((o) => o.orderStatus === "CANCELLED");
  }

  if (list.length === 0) {
    const empty =
      tab === "Cancelled Orders"
        ? {
            title: "No Cancelled Orders",
            desc: "You don’t have any cancelled orders at the moment.",
            img: "/cancelled.png",
          }
        : {
            title: "No Orders Yet",
            desc: "Your order history will appear here once you make your first purchase.",
            img: "/two_persons.png",
          };

    return <EmptyState {...empty} />;
  }

  return (
    <div className="space-y-3 sm:space-y-4">
      {list.map((order, idx) => {
        // derive a unique, stable-ish suffix from the first item
        const item = order.items?.[0];
        const pid =
          typeof item?.product !== "string" ? item?.product?._id : undefined;
        const name = item?.name?.replace(/\s+/g, "-").toLowerCase();
        const suffix = pid || name || idx; // fall back to index only if needed

        return <OrderCard key={`${order._id}-${suffix}`} order={order} />;
      })}
    </div>
  );
}
