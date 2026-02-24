import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ChooseModeModal } from "./ChooseModeModal";

describe("ChooseModeModal (#142)", () => {
  it("renders both mode cards", () => {
    render(<ChooseModeModal onSelect={() => {}} />);
    expect(screen.getByText("General UI")).toBeDefined();
    expect(screen.getByText("Roblox UI")).toBeDefined();
  });

  it("calls onSelect with 'general' when General UI is clicked", () => {
    const onSelect = vi.fn();
    render(<ChooseModeModal onSelect={onSelect} />);
    fireEvent.click(screen.getByText("Start with blank canvas"));
    expect(onSelect).toHaveBeenCalledWith("general");
  });

  it("calls onSelect with 'roblox' when Roblox UI is clicked", () => {
    const onSelect = vi.fn();
    render(<ChooseModeModal onSelect={onSelect} />);
    fireEvent.click(screen.getByText("Start with Roblox HUD"));
    expect(onSelect).toHaveBeenCalledWith("roblox");
  });

  it("displays descriptive text for each mode", () => {
    render(<ChooseModeModal onSelect={() => {}} />);
    expect(screen.getByText(/in-game HUDs/i)).toBeDefined();
    expect(screen.getByText(/web, mobile or any platform/i)).toBeDefined();
  });

  it("shows the title 'Choose Design Mode'", () => {
    render(<ChooseModeModal onSelect={() => {}} />);
    expect(screen.getByText("Choose Design Mode")).toBeDefined();
  });
});
