import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { ActionableInsights } from "../../components/ActionableInsights";

// Mock data for testing
const mockInsights = {
  viabilityScore: 8,
  strengths: [
    "Strong market opportunity with validated demand",
    "Unique technology with clear competitive advantages", 
    "Healthy unit economics and multiple revenue streams"
  ],
  concerns: [
    "Competitive landscape becoming crowded",
    "Technical execution complexity",
    "Customer acquisition cost optimization needed"
  ],
  pivots: [
    "Focus on specific vertical market first",
    "Pivot to B2B2C model through partnerships"
  ],
  nextSteps: [
    "Conduct detailed customer discovery interviews",
    "Build and test MVP with early adopters",
    "Secure seed funding and hire core technical team"
  ],
  executiveSummary: "Strong startup opportunity with significant market potential and clear differentiation."
};

describe("ActionableInsights Component", () => {
  beforeEach(() => {
    // Clear any previous renders
    vi.clearAllMocks();
  });

  it("should render viability score correctly", () => {
    render(<ActionableInsights {...mockInsights} />);
    
    expect(screen.getByText("8/10")).toBeInTheDocument();
    expect(screen.getByText("Overall Viability Score")).toBeInTheDocument();
  });

  it("should display high viability message for score >= 8", () => {
    render(<ActionableInsights {...mockInsights} />);
    
    expect(screen.getByText("Highly Viable - Strong investment potential")).toBeInTheDocument();
  });

  it("should display moderate viability message for score 6-7", () => {
    render(<ActionableInsights {...mockInsights} viabilityScore={7} />);
    
    expect(screen.getByText("Moderately Viable - Address key concerns before proceeding")).toBeInTheDocument();
  });

  it("should display low viability message for score < 6", () => {
    render(<ActionableInsights {...mockInsights} viabilityScore={4} />);
    
    expect(screen.getByText("Low Viability - Significant pivots or improvements needed")).toBeInTheDocument();
  });

  it("should render executive summary when provided", () => {
    render(<ActionableInsights {...mockInsights} />);
    
    expect(screen.getByText("Executive Summary")).toBeInTheDocument();
    expect(screen.getByText(mockInsights.executiveSummary)).toBeInTheDocument();
  });

  it("should not render executive summary when not provided", () => {
    const { executiveSummary, ...insightsWithoutSummary } = mockInsights;
    render(<ActionableInsights {...insightsWithoutSummary} />);
    
    expect(screen.queryByText("Executive Summary")).not.toBeInTheDocument();
  });

  it("should render all strengths", () => {
    render(<ActionableInsights {...mockInsights} />);
    
    mockInsights.strengths.forEach(strength => {
      expect(screen.getByText(strength)).toBeInTheDocument();
    });
  });

  it("should render all concerns", () => {
    render(<ActionableInsights {...mockInsights} />);
    
    mockInsights.concerns.forEach(concern => {
      expect(screen.getByText(concern)).toBeInTheDocument();
    });
  });

  it("should render pivots when provided", () => {
    render(<ActionableInsights {...mockInsights} />);
    
    expect(screen.getByText("Potential Pivots")).toBeInTheDocument();
    mockInsights.pivots.forEach(pivot => {
      expect(screen.getByText(pivot)).toBeInTheDocument();
    });
  });

  it("should not render pivots section when empty", () => {
    render(<ActionableInsights {...mockInsights} pivots={[]} />);
    
    expect(screen.queryByText("Potential Pivots")).not.toBeInTheDocument();
  });

  it("should render next steps with numbered list", () => {
    render(<ActionableInsights {...mockInsights} />);
    
    expect(screen.getByText("Recommended Next Steps")).toBeInTheDocument();
    
    // Check that steps are numbered
    mockInsights.nextSteps.forEach((step, index) => {
      expect(screen.getByText(step)).toBeInTheDocument();
      expect(screen.getByText((index + 1).toString())).toBeInTheDocument();
    });
  });

  it("should use correct colors for different score ranges", () => {
    const { rerender } = render(<ActionableInsights {...mockInsights} viabilityScore={9} />);
    
    // High score should have green styling
    expect(screen.getByText("9/10")).toHaveClass("bg-green-100", "text-green-800", "border-green-200");
    
    // Medium score should have yellow styling
    rerender(<ActionableInsights {...mockInsights} viabilityScore={6} />);
    expect(screen.getByText("6/10")).toHaveClass("bg-yellow-100", "text-yellow-800", "border-yellow-200");
    
    // Low score should have red styling
    rerender(<ActionableInsights {...mockInsights} viabilityScore={4} />);
    expect(screen.getByText("4/10")).toHaveClass("bg-red-100", "text-red-800", "border-red-200");
  });

  it("should render progress bar with correct value", () => {
    render(<ActionableInsights {...mockInsights} />);
    
    // Progress bar should show 80% (8 * 10) for score of 8
    const progressBar = document.querySelector('[role="progressbar"]');
    expect(progressBar).toHaveAttribute("aria-valuenow", "80");
  });
});

