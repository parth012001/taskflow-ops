"use client";

import { useState, useEffect, useCallback } from "react";
import { authFetch } from "@/lib/auth-fetch";
import { format, parseISO } from "date-fns";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface TrendDataPoint {
  weekStartDate: string;
  composite: number;
  output: number;
  quality: number;
  reliability: number;
  consistency: number;
  scoredCount: number;
}

const PERIOD_OPTIONS = [
  { label: "4 weeks", value: "4" },
  { label: "3 months", value: "12" },
  { label: "6 months", value: "26" },
  { label: "1 year", value: "52" },
];

export function CompanyTrendChart() {
  const [data, setData] = useState<TrendDataPoint[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [weeks, setWeeks] = useState("12");

  const fetchTrends = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await authFetch(
        `/api/analytics/company-trends?weeks=${weeks}`
      );
      if (response.ok) {
        const result = await response.json();
        setData(result.trends);
      }
    } catch (error) {
      console.error("Error fetching company trends:", error);
    } finally {
      setIsLoading(false);
    }
  }, [weeks]);

  useEffect(() => {
    fetchTrends();
  }, [fetchTrends]);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-base">Company Trend</CardTitle>
        <Select value={weeks} onValueChange={setWeeks}>
          <SelectTrigger className="w-[130px] h-8 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {PERIOD_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="h-[320px] flex items-center justify-center">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-indigo-600" />
          </div>
        ) : data.length === 0 ? (
          <div className="h-[320px] flex items-center justify-center text-sm text-gray-500">
            No trend data available yet
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={320}>
            <LineChart data={data}>
              <XAxis
                dataKey="weekStartDate"
                tickFormatter={(value: string) =>
                  format(parseISO(value), "MMM d")
                }
                tick={{ fontSize: 12 }}
              />
              <YAxis domain={[0, 100]} tick={{ fontSize: 12 }} />
              <Tooltip
                labelFormatter={(value) =>
                  format(parseISO(String(value)), "MMM d, yyyy")
                }
              />
              <Legend />
              <Line
                type="monotone"
                dataKey="composite"
                name="Composite"
                stroke="var(--chart-1)"
                strokeWidth={3}
                dot={false}
              />
              <Line
                type="monotone"
                dataKey="output"
                name="Output"
                stroke="var(--chart-2)"
                strokeWidth={1.5}
                dot={false}
              />
              <Line
                type="monotone"
                dataKey="quality"
                name="Quality"
                stroke="var(--chart-3)"
                strokeWidth={1.5}
                dot={false}
              />
              <Line
                type="monotone"
                dataKey="reliability"
                name="Reliability"
                stroke="var(--chart-4)"
                strokeWidth={1.5}
                dot={false}
              />
              <Line
                type="monotone"
                dataKey="consistency"
                name="Consistency"
                stroke="var(--chart-5)"
                strokeWidth={1.5}
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}
