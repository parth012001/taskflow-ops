"use client";

import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface Distribution {
  thriving: number;
  healthy: number;
  atRisk: number;
  critical: number;
}

interface ScoreDistributionProps {
  data: Distribution;
}

const BANDS = [
  { key: "thriving", label: "Thriving", color: "#22c55e" },
  { key: "healthy", label: "Healthy", color: "#3b82f6" },
  { key: "atRisk", label: "At Risk", color: "#eab308" },
  { key: "critical", label: "Critical", color: "#ef4444" },
];

export function ScoreDistribution({ data }: ScoreDistributionProps) {
  const chartData = BANDS.map((band) => ({
    name: band.label,
    count: data[band.key as keyof Distribution],
    color: band.color,
  }));

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Score Distribution</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={chartData}>
            <XAxis dataKey="name" tick={{ fontSize: 12 }} />
            <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
            <Tooltip />
            <Bar dataKey="count" radius={[4, 4, 0, 0]}>
              {chartData.map((entry, index) => (
                <Cell key={index} fill={entry.color} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
