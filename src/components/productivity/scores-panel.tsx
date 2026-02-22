"use client";

import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import {
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  Loader2,
  BarChart3,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ScoreBadge } from "./score-badge";
import { ScorecardDialog } from "./scorecard-dialog";
import { formatDistanceToNow } from "date-fns";

interface Score {
  userId: string;
  firstName: string;
  lastName: string;
  role: string;
  department: string | null;
  output: number;
  quality: number;
  reliability: number;
  consistency: number;
  composite: number;
  calculatedAt: string;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

interface Department {
  id: string;
  name: string;
}

interface ScoresPanelProps {
  isAdmin: boolean;
  onStatsLoaded?: (stats: {
    average: number;
    topScore: number;
    totalScored: number;
  }) => void;
}

const roleLabels: Record<string, string> = {
  EMPLOYEE: "Employee",
  MANAGER: "Manager",
  DEPARTMENT_HEAD: "Dept Head",
  ADMIN: "Admin",
};

const roleBadgeColors: Record<string, string> = {
  EMPLOYEE: "bg-gray-100 text-gray-700 border-gray-200",
  MANAGER: "bg-blue-100 text-blue-700 border-blue-200",
  DEPARTMENT_HEAD: "bg-purple-100 text-purple-700 border-purple-200",
  ADMIN: "bg-red-100 text-red-700 border-red-200",
};

const pillarColors = {
  output: "text-blue-600",
  quality: "text-green-600",
  reliability: "text-purple-600",
  consistency: "text-amber-600",
};

export function ScoresPanel({ isAdmin, onStatsLoaded }: ScoresPanelProps) {
  const [scores, setScores] = useState<Score[]>([]);
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [departmentFilter, setDepartmentFilter] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [sortBy, setSortBy] = useState("composite");
  const [selectedUser, setSelectedUser] = useState<Score | null>(null);
  const [isRecalculating, setIsRecalculating] = useState(false);

  const fetchScores = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams({
        page: pagination.page.toString(),
        limit: pagination.limit.toString(),
        sortBy,
        sortOrder: "desc",
      });

      if (departmentFilter) params.append("departmentId", departmentFilter);
      if (roleFilter) params.append("role", roleFilter);

      const response = await fetch(`/api/productivity/scores?${params}`);
      if (!response.ok) throw new Error("Failed to fetch scores");

      const data = await response.json();
      setScores(data.scores);
      setPagination(data.pagination);

      if (onStatsLoaded && data.scores.length > 0) {
        const avg =
          data.scores.reduce((sum: number, s: Score) => sum + s.composite, 0) /
          data.scores.length;
        const top = Math.max(...data.scores.map((s: Score) => s.composite));
        onStatsLoaded({
          average: Math.round(avg),
          topScore: Math.round(top),
          totalScored: data.pagination.total,
        });
      }
    } catch (error) {
      console.error("Error fetching scores:", error);
      toast.error("Failed to load scores");
    } finally {
      setIsLoading(false);
    }
  }, [pagination.page, pagination.limit, sortBy, departmentFilter, roleFilter, onStatsLoaded]);

  const fetchDepartments = useCallback(async () => {
    try {
      const response = await fetch("/api/admin/departments");
      if (response.ok) {
        const data = await response.json();
        setDepartments(data.departments);
      }
    } catch (error) {
      console.error("Error fetching departments:", error);
    }
  }, []);

  useEffect(() => {
    if (isAdmin) {
      fetchDepartments();
    }
  }, [isAdmin, fetchDepartments]);

  useEffect(() => {
    fetchScores();
  }, [fetchScores]);

  useEffect(() => {
    setPagination((prev) => ({ ...prev, page: 1 }));
  }, [departmentFilter, roleFilter, sortBy]);

  const handleRecalculate = async () => {
    setIsRecalculating(true);
    try {
      const response = await fetch("/api/productivity/calculate", {
        method: "POST",
      });
      if (!response.ok) throw new Error("Recalculation failed");
      const data = await response.json();
      toast.success(`Recalculated ${data.processed} scores`);
      fetchScores();
    } catch (error) {
      console.error("Error recalculating:", error);
      toast.error("Failed to recalculate scores");
    } finally {
      setIsRecalculating(false);
    }
  };

  const handlePageChange = (newPage: number) => {
    setPagination((prev) => ({ ...prev, page: newPage }));
  };

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <div>
            <CardTitle>Productivity Leaderboard</CardTitle>
            <CardDescription>
              Scores based on the last 28 days of activity
            </CardDescription>
          </div>
          {isAdmin && (
            <Button
              variant="outline"
              onClick={handleRecalculate}
              disabled={isRecalculating}
            >
              {isRecalculating ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4 mr-2" />
              )}
              Recalculate All
            </Button>
          )}
        </CardHeader>
        <CardContent>
          {/* Filters */}
          <div className="flex flex-wrap gap-3 mb-4">
            {isAdmin && (
              <Select
                value={departmentFilter || "all"}
                onValueChange={(v) => setDepartmentFilter(v === "all" ? "" : v)}
              >
                <SelectTrigger className="w-[160px]">
                  <SelectValue placeholder="All Departments" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Departments</SelectItem>
                  {departments.map((dept) => (
                    <SelectItem key={dept.id} value={dept.id}>
                      {dept.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            <Select
              value={roleFilter || "all"}
              onValueChange={(v) => setRoleFilter(v === "all" ? "" : v)}
            >
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="All Roles" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Roles</SelectItem>
                <SelectItem value="EMPLOYEE">Employee</SelectItem>
                <SelectItem value="MANAGER">Manager</SelectItem>
                <SelectItem value="DEPARTMENT_HEAD">Dept Head</SelectItem>
              </SelectContent>
            </Select>
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-[150px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="composite">Composite</SelectItem>
                <SelectItem value="output">Output</SelectItem>
                <SelectItem value="quality">Quality</SelectItem>
                <SelectItem value="reliability">Reliability</SelectItem>
                <SelectItem value="consistency">Consistency</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4, 5].map((i) => (
                <div
                  key={i}
                  className="flex items-center gap-4 p-4 border rounded-lg animate-pulse"
                >
                  <div className="h-4 bg-gray-200 rounded w-32" />
                  <div className="h-4 bg-gray-200 rounded w-48 flex-1" />
                  <div className="h-4 bg-gray-200 rounded w-24" />
                </div>
              ))}
            </div>
          ) : scores.length === 0 ? (
            <div className="text-center py-12">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-gray-100 rounded-full mb-4">
                <BarChart3 className="h-8 w-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                No scores yet
              </h3>
              <p className="text-gray-500 max-w-sm mx-auto">
                {isAdmin
                  ? "Run a recalculation to generate scores for all users."
                  : "Scores will appear once they are calculated."}
              </p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="min-w-[180px]">Name</TableHead>
                      <TableHead className="w-[120px]">Department</TableHead>
                      <TableHead className="w-[90px]">Role</TableHead>
                      <TableHead className="w-[70px] text-center">
                        <span className={pillarColors.output}>Output</span>
                      </TableHead>
                      <TableHead className="w-[70px] text-center">
                        <span className={pillarColors.quality}>Quality</span>
                      </TableHead>
                      <TableHead className="w-[80px] text-center">
                        <span className={pillarColors.reliability}>Reliability</span>
                      </TableHead>
                      <TableHead className="w-[90px] text-center">
                        <span className={pillarColors.consistency}>Consistency</span>
                      </TableHead>
                      <TableHead className="w-[90px] text-center">Composite</TableHead>
                      <TableHead className="w-[100px]">Calculated</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {scores.map((score) => (
                      <TableRow
                        key={score.userId}
                        className="cursor-pointer hover:bg-muted/50 transition-colors"
                        onClick={() => setSelectedUser(score)}
                      >
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className="h-8 w-8 rounded-full bg-gray-200 flex items-center justify-center shrink-0">
                              <span className="text-xs font-medium text-gray-600">
                                {score.firstName[0]}{score.lastName[0]}
                              </span>
                            </div>
                            <span className="font-medium text-gray-900">
                              {score.firstName} {score.lastName}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm text-gray-600">
                            {score.department || "—"}
                          </span>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={`text-xs ${roleBadgeColors[score.role] || ""}`}
                          >
                            {roleLabels[score.role] || score.role}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center">
                          <span className={`text-sm font-medium ${pillarColors.output}`}>
                            {Math.round(score.output)}
                          </span>
                        </TableCell>
                        <TableCell className="text-center">
                          <span className={`text-sm font-medium ${pillarColors.quality}`}>
                            {Math.round(score.quality)}
                          </span>
                        </TableCell>
                        <TableCell className="text-center">
                          <span className={`text-sm font-medium ${pillarColors.reliability}`}>
                            {Math.round(score.reliability)}
                          </span>
                        </TableCell>
                        <TableCell className="text-center">
                          <span className={`text-sm font-medium ${pillarColors.consistency}`}>
                            {Math.round(score.consistency)}
                          </span>
                        </TableCell>
                        <TableCell className="text-center">
                          <ScoreBadge score={score.composite} />
                        </TableCell>
                        <TableCell>
                          <span className="text-xs text-gray-500">
                            {formatDistanceToNow(new Date(score.calculatedAt), {
                              addSuffix: true,
                            })}
                          </span>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Pagination */}
              {pagination.totalPages > 1 && (
                <div className="flex items-center justify-between mt-4 pt-4 border-t">
                  <p className="text-sm text-gray-500">
                    Showing {(pagination.page - 1) * pagination.limit + 1} to{" "}
                    {Math.min(pagination.page * pagination.limit, pagination.total)} of{" "}
                    {pagination.total} users
                  </p>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handlePageChange(pagination.page - 1)}
                      disabled={pagination.page === 1}
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <span className="text-sm text-gray-600">
                      Page {pagination.page} of {pagination.totalPages}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handlePageChange(pagination.page + 1)}
                      disabled={pagination.page === pagination.totalPages}
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {selectedUser && (
        <ScorecardDialog
          open={!!selectedUser}
          onOpenChange={(open) => !open && setSelectedUser(null)}
          userId={selectedUser.userId}
          userName={`${selectedUser.firstName} ${selectedUser.lastName}`}
          userRole={selectedUser.role}
          userDepartment={selectedUser.department}
        />
      )}
    </>
  );
}
