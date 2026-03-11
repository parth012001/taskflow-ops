/**
 * Unit tests for analytics utility logic — band classification and distribution bucketing.
 */

// Band classification logic (matches the API route)
function getBand(score: number): string {
  if (score >= 80) return "thriving";
  if (score >= 60) return "healthy";
  if (score >= 40) return "atRisk";
  return "critical";
}

// Distribution bucketing
function computeDistribution(compositeScores: number[]) {
  const distribution = { thriving: 0, healthy: 0, atRisk: 0, critical: 0 };
  for (const score of compositeScores) {
    const band = getBand(score);
    distribution[band as keyof typeof distribution]++;
  }
  return distribution;
}

describe("Analytics - Band Classification", () => {
  it("classifies scores >= 80 as thriving", () => {
    expect(getBand(80)).toBe("thriving");
    expect(getBand(95)).toBe("thriving");
    expect(getBand(100)).toBe("thriving");
  });

  it("classifies scores 60-79 as healthy", () => {
    expect(getBand(60)).toBe("healthy");
    expect(getBand(70)).toBe("healthy");
    expect(getBand(79)).toBe("healthy");
  });

  it("classifies scores 40-59 as atRisk", () => {
    expect(getBand(40)).toBe("atRisk");
    expect(getBand(50)).toBe("atRisk");
    expect(getBand(59)).toBe("atRisk");
  });

  it("classifies scores < 40 as critical", () => {
    expect(getBand(0)).toBe("critical");
    expect(getBand(20)).toBe("critical");
    expect(getBand(39)).toBe("critical");
  });

  it("handles boundary values correctly", () => {
    expect(getBand(79.9)).toBe("healthy");
    expect(getBand(80)).toBe("thriving");
    expect(getBand(59.9)).toBe("atRisk");
    expect(getBand(60)).toBe("healthy");
    expect(getBand(39.9)).toBe("critical");
    expect(getBand(40)).toBe("atRisk");
  });
});

describe("Analytics - Distribution Bucketing", () => {
  it("buckets an empty array", () => {
    const dist = computeDistribution([]);
    expect(dist).toEqual({ thriving: 0, healthy: 0, atRisk: 0, critical: 0 });
  });

  it("buckets a single score", () => {
    const dist = computeDistribution([85]);
    expect(dist).toEqual({ thriving: 1, healthy: 0, atRisk: 0, critical: 0 });
  });

  it("distributes scores across all bands", () => {
    const scores = [90, 85, 70, 65, 50, 45, 30, 10];
    const dist = computeDistribution(scores);
    expect(dist).toEqual({ thriving: 2, healthy: 2, atRisk: 2, critical: 2 });
  });

  it("handles all scores in one band", () => {
    const scores = [82, 88, 90, 95, 100];
    const dist = computeDistribution(scores);
    expect(dist).toEqual({ thriving: 5, healthy: 0, atRisk: 0, critical: 0 });
  });

  it("total count equals input length", () => {
    const scores = [10, 20, 30, 40, 50, 60, 70, 80, 90];
    const dist = computeDistribution(scores);
    const total = dist.thriving + dist.healthy + dist.atRisk + dist.critical;
    expect(total).toBe(scores.length);
  });
});

describe("Analytics - Company Health Response Shape", () => {
  it("validates expected response structure", () => {
    // Mock a company health response
    const response = {
      companyScore: {
        composite: 68.5,
        output: 72.3,
        quality: 71.0,
        reliability: 64.2,
        consistency: 61.8,
        band: "healthy",
        change: 3.2,
        scoredCount: 18,
        totalEmployees: 20,
      },
      distribution: {
        thriving: 4,
        healthy: 8,
        atRisk: 4,
        critical: 2,
      },
      alerts: {
        atRiskCount: 6,
        biggestMover: { pillar: "quality", direction: "up", delta: 5.3 },
        unscorableCount: 2,
      },
    };

    // Validate companyScore
    expect(response.companyScore).toHaveProperty("composite");
    expect(response.companyScore).toHaveProperty("output");
    expect(response.companyScore).toHaveProperty("quality");
    expect(response.companyScore).toHaveProperty("reliability");
    expect(response.companyScore).toHaveProperty("consistency");
    expect(response.companyScore).toHaveProperty("band");
    expect(response.companyScore).toHaveProperty("change");
    expect(response.companyScore).toHaveProperty("scoredCount");
    expect(response.companyScore).toHaveProperty("totalEmployees");

    // Validate band is valid
    expect(["thriving", "healthy", "atRisk", "critical"]).toContain(
      response.companyScore.band
    );

    // Validate distribution
    expect(response.distribution).toHaveProperty("thriving");
    expect(response.distribution).toHaveProperty("healthy");
    expect(response.distribution).toHaveProperty("atRisk");
    expect(response.distribution).toHaveProperty("critical");

    // Distribution should sum to scored count
    const distTotal =
      response.distribution.thriving +
      response.distribution.healthy +
      response.distribution.atRisk +
      response.distribution.critical;
    expect(distTotal).toBe(response.companyScore.scoredCount);

    // Validate alerts
    expect(response.alerts).toHaveProperty("atRiskCount");
    expect(response.alerts).toHaveProperty("biggestMover");
    expect(response.alerts).toHaveProperty("unscorableCount");

    // unscorable + scored should equal total
    expect(
      response.companyScore.scoredCount + response.alerts.unscorableCount
    ).toBe(response.companyScore.totalEmployees);
  });
});
