import { describe, expect, it } from "vitest";
import { classifyReply, nextStatusAfterReply, replyNote } from "./replies";

describe("classifyReply", () => {
  it("reads already-cleared in Greek and English", () => {
    expect(classifyReply("Το καθάρισα την προηγούμενη εβδομάδα")).toBe("already_cleared");
    expect(classifyReply("already cleared last week")).toBe("already_cleared");
  });

  it("reads not-my-plot in Greek and English", () => {
    expect(classifyReply("Δεν είναι δικό μου")).toBe("not_my_plot");
    expect(classifyReply("not my plot")).toBe("not_my_plot");
  });

  it("treats empty as silence", () => {
    expect(classifyReply("   ")).toBe("silence");
  });

  it("flags a dry-cover photo note", () => {
    expect(classifyReply("φωτογραφία με ξερά χόρτα")).toBe("photo_still_dry");
  });
});

describe("nextStatusAfterReply", () => {
  it("does not close the case when the owner says they already cleared", () => {
    expect(nextStatusAfterReply("already_cleared")).toBe("awaiting_officer_review");
  });

  it("keeps not-my-plot open under joint liability", () => {
    expect(nextStatusAfterReply("not_my_plot")).toBe("gap");
    expect(replyNote("not_my_plot")).toMatch(/3\.3/);
  });
});
