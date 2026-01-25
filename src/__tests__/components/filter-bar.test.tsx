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
});
