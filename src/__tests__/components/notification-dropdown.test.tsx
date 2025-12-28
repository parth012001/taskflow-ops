import { render, screen, waitFor, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NotificationDropdown } from "@/components/notifications/notification-dropdown";

// Mock next/navigation with a trackable mock
const mockPush = jest.fn();
jest.mock("next/navigation", () => ({
  useRouter: () => ({
    push: mockPush,
    replace: jest.fn(),
    prefetch: jest.fn(),
    back: jest.fn(),
  }),
}));

// Mock fetch
const mockFetch = jest.fn();
global.fetch = mockFetch;

describe("NotificationDropdown", () => {
  const mockNotifications = [
    {
      id: "notif-1",
      type: "TASK_PENDING_REVIEW",
      title: "Task pending review",
      message: "Your task 'Complete documentation' is pending review",
      entityType: "Task",
      entityId: "task-123",
      isRead: false,
      createdAt: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
    },
    {
      id: "notif-2",
      type: "TASK_APPROVED",
      title: "Task approved",
      message: "Your task 'Fix bug' has been approved",
      entityType: "Task",
      entityId: "task-456",
      isRead: true,
      createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        notifications: mockNotifications,
        unreadCount: 1,
        total: 2,
      }),
    });
  });

  it("renders bell icon button", async () => {
    await act(async () => {
      render(<NotificationDropdown />);
    });

    const bellButton = screen.getByRole("button");
    expect(bellButton).toBeInTheDocument();
  });

  it("shows unread count badge when there are unread notifications", async () => {
    await act(async () => {
      render(<NotificationDropdown />);
    });

    await waitFor(() => {
      expect(screen.getByText("1")).toBeInTheDocument();
    });
  });

  it("shows 9+ when unread count exceeds 9", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        notifications: mockNotifications,
        unreadCount: 15,
        total: 20,
      }),
    });

    await act(async () => {
      render(<NotificationDropdown />);
    });

    await waitFor(() => {
      expect(screen.getByText("9+")).toBeInTheDocument();
    });
  });

  it("does not show badge when no unread notifications", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        notifications: mockNotifications.map((n) => ({ ...n, isRead: true })),
        unreadCount: 0,
        total: 2,
      }),
    });

    await act(async () => {
      render(<NotificationDropdown />);
    });

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalled();
    });

    expect(screen.queryByText("0")).not.toBeInTheDocument();
  });

  it("fetches notifications on mount", async () => {
    await act(async () => {
      render(<NotificationDropdown />);
    });

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith("/api/notifications?limit=10");
    });
  });

  it("opens dropdown and shows notifications on click", async () => {
    const user = userEvent.setup();

    await act(async () => {
      render(<NotificationDropdown />);
    });

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalled();
    });

    const bellButton = screen.getByRole("button");
    await act(async () => {
      await user.click(bellButton);
    });

    await waitFor(() => {
      expect(screen.getByText("Notifications")).toBeInTheDocument();
    });
  });

  it("displays notification titles in dropdown", async () => {
    const user = userEvent.setup();

    await act(async () => {
      render(<NotificationDropdown />);
    });

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalled();
    });

    const bellButton = screen.getByRole("button");
    await act(async () => {
      await user.click(bellButton);
    });

    await waitFor(() => {
      expect(screen.getByText("Task pending review")).toBeInTheDocument();
      expect(screen.getByText("Task approved")).toBeInTheDocument();
    });
  });

  it("shows 'Mark all read' button when there are unread notifications", async () => {
    const user = userEvent.setup();

    await act(async () => {
      render(<NotificationDropdown />);
    });

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalled();
    });

    const bellButton = screen.getByRole("button");
    await act(async () => {
      await user.click(bellButton);
    });

    await waitFor(() => {
      expect(screen.getByText("Mark all read")).toBeInTheDocument();
    });
  });

  it("shows empty state when no notifications", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        notifications: [],
        unreadCount: 0,
        total: 0,
      }),
    });

    const user = userEvent.setup();

    await act(async () => {
      render(<NotificationDropdown />);
    });

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalled();
    });

    const bellButton = screen.getByRole("button");
    await act(async () => {
      await user.click(bellButton);
    });

    await waitFor(() => {
      expect(screen.getByText("No notifications yet")).toBeInTheDocument();
    });
  });

  it("handles API error gracefully", async () => {
    const consoleSpy = jest.spyOn(console, "error").mockImplementation();
    mockFetch.mockRejectedValue(new Error("Network error"));

    await act(async () => {
      render(<NotificationDropdown />);
    });

    await waitFor(() => {
      expect(consoleSpy).toHaveBeenCalledWith(
        "Error fetching notifications:",
        expect.any(Error)
      );
    });

    consoleSpy.mockRestore();
  });

  it("calls mark all read API when button clicked", async () => {
    const user = userEvent.setup();

    await act(async () => {
      render(<NotificationDropdown />);
    });

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalled();
    });

    const bellButton = screen.getByRole("button");
    await act(async () => {
      await user.click(bellButton);
    });

    await waitFor(() => {
      expect(screen.getByText("Mark all read")).toBeInTheDocument();
    });

    const markAllButton = screen.getByText("Mark all read");
    await act(async () => {
      await user.click(markAllButton);
    });

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith("/api/notifications/read-all", {
        method: "POST",
      });
    });
  });

  it("refetches notifications when dropdown opens", async () => {
    const user = userEvent.setup();

    await act(async () => {
      render(<NotificationDropdown />);
    });

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalled();
    });

    const initialCallCount = mockFetch.mock.calls.length;

    const bellButton = screen.getByRole("button");
    await act(async () => {
      await user.click(bellButton);
    });

    await waitFor(() => {
      expect(mockFetch.mock.calls.length).toBeGreaterThan(initialCallCount);
    });
  });
});
