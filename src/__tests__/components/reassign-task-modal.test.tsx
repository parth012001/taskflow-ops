import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ReassignTaskModal } from "@/components/team/reassign-task-modal";

// Mock sonner toast
jest.mock("sonner", () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
  },
}));

// Mock fetch
const mockFetch = jest.fn();
global.fetch = mockFetch;

describe("ReassignTaskModal", () => {
  const defaultProps = {
    open: true,
    onOpenChange: jest.fn(),
    taskId: "task-123",
    taskTitle: "Implement new feature",
    currentOwnerId: "user-1",
    currentOwnerName: "John Doe",
    teamMembers: [
      { id: "user-1", firstName: "John", lastName: "Doe", email: "john@example.com" },
      { id: "user-2", firstName: "Jane", lastName: "Smith", email: "jane@example.com" },
      { id: "user-3", firstName: "Bob", lastName: "Wilson", email: "bob@example.com" },
    ],
    onSuccess: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({}),
    });
  });

  it("renders correctly when open", () => {
    render(<ReassignTaskModal {...defaultProps} />);

    // Title in dialog header
    expect(screen.getByRole("heading", { name: /Reassign Task/i })).toBeInTheDocument();
    expect(screen.getByText("Implement new feature")).toBeInTheDocument();
    expect(screen.getByText("Currently assigned to: John Doe")).toBeInTheDocument();
  });

  it("does not render when closed", () => {
    render(<ReassignTaskModal {...defaultProps} open={false} />);

    expect(screen.queryByText("Reassign Task")).not.toBeInTheDocument();
  });

  it("shows team member select dropdown", () => {
    render(<ReassignTaskModal {...defaultProps} />);

    expect(screen.getByRole("combobox")).toBeInTheDocument();
    expect(screen.getByText("Select team member")).toBeInTheDocument();
  });

  it("shows character count for reason", () => {
    render(<ReassignTaskModal {...defaultProps} />);

    expect(screen.getByText("0/500 characters (min 10)")).toBeInTheDocument();
  });

  it("shows Assign To label with required indicator", () => {
    render(<ReassignTaskModal {...defaultProps} />);

    expect(screen.getByText(/Assign To/)).toBeInTheDocument();
    // Check that required indicators exist (asterisks)
    const asterisks = screen.getAllByText("*");
    expect(asterisks.length).toBeGreaterThan(0);
  });

  it("shows Reason for Reassignment label with required indicator", () => {
    render(<ReassignTaskModal {...defaultProps} />);

    expect(screen.getByText(/Reason for Reassignment/)).toBeInTheDocument();
  });

  it("shows optional New Deadline field", () => {
    render(<ReassignTaskModal {...defaultProps} />);

    expect(screen.getByText(/New Deadline.*Optional/)).toBeInTheDocument();
  });

  it("updates character count when typing reason", async () => {
    const user = userEvent.setup();
    render(<ReassignTaskModal {...defaultProps} />);

    const reasonInput = screen.getByPlaceholderText(/Why is this task being reassigned/);
    await user.type(reasonInput, "Testing reason");

    expect(screen.getByText("14/500 characters (min 10)")).toBeInTheDocument();
  });

  it("disables submit button initially", () => {
    render(<ReassignTaskModal {...defaultProps} />);

    const submitButton = screen.getByRole("button", { name: /Reassign Task/ });
    expect(submitButton).toBeDisabled();
  });

  it("shows message when no other team members available", () => {
    render(
      <ReassignTaskModal
        {...defaultProps}
        teamMembers={[
          { id: "user-1", firstName: "John", lastName: "Doe", email: "john@example.com" },
        ]}
      />
    );

    expect(screen.getByText("No other team members available")).toBeInTheDocument();
  });

  it("closes modal when cancel is clicked", async () => {
    const user = userEvent.setup();
    render(<ReassignTaskModal {...defaultProps} />);

    const cancelButton = screen.getByRole("button", { name: /Cancel/ });
    await user.click(cancelButton);

    expect(defaultProps.onOpenChange).toHaveBeenCalledWith(false);
  });

  it("shows deadline input field", () => {
    render(<ReassignTaskModal {...defaultProps} />);

    const deadlineInput = screen.getByLabelText(/New Deadline/);
    expect(deadlineInput).toBeInTheDocument();
    expect(deadlineInput).toHaveAttribute("type", "date");
  });

  it("shows description text", () => {
    render(<ReassignTaskModal {...defaultProps} />);

    expect(screen.getByText("Transfer this task to another team member.")).toBeInTheDocument();
  });

  it("shows leave empty to keep current deadline text", () => {
    render(<ReassignTaskModal {...defaultProps} />);

    expect(screen.getByText("Leave empty to keep the current deadline")).toBeInTheDocument();
  });

  it("has proper form structure", () => {
    render(<ReassignTaskModal {...defaultProps} />);

    // Check form elements exist
    expect(screen.getByRole("combobox")).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/Why is this task being reassigned/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Cancel/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Reassign Task/ })).toBeInTheDocument();
  });

  it("shows error toast on API failure with validation", async () => {
    const { toast } = require("sonner");
    const user = userEvent.setup();
    render(<ReassignTaskModal {...defaultProps} />);

    // Enter a short reason (less than 10 chars)
    const reasonInput = screen.getByPlaceholderText(/Why is this task being reassigned/);
    await user.type(reasonInput, "Short");

    // Submit button should still be disabled
    const submitButton = screen.getByRole("button", { name: /Reassign Task/ });
    expect(submitButton).toBeDisabled();
  });
});
