import { render, screen } from "@testing-library/react";
import BrandLogo from "../BrandLogo";
import "@testing-library/jest-dom";

test("renders the Pulse Connect logo", () => {
  render(<BrandLogo />);
  const logo = screen.getByRole("img", { name: /pulse connect logo/i });
  expect(logo).toBeInTheDocument();
});
