"use client"

import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"

type TrendPoint = {
  date: string
  apps: number
  posts: number
  requests: number
}

export function AdminTrendChart({ data }: { data: TrendPoint[] }) {
  return (
    <div className="h-[280px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data}>
          <CartesianGrid stroke="var(--color-border)" strokeDasharray="3 3" />
          <XAxis dataKey="date" stroke="var(--color-muted-foreground)" tickLine={false} axisLine={false} />
          <YAxis allowDecimals={false} stroke="var(--color-muted-foreground)" tickLine={false} axisLine={false} />
          <Tooltip />
          <Line type="monotone" dataKey="apps" stroke="var(--color-chart-1)" strokeWidth={2} name="软件" />
          <Line type="monotone" dataKey="posts" stroke="var(--color-chart-2)" strokeWidth={2} name="文章" />
          <Line type="monotone" dataKey="requests" stroke="var(--color-chart-3)" strokeWidth={2} name="需求" />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
