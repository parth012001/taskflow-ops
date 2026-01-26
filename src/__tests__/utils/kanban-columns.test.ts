import { TaskStatus } from "@prisma/client";
import {
  KANBAN_COLUMNS,
  COLUMN_ORDER,
  getColumnForStatus,
  getDefaultStatusForColumn,
  getColumnConfig,
  getStatusBadge,
  getValidDropTargets,
  isValidDropTarget,
  getDropTargetStatus,
} from "@/lib/utils/kanban-columns";

describe("Kanban Columns Utility", () => {
  describe("KANBAN_COLUMNS", () => {
    it("should have 4 columns", () => {
      expect(Object.keys(KANBAN_COLUMNS)).toHaveLength(4);
    });

    it("should have TODO column with correct statuses", () => {
      expect(KANBAN_COLUMNS.TODO.statuses).toContain(TaskStatus.NEW);
      expect(KANBAN_COLUMNS.TODO.statuses).toContain(TaskStatus.ACCEPTED);
      expect(KANBAN_COLUMNS.TODO.statuses).toContain(TaskStatus.REOPENED);
    });

    it("should have IN_PROGRESS column with correct statuses", () => {
      expect(KANBAN_COLUMNS.IN_PROGRESS.statuses).toContain(TaskStatus.IN_PROGRESS);
      expect(KANBAN_COLUMNS.IN_PROGRESS.statuses).toContain(TaskStatus.ON_HOLD);
    });

    it("should have IN_REVIEW column with correct status", () => {
      expect(KANBAN_COLUMNS.IN_REVIEW.statuses).toContain(TaskStatus.COMPLETED_PENDING_REVIEW);
    });

    it("should have DONE column with correct status", () => {
      expect(KANBAN_COLUMNS.DONE.statuses).toContain(TaskStatus.CLOSED_APPROVED);
    });
  });

  describe("COLUMN_ORDER", () => {
    it("should have 4 columns in correct order", () => {
      expect(COLUMN_ORDER).toEqual(["TODO", "IN_PROGRESS", "IN_REVIEW", "DONE"]);
    });
  });

  describe("getColumnForStatus", () => {
    it("should return TODO for NEW status", () => {
      expect(getColumnForStatus(TaskStatus.NEW)).toBe("TODO");
    });

    it("should return TODO for ACCEPTED status", () => {
      expect(getColumnForStatus(TaskStatus.ACCEPTED)).toBe("TODO");
    });

    it("should return TODO for REOPENED status", () => {
      expect(getColumnForStatus(TaskStatus.REOPENED)).toBe("TODO");
    });

    it("should return IN_PROGRESS for IN_PROGRESS status", () => {
      expect(getColumnForStatus(TaskStatus.IN_PROGRESS)).toBe("IN_PROGRESS");
    });

    it("should return IN_PROGRESS for ON_HOLD status", () => {
      expect(getColumnForStatus(TaskStatus.ON_HOLD)).toBe("IN_PROGRESS");
    });

    it("should return IN_REVIEW for COMPLETED_PENDING_REVIEW status", () => {
      expect(getColumnForStatus(TaskStatus.COMPLETED_PENDING_REVIEW)).toBe("IN_REVIEW");
    });

    it("should return DONE for CLOSED_APPROVED status", () => {
      expect(getColumnForStatus(TaskStatus.CLOSED_APPROVED)).toBe("DONE");
    });
  });

  describe("getDefaultStatusForColumn", () => {
    it("should return NEW for TODO column", () => {
      expect(getDefaultStatusForColumn("TODO")).toBe(TaskStatus.NEW);
    });

    it("should return IN_PROGRESS for IN_PROGRESS column", () => {
      expect(getDefaultStatusForColumn("IN_PROGRESS")).toBe(TaskStatus.IN_PROGRESS);
    });

    it("should return COMPLETED_PENDING_REVIEW for IN_REVIEW column", () => {
      expect(getDefaultStatusForColumn("IN_REVIEW")).toBe(TaskStatus.COMPLETED_PENDING_REVIEW);
    });

    it("should return CLOSED_APPROVED for DONE column", () => {
      expect(getDefaultStatusForColumn("DONE")).toBe(TaskStatus.CLOSED_APPROVED);
    });
  });

  describe("getColumnConfig", () => {
    it("should return correct config for TODO", () => {
      const config = getColumnConfig("TODO");
      expect(config.id).toBe("TODO");
      expect(config.label).toBe("To Do");
      expect(config.color).toBeDefined();
    });

    it("should return correct config for DONE", () => {
      const config = getColumnConfig("DONE");
      expect(config.id).toBe("DONE");
      expect(config.label).toBe("Done");
    });
  });

  describe("getStatusBadge", () => {
    it("should return warning badge for ON_HOLD", () => {
      const badge = getStatusBadge(TaskStatus.ON_HOLD);
      expect(badge).toEqual({ label: "On Hold", variant: "warning" });
    });

    it("should return danger badge for REOPENED", () => {
      const badge = getStatusBadge(TaskStatus.REOPENED);
      expect(badge).toEqual({ label: "Reopened", variant: "danger" });
    });

    it("should return null for other statuses", () => {
      expect(getStatusBadge(TaskStatus.NEW)).toBeNull();
      expect(getStatusBadge(TaskStatus.IN_PROGRESS)).toBeNull();
      expect(getStatusBadge(TaskStatus.CLOSED_APPROVED)).toBeNull();
    });
  });

  describe("getValidDropTargets", () => {
    it("should return valid targets for NEW status", () => {
      const targets = getValidDropTargets(TaskStatus.NEW);
      expect(targets).toContainEqual({ status: TaskStatus.ACCEPTED, requiresReason: false });
      expect(targets).toContainEqual({ status: TaskStatus.IN_PROGRESS, requiresReason: false });
    });

    it("should return valid targets for IN_PROGRESS status (review ON, default)", () => {
      const targets = getValidDropTargets(TaskStatus.IN_PROGRESS);
      expect(targets).toContainEqual({ status: TaskStatus.ON_HOLD, requiresReason: true });
      expect(targets).toContainEqual({ status: TaskStatus.COMPLETED_PENDING_REVIEW, requiresReason: false });
    });

    it("should return CLOSED_APPROVED for IN_PROGRESS when requiresReview=false", () => {
      const targets = getValidDropTargets(TaskStatus.IN_PROGRESS, false);
      expect(targets).toContainEqual({ status: TaskStatus.ON_HOLD, requiresReason: true });
      expect(targets).toContainEqual({ status: TaskStatus.CLOSED_APPROVED, requiresReason: false });
      expect(targets).not.toContainEqual(
        expect.objectContaining({ status: TaskStatus.COMPLETED_PENDING_REVIEW })
      );
    });

    it("should return valid targets for COMPLETED_PENDING_REVIEW status", () => {
      const targets = getValidDropTargets(TaskStatus.COMPLETED_PENDING_REVIEW);
      expect(targets).toContainEqual({ status: TaskStatus.CLOSED_APPROVED, requiresReason: false });
      expect(targets).toContainEqual({ status: TaskStatus.REOPENED, requiresReason: true });
    });

    it("should return empty array for CLOSED_APPROVED (terminal state)", () => {
      const targets = getValidDropTargets(TaskStatus.CLOSED_APPROVED);
      expect(targets).toHaveLength(0);
    });
  });

  describe("isValidDropTarget", () => {
    it("should return true for valid transitions", () => {
      expect(isValidDropTarget(TaskStatus.NEW, "IN_PROGRESS")).toBe(true);
      expect(isValidDropTarget(TaskStatus.IN_PROGRESS, "IN_REVIEW")).toBe(true);
      expect(isValidDropTarget(TaskStatus.COMPLETED_PENDING_REVIEW, "DONE")).toBe(true);
    });

    it("should return false for invalid transitions", () => {
      expect(isValidDropTarget(TaskStatus.NEW, "DONE")).toBe(false);
      expect(isValidDropTarget(TaskStatus.CLOSED_APPROVED, "TODO")).toBe(false);
    });

    it("should allow IN_PROGRESS to DONE when requiresReview=false", () => {
      expect(isValidDropTarget(TaskStatus.IN_PROGRESS, "DONE", false)).toBe(true);
    });

    it("should not allow IN_PROGRESS to IN_REVIEW when requiresReview=false", () => {
      expect(isValidDropTarget(TaskStatus.IN_PROGRESS, "IN_REVIEW", false)).toBe(false);
    });
  });

  describe("getDropTargetStatus", () => {
    it("should return correct status for valid drop", () => {
      const result = getDropTargetStatus(TaskStatus.NEW, "IN_PROGRESS");
      expect(result).toEqual({ status: TaskStatus.IN_PROGRESS, requiresReason: false });
    });

    it("should indicate reason required for ON_HOLD transition", () => {
      const result = getDropTargetStatus(TaskStatus.IN_PROGRESS, "IN_PROGRESS");
      // When dropping on same column but targeting ON_HOLD
      expect(result?.requiresReason).toBe(true);
    });

    it("should return null for invalid drop", () => {
      const result = getDropTargetStatus(TaskStatus.NEW, "DONE");
      expect(result).toBeNull();
    });
  });
});
