import { Button } from "@babascamera/ui";
import Link from "next/link";

export default function NotFound() {
  return <div className="grid min-h-64 place-items-center rounded-2xl border bg-white p-10 text-center"><div><h1 className="text-2xl font-black">Order not found</h1><Button asChild className="mt-4"><Link href="/orders">Back to orders</Link></Button></div></div>;
}
