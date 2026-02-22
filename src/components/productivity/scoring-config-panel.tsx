"use client";

import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import { Pencil, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ConfigEditDialog } from "./config-edit-dialog";

interface ScoringConfig {
  departmentId: string;
  departmentName: string;
  weeklyOutputTarget: number;
  outputWeight: number;
  qualityWeight: number;
  reliabilityWeight: number;
  consistencyWeight: number;
  updatedAt: string | null;
}

interface ScoringConfigPanelProps {
  onDataChange?: () => void;
}

export function ScoringConfigPanel({ onDataChange }: ScoringConfigPanelProps) {
  const [configs, setConfigs] = useState<ScoringConfig[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editingConfig, setEditingConfig] = useState<ScoringConfig | null>(null);

  const fetchConfigs = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/productivity/config");
      if (!response.ok) throw new Error("Failed to fetch configs");
      const data = await response.json();
      setConfigs(data.configs);
    } catch (error) {
      console.error("Error fetching configs:", error);
      toast.error("Failed to load scoring config");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchConfigs();
  }, [fetchConfigs]);

  const handleEditSuccess = () => {
    fetchConfigs();
    onDataChange?.();
  };

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Scoring Configuration</CardTitle>
          <CardDescription>
            Configure output targets and pillar weights per department
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="flex items-center gap-4 p-4 border rounded-lg animate-pulse"
                >
                  <div className="h-4 bg-gray-200 rounded w-32" />
                  <div className="h-4 bg-gray-200 rounded w-48 flex-1" />
                  <div className="h-4 bg-gray-200 rounded w-16" />
                </div>
              ))}
            </div>
          ) : configs.length === 0 ? (
            <div className="text-center py-12">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-gray-100 rounded-full mb-4">
                <Settings className="h-8 w-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                No configurations
              </h3>
              <p className="text-gray-500 max-w-sm mx-auto">
                Department scoring configs will appear here once departments are created.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Department</TableHead>
                    <TableHead className="text-center">Weekly Target</TableHead>
                    <TableHead className="text-center">Output %</TableHead>
                    <TableHead className="text-center">Quality %</TableHead>
                    <TableHead className="text-center">Reliability %</TableHead>
                    <TableHead className="text-center">Consistency %</TableHead>
                    <TableHead className="text-center">Last Updated</TableHead>
                    <TableHead className="w-[60px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {configs.map((config) => (
                    <TableRow key={config.departmentId}>
                      <TableCell className="font-medium">
                        {config.departmentName}
                      </TableCell>
                      <TableCell className="text-center">
                        {config.weeklyOutputTarget}
                      </TableCell>
                      <TableCell className="text-center text-blue-600">
                        {Math.round(config.outputWeight * 100)}%
                      </TableCell>
                      <TableCell className="text-center text-green-600">
                        {Math.round(config.qualityWeight * 100)}%
                      </TableCell>
                      <TableCell className="text-center text-purple-600">
                        {Math.round(config.reliabilityWeight * 100)}%
                      </TableCell>
                      <TableCell className="text-center text-amber-600">
                        {Math.round(config.consistencyWeight * 100)}%
                      </TableCell>
                      <TableCell className="text-center text-sm text-gray-500">
                        {config.updatedAt
                          ? new Date(config.updatedAt).toLocaleDateString()
                          : "Default"}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setEditingConfig(config)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <ConfigEditDialog
        open={!!editingConfig}
        onOpenChange={(open) => !open && setEditingConfig(null)}
        config={editingConfig}
        onSuccess={handleEditSuccess}
      />
    </>
  );
}
