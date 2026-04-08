"use client"

import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"

type TrendPoint = {
  date: string
  apps: number
  posts: number
  requests: number
}

type TooltipProps = {
  active?: boolean
  payload?: Array<{ name?: string; value?: number; color?: string }>
  label?: string
}

function ChartTooltip({ active, payload, label }: TooltipProps) {
  if (!active || !payload?.length) return null

  return (
    <div className="rounded-2xl border border-border bg-card px-4 py-3 shadow-[0_18px_40px_-30px_rgba(15,23,42,0.45)]">
      <p className="text-xs font-semibold tracking-[0.16em] text-muted-foreground">{label}</p>
      <div className="mt-3 space-y-2 text-sm">
        {payload.map((item) => (
          <div key={item.name} className="flex items-center justify-between gap-6">
            <span className="flex items-center gap-2 text-muted-foreground">
              <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: item.color }} />
              {item.name}
            </span>
            <span className="font-semibold text-foreground">{item.value ?? 0}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

export function AdminTrendChart({ data }: { data: TrendPoint[] }) {
  return (
    <div className="h-[280px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ left: 4, right: 4, top: 12, bottom: 4 }}>
          <CartesianGrid stroke="rgb(var(--border) / 0.8)" strokeDasharray="3 3" />
          <XAxis dataKey="date" stroke="rgb(var(--muted-foreground))" tickLine={false} axisLine={false} />
          <YAxis allowDecimals={false} stroke="rgb(var(--muted-foreground))" tickLine={false} axisLine={false} />
          <Tooltip content={<ChartTooltip />} />
          <Line type="monotone" dataKey="apps" stroke="rgb(var(--chart-1))" strokeWidth={2.5} dot={{ r: 3 }} activeDot={{ r: 5 }} name="软件" />
          <Line type="monotone" dataKey="posts" stroke="rgb(var(--chart-2))" strokeWidth={2.5} dot={{ r: 3 }} activeDot={{ r: 5 }} name="文章" />
          <Line type="monotone" dataKey="requests" stroke="rgb(var(--chart-3))" strokeWidth={2.5} dot={{ r: 3 }} activeDot={{ r: 5 }} name="需求" />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
