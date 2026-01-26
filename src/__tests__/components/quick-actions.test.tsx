import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { TaskStatus, Role } from "@prisma/client";
import { QuickActions } from "@/components/tasks/quick-actions";

describe("QuickActions", () => {
  const defaultProps = {
    currentStatus: TaskStatus.NEW,
    userRole: Role.EMPLOYEE,
    isOwner: true,
    isManager: false,
    requiresReview: true,
    onAction: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("Actions for different statuses", () => {
    it("should show Start action for NEW status when owner", () => {
      render(<QuickActions {...defaultProps} currentStatus={TaskStatus.NEW} />);

      expect(screen.getByTitle("Start")).toBeInTheDocument();
    });

    it("should show Start action for ACCEPTED status when owner", () => {
      render(<QuickActions {...defaultProps} currentStatus={TaskStatus.ACCEPTED} />);

      expect(screen.getByTitle("Start")).toBeInTheDocument();
    });

    it("should show Complete and Pause actions for IN_PROGRESS status when owner", () => {
      render(<QuickActions {...defaultProps} currentStatus={TaskStatus.IN_PROGRESS} />);

      expect(screen.getByTitle("Complete")).toBeInTheDocument();
      expect(screen.getByTitle("Pause")).toBeInTheDocument();
    });

    it("should target CLOSED_APPROVED for Complete when requiresReview is false", async () => {
      const user = userEvent.setup();
      const onAction = jest.fn();
      render(
        <QuickActions
          {...defaultProps}
          currentStatus={TaskStatus.IN_PROGRESS}
          requiresReview={false}
          onAction={onAction}
        />
      );

      await user.click(screen.getByTitle("Complete"));
      expect(onAction).toHaveBeenCalledWith(TaskStatus.CLOSED_APPROVED, false);
    });

    it("should target COMPLETED_PENDING_REVIEW for Complete when requiresReview is true", async () => {
      const user = userEvent.setup();
      const onAction = jest.fn();
      render(
        <QuickActions
          {...defaultProps}
          currentStatus={TaskStatus.IN_PROGRESS}
          requiresReview={true}
          onAction={onAction}
        />
      );

      await user.click(screen.getByTitle("Complete"));
      expect(onAction).toHaveBeenCalledWith(TaskStatus.COMPLETED_PENDING_REVIEW, false);
    });

    it("should show Resume action for ON_HOLD status when owner", () => {
      render(<QuickActions {...defaultProps} currentStatus={TaskStatus.ON_HOLD} />);

      expect(screen.getByTitle("Resume")).toBeInTheDocument();
    });

    it("should show Resume action for REOPENED status when owner", () => {
      render(<QuickActions {...defaultProps} currentStatus={TaskStatus.REOPENED} />);

      expect(screen.getByTitle("Resume")).toBeInTheDocument();
    });

    it("should show Approve and Reject actions for COMPLETED_PENDING_REVIEW when manager", () => {
      render(
        <QuickActions
          {...defaultProps}
          currentStatus={TaskStatus.COMPLETED_PENDING_REVIEW}
          userRole={Role.MANAGER}
          isOwner={false}
          isManager={true}
        />
      );

      expect(screen.getByTitle("Approve")).toBeInTheDocument();
      expect(screen.getByTitle("Reject")).toBeInTheDocument();
    });

    it("should not show actions for CLOSED_APPROVED (terminal state)", () => {
      const { container } = render(
        <QuickActions {...defaultProps} currentStatus={TaskStatus.CLOSED_APPROVED} />
      );

      expect(container).toBeEmptyDOMElement();
    });
  });

  describe("Role-based visibility", () => {
    it("should not show actions for non-owner on NEW status", () => {
      const { container } = render(
        <QuickActions {...defaultProps} currentStatus={TaskStatus.NEW} isOwner={false} />
      );

      expect(container).toBeEmptyDOMElement();
    });

    it("should not show review actions for employee on COMPLETED_PENDING_REVIEW", () => {
      const { container } = render(
        <QuickActions
          {...defaultProps}
          currentStatus={TaskStatus.COMPLETED_PENDING_REVIEW}
          userRole={Role.EMPLOYEE}
          isOwner={false}
          isManager={false}
        />
      );

      expect(container).toBeEmptyDOMElement();
    });

    it("should show review actions for DEPARTMENT_HEAD", () => {
      render(
        <QuickActions
          {...defaultProps}
          currentStatus={TaskStatus.COMPLETED_PENDING_REVIEW}
          userRole={Role.DEPARTMENT_HEAD}
          isOwner={false}
          isManager={true}
        />
      );

      expect(screen.getByTitle("Approve")).toBeInTheDocument();
      expect(screen.getByTitle("Reject")).toBeInTheDocument();
    });

    it("should show review actions for ADMIN", () => {
      render(
        <QuickActions
          {...defaultProps}
          currentStatus={TaskStatus.COMPLETED_PENDING_REVIEW}
          userRole={Role.ADMIN}
          isOwner={false}
          isManager={true}
        />
      );

      expect(screen.getByTitle("Approve")).toBeInTheDocument();
    });
  });

  describe("Action callbacks", () => {
    it("should call onAction with correct status when Start is clicked", async () => {
      const user = userEvent.setup();
      const onAction = jest.fn();
      render(<QuickActions {...defaultProps} onAction={onAction} />);

      await user.click(screen.getByTitle("Start"));

      expect(onAction).toHaveBeenCalledWith(TaskStatus.IN_PROGRESS, false);
    });

    it("should call onAction with requiresReason=true for Pause", async () => {
      const user = userEvent.setup();
      const onAction = jest.fn();
      render(
        <QuickActions
          {...defaultProps}
          currentStatus={TaskStatus.IN_PROGRESS}
          onAction={onAction}
        />
      );

      await user.click(screen.getByTitle("Pause"));

      expect(onAction).toHaveBeenCalledWith(TaskStatus.ON_HOLD, true);
    });

    it("should call onAction with requiresReason=true for Reject", async () => {
      const user = userEvent.setup();
      const onAction = jest.fn();
      render(
        <QuickActions
          {...defaultProps}
          currentStatus={TaskStatus.COMPLETED_PENDING_REVIEW}
          userRole={Role.MANAGER}
          isOwner={false}
          isManager={true}
          onAction={onAction}
        />
      );

      await user.click(screen.getByTitle("Reject"));

      expect(onAction).toHaveBeenCalledWith(TaskStatus.REOPENED, true);
    });

    it("should call onAction with requiresReason=false for Approve", async () => {
      const user = userEvent.setup();
      const onAction = jest.fn();
      render(
        <QuickActions
          {...defaultProps}
          currentStatus={TaskStatus.COMPLETED_PENDING_REVIEW}
          userRole={Role.MANAGER}
          isOwner={false}
          isManager={true}
          onAction={onAction}
        />
      );

      await user.click(screen.getByTitle("Approve"));

      expect(onAction).toHaveBeenCalledWith(TaskStatus.CLOSED_APPROVED, false);
    });
  });

  describe("Event propagation", () => {
    it("should stop event propagation on click", async () => {
      const user = userEvent.setup();
      const parentClick = jest.fn();
      const onAction = jest.fn();

      render(
        <div onClick={parentClick}>
          <QuickActions {...defaultProps} onAction={onAction} />
        </div>
      );

      await user.click(screen.getByTitle("Start"));

      expect(onAction).toHaveBeenCalled();
      // Parent click should not be triggered due to stopPropagation on container
    });
  });
});
