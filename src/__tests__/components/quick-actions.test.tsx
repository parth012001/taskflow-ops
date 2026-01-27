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

    it("should show Complete, Pause, and Undo actions for IN_PROGRESS status when owner", () => {
      render(<QuickActions {...defaultProps} currentStatus={TaskStatus.IN_PROGRESS} />);

      expect(screen.getByTitle("Complete")).toBeInTheDocument();
      expect(screen.getByTitle("Pause")).toBeInTheDocument();
      expect(screen.getByTitle("Undo")).toBeInTheDocument();
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

    it("should show Reopen action for CLOSED_APPROVED when owner", () => {
      render(
        <QuickActions {...defaultProps} currentStatus={TaskStatus.CLOSED_APPROVED} />
      );

      expect(screen.getByTitle("Reopen")).toBeInTheDocument();
    });

    it("should not show actions for CLOSED_APPROVED when not owner and not manager", () => {
      const { container } = render(
        <QuickActions
          {...defaultProps}
          currentStatus={TaskStatus.CLOSED_APPROVED}
          isOwner={false}
          isManager={false}
        />
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

  describe("Backward / Undo actions", () => {
    it("should show Withdraw action for owner on COMPLETED_PENDING_REVIEW", () => {
      render(
        <QuickActions
          {...defaultProps}
          currentStatus={TaskStatus.COMPLETED_PENDING_REVIEW}
          isOwner={true}
          isManager={false}
        />
      );

      expect(screen.getByTitle("Withdraw")).toBeInTheDocument();
    });

    it("should show both review and Withdraw actions when owner is also manager", () => {
      render(
        <QuickActions
          {...defaultProps}
          currentStatus={TaskStatus.COMPLETED_PENDING_REVIEW}
          userRole={Role.MANAGER}
          isOwner={true}
          isManager={true}
        />
      );

      // Manager actions (self-approval is blocked at state machine level, not UI)
      expect(screen.getByTitle("Approve")).toBeInTheDocument();
      expect(screen.getByTitle("Reject")).toBeInTheDocument();
      // Owner action
      expect(screen.getByTitle("Withdraw")).toBeInTheDocument();
    });

    it("should call onAction with ACCEPTED and requiresReason=false for Undo", async () => {
      const user = userEvent.setup();
      const onAction = jest.fn();
      render(
        <QuickActions
          {...defaultProps}
          currentStatus={TaskStatus.IN_PROGRESS}
          onAction={onAction}
        />
      );

      await user.click(screen.getByTitle("Undo"));
      expect(onAction).toHaveBeenCalledWith(TaskStatus.ACCEPTED, false);
    });

    it("should call onAction with IN_PROGRESS and requiresReason=false for Withdraw", async () => {
      const user = userEvent.setup();
      const onAction = jest.fn();
      render(
        <QuickActions
          {...defaultProps}
          currentStatus={TaskStatus.COMPLETED_PENDING_REVIEW}
          isOwner={true}
          onAction={onAction}
        />
      );

      await user.click(screen.getByTitle("Withdraw"));
      expect(onAction).toHaveBeenCalledWith(TaskStatus.IN_PROGRESS, false);
    });

    it("should call onAction with REOPENED and requiresReason=true for Reopen", async () => {
      const user = userEvent.setup();
      const onAction = jest.fn();
      render(
        <QuickActions
          {...defaultProps}
          currentStatus={TaskStatus.CLOSED_APPROVED}
          isOwner={true}
          onAction={onAction}
        />
      );

      await user.click(screen.getByTitle("Reopen"));
      expect(onAction).toHaveBeenCalledWith(TaskStatus.REOPENED, true);
    });

    it("should show Reopen for manager on CLOSED_APPROVED", () => {
      render(
        <QuickActions
          {...defaultProps}
          currentStatus={TaskStatus.CLOSED_APPROVED}
          userRole={Role.MANAGER}
          isOwner={false}
          isManager={true}
        />
      );

      expect(screen.getByTitle("Reopen")).toBeInTheDocument();
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
