import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { TaskStatus, TaskPriority } from "@prisma/client";
import { FilterBar } from "@/components/tasks/filter-bar";
import { TaskFilters } from "@/hooks/use-task-filters";

describe("FilterBar", () => {
  const emptyFilters: TaskFilters = {
    statuses: [],
    priorities: [],
    kpiBucketId: null,
    datePreset: null,
    fromDate: null,
    toDate: null,
    ownerIds: [],
  };

  const mockKpiBuckets = [
    { id: "1", name: "Sales KPIs" },
    { id: "2", name: "Marketing KPIs" },
  ];

  const defaultProps = {
    filters: emptyFilters,
    kpiBuckets: mockKpiBuckets,
    onStatusToggle: jest.fn(),
    onPriorityToggle: jest.fn(),
    onKpiBucketChange: jest.fn(),
    onDatePresetChange: jest.fn(),
    onClearFilters: jest.fn(),
    hasActiveFilters: false,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("Filter dropdowns", () => {
    it("should render all filter buttons", () => {
      render(<FilterBar {...defaultProps} />);

      expect(screen.getByText("Status")).toBeInTheDocument();
      expect(screen.getByText("Priority")).toBeInTheDocument();
      expect(screen.getByText("KPI Bucket")).toBeInTheDocument();
      expect(screen.getByText("Due Date")).toBeInTheDocument();
    });

    it("should open status dropdown and show all statuses", async () => {
      const user = userEvent.setup();
      render(<FilterBar {...defaultProps} />);

      await user.click(screen.getByText("Status"));

      expect(screen.getByText("New")).toBeInTheDocument();
      expect(screen.getByText("In Progress")).toBeInTheDocument();
      expect(screen.getByText("Pending Review")).toBeInTheDocument();
      expect(screen.getByText("Completed")).toBeInTheDocument();
    });

    it("should call onStatusToggle when selecting a status", async () => {
      const user = userEvent.setup();
      render(<FilterBar {...defaultProps} />);

      await user.click(screen.getByText("Status"));
      await user.click(screen.getByText("In Progress"));

      expect(defaultProps.onStatusToggle).toHaveBeenCalledWith(TaskStatus.IN_PROGRESS);
    });

    it("should open priority dropdown and show all priorities", async () => {
      const user = userEvent.setup();
      render(<FilterBar {...defaultProps} />);

      await user.click(screen.getByText("Priority"));

      expect(screen.getByText("P1 - Urgent & Important")).toBeInTheDocument();
      expect(screen.getByText("P2 - Urgent")).toBeInTheDocument();
      expect(screen.getByText("P3 - Important")).toBeInTheDocument();
      expect(screen.getByText("P4 - Low Priority")).toBeInTheDocument();
    });

    it("should call onPriorityToggle when selecting a priority", async () => {
      const user = userEvent.setup();
      render(<FilterBar {...defaultProps} />);

      await user.click(screen.getByText("Priority"));
      await user.click(screen.getByText("P1 - Urgent & Important"));

      expect(defaultProps.onPriorityToggle).toHaveBeenCalledWith(TaskPriority.URGENT_IMPORTANT);
    });

    it("should show KPI buckets in dropdown", async () => {
      const user = userEvent.setup();
      render(<FilterBar {...defaultProps} />);

      await user.click(screen.getByText("KPI Bucket"));

      expect(screen.getByText("All Buckets")).toBeInTheDocument();
      expect(screen.getByText("Sales KPIs")).toBeInTheDocument();
      expect(screen.getByText("Marketing KPIs")).toBeInTheDocument();
    });

    it("should call onKpiBucketChange when selecting a bucket", async () => {
      const user = userEvent.setup();
      render(<FilterBar {...defaultProps} />);

      await user.click(screen.getByText("KPI Bucket"));
      await user.click(screen.getByText("Sales KPIs"));

      expect(defaultProps.onKpiBucketChange).toHaveBeenCalledWith("1");
    });

    it("should show date presets in dropdown", async () => {
      const user = userEvent.setup();
      render(<FilterBar {...defaultProps} />);

      await user.click(screen.getByText("Due Date"));

      expect(screen.getByText("Any Date")).toBeInTheDocument();
      expect(screen.getByText("Overdue")).toBeInTheDocument();
      expect(screen.getByText("Due Today")).toBeInTheDocument();
      expect(screen.getByText("This Week")).toBeInTheDocument();
      expect(screen.getByText("This Month")).toBeInTheDocument();
    });

    it("should call onDatePresetChange when selecting a preset", async () => {
      const user = userEvent.setup();
      render(<FilterBar {...defaultProps} />);

      await user.click(screen.getByText("Due Date"));
      await user.click(screen.getByText("Overdue"));

      expect(defaultProps.onDatePresetChange).toHaveBeenCalledWith("overdue");
    });
  });

  describe("Active filters", () => {
    it("should show filter count on buttons when filters are active", () => {
      const filtersWithStatus: TaskFilters = {
        ...emptyFilters,
        statuses: [TaskStatus.IN_PROGRESS, TaskStatus.ON_HOLD],
      };

      render(<FilterBar {...defaultProps} filters={filtersWithStatus} />);

      const statusButton = screen.getByText("Status").closest("button");
      expect(statusButton).toHaveTextContent("2");
    });

    it("should show Clear all button when hasActiveFilters is true", () => {
      render(<FilterBar {...defaultProps} hasActiveFilters={true} />);

      expect(screen.getByText("Clear all")).toBeInTheDocument();
    });

    it("should not show Clear all button when no filters active", () => {
      render(<FilterBar {...defaultProps} hasActiveFilters={false} />);

      expect(screen.queryByText("Clear all")).not.toBeInTheDocument();
    });

    it("should call onClearFilters when Clear all is clicked", async () => {
      const user = userEvent.setup();
      render(<FilterBar {...defaultProps} hasActiveFilters={true} />);

      await user.click(screen.getByText("Clear all"));

      expect(defaultProps.onClearFilters).toHaveBeenCalled();
    });
  });

  describe("Filter chips", () => {
    it("should show filter chips for active status filters", () => {
      const filtersWithStatus: TaskFilters = {
        ...emptyFilters,
        statuses: [TaskStatus.IN_PROGRESS],
      };

      render(
        <FilterBar {...defaultProps} filters={filtersWithStatus} hasActiveFilters={true} />
      );

      expect(screen.getByText("In Progress")).toBeInTheDocument();
    });

    it("should show filter chips for active priority filters", () => {
      const filtersWithPriority: TaskFilters = {
        ...emptyFilters,
        priorities: [TaskPriority.URGENT_IMPORTANT],
      };

      render(
        <FilterBar {...defaultProps} filters={filtersWithPriority} hasActiveFilters={true} />
      );

      expect(screen.getByText("P1")).toBeInTheDocument();
    });

    it("should show filter chip for KPI bucket", () => {
      const filtersWithBucket: TaskFilters = {
        ...emptyFilters,
        kpiBucketId: "1",
      };

      render(
        <FilterBar {...defaultProps} filters={filtersWithBucket} hasActiveFilters={true} />
      );

      expect(screen.getByText("Sales KPIs")).toBeInTheDocument();
    });

    it("should remove filter when chip X is clicked", async () => {
      const user = userEvent.setup();
      const filtersWithStatus: TaskFilters = {
        ...emptyFilters,
        statuses: [TaskStatus.IN_PROGRESS],
      };

      render(
        <FilterBar {...defaultProps} filters={filtersWithStatus} hasActiveFilters={true} />
      );

      const removeButton = screen.getByRole("button", { name: /Remove In Progress filter/i });
      await user.click(removeButton);

      expect(defaultProps.onStatusToggle).toHaveBeenCalledWith(TaskStatus.IN_PROGRESS);
    });
  });

  describe("Team Member filter", () => {
    const mockAssignableUsers = [
      { id: "user-1", firstName: "Alice", lastName: "Wong" },
      { id: "user-2", firstName: "Bob", lastName: "Chen" },
      { id: "user-3", firstName: "Carol", lastName: "Davis" },
    ];

    it("should not render Team Member button when assignableUsers is not provided", () => {
      render(<FilterBar {...defaultProps} />);

      expect(screen.queryByText("Team Member")).not.toBeInTheDocument();
    });

    it("should not render Team Member button when assignableUsers is empty", () => {
      render(
        <FilterBar
          {...defaultProps}
          assignableUsers={[]}
          onOwnerToggle={jest.fn()}
        />
      );

      expect(screen.queryByText("Team Member")).not.toBeInTheDocument();
    });

    it("should not render Team Member button when onOwnerToggle is not provided", () => {
      render(
        <FilterBar {...defaultProps} assignableUsers={mockAssignableUsers} />
      );

      expect(screen.queryByText("Team Member")).not.toBeInTheDocument();
    });

    it("should render Team Member button when assignableUsers and onOwnerToggle are provided", () => {
      render(
        <FilterBar
          {...defaultProps}
          assignableUsers={mockAssignableUsers}
          onOwnerToggle={jest.fn()}
        />
      );

      expect(screen.getByText("Team Member")).toBeInTheDocument();
    });

    it("should show team members in dropdown when clicked", async () => {
      const user = userEvent.setup();
      render(
        <FilterBar
          {...defaultProps}
          assignableUsers={mockAssignableUsers}
          onOwnerToggle={jest.fn()}
        />
      );

      await user.click(screen.getByText("Team Member"));

      expect(screen.getByText("Alice Wong")).toBeInTheDocument();
      expect(screen.getByText("Bob Chen")).toBeInTheDocument();
      expect(screen.getByText("Carol Davis")).toBeInTheDocument();
    });

    it("should call onOwnerToggle when a team member is selected", async () => {
      const user = userEvent.setup();
      const onOwnerToggle = jest.fn();

      render(
        <FilterBar
          {...defaultProps}
          assignableUsers={mockAssignableUsers}
          onOwnerToggle={onOwnerToggle}
        />
      );

      await user.click(screen.getByText("Team Member"));
      await user.click(screen.getByText("Alice Wong"));

      expect(onOwnerToggle).toHaveBeenCalledWith("user-1");
    });

    it("should show count badge when owners are selected", () => {
      const filtersWithOwners: TaskFilters = {
        ...emptyFilters,
        ownerIds: ["user-1", "user-2"],
      };

      render(
        <FilterBar
          {...defaultProps}
          filters={filtersWithOwners}
          assignableUsers={mockAssignableUsers}
          onOwnerToggle={jest.fn()}
        />
      );

      const teamMemberButton = screen.getByText("Team Member").closest("button");
      expect(teamMemberButton).toHaveTextContent("2");
    });

    it("should highlight Team Member button when owners are selected", () => {
      const filtersWithOwners: TaskFilters = {
        ...emptyFilters,
        ownerIds: ["user-1"],
      };

      render(
        <FilterBar
          {...defaultProps}
          filters={filtersWithOwners}
          assignableUsers={mockAssignableUsers}
          onOwnerToggle={jest.fn()}
        />
      );

      const teamMemberButton = screen.getByText("Team Member").closest("button");
      expect(teamMemberButton).toHaveClass("bg-indigo-50");
      expect(teamMemberButton).toHaveClass("border-indigo-300");
    });

    it("should show checkboxes as checked for selected owners", async () => {
      const user = userEvent.setup();
      const filtersWithOwners: TaskFilters = {
        ...emptyFilters,
        ownerIds: ["user-1"],
      };

      render(
        <FilterBar
          {...defaultProps}
          filters={filtersWithOwners}
          assignableUsers={mockAssignableUsers}
          onOwnerToggle={jest.fn()}
        />
      );

      await user.click(screen.getByText("Team Member"));

      const checkboxes = screen.getAllByRole("checkbox");
      // Find the checkbox next to "Alice Wong" - it should be checked
      const aliceLabel = screen.getByText("Alice Wong").closest("label");
      const aliceCheckbox = aliceLabel?.querySelector("input[type='checkbox']") as HTMLInputElement;
      expect(aliceCheckbox.checked).toBe(true);

      // Bob's should not be checked
      const bobLabel = screen.getByText("Bob Chen").closest("label");
      const bobCheckbox = bobLabel?.querySelector("input[type='checkbox']") as HTMLInputElement;
      expect(bobCheckbox.checked).toBe(false);
    });
  });

  describe("Team Member filter chips", () => {
    const mockAssignableUsers = [
      { id: "user-1", firstName: "Alice", lastName: "Wong" },
      { id: "user-2", firstName: "Bob", lastName: "Chen" },
    ];

    it("should show filter chips for selected team members", () => {
      const filtersWithOwners: TaskFilters = {
        ...emptyFilters,
        ownerIds: ["user-1", "user-2"],
      };

      render(
        <FilterBar
          {...defaultProps}
          filters={filtersWithOwners}
          hasActiveFilters={true}
          assignableUsers={mockAssignableUsers}
          onOwnerToggle={jest.fn()}
        />
      );

      expect(screen.getByText("Alice Wong")).toBeInTheDocument();
      expect(screen.getByText("Bob Chen")).toBeInTheDocument();
    });

    it("should call onOwnerToggle when team member chip is removed", async () => {
      const user = userEvent.setup();
      const onOwnerToggle = jest.fn();

      const filtersWithOwners: TaskFilters = {
        ...emptyFilters,
        ownerIds: ["user-1"],
      };

      render(
        <FilterBar
          {...defaultProps}
          filters={filtersWithOwners}
          hasActiveFilters={true}
          assignableUsers={mockAssignableUsers}
          onOwnerToggle={onOwnerToggle}
        />
      );

      const removeButton = screen.getByRole("button", { name: /Remove Alice Wong filter/i });
      await user.click(removeButton);

      expect(onOwnerToggle).toHaveBeenCalledWith("user-1");
    });

    it("should not render team member chips when assignableUsers not provided", () => {
      const filtersWithOwners: TaskFilters = {
        ...emptyFilters,
        ownerIds: ["user-1"],
      };

      render(
        <FilterBar
          {...defaultProps}
          filters={filtersWithOwners}
          hasActiveFilters={true}
        />
      );

      // No chip for user-1 should appear since assignableUsers is undefined
      expect(screen.queryByText("Alice Wong")).not.toBeInTheDocument();
    });
  });
});
