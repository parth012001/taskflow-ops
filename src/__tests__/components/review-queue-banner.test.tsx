import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ReviewQueueBanner } from "@/components/tasks/review-queue-banner";

describe("ReviewQueueBanner", () => {
  const defaultProps = {
    pendingCount: 3,
    onViewClick: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should render with pending count", () => {
    render(<ReviewQueueBanner {...defaultProps} />);

    expect(screen.getByText("3 tasks need your review")).toBeInTheDocument();
    expect(screen.getByText("Team members are waiting for your approval")).toBeInTheDocument();
  });

  it("should use singular form for 1 task", () => {
    render(<ReviewQueueBanner {...defaultProps} pendingCount={1} />);

    expect(screen.getByText("1 task needs your review")).toBeInTheDocument();
  });

  it("should not render when pendingCount is 0", () => {
    const { container } = render(<ReviewQueueBanner {...defaultProps} pendingCount={0} />);

    expect(container).toBeEmptyDOMElement();
  });

  it("should call onViewClick when View button is clicked", async () => {
    const user = userEvent.setup();
    const onViewClick = jest.fn();
    render(<ReviewQueueBanner {...defaultProps} onViewClick={onViewClick} />);

    await user.click(screen.getByText("View"));

    expect(onViewClick).toHaveBeenCalled();
  });

  it("should render View button", () => {
    render(<ReviewQueueBanner {...defaultProps} />);

    expect(screen.getByText("View")).toBeInTheDocument();
  });

  it("should apply custom className", () => {
    const { container } = render(
      <ReviewQueueBanner {...defaultProps} className="custom-class" />
    );

    expect(container.firstChild).toHaveClass("custom-class");
  });

  it("should render icon", () => {
    render(<ReviewQueueBanner {...defaultProps} />);

    // Check for the ClipboardCheck icon container
    const iconContainer = document.querySelector(".bg-purple-100");
    expect(iconContainer).toBeInTheDocument();
  });
});
