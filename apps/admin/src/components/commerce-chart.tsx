"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@babascamera/ui";
import { Area, Bar, CartesianGrid, ComposedChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import { formatPaise } from "@/lib/money";

export interface ChartPoint { label: string; revenuePaise: number; orders: number }

export function CommerceChart({ points }: { points: ChartPoint[] }) {
  return (
    <Card className="border-slate-200">
      <CardHeader><CardTitle>Revenue and orders · last 30 days</CardTitle></CardHeader>
      <CardContent>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={points}>
              <CartesianGrid vertical={false} strokeDasharray="3 3" />
              <XAxis dataKey="label" tickLine={false} axisLine={false} />
              <YAxis yAxisId="revenue" tickFormatter={(value) => `₹${Math.round(Number(value) / 100)}`} />
              <YAxis yAxisId="orders" orientation="right" allowDecimals={false} />
              <Tooltip formatter={(value, name) => name === "revenuePaise" ? formatPaise(Number(value)) : value} />
              <Area yAxisId="revenue" dataKey="revenuePaise" stroke="#d97706" fill="#fde68a" />
              <Bar yAxisId="orders" dataKey="orders" fill="#0f172a" radius={[4, 4, 0, 0]} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
