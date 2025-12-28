import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { CarryForwardModal } from "@/components/tasks/carry-forward-modal";

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

describe("CarryForwardModal", () => {
  const defaultProps = {
    open: true,
    onOpenChange: jest.fn(),
    taskId: "task-123",
    taskTitle: "Complete project documentation",
    currentDeadline: "2025-01-10T00:00:00Z",
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
    render(<CarryForwardModal {...defaultProps} />);

    expect(screen.getByText("Carry Forward Task")).toBeInTheDocument();
    expect(screen.getByText("Complete project documentation")).toBeInTheDocument();
    expect(screen.getByLabelText("New Deadline")).toBeInTheDocument();
    expect(screen.getByText(/Reason for Carry Forward/)).toBeInTheDocument();
  });

  it("does not render when closed", () => {
    render(<CarryForwardModal {...defaultProps} open={false} />);

    expect(screen.queryByText("Carry Forward Task")).not.toBeInTheDocument();
  });

  it("shows current deadline", () => {
    render(<CarryForwardModal {...defaultProps} />);

    expect(screen.getByText(/Current deadline:/)).toBeInTheDocument();
  });

  it("shows character count", () => {
    render(<CarryForwardModal {...defaultProps} />);

    expect(screen.getByText("0/500 characters (min 10)")).toBeInTheDocument();
  });

  it("updates character count when typing reason", async () => {
    const user = userEvent.setup();
    render(<CarryForwardModal {...defaultProps} />);

    const reasonInput = screen.getByPlaceholderText(/Why does this task/);
    await user.type(reasonInput, "Testing reason");

    expect(screen.getByText("14/500 characters (min 10)")).toBeInTheDocument();
  });

  it("disables submit button when reason is too short", () => {
    render(<CarryForwardModal {...defaultProps} />);

    const submitButton = screen.getByRole("button", { name: /Carry Forward/ });
    expect(submitButton).toBeDisabled();
  });

  it("enables submit button when reason is long enough", async () => {
    const user = userEvent.setup();
    render(<CarryForwardModal {...defaultProps} />);

    const reasonInput = screen.getByPlaceholderText(/Why does this task/);
    await user.type(reasonInput, "This is a valid reason for carry forward");

    const submitButton = screen.getByRole("button", { name: /Carry Forward/ });
    expect(submitButton).not.toBeDisabled();
  });

  it("calls API on submit with valid data", async () => {
    const user = userEvent.setup();
    render(<CarryForwardModal {...defaultProps} />);

    const reasonInput = screen.getByPlaceholderText(/Why does this task/);
    await user.type(reasonInput, "Waiting for client feedback on requirements");

    const submitButton = screen.getByRole("button", { name: /Carry Forward/ });
    await user.click(submitButton);

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        "/api/tasks/task-123/carry-forward",
        expect.objectContaining({
          method: "POST",
          headers: { "Content-Type": "application/json" },
        })
      );
    });
  });

  it("calls onSuccess and onOpenChange on successful submit", async () => {
    const user = userEvent.setup();
    render(<CarryForwardModal {...defaultProps} />);

    const reasonInput = screen.getByPlaceholderText(/Why does this task/);
    await user.type(reasonInput, "Waiting for client feedback on requirements");

    const submitButton = screen.getByRole("button", { name: /Carry Forward/ });
    await user.click(submitButton);

    await waitFor(() => {
      expect(defaultProps.onSuccess).toHaveBeenCalled();
      expect(defaultProps.onOpenChange).toHaveBeenCalledWith(false);
    });
  });

  it("shows error toast on API failure", async () => {
    const { toast } = require("sonner");
    mockFetch.mockResolvedValue({
      ok: false,
      json: async () => ({ error: "Task not found" }),
    });

    const user = userEvent.setup();
    render(<CarryForwardModal {...defaultProps} />);

    const reasonInput = screen.getByPlaceholderText(/Why does this task/);
    await user.type(reasonInput, "Waiting for client feedback on requirements");

    const submitButton = screen.getByRole("button", { name: /Carry Forward/ });
    await user.click(submitButton);

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith("Task not found");
    });
  });

  it("calls onOpenChange when cancel is clicked", async () => {
    const user = userEvent.setup();
    render(<CarryForwardModal {...defaultProps} />);

    const cancelButton = screen.getByRole("button", { name: /Cancel/ });
    await user.click(cancelButton);

    expect(defaultProps.onOpenChange).toHaveBeenCalledWith(false);
  });

  it("shows loading state during submission", async () => {
    // Make fetch hang
    mockFetch.mockImplementation(() => new Promise(() => {}));

    const user = userEvent.setup();
    render(<CarryForwardModal {...defaultProps} />);

    const reasonInput = screen.getByPlaceholderText(/Why does this task/);
    await user.type(reasonInput, "Waiting for client feedback on requirements");

    const submitButton = screen.getByRole("button", { name: /Carry Forward/ });
    await user.click(submitButton);

    // Submit button should be disabled during loading
    expect(submitButton).toBeDisabled();
  });
});
