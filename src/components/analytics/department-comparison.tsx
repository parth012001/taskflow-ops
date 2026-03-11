"use client";

import { useState, useEffect, useCallback } from "react";
import { authFetch } from "@/lib/auth-fetch";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";

interface DepartmentData {
  id: string;
  name: string;
  composite: number;
  output: number;
  quality: number;
  reliability: number;
  consistency: number;
  scoredCount: number;
  totalCount: number;
}

function getScoreBg(score: number): string {
  if (score >= 80) return "bg-green-100 text-green-800";
  if (score >= 60) return "bg-green-50 text-green-700";
  if (score >= 40) return "bg-yellow-50 text-yellow-700";
  return "bg-red-50 text-red-700";
}

export function DepartmentComparison() {
  const [departments, setDepartments] = useState<DepartmentData[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await authFetch("/api/analytics/department-comparison");
      if (response.ok) {
        const result = await response.json();
        setDepartments(result.departments);
      }
    } catch (error) {
      console.error("Error fetching department comparison:", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-12">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-indigo-600" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (departments.length === 0) {
    return (
      <Card>
        <CardContent className="py-12">
          <p className="text-center text-sm text-gray-500">
            No department data available
          </p>
        </CardContent>
      </Card>
    );
  }

  const chartData = departments.map((d) => ({
    name: d.name,
    composite: d.composite,
  }));

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Department Comparison</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Horizontal bar chart */}
        <ResponsiveContainer width="100%" height={Math.max(120, departments.length * 50)}>
          <BarChart data={chartData} layout="vertical">
            <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 12 }} />
            <YAxis
              type="category"
              dataKey="name"
              tick={{ fontSize: 12 }}
              width={100}
            />
            <Tooltip />
            <Bar dataKey="composite" fill="#6366f1" radius={[0, 4, 4, 0]} />
          </BarChart>
        </ResponsiveContainer>

        {/* Pillar heatmap table */}
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Department</TableHead>
                <TableHead className="text-center">Output</TableHead>
                <TableHead className="text-center">Quality</TableHead>
                <TableHead className="text-center">Reliability</TableHead>
                <TableHead className="text-center">Consistency</TableHead>
                <TableHead className="text-center">Scored</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {departments.map((dept) => (
                <TableRow key={dept.id}>
                  <TableCell className="font-medium">{dept.name}</TableCell>
                  <TableCell className="text-center p-1">
                    <span className={cn("inline-block rounded px-2 py-1 text-xs font-medium", getScoreBg(dept.output))}>
                      {Math.round(dept.output)}
                    </span>
                  </TableCell>
                  <TableCell className="text-center p-1">
                    <span className={cn("inline-block rounded px-2 py-1 text-xs font-medium", getScoreBg(dept.quality))}>
                      {Math.round(dept.quality)}
                    </span>
                  </TableCell>
                  <TableCell className="text-center p-1">
                    <span className={cn("inline-block rounded px-2 py-1 text-xs font-medium", getScoreBg(dept.reliability))}>
                      {Math.round(dept.reliability)}
                    </span>
                  </TableCell>
                  <TableCell className="text-center p-1">
                    <span className={cn("inline-block rounded px-2 py-1 text-xs font-medium", getScoreBg(dept.consistency))}>
                      {Math.round(dept.consistency)}
                    </span>
                  </TableCell>
                  <TableCell className="text-center text-xs text-gray-500">
                    {dept.scoredCount}/{dept.totalCount}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
