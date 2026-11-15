import { describe, expect, it } from "vitest";
import { classifyReply, routeReply } from "@/lib/replies";

describe("reply routing", () => {
  it("does not close a case when the owner says it was cleared last week", () => {
    expect(classifyReply("Το καθάρισα την περασμένη εβδομάδα.")).toBe(
      "cleared_last_week",
    );
    expect(classifyReply("I cleared it last week")).toBe("cleared_last_week");
    expect(routeReply("cleared_last_week")).toBe("awaiting_officer_review");
  });

  it("keeps 'not my plot' open under joint and several liability", () => {
    expect(classifyReply("Δεν είναι δικό μου οικόπεδο")).toBe("not_my_plot");
    expect(classifyReply("This is not my plot")).toBe("not_my_plot");
    expect(routeReply("not_my_plot")).toBe("open_joint_liability");
  });

  it("treats silence as follow-up and a dry-cover photo as evidence", () => {
    expect(classifyReply("")).toBe("silence");
    expect(classifyReply("   ")).toBe("silence");
    expect(classifyReply(null)).toBe("silence");
    expect(routeReply("silence")).toBe("follow_up_needed");
    expect(routeReply("dry_cover_photo")).toBe("evidence_uncleared");
  });
});