describe("ActionableInsights Accessibility", () => {
  it("should have proper ARIA labels", () => {
    render(<ActionableInsights {...mockInsights} />);
    
    const progressBar = document.querySelector('[role="progressbar"]');
    expect(progressBar).toHaveAttribute("aria-valuenow");
    expect(progressBar).toHaveAttribute("aria-valuemin", "0");
    expect(progressBar).toHaveAttribute("aria-valuemax", "100");
  });

  it("should have proper heading hierarchy", () => {
    render(<ActionableInsights {...mockInsights} />);
    
    // Should have proper heading levels
    expect(screen.getByRole("heading", { level: 3 })).toBeInTheDocument();
  });

  it("should have proper list structure", () => {
    render(<ActionableInsights {...mockInsights} />);
    
    // Should have proper list elements
    const lists = screen.getAllByRole("list");
    expect(lists.length).toBeGreaterThan(0);
    
    const listItems = screen.getAllByRole("listitem");
    expect(listItems.length).toBeGreaterThan(0);
  });
});

describe("ActionableInsights Edge Cases", () => {
  it("should handle empty arrays gracefully", () => {
    const emptyInsights = {
      viabilityScore: 5,
      strengths: [],
      concerns: [],
      pivots: [],
      nextSteps: []
    };
    
    render(<ActionableInsights {...emptyInsights} />);
    
    // Should still render the score
    expect(screen.getByText("5/10")).toBeInTheDocument();
    
    // Should not crash with empty arrays
    expect(screen.getByText("Top Strengths")).toBeInTheDocument();
    expect(screen.getByText("Top Concerns")).toBeInTheDocument();
  });

  it("should handle boundary viability scores", () => {
    const { rerender } = render(<ActionableInsights {...mockInsights} viabilityScore={1} />);
    expect(screen.getByText("1/10")).toBeInTheDocument();
    
    rerender(<ActionableInsights {...mockInsights} viabilityScore={10} />);
    expect(screen.getByText("10/10")).toBeInTheDocument();
  });

  it("should handle long text content", () => {
    const longTextInsights = {
      ...mockInsights,
      executiveSummary: "This is a very long executive summary that should wrap properly and not break the layout even when it contains many words and detailed explanations about the startup opportunity.",
      strengths: [
        "This is a very long strength description that should wrap properly in the UI",
        "Another long strength with detailed explanation of the competitive advantages",
        "Third strength with comprehensive analysis of market positioning"
      ]
    };
    
    render(<ActionableInsights {...longTextInsights} />);
    
    // Should render without breaking
    expect(screen.getByText(longTextInsights.executiveSummary)).toBeInTheDocument();
    longTextInsights.strengths.forEach(strength => {
      expect(screen.getByText(strength)).toBeInTheDocument();
    });
  });
});