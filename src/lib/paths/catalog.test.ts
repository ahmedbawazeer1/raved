import { describe, expect, it } from "vitest";
import { catalogPaths, getPublicPaths, type CatalogPath } from "./catalog";

describe("getPublicPaths", () => {
  it("starts with the published English path", () => {
    const paths = getPublicPaths();
    expect(paths[0]?.slug).toBe("english");
    expect(paths[0]?.status).toBe("published");
    expect(paths.filter((p) => p.status === "soon")).toHaveLength(3);
  });

  it("hides drafts and sorts by order", () => {
    const input: CatalogPath[] = [
      { ...catalogPaths[1]!, order: 2 },
      { ...catalogPaths[2]!, status: "draft" },
      { ...catalogPaths[0]!, order: 1 },
    ];
    expect(getPublicPaths(input).map((p) => p.slug)).toEqual(["english", "web"]);
  });

  it("has unique slugs", () => {
    const slugs = catalogPaths.map((p) => p.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
  });
});
