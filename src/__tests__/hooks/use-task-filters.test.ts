import { renderHook, act } from "@testing-library/react";
import { TaskStatus, TaskPriority } from "@prisma/client";
import { useTaskFilters } from "@/hooks/use-task-filters";

describe("useTaskFilters", () => {
  describe("initial state", () => {
    it("should have empty initial filters", () => {
      const { result } = renderHook(() => useTaskFilters());

      expect(result.current.filters.statuses).toEqual([]);
      expect(result.current.filters.priorities).toEqual([]);
      expect(result.current.filters.kpiBucketId).toBeNull();
      expect(result.current.filters.datePreset).toBeNull();
      expect(result.current.hasActiveFilters).toBe(false);
      expect(result.current.activeFilterCount).toBe(0);
    });
  });

  describe("status filters", () => {
    it("should toggle status on", () => {
      const { result } = renderHook(() => useTaskFilters());

      act(() => {
        result.current.toggleStatus(TaskStatus.IN_PROGRESS);
      });

      expect(result.current.filters.statuses).toContain(TaskStatus.IN_PROGRESS);
      expect(result.current.hasActiveFilters).toBe(true);
    });

    it("should toggle status off", () => {
      const { result } = renderHook(() => useTaskFilters());

      act(() => {
        result.current.toggleStatus(TaskStatus.IN_PROGRESS);
      });

      act(() => {
        result.current.toggleStatus(TaskStatus.IN_PROGRESS);
      });

      expect(result.current.filters.statuses).not.toContain(TaskStatus.IN_PROGRESS);
    });

    it("should set multiple statuses", () => {
      const { result } = renderHook(() => useTaskFilters());

      act(() => {
        result.current.setStatuses([TaskStatus.IN_PROGRESS, TaskStatus.ON_HOLD]);
      });

      expect(result.current.filters.statuses).toHaveLength(2);
      expect(result.current.filters.statuses).toContain(TaskStatus.IN_PROGRESS);
      expect(result.current.filters.statuses).toContain(TaskStatus.ON_HOLD);
    });
  });

  describe("priority filters", () => {
    it("should toggle priority on", () => {
      const { result } = renderHook(() => useTaskFilters());

      act(() => {
        result.current.togglePriority(TaskPriority.URGENT_IMPORTANT);
      });

      expect(result.current.filters.priorities).toContain(TaskPriority.URGENT_IMPORTANT);
    });

    it("should toggle priority off", () => {
      const { result } = renderHook(() => useTaskFilters());

      act(() => {
        result.current.togglePriority(TaskPriority.URGENT_IMPORTANT);
      });

      act(() => {
        result.current.togglePriority(TaskPriority.URGENT_IMPORTANT);
      });

      expect(result.current.filters.priorities).not.toContain(TaskPriority.URGENT_IMPORTANT);
    });
  });

  describe("KPI bucket filter", () => {
    it("should set KPI bucket ID", () => {
      const { result } = renderHook(() => useTaskFilters());

      act(() => {
        result.current.setKpiBucketId("bucket-1");
      });

      expect(result.current.filters.kpiBucketId).toBe("bucket-1");
    });

    it("should clear KPI bucket ID", () => {
      const { result } = renderHook(() => useTaskFilters());

      act(() => {
        result.current.setKpiBucketId("bucket-1");
      });

      act(() => {
        result.current.setKpiBucketId(null);
      });

      expect(result.current.filters.kpiBucketId).toBeNull();
    });
  });

  describe("date preset filter", () => {
    it("should set date preset with calculated dates", () => {
      const { result } = renderHook(() => useTaskFilters());

      act(() => {
        result.current.setDatePreset("today");
      });

      expect(result.current.filters.datePreset).toBe("today");
      expect(result.current.filters.fromDate).toBeDefined();
      expect(result.current.filters.toDate).toBeDefined();
    });

    it("should clear date preset", () => {
      const { result } = renderHook(() => useTaskFilters());

      act(() => {
        result.current.setDatePreset("today");
      });

      act(() => {
        result.current.setDatePreset(null);
      });

      expect(result.current.filters.datePreset).toBeNull();
      expect(result.current.filters.fromDate).toBeNull();
      expect(result.current.filters.toDate).toBeNull();
    });
  });

  describe("custom date range", () => {
    it("should set custom date range and clear preset", () => {
      const { result } = renderHook(() => useTaskFilters());

      act(() => {
        result.current.setDatePreset("today");
      });

      act(() => {
        result.current.setCustomDateRange("2025-01-01", "2025-01-31");
      });

      expect(result.current.filters.datePreset).toBeNull();
      expect(result.current.filters.fromDate).toBe("2025-01-01");
      expect(result.current.filters.toDate).toBe("2025-01-31");
    });
  });

  describe("clearFilters", () => {
    it("should clear all filters", () => {
      const { result } = renderHook(() => useTaskFilters());

      act(() => {
        result.current.toggleStatus(TaskStatus.IN_PROGRESS);
        result.current.togglePriority(TaskPriority.URGENT_IMPORTANT);
        result.current.setKpiBucketId("bucket-1");
        result.current.setDatePreset("today");
      });

      expect(result.current.hasActiveFilters).toBe(true);

      act(() => {
        result.current.clearFilters();
      });

      expect(result.current.filters.statuses).toEqual([]);
      expect(result.current.filters.priorities).toEqual([]);
      expect(result.current.filters.kpiBucketId).toBeNull();
      expect(result.current.filters.datePreset).toBeNull();
      expect(result.current.hasActiveFilters).toBe(false);
    });
  });

  describe("activeFilterCount", () => {
    it("should count filter categories, not individual items", () => {
      const { result } = renderHook(() => useTaskFilters());

      act(() => {
        result.current.setStatuses([TaskStatus.IN_PROGRESS, TaskStatus.ON_HOLD]);
        result.current.setPriorities([TaskPriority.URGENT_IMPORTANT]);
      });

      // 2 categories active: statuses and priorities
      expect(result.current.activeFilterCount).toBe(2);
    });

    it("should count date filter as one category", () => {
      const { result } = renderHook(() => useTaskFilters());

      act(() => {
        result.current.setDatePreset("today");
      });

      expect(result.current.activeFilterCount).toBe(1);
    });
  });

  describe("toQueryParams", () => {
    it("should generate correct query params", () => {
      const { result } = renderHook(() => useTaskFilters());

      act(() => {
        result.current.setStatuses([TaskStatus.IN_PROGRESS]);
        result.current.setPriorities([TaskPriority.URGENT_IMPORTANT]);
        result.current.setKpiBucketId("bucket-1");
      });

      const params = result.current.toQueryParams();

      expect(params.getAll("status")).toContain(TaskStatus.IN_PROGRESS);
      expect(params.getAll("priority")).toContain(TaskPriority.URGENT_IMPORTANT);
      expect(params.get("kpiBucketId")).toBe("bucket-1");
    });

    it("should include date params when set", () => {
      const { result } = renderHook(() => useTaskFilters());

      act(() => {
        result.current.setDatePreset("today");
      });

      const params = result.current.toQueryParams();

      expect(params.get("fromDate")).toBeDefined();
      expect(params.get("toDate")).toBeDefined();
    });

    it("should return empty params when no filters", () => {
      const { result } = renderHook(() => useTaskFilters());

      const params = result.current.toQueryParams();

      expect(params.toString()).toBe("");
    });
  });
});
