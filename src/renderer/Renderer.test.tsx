import { render, screen } from "@testing-library/react";
import { Renderer } from "./Renderer";
import { sampleSpec } from "../sample-spec";

it("renders heading from spec", () => {
  render(<Renderer spec={sampleSpec} />);
  expect(screen.getByText(/visual flow|acme dashboard/i)).toBeInTheDocument();
});
