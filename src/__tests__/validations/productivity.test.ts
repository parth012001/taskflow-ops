import {
  productivityScoresQuerySchema,
  productivityTrendsQuerySchema,
  updateScoringConfigSchema,
} from "@/lib/validations/productivity";

describe("productivityScoresQuerySchema", () => {
  it("should pass with defaults", () => {
    const result = productivityScoresQuerySchema.safeParse({});
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.sortBy).toBe("composite");
      expect(result.data.sortOrder).toBe("desc");
      expect(result.data.page).toBe(1);
      expect(result.data.limit).toBe(20);
    }
  });

  it("should pass with all params provided", () => {
    const result = productivityScoresQuerySchema.safeParse({
      departmentId: "dept-1",
      role: "EMPLOYEE",
      sortBy: "output",
      sortOrder: "asc",
      page: 2,
      limit: 50,
    });
    expect(result.success).toBe(true);
  });

  it("should reject invalid sortBy value", () => {
    const result = productivityScoresQuerySchema.safeParse({
      sortBy: "invalid",
    });
    expect(result.success).toBe(false);
  });

  it("should reject page < 1", () => {
    const result = productivityScoresQuerySchema.safeParse({ page: 0 });
    expect(result.success).toBe(false);
  });

  it("should reject limit > 100", () => {
    const result = productivityScoresQuerySchema.safeParse({ limit: 101 });
    expect(result.success).toBe(false);
  });

  it("should coerce string page/limit to numbers", () => {
    const result = productivityScoresQuerySchema.safeParse({
      page: "3",
      limit: "10",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.page).toBe(3);
      expect(result.data.limit).toBe(10);
    }
  });
});

describe("productivityTrendsQuerySchema", () => {
  it("should pass with defaults", () => {
    const result = productivityTrendsQuerySchema.safeParse({});
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.weeks).toBe(12);
    }
  });

  it("should accept weeks 1-52", () => {
    expect(productivityTrendsQuerySchema.safeParse({ weeks: 1 }).success).toBe(true);
    expect(productivityTrendsQuerySchema.safeParse({ weeks: 52 }).success).toBe(true);
  });

  it("should reject weeks 0", () => {
    expect(productivityTrendsQuerySchema.safeParse({ weeks: 0 }).success).toBe(false);
  });

  it("should reject weeks 53", () => {
    expect(productivityTrendsQuerySchema.safeParse({ weeks: 53 }).success).toBe(false);
  });

  it("should accept optional userId", () => {
    const result = productivityTrendsQuerySchema.safeParse({ userId: "user-1" });
    expect(result.success).toBe(true);
  });
});

describe("updateScoringConfigSchema", () => {
  it("should pass with valid config (all 4 weights summing to 1)", () => {
    const result = updateScoringConfigSchema.safeParse({
      outputWeight: 0.4,
      qualityWeight: 0.2,
      reliabilityWeight: 0.3,
      consistencyWeight: 0.1,
    });
    expect(result.success).toBe(true);
  });

  it("should pass with only weeklyOutputTarget", () => {
    const result = updateScoringConfigSchema.safeParse({
      weeklyOutputTarget: 20,
    });
    expect(result.success).toBe(true);
  });

  it("should reject partial weights (3 of 4)", () => {
    const result = updateScoringConfigSchema.safeParse({
      outputWeight: 0.4,
      qualityWeight: 0.3,
      reliabilityWeight: 0.3,
    });
    expect(result.success).toBe(false);
  });

  it("should reject weights not summing to 1.0", () => {
    const result = updateScoringConfigSchema.safeParse({
      outputWeight: 0.4,
      qualityWeight: 0.4,
      reliabilityWeight: 0.3,
      consistencyWeight: 0.1,
    });
    expect(result.success).toBe(false);
  });

  it("should accept weights summing close to 1.0 (within 0.01 tolerance)", () => {
    const result = updateScoringConfigSchema.safeParse({
      outputWeight: 0.35,
      qualityWeight: 0.25,
      reliabilityWeight: 0.25,
      consistencyWeight: 0.15,
    });
    expect(result.success).toBe(true);
  });

  it("should validate weeklyOutputTarget boundaries", () => {
    expect(
      updateScoringConfigSchema.safeParse({ weeklyOutputTarget: 0 }).success
    ).toBe(false);
    expect(
      updateScoringConfigSchema.safeParse({ weeklyOutputTarget: 1 }).success
    ).toBe(true);
    expect(
      updateScoringConfigSchema.safeParse({ weeklyOutputTarget: 100 }).success
    ).toBe(true);
    expect(
      updateScoringConfigSchema.safeParse({ weeklyOutputTarget: 101 }).success
    ).toBe(false);
  });

  it("should pass with no fields (empty update)", () => {
    const result = updateScoringConfigSchema.safeParse({});
    expect(result.success).toBe(true);
  });
});
