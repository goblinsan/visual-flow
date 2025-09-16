import { render, screen } from "@testing-library/react";
import '@testing-library/jest-dom';
import { Renderer } from "./Renderer";
import { gridSample, simpleText, stackSample } from "../samples";

describe("Renderer", () => {
  it("renders simple text h1", () => {
    render(<Renderer spec={simpleText} />);
    expect(screen.getByText(/visual flow/i)).toBeInTheDocument();
  });

  it("renders stack sample heading", () => {
    render(<Renderer spec={stackSample} />);
    expect(screen.getByText(/acme dashboard/i)).toBeInTheDocument();
  });

  it("renders grid items", () => {
    render(<Renderer spec={gridSample} />);
    expect(screen.getByText(/One/)).toBeInTheDocument();
    expect(screen.getByText(/Six/)).toBeInTheDocument();
  });
});
