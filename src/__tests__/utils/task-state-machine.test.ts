import { TaskStatus, Role } from "@prisma/client";
import {
  validateTransition,
  getValidTransitions,
  getStatusLabel,
  getStatusColor,
  transitionRequiresReason,
  TransitionContext,
} from "@/lib/utils/task-state-machine";

describe("Task State Machine", () => {
  const baseContext: TransitionContext = {
    taskOwnerId: "owner-1",
    currentUserId: "owner-1",
    currentUserRole: Role.EMPLOYEE,
    isManager: false,
  };

  describe("validateTransition", () => {
    describe("NEW → ACCEPTED", () => {
      it("should allow owner to accept task", () => {
        const result = validateTransition(TaskStatus.NEW, TaskStatus.ACCEPTED, baseContext);
        expect(result.valid).toBe(true);
      });

      it("should reject non-owner accepting task", () => {
        const result = validateTransition(TaskStatus.NEW, TaskStatus.ACCEPTED, {
          ...baseContext,
          currentUserId: "other-user",
        });
        expect(result.valid).toBe(false);
        expect(result.error).toBe("Only task owner can accept the task");
      });
    });

    describe("NEW → IN_PROGRESS", () => {
      it("should allow owner to start task directly", () => {
        const result = validateTransition(TaskStatus.NEW, TaskStatus.IN_PROGRESS, baseContext);
        expect(result.valid).toBe(true);
      });
    });

    describe("ACCEPTED → IN_PROGRESS", () => {
      it("should allow owner to start accepted task", () => {
        const result = validateTransition(TaskStatus.ACCEPTED, TaskStatus.IN_PROGRESS, baseContext);
        expect(result.valid).toBe(true);
      });
    });

    describe("IN_PROGRESS → ON_HOLD", () => {
      it("should allow owner with valid reason", () => {
        const result = validateTransition(TaskStatus.IN_PROGRESS, TaskStatus.ON_HOLD, {
          ...baseContext,
          onHoldReason: "Waiting for client feedback on the design",
        });
        expect(result.valid).toBe(true);
      });

      it("should reject without reason", () => {
        const result = validateTransition(TaskStatus.IN_PROGRESS, TaskStatus.ON_HOLD, baseContext);
        expect(result.valid).toBe(false);
        expect(result.error).toBe("On-hold reason must be at least 10 characters");
      });

      it("should reject short reason", () => {
        const result = validateTransition(TaskStatus.IN_PROGRESS, TaskStatus.ON_HOLD, {
          ...baseContext,
          onHoldReason: "waiting",
        });
        expect(result.valid).toBe(false);
      });

      it("should reject non-owner", () => {
        const result = validateTransition(TaskStatus.IN_PROGRESS, TaskStatus.ON_HOLD, {
          ...baseContext,
          currentUserId: "other-user",
          onHoldReason: "Valid long reason here",
        });
        expect(result.valid).toBe(false);
        expect(result.error).toBe("Only task owner can put task on hold");
      });
    });

    describe("ON_HOLD → IN_PROGRESS", () => {
      it("should allow owner to resume", () => {
        const result = validateTransition(TaskStatus.ON_HOLD, TaskStatus.IN_PROGRESS, baseContext);
        expect(result.valid).toBe(true);
      });
    });

    describe("IN_PROGRESS → COMPLETED_PENDING_REVIEW", () => {
      it("should allow owner to submit for review", () => {
        const result = validateTransition(
          TaskStatus.IN_PROGRESS,
          TaskStatus.COMPLETED_PENDING_REVIEW,
          baseContext
        );
        expect(result.valid).toBe(true);
      });
    });

    describe("COMPLETED_PENDING_REVIEW → CLOSED_APPROVED", () => {
      it("should allow manager to approve subordinate task", () => {
        const result = validateTransition(
          TaskStatus.COMPLETED_PENDING_REVIEW,
          TaskStatus.CLOSED_APPROVED,
          {
            taskOwnerId: "employee-1",
            currentUserId: "manager-1",
            currentUserRole: Role.MANAGER,
            isManager: true,
          }
        );
        expect(result.valid).toBe(true);
      });

      it("should reject owner approving own task", () => {
        const result = validateTransition(
          TaskStatus.COMPLETED_PENDING_REVIEW,
          TaskStatus.CLOSED_APPROVED,
          {
            ...baseContext,
            currentUserRole: Role.MANAGER,
          }
        );
        expect(result.valid).toBe(false);
        expect(result.error).toBe("Cannot approve your own task");
      });

      it("should reject employee approving", () => {
        const result = validateTransition(
          TaskStatus.COMPLETED_PENDING_REVIEW,
          TaskStatus.CLOSED_APPROVED,
          {
            taskOwnerId: "other-emp",
            currentUserId: "emp-1",
            currentUserRole: Role.EMPLOYEE,
            isManager: false,
          }
        );
        expect(result.valid).toBe(false);
      });
    });

    describe("COMPLETED_PENDING_REVIEW → REOPENED", () => {
      it("should allow manager to reopen with reason", () => {
        const result = validateTransition(
          TaskStatus.COMPLETED_PENDING_REVIEW,
          TaskStatus.REOPENED,
          {
            taskOwnerId: "employee-1",
            currentUserId: "manager-1",
            currentUserRole: Role.MANAGER,
            isManager: true,
            reason: "The implementation doesn't meet requirements",
          }
        );
        expect(result.valid).toBe(true);
      });

      it("should reject without reason", () => {
        const result = validateTransition(
          TaskStatus.COMPLETED_PENDING_REVIEW,
          TaskStatus.REOPENED,
          {
            taskOwnerId: "employee-1",
            currentUserId: "manager-1",
            currentUserRole: Role.MANAGER,
            isManager: true,
          }
        );
        expect(result.valid).toBe(false);
        expect(result.error).toBe("Rejection reason must be at least 10 characters");
      });
    });

    describe("REOPENED → IN_PROGRESS", () => {
      it("should allow owner to resume reopened task", () => {
        const result = validateTransition(TaskStatus.REOPENED, TaskStatus.IN_PROGRESS, baseContext);
        expect(result.valid).toBe(true);
      });
    });

    describe("Invalid transitions", () => {
      it("should reject NEW → CLOSED_APPROVED", () => {
        const result = validateTransition(TaskStatus.NEW, TaskStatus.CLOSED_APPROVED, baseContext);
        expect(result.valid).toBe(false);
        expect(result.error).toContain("Invalid transition");
      });

      it("should reject CLOSED_APPROVED → anything", () => {
        const result = validateTransition(
          TaskStatus.CLOSED_APPROVED,
          TaskStatus.IN_PROGRESS,
          baseContext
        );
        expect(result.valid).toBe(false);
      });
    });
  });

  describe("getValidTransitions", () => {
    it("should return valid transitions for NEW status as owner", () => {
      const transitions = getValidTransitions(TaskStatus.NEW, baseContext);
      expect(transitions).toContain(TaskStatus.ACCEPTED);
      expect(transitions).toContain(TaskStatus.IN_PROGRESS);
      expect(transitions).not.toContain(TaskStatus.CLOSED_APPROVED);
    });

    it("should return valid transitions for IN_PROGRESS with reason", () => {
      const transitions = getValidTransitions(TaskStatus.IN_PROGRESS, {
        ...baseContext,
        onHoldReason: "Valid reason for holding",
      });
      expect(transitions).toContain(TaskStatus.ON_HOLD);
      expect(transitions).toContain(TaskStatus.COMPLETED_PENDING_REVIEW);
    });

    it("should return approval options for manager reviewing", () => {
      const transitions = getValidTransitions(TaskStatus.COMPLETED_PENDING_REVIEW, {
        taskOwnerId: "employee-1",
        currentUserId: "manager-1",
        currentUserRole: Role.MANAGER,
        isManager: true,
        reason: "Valid rejection reason",
      });
      expect(transitions).toContain(TaskStatus.CLOSED_APPROVED);
      expect(transitions).toContain(TaskStatus.REOPENED);
    });
  });

  describe("transitionRequiresReason", () => {
    it("should require reason for ON_HOLD transition", () => {
      expect(transitionRequiresReason(TaskStatus.IN_PROGRESS, TaskStatus.ON_HOLD)).toBe(true);
    });

    it("should require reason for REOPENED transition", () => {
      expect(transitionRequiresReason(TaskStatus.COMPLETED_PENDING_REVIEW, TaskStatus.REOPENED)).toBe(true);
    });

    it("should not require reason for ACCEPTED transition", () => {
      expect(transitionRequiresReason(TaskStatus.NEW, TaskStatus.ACCEPTED)).toBe(false);
    });
  });

  describe("getStatusLabel", () => {
    it("should return human-readable labels", () => {
      expect(getStatusLabel(TaskStatus.NEW)).toBe("New");
      expect(getStatusLabel(TaskStatus.IN_PROGRESS)).toBe("In Progress");
      expect(getStatusLabel(TaskStatus.COMPLETED_PENDING_REVIEW)).toBe("Pending Review");
      expect(getStatusLabel(TaskStatus.CLOSED_APPROVED)).toBe("Completed");
    });
  });

  describe("getStatusColor", () => {
    it("should return color classes for each status", () => {
      const newColor = getStatusColor(TaskStatus.NEW);
      expect(newColor.bg).toBe("bg-gray-100");
      expect(newColor.text).toBe("text-gray-700");

      const inProgressColor = getStatusColor(TaskStatus.IN_PROGRESS);
      expect(inProgressColor.bg).toBe("bg-indigo-100");

      const completedColor = getStatusColor(TaskStatus.CLOSED_APPROVED);
      expect(completedColor.bg).toBe("bg-green-100");
    });
  });
});
