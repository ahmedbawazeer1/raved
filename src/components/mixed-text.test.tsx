import { describe, expect, it } from "vitest";
import { render } from "@testing-library/react";
import { MixedText } from "./mixed-text";

describe("MixedText", () => {
  it("keeps a pure English sentence (with a blank) in one LTR run", () => {
    const { container } = render(<MixedText text="I ___ from Aden." />);
    const spans = container.querySelectorAll('[dir="ltr"]');
    expect(spans).toHaveLength(1);
    expect(spans[0].textContent).toBe("I ___ from Aden.");
  });

  it("wraps Latin runs inside Arabic", () => {
    const { container } = render(<MixedText text="مع they نستخدم are." />);
    const runs = [...container.querySelectorAll('[dir="ltr"]')].map((s) => s.textContent);
    expect(runs).toEqual(["they", "are."]);
  });
});
