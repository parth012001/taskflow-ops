"use client";

import { useState, useCallback, useMemo } from "react";
import { TaskStatus, TaskPriority } from "@prisma/client";

export interface TaskFilters {
  statuses: TaskStatus[];
  priorities: TaskPriority[];
  kpiBucketId: string | null;
  datePreset: DatePreset | null;
  fromDate: string | null;
  toDate: string | null;
  ownerIds: string[];
}

export type DatePreset = "overdue" | "today" | "this_week" | "this_month";

export interface UseTaskFiltersReturn {
  filters: TaskFilters;
  setStatuses: (statuses: TaskStatus[]) => void;
  toggleStatus: (status: TaskStatus) => void;
  setPriorities: (priorities: TaskPriority[]) => void;
  togglePriority: (priority: TaskPriority) => void;
  setKpiBucketId: (id: string | null) => void;
  setDatePreset: (preset: DatePreset | null) => void;
  setCustomDateRange: (fromDate: string | null, toDate: string | null) => void;
  setOwnerIds: (ids: string[]) => void;
  toggleOwner: (id: string) => void;
  clearFilters: () => void;
  hasActiveFilters: boolean;
  activeFilterCount: number;
  toQueryParams: () => URLSearchParams;
}

const initialFilters: TaskFilters = {
  statuses: [],
  priorities: [],
  kpiBucketId: null,
  datePreset: null,
  fromDate: null,
  toDate: null,
  ownerIds: [],
};

function getDateRangeForPreset(preset: DatePreset): { fromDate: string; toDate: string } {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const formatDate = (date: Date) => date.toISOString().split("T")[0];

  switch (preset) {
    case "overdue": {
      // Tasks with deadline before today
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      return {
        fromDate: "1970-01-01", // Far past
        toDate: formatDate(yesterday),
      };
    }
    case "today": {
      return {
        fromDate: formatDate(today),
        toDate: formatDate(today),
      };
    }
    case "this_week": {
      const endOfWeek = new Date(today);
      endOfWeek.setDate(today.getDate() + (6 - today.getDay())); // Sunday
      return {
        fromDate: formatDate(today),
        toDate: formatDate(endOfWeek),
      };
    }
    case "this_month": {
      const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);
      return {
        fromDate: formatDate(today),
        toDate: formatDate(endOfMonth),
      };
    }
    default:
      return { fromDate: "", toDate: "" };
  }
}

export function useTaskFilters(): UseTaskFiltersReturn {
  const [filters, setFilters] = useState<TaskFilters>(initialFilters);

  const setStatuses = useCallback((statuses: TaskStatus[]) => {
    setFilters((prev) => ({ ...prev, statuses }));
  }, []);

  const toggleStatus = useCallback((status: TaskStatus) => {
    setFilters((prev) => ({
      ...prev,
      statuses: prev.statuses.includes(status)
        ? prev.statuses.filter((s) => s !== status)
        : [...prev.statuses, status],
    }));
  }, []);

  const setPriorities = useCallback((priorities: TaskPriority[]) => {
    setFilters((prev) => ({ ...prev, priorities }));
  }, []);

  const togglePriority = useCallback((priority: TaskPriority) => {
    setFilters((prev) => ({
      ...prev,
      priorities: prev.priorities.includes(priority)
        ? prev.priorities.filter((p) => p !== priority)
        : [...prev.priorities, priority],
    }));
  }, []);

  const setKpiBucketId = useCallback((id: string | null) => {
    setFilters((prev) => ({ ...prev, kpiBucketId: id }));
  }, []);

  const setDatePreset = useCallback((preset: DatePreset | null) => {
    if (preset) {
      const { fromDate, toDate } = getDateRangeForPreset(preset);
      setFilters((prev) => ({
        ...prev,
        datePreset: preset,
        fromDate,
        toDate,
      }));
    } else {
      setFilters((prev) => ({
        ...prev,
        datePreset: null,
        fromDate: null,
        toDate: null,
      }));
    }
  }, []);

  const setCustomDateRange = useCallback((fromDate: string | null, toDate: string | null) => {
    setFilters((prev) => ({
      ...prev,
      datePreset: null, // Clear preset when using custom range
      fromDate,
      toDate,
    }));
  }, []);

  const setOwnerIds = useCallback((ids: string[]) => {
    setFilters((prev) => ({ ...prev, ownerIds: ids }));
  }, []);

  const toggleOwner = useCallback((id: string) => {
    setFilters((prev) => ({
      ...prev,
      ownerIds: prev.ownerIds.includes(id)
        ? prev.ownerIds.filter((o) => o !== id)
        : [...prev.ownerIds, id],
    }));
  }, []);

  const clearFilters = useCallback(() => {
    setFilters(initialFilters);
  }, []);

  const hasActiveFilters = useMemo(() => {
    return (
      filters.statuses.length > 0 ||
      filters.priorities.length > 0 ||
      filters.kpiBucketId !== null ||
      filters.datePreset !== null ||
      filters.fromDate !== null ||
      filters.toDate !== null ||
      filters.ownerIds.length > 0
    );
  }, [filters]);

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (filters.statuses.length > 0) count++;
    if (filters.priorities.length > 0) count++;
    if (filters.kpiBucketId) count++;
    if (filters.datePreset || filters.fromDate || filters.toDate) count++;
    if (filters.ownerIds.length > 0) count++;
    return count;
  }, [filters]);

  const toQueryParams = useCallback(() => {
    const params = new URLSearchParams();

    if (filters.statuses.length > 0) {
      filters.statuses.forEach((status) => params.append("status", status));
    }

    if (filters.priorities.length > 0) {
      filters.priorities.forEach((priority) => params.append("priority", priority));
    }

    if (filters.kpiBucketId) {
      params.set("kpiBucketId", filters.kpiBucketId);
    }

    if (filters.fromDate) {
      params.set("fromDate", filters.fromDate);
    }

    if (filters.toDate) {
      params.set("toDate", filters.toDate);
    }

    if (filters.ownerIds.length > 0) {
      filters.ownerIds.forEach((id) => params.append("ownerId", id));
    }

    return params;
  }, [filters]);

  return {
    filters,
    setStatuses,
    toggleStatus,
    setPriorities,
    togglePriority,
    setKpiBucketId,
    setDatePreset,
    setCustomDateRange,
    setOwnerIds,
    toggleOwner,
    clearFilters,
    hasActiveFilters,
    activeFilterCount,
    toQueryParams,
  };
}
