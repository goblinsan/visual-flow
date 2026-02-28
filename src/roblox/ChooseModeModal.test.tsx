import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ChooseModeModal } from "./ChooseModeModal";

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

  it("calls onSelect with template action when a category is clicked", () => {
    const onSelect = vi.fn();
    render(<ChooseModeModal onSelect={onSelect} />);
    fireEvent.click(screen.getByText("Web Design"));
    expect(onSelect).toHaveBeenCalledWith({ type: "template", category: "web" });
  });

  it("calls onSelect with game template when Game Design is clicked", () => {
    const onSelect = vi.fn();
    render(<ChooseModeModal onSelect={onSelect} />);
    fireEvent.click(screen.getByText("Game Design"));
    expect(onSelect).toHaveBeenCalledWith({ type: "template", category: "game" });
  });

  it("shows the Vizail branding", () => {
    render(<ChooseModeModal onSelect={() => {}} />);
    expect(screen.getByText(/Design, prototype, and collaborate/)).toBeDefined();
  });
});
