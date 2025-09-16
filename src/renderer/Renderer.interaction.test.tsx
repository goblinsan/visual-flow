import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Renderer } from "./Renderer";
import { RootSpec } from "../dsl";
import { vi } from "vitest";

const spec: RootSpec = {
  body: {
    type: "grid",
    columns: 2,
    gap: 2,
    children: [
      { type: "box", id: "a", selectable: true, children: [ { type: "text", text: "A" } ] },
      { type: "box", id: "b", selectable: true, children: [ { type: "text", text: "B" } ] },
    ],
  },
};

it("calls onSelect when clicking selectable box", async () => {
  const user = userEvent.setup();
  const onSelect = vi.fn();
  render(<Renderer spec={spec} onSelect={onSelect} />);
  await user.click(screen.getByText("A"));
  expect(onSelect).toHaveBeenCalledWith("a");
});

it("applies selected ring when selectedId provided", () => {
  render(<Renderer spec={spec} selectedId="b" />);
  const box = screen.getByTestId("b");
  expect(box.className).toMatch(/ring-2/);
});
