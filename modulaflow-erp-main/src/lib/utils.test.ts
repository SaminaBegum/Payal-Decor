import { describe, it, expect } from "vitest";
import { cn } from "./utils";

describe("CSS Class Merging Utility (cn)", () => {
  it("combines class names correctly", () => {
    expect(cn("px-2", "py-1")).toBe("px-2 py-1");
  });

  it("handles conditional classes and falsy values", () => {
    const isHidden = false;
    expect(cn("base-class", isHidden && "hidden", null, undefined, "active")).toBe(
      "base-class active"
    );
  });

  it("resolves tailwind conflicts via tailwind-merge", () => {
    expect(cn("p-4", "p-2")).toBe("p-2");
    expect(cn("text-red-500", "text-blue-500")).toBe("text-blue-500");
  });
});
