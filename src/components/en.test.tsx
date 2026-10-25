import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { En } from "./en";

describe("En", () => {
  it("renders English text left-to-right inside the RTL page", () => {
    render(<En>How much / How many</En>);
    const el = screen.getByText("How much / How many");
    expect(el.tagName).toBe("SPAN");
    expect(el.getAttribute("dir")).toBe("ltr");
    expect(el.getAttribute("lang")).toBe("en");
  });

  it("can render as another element", () => {
    render(<En as="p">Hello</En>);
    expect(screen.getByText("Hello").tagName).toBe("P");
  });
});
