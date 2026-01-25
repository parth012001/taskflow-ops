import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { TaskStatus } from "@prisma/client";
import { TransitionReasonModal } from "@/components/tasks/transition-reason-modal";

describe("TransitionReasonModal", () => {
  const defaultProps = {
    open: true,
    onOpenChange: jest.fn(),
    taskTitle: "Test Task Title",
    toStatus: TaskStatus.ON_HOLD,
    onConfirm: jest.fn(),
    onCancel: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders correctly for ON_HOLD transition", () => {
    render(<TransitionReasonModal {...defaultProps} />);

    expect(screen.getByText("Put Task On Hold")).toBeInTheDocument();
    expect(screen.getByText("Test Task Title")).toBeInTheDocument();
    expect(screen.getByText("Put On Hold")).toBeInTheDocument();
  });

  it("renders correctly for REOPENED transition", () => {
    render(<TransitionReasonModal {...defaultProps} toStatus={TaskStatus.REOPENED} />);

    // Title in header
    expect(screen.getByRole("heading", { name: /Reopen Task/i })).toBeInTheDocument();
    // Button text
    expect(screen.getByRole("button", { name: /Reopen Task/i })).toBeInTheDocument();
  });

  it("does not render when closed", () => {
    render(<TransitionReasonModal {...defaultProps} open={false} />);

    expect(screen.queryByText("Put Task On Hold")).not.toBeInTheDocument();
  });

  it("shows character count", () => {
    render(<TransitionReasonModal {...defaultProps} />);

    expect(screen.getByText("0/500 characters (min 10)")).toBeInTheDocument();
  });

  it("updates character count when typing", async () => {
    const user = userEvent.setup();
    render(<TransitionReasonModal {...defaultProps} />);

    const textarea = screen.getByRole("textbox");
    await user.type(textarea, "Testing reason");

    expect(screen.getByText("14/500 characters (min 10)")).toBeInTheDocument();
  });

  it("disables submit button when reason is too short", () => {
    render(<TransitionReasonModal {...defaultProps} />);

    const submitButton = screen.getByRole("button", { name: /Put On Hold/i });
    expect(submitButton).toBeDisabled();
  });

  it("enables submit button when reason is long enough", async () => {
    const user = userEvent.setup();
    render(<TransitionReasonModal {...defaultProps} />);

    const textarea = screen.getByRole("textbox");
    await user.type(textarea, "This is a valid reason for the transition");

    const submitButton = screen.getByRole("button", { name: /Put On Hold/i });
    expect(submitButton).not.toBeDisabled();
  });

  it("calls onConfirm with reason on submit", async () => {
    const user = userEvent.setup();
    const onConfirm = jest.fn().mockResolvedValue(undefined);
    render(<TransitionReasonModal {...defaultProps} onConfirm={onConfirm} />);

    const textarea = screen.getByRole("textbox");
    await user.type(textarea, "Waiting for client feedback on requirements");

    const submitButton = screen.getByRole("button", { name: /Put On Hold/i });
    await user.click(submitButton);

    await waitFor(() => {
      expect(onConfirm).toHaveBeenCalledWith("Waiting for client feedback on requirements");
    });
  });

  it("calls onCancel when cancel button is clicked", async () => {
    const user = userEvent.setup();
    render(<TransitionReasonModal {...defaultProps} />);

    const cancelButton = screen.getByRole("button", { name: /Cancel/i });
    await user.click(cancelButton);

    expect(defaultProps.onCancel).toHaveBeenCalled();
    expect(defaultProps.onOpenChange).toHaveBeenCalledWith(false);
  });

  it("resets state when modal closes", () => {
    const { rerender } = render(<TransitionReasonModal {...defaultProps} />);

    // Close the modal
    rerender(<TransitionReasonModal {...defaultProps} open={false} />);

    // Reopen
    rerender(<TransitionReasonModal {...defaultProps} open={true} />);

    // Should show empty state
    expect(screen.getByText("0/500 characters (min 10)")).toBeInTheDocument();
  });

  it("shows loading state during submission", async () => {
    const user = userEvent.setup();
    const onConfirm = jest.fn().mockImplementation(() => new Promise(() => {})); // Never resolves
    render(<TransitionReasonModal {...defaultProps} onConfirm={onConfirm} />);

    const textarea = screen.getByRole("textbox");
    await user.type(textarea, "Waiting for client feedback on requirements");

    const submitButton = screen.getByRole("button", { name: /Put On Hold/i });
    await user.click(submitButton);

    // Submit button should be disabled during loading
    expect(submitButton).toBeDisabled();
  });
});
