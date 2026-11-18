import { describe, it, expect } from "vitest";
import {
  toMm,
  fromMm,
  feetInchToMm,
  areaSqft,
  areaSqm,
  rft,
  edgeBandRft,
} from "./units";

describe("ERP Measurement & Formula Engine", () => {
  it("converts units to mm accurately", () => {
    expect(toMm(10, "mm")).toBe(10);
    expect(toMm(5, "cm")).toBe(50);
    expect(toMm(2, "inch")).toBeCloseTo(50.8, 2);
    expect(toMm(1, "ft")).toBe(304.8);
    expect(toMm(1, "m")).toBe(1000);
  });

  it("converts mm to target units accurately", () => {
    expect(fromMm(1000, "m")).toBe(1);
    expect(fromMm(304.8, "ft")).toBe(1);
    expect(fromMm(50, "cm")).toBe(5);
  });

  it("calculates feet + inch to mm accurately", () => {
    // 8 ft + 6 in
    const expected = 8 * 304.8 + 6 * 25.4;
    expect(feetInchToMm(8, 6)).toBeCloseTo(expected, 2);
  });

  it("calculates square footage and square meters", () => {
    // 1000mm x 1000mm = 1 sqm
    expect(areaSqm(1000, 1000)).toBe(1);
    // 304.8mm x 304.8mm = 1 sqft
    expect(areaSqft(304.8, 304.8)).toBeCloseTo(1, 4);
  });

  it("calculates running feet (RFT)", () => {
    expect(rft(304.8)).toBe(1);
    expect(rft(609.6)).toBe(2);
  });

  it("calculates edge band RFT based on selected edges", () => {
    // 1000mm length, 500mm width, all 4 edges selected
    const allEdges = edgeBandRft(1000, 500, { e1: true, e2: true, e3: true, e4: true });
    expect(allEdges).toBeCloseTo((1000 * 2 + 500 * 2) / 304.8, 4);

    // No edges selected
    const noEdges = edgeBandRft(1000, 500, {});
    expect(noEdges).toBe(0);
  });
});
