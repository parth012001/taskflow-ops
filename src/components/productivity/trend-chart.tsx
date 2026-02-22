"use client";

import { useState, useEffect, useCallback } from "react";
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

interface TrendDataPoint {
  weekStartDate: string;
  output: number;
  quality: number;
  reliability: number;
  consistency: number;
  composite: number;
}

interface TrendChartProps {
  userId: string;
}

export function TrendChart({ userId }: TrendChartProps) {
  const [data, setData] = useState<TrendDataPoint[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchTrends = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await fetch(
        `/api/productivity/trends?userId=${userId}&weeks=12`
      );
      if (response.ok) {
        const result = await response.json();
        setData(result.trends);
      }
    } catch (error) {
      console.error("Error fetching trends:", error);
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchTrends();
  }, [fetchTrends]);

  if (isLoading) {
    return (
      <div className="h-64 flex items-center justify-center">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-indigo-600" />
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center text-sm text-gray-500">
        No trend data available yet
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={280}>
      <LineChart data={data}>
        <XAxis
          dataKey="weekStartDate"
          tickFormatter={(value: string) => format(parseISO(value), "MMM d")}
          tick={{ fontSize: 12 }}
        />
        <YAxis domain={[0, 100]} tick={{ fontSize: 12 }} />
        <Tooltip
          labelFormatter={(value) => format(parseISO(String(value)), "MMM d, yyyy")}
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
  );
}
