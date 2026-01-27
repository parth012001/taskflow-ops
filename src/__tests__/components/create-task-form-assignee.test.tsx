/**
 * Tests for CreateTaskForm "Assign to" dropdown feature
 *
 * Tests that the assignee dropdown:
 * - Shows when assignableUsers prop is provided with users
 * - Hides when assignableUsers prop is empty
 * - Correctly displays user options
 * - Defaults to "Myself (default)" option
 *
 * Note: Radix UI Select components have limited interaction testing in jsdom.
 * These tests focus on rendering and visibility, not click interactions.
 */

import { render, screen } from "@testing-library/react";
import { CreateTaskForm, AssignableUser } from "@/components/tasks/create-task-form";
import { Role } from "@prisma/client";

// Mock sonner toast
jest.mock("sonner", () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
  },
}));

describe("CreateTaskForm - Assign to Dropdown", () => {
  const mockOnSubmit = jest.fn();
  const mockOnOpenChange = jest.fn();

  const defaultKpiBuckets = [
    { id: "kpi-1", name: "Sales Performance", description: "Track sales metrics" },
    { id: "kpi-2", name: "Customer Satisfaction", description: null },
  ];

  const assignableUsers: AssignableUser[] = [
    { id: "user-1", firstName: "John", lastName: "Doe", email: "john@test.com", role: Role.EMPLOYEE },
    { id: "user-2", firstName: "Jane", lastName: "Smith", email: "jane@test.com", role: Role.EMPLOYEE },
    { id: "user-3", firstName: "Bob", lastName: "Wilson", email: "bob@test.com", role: Role.MANAGER },
  ];

  const defaultProps = {
    open: true,
    onOpenChange: mockOnOpenChange,
    onSubmit: mockOnSubmit,
    kpiBuckets: defaultKpiBuckets,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("Dropdown visibility", () => {
    it("should NOT show 'Assign To' dropdown when assignableUsers is empty", () => {
      render(<CreateTaskForm {...defaultProps} assignableUsers={[]} />);

      // The "Assign To" label should not be in the document
      expect(screen.queryByText("Assign To")).not.toBeInTheDocument();
      expect(screen.queryByText("Select a team member to assign this task to")).not.toBeInTheDocument();
    });

    it("should NOT show 'Assign To' dropdown when assignableUsers prop is not provided", () => {
      render(<CreateTaskForm {...defaultProps} />);

      expect(screen.queryByText("Assign To")).not.toBeInTheDocument();
    });

    it("should show 'Assign To' dropdown when assignableUsers has users", () => {
      render(<CreateTaskForm {...defaultProps} assignableUsers={assignableUsers} />);

      expect(screen.getByText("Assign To")).toBeInTheDocument();
      expect(screen.getByText("Select a team member to assign this task to")).toBeInTheDocument();
    });
  });

  describe("Dropdown default state", () => {
    it("should show 'Myself (default)' as the default placeholder", () => {
      render(<CreateTaskForm {...defaultProps} assignableUsers={assignableUsers} />);

      // The default text should be visible in the trigger (may appear multiple times due to portal)
      expect(screen.getAllByText("Myself (default)").length).toBeGreaterThanOrEqual(1);
    });

    it("should have a combobox role for the dropdown trigger", () => {
      render(<CreateTaskForm {...defaultProps} assignableUsers={assignableUsers} />);

      // Find the Assign To section and its combobox
      const comboboxes = screen.getAllByRole("combobox");
      // Should have multiple comboboxes (KPI, Priority, Size, Estimate, and Assign To)
      expect(comboboxes.length).toBeGreaterThanOrEqual(5);
    });
  });

  describe("Form structure", () => {
    it("should render 'Assign To' dropdown after KPI bucket dropdown", () => {
      render(<CreateTaskForm {...defaultProps} assignableUsers={assignableUsers} />);

      // Get the form element
      const form = document.querySelector("form");
      expect(form).not.toBeNull();

      const formHTML = form?.innerHTML || "";

      // KPI Bucket should appear before Assign To
      const kpiBucketIndex = formHTML.indexOf("KPI Bucket");
      const assignToIndex = formHTML.indexOf("Assign To");

      expect(kpiBucketIndex).toBeLessThan(assignToIndex);
      expect(kpiBucketIndex).toBeGreaterThan(-1);
      expect(assignToIndex).toBeGreaterThan(-1);
    });

    it("should include helper text below the dropdown", () => {
      render(<CreateTaskForm {...defaultProps} assignableUsers={assignableUsers} />);

      expect(screen.getByText("Select a team member to assign this task to")).toBeInTheDocument();
    });

    it("should render user icon in the dropdown trigger", () => {
      render(<CreateTaskForm {...defaultProps} assignableUsers={assignableUsers} />);

      // The UserIcon from lucide-react should be rendered
      // It's rendered as an SVG with the class containing 'lucide-user'
      const assignToLabel = screen.getByText("Assign To");
      const assignToSection = assignToLabel.closest("div[class*='space-y-']");

      // Check that the section exists and contains an SVG (the user icon)
      expect(assignToSection).not.toBeNull();
      const svg = assignToSection?.querySelector("svg");
      expect(svg).not.toBeNull();
    });
  });

  describe("Integration with form", () => {
    it("should not require assignee selection (optional field)", () => {
      render(<CreateTaskForm {...defaultProps} assignableUsers={assignableUsers} />);

      // There should be no required indicator (*) next to "Assign To"
      // Required fields have "*" in their text like "Title *" or "KPI Bucket *"
      const assignToLabel = screen.getByText("Assign To");

      // The label element itself should not contain an asterisk
      expect(assignToLabel.textContent).toBe("Assign To");
      expect(assignToLabel.textContent).not.toContain("*");
    });

    it("should work with empty kpiBuckets (edge case)", () => {
      render(
        <CreateTaskForm
          {...defaultProps}
          kpiBuckets={[]}
          assignableUsers={assignableUsers}
        />
      );

      // Should still render the Assign To dropdown
      expect(screen.getByText("Assign To")).toBeInTheDocument();
    });

    it("should still render required fields when assignableUsers is provided", () => {
      render(<CreateTaskForm {...defaultProps} assignableUsers={assignableUsers} />);

      // Verify other form elements are still present
      expect(screen.getByText("Title *")).toBeInTheDocument();
      expect(screen.getByText("KPI Bucket *")).toBeInTheDocument();
      expect(screen.getByText("Priority *")).toBeInTheDocument();
      expect(screen.getByText("Size *")).toBeInTheDocument();
    });
  });

  describe("Modal state", () => {
    it("should not render anything when modal is closed", () => {
      render(
        <CreateTaskForm
          {...defaultProps}
          open={false}
          assignableUsers={assignableUsers}
        />
      );

      expect(screen.queryByText("Create New Task")).not.toBeInTheDocument();
      expect(screen.queryByText("Assign To")).not.toBeInTheDocument();
    });

    it("should render the modal title when open", () => {
      render(<CreateTaskForm {...defaultProps} assignableUsers={assignableUsers} />);

      expect(screen.getByText("Create New Task")).toBeInTheDocument();
    });
  });

  describe("Single user edge case", () => {
    it("should show dropdown with single assignable user", () => {
      const singleUser: AssignableUser[] = [
        { id: "user-1", firstName: "Solo", lastName: "User", email: "solo@test.com", role: Role.EMPLOYEE },
      ];

      render(<CreateTaskForm {...defaultProps} assignableUsers={singleUser} />);

      expect(screen.getByText("Assign To")).toBeInTheDocument();
      // Check that "Myself (default)" appears at least once (in the trigger)
      expect(screen.getAllByText("Myself (default)").length).toBeGreaterThanOrEqual(1);
    });
  });

  describe("Multiple users", () => {
    it("should render dropdown when multiple assignable users provided", () => {
      render(<CreateTaskForm {...defaultProps} assignableUsers={assignableUsers} />);

      expect(screen.getByText("Assign To")).toBeInTheDocument();
    });

    it("should maintain dropdown visibility regardless of user count", () => {
      const manyUsers: AssignableUser[] = Array.from({ length: 10 }, (_, i) => ({
        id: `user-${i}`,
        firstName: `User`,
        lastName: `${i}`,
        email: `user${i}@test.com`,
        role: Role.EMPLOYEE,
      }));

      render(<CreateTaskForm {...defaultProps} assignableUsers={manyUsers} />);

      expect(screen.getByText("Assign To")).toBeInTheDocument();
      expect(screen.getByText("Select a team member to assign this task to")).toBeInTheDocument();
    });
  });
});
