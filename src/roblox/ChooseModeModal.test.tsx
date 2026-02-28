import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ChooseModeModal } from "./ChooseModeModal";

const MOCK_TEMPLATES = [
  { id: 'top-nav', name: 'Top Nav', icon: 'fa-solid fa-globe', description: 'Website', category: 'web' },
  { id: 'left-nav', name: 'Left Nav', icon: 'fa-solid fa-table-columns', description: 'Dashboard', category: 'web' },
  { id: 'game-ui-hud', name: 'Game HUD', icon: 'fa-solid fa-gamepad', description: 'Game UI', category: 'game' },
  { id: 'presentation-deck', name: 'Presentation', icon: 'fa-solid fa-tv', description: 'Slides', category: 'presentation' },
];

describe("ChooseModeModal (#142)", () => {
  it("renders all welcome options", () => {
    render(<ChooseModeModal onSelect={() => {}} />);
    expect(screen.getByText("Web Design")).toBeDefined();
    expect(screen.getByText("Game Design")).toBeDefined();
    expect(screen.getByText("Presentation")).toBeDefined();
    expect(screen.getByText("Explore Vizail")).toBeDefined();
    expect(screen.getByText("Blank Canvas")).toBeDefined();
  });

  it("calls onSelect with blank action when Blank Canvas is clicked", () => {
    const onSelect = vi.fn();
    render(<ChooseModeModal onSelect={onSelect} />);
    fireEvent.click(screen.getByText("Blank Canvas"));
    expect(onSelect).toHaveBeenCalledWith({ type: "blank" });
  });

  it("calls onSelect with explore action when Explore Vizail is clicked", () => {
    const onSelect = vi.fn();
    render(<ChooseModeModal onSelect={onSelect} />);
    fireEvent.click(screen.getByText("Explore Vizail"));
    expect(onSelect).toHaveBeenCalledWith({ type: "explore" });
  });

  it("opens sub-options when a category is clicked (with templates)", () => {
    const onSelect = vi.fn();
    render(<ChooseModeModal onSelect={onSelect} templates={MOCK_TEMPLATES} />);
    fireEvent.click(screen.getByText("Web Design"));
    // Should NOT have called onSelect yet — shows sub-options
    expect(onSelect).not.toHaveBeenCalled();
    // Should see template options (may appear multiple times due to preview bar)
    expect(screen.getAllByText("Top Nav").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("Left Nav").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("Start Designing")).toBeDefined();
  });

  it("calls onSelect with template details when Start Designing is clicked", () => {
    const onSelect = vi.fn();
    render(<ChooseModeModal onSelect={onSelect} templates={MOCK_TEMPLATES} />);
    fireEvent.click(screen.getByText("Web Design"));
    // Auto-selects first template, click Start
    fireEvent.click(screen.getByText("Start Designing"));
    expect(onSelect).toHaveBeenCalledWith(
      expect.objectContaining({ type: "template", category: "web", templateId: "top-nav" })
    );
  });

  it("falls back to immediate select when no templates provided", () => {
    const onSelect = vi.fn();
    render(<ChooseModeModal onSelect={onSelect} />);
    fireEvent.click(screen.getByText("Game Design"));
    expect(onSelect).toHaveBeenCalledWith(
      expect.objectContaining({ type: "template", category: "game", templateId: "game-ui-hud" })
    );
  });

  it("shows the Vizail branding", () => {
    render(<ChooseModeModal onSelect={() => {}} />);
    expect(screen.getByText(/Design, prototype, and collaborate/)).toBeDefined();
  });
});
