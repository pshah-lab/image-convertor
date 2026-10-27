import { describe, expect, it } from "vitest";
import { metadataEntries } from "./metadata";

describe("metadata entries", () => {
  it("shows only known present fields and flags GPS", () => {
    expect(metadataEntries({ Model: "Phone", latitude: 12.3, Unknown: "ignore" })).toEqual([{ label: "Camera", value: "Phone", sensitive: undefined }, { label: "GPS latitude", value: "12.3", sensitive: true }]);
  });
});
