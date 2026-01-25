import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Role } from "@prisma/client";
import { ViewTabs } from "@/components/tasks/view-tabs";

describe("ViewTabs", () => {
  const defaultProps = {
    role: Role.MANAGER,
    activeView: "my" as const,
    onViewChange: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("Tab visibility by role", () => {
    it("should not render tabs for EMPLOYEE role", () => {
      const { container } = render(
        <ViewTabs {...defaultProps} role={Role.EMPLOYEE} />
      );

      // Should render nothing
      expect(container).toBeEmptyDOMElement();
    });

    it("should render 2 tabs for MANAGER role", () => {
      render(<ViewTabs {...defaultProps} role={Role.MANAGER} />);

      expect(screen.getByText("My Tasks")).toBeInTheDocument();
      expect(screen.getByText("Team Tasks")).toBeInTheDocument();
      expect(screen.queryByText("All Tasks")).not.toBeInTheDocument();
    });

    it("should render 3 tabs for DEPARTMENT_HEAD role", () => {
      render(<ViewTabs {...defaultProps} role={Role.DEPARTMENT_HEAD} />);

      expect(screen.getByText("My Tasks")).toBeInTheDocument();
      expect(screen.getByText("Team Tasks")).toBeInTheDocument();
      expect(screen.getByText("All Tasks")).toBeInTheDocument();
    });

    it("should render 3 tabs for ADMIN role", () => {
      render(<ViewTabs {...defaultProps} role={Role.ADMIN} />);

      expect(screen.getByText("My Tasks")).toBeInTheDocument();
      expect(screen.getByText("Team Tasks")).toBeInTheDocument();
      expect(screen.getByText("All Tasks")).toBeInTheDocument();
    });
  });

  describe("Tab interactions", () => {
    it("should highlight active tab", () => {
      render(<ViewTabs {...defaultProps} activeView="my" />);

      const myTasksButton = screen.getByText("My Tasks").closest("button");
      expect(myTasksButton).toHaveClass("bg-white");
    });

    it("should call onViewChange when clicking a tab", async () => {
      const user = userEvent.setup();
      const onViewChange = jest.fn();
      render(<ViewTabs {...defaultProps} onViewChange={onViewChange} />);

      await user.click(screen.getByText("Team Tasks"));

      expect(onViewChange).toHaveBeenCalledWith("team");
    });

    it("should call onViewChange with 'all' when clicking All Tasks", async () => {
      const user = userEvent.setup();
      const onViewChange = jest.fn();
      render(
        <ViewTabs
          {...defaultProps}
          role={Role.ADMIN}
          onViewChange={onViewChange}
        />
      );

      await user.click(screen.getByText("All Tasks"));

      expect(onViewChange).toHaveBeenCalledWith("all");
    });
  });

  describe("Active state", () => {
    it("should show team tab as active when activeView is team", () => {
      render(<ViewTabs {...defaultProps} activeView="team" />);

      const teamTasksButton = screen.getByText("Team Tasks").closest("button");
      expect(teamTasksButton).toHaveClass("bg-white");
    });

    it("should show all tab as active for admin with all view", () => {
      render(
        <ViewTabs {...defaultProps} role={Role.ADMIN} activeView="all" />
      );

      const allTasksButton = screen.getByText("All Tasks").closest("button");
      expect(allTasksButton).toHaveClass("bg-white");
    });
  });
});
