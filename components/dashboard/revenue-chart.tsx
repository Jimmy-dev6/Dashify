"use client";

import { useEffect, useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";

type DataPoint = {
  month: string;
  revenue: number;
  key: string;
};

function fmtXOF(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${Math.round(n / 1_000)}k`;
  return String(n);
}

function fmtFull(n: number) {
  return new Intl.NumberFormat("fr-SN", {
    style: "currency",
    currency: "XOF",
    maximumFractionDigits: 0,
  }).format(n);
}

export function RevenueChart({ data, loading }: { data: DataPoint[]; loading: boolean }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const hasData = data.some((d) => d.revenue > 0);
  const total = data.reduce((s, d) => s + d.revenue, 0);

  return (
    <div className="rounded-xl border border-gray-700 bg-gray-800/80 p-6 shadow-sm">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-sm font-semibold text-white">Revenus</h2>
          <p className="text-xs text-gray-400">3 derniers + 3 prochains mois</p>
        </div>
        {!loading && (
          <div className="text-right">
            <p className="text-xs uppercase tracking-wide text-gray-500">Total période</p>
            <p className="text-sm font-semibold text-teal-400">{fmtFull(total)}</p>
          </div>
        )}
      </div>

      <div className="mt-6 h-64">
        {loading ? (
          <div className="flex h-full items-center justify-center text-sm text-gray-500">
            Chargement…
          </div>
        ) : !hasData ? (
          <div className="flex h-full flex-col items-center justify-center gap-2 text-center">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" className="text-gray-600">
              <path d="M3 3v18h18M7 14l4-4 4 4 6-6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <p className="text-sm text-gray-400">Pas encore de revenus enregistrés</p>
            <p className="text-xs text-gray-500">Les réservations confirmées apparaîtront ici</p>
          </div>
        ) : mounted ? (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
              <defs>
                <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#14B8A6" stopOpacity={0.9} />
                  <stop offset="100%" stopColor="#14B8A6" stopOpacity={0.3} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" vertical={false} />
              <XAxis
                dataKey="month"
                stroke="#9CA3AF"
                fontSize={11}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                stroke="#9CA3AF"
                fontSize={11}
                tickLine={false}
                axisLine={false}
                tickFormatter={fmtXOF}
              />
              <Tooltip
                cursor={{ fill: "#374151", fillOpacity: 0.3 }}
                contentStyle={{
                  backgroundColor: "#111827",
                  border: "1px solid #374151",
                  borderRadius: "8px",
                  fontSize: "12px",
                }}
                labelStyle={{ color: "#F3F4F6", fontWeight: 600 }}
                itemStyle={{ color: "#14B8A6" }}
                formatter={(value) => {
                    const n = typeof value === "number" ? value : Number(value ?? 0);
                    return [fmtFull(n), "Revenus"];
                  }}
              />
              <Bar dataKey="revenue" fill="url(#revenueGradient)" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        ) : null}
      </div>
    </div>
  );
}