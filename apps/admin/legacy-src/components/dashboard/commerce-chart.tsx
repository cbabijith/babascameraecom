"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@babascamera/ui";
import {
  Area,
  AreaChart,
  Bar,
  CartesianGrid,
  ComposedChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { formatMoney } from "@/lib/utils";

export type CommerceChartPoint = {
  label: string;
  revenueMinor: number;
  orders: number;
};

function RevenueTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ dataKey?: string; value?: number }>;
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  const revenue = payload.find((entry) => entry.dataKey === "revenueMinor")?.value ?? 0;
  const orders = payload.find((entry) => entry.dataKey === "orders")?.value ?? 0;
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3 text-xs shadow-xl">
      <p className="font-black text-slate-950">{label}</p>
      <p className="mt-1 text-slate-600">{formatMoney(revenue)} revenue</p>
      <p className="text-slate-600">{orders} orders</p>
    </div>
  );
}

export function CommerceChart({ points }: { points: CommerceChartPoint[] }) {
  return (
    <Card className="border-slate-200 shadow-none">
      <CardHeader>
        <CardTitle>Revenue and order volume</CardTitle>
        <CardDescription>Paid commerce activity over the last fourteen days.</CardDescription>
      </CardHeader>
      <CardContent>
        {points.length ? (
          <div className="h-80 w-full" aria-label="Revenue and order volume chart">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={points} margin={{ left: 4, right: 12, top: 12, bottom: 0 }}>
                <defs>
                  <linearGradient id="revenue-fill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid vertical={false} stroke="#e2e8f0" strokeDasharray="3 3" />
                <XAxis
                  dataKey="label"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: "#64748b", fontSize: 11, fontWeight: 700 }}
                />
                <YAxis
                  yAxisId="revenue"
                  axisLine={false}
                  tickLine={false}
                  width={72}
                  tickFormatter={(value) => `₹${Math.round(Number(value) / 100)}`}
                  tick={{ fill: "#64748b", fontSize: 11 }}
                />
                <YAxis
                  yAxisId="orders"
                  orientation="right"
                  axisLine={false}
                  tickLine={false}
                  allowDecimals={false}
                  width={32}
                  tick={{ fill: "#64748b", fontSize: 11 }}
                />
                <Tooltip content={<RevenueTooltip />} />
                <Area
                  yAxisId="revenue"
                  type="monotone"
                  dataKey="revenueMinor"
                  stroke="#d97706"
                  strokeWidth={2.5}
                  fill="url(#revenue-fill)"
                />
                <Bar
                  yAxisId="orders"
                  dataKey="orders"
                  fill="#0f172a"
                  opacity={0.78}
                  radius={[5, 5, 0, 0]}
                  barSize={12}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="grid h-80 place-items-center rounded-xl bg-slate-50 text-sm font-medium text-slate-500">
            Revenue appears here after the first paid order.
          </div>
        )}
      </CardContent>
    </Card>
  );
}

