import { carryForwardSchema } from "@/lib/validations/carry-forward";

describe("Carry Forward Validation Schema", () => {
  describe("valid inputs", () => {
    it("should accept valid date and reason", () => {
      const result = carryForwardSchema.safeParse({
        newDeadline: "2025-01-15",
        reason: "Waiting for client feedback on the design requirements",
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.newDeadline).toBe("2025-01-15");
        expect(result.data.reason).toBe("Waiting for client feedback on the design requirements");
      }
    });

    it("should accept reason at minimum length (10 chars)", () => {
      const result = carryForwardSchema.safeParse({
        newDeadline: "2025-02-01",
        reason: "1234567890", // exactly 10 chars
      });
      expect(result.success).toBe(true);
    });

    it("should accept reason at maximum length (500 chars)", () => {
      const result = carryForwardSchema.safeParse({
        newDeadline: "2025-02-01",
        reason: "a".repeat(500),
      });
      expect(result.success).toBe(true);
    });
  });

  describe("invalid date formats", () => {
    it("should reject invalid date format (MM-DD-YYYY)", () => {
      const result = carryForwardSchema.safeParse({
        newDeadline: "01-15-2025",
        reason: "Valid reason for carry forward",
      });
      expect(result.success).toBe(false);
    });

    it("should reject invalid date format (YYYY/MM/DD)", () => {
      const result = carryForwardSchema.safeParse({
        newDeadline: "2025/01/15",
        reason: "Valid reason for carry forward",
      });
      expect(result.success).toBe(false);
    });

    it("should reject invalid date format (ISO datetime)", () => {
      const result = carryForwardSchema.safeParse({
        newDeadline: "2025-01-15T10:00:00Z",
        reason: "Valid reason for carry forward",
      });
      expect(result.success).toBe(false);
    });

    it("should reject empty date", () => {
      const result = carryForwardSchema.safeParse({
        newDeadline: "",
        reason: "Valid reason for carry forward",
      });
      expect(result.success).toBe(false);
    });

    it("should reject missing date", () => {
      const result = carryForwardSchema.safeParse({
        reason: "Valid reason for carry forward",
      });
      expect(result.success).toBe(false);
    });
  });

  describe("invalid reasons", () => {
    it("should reject reason shorter than 10 characters", () => {
      const result = carryForwardSchema.safeParse({
        newDeadline: "2025-01-15",
        reason: "Too short",
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain("at least 10 characters");
      }
    });

    it("should reject reason longer than 500 characters", () => {
      const result = carryForwardSchema.safeParse({
        newDeadline: "2025-01-15",
        reason: "a".repeat(501),
      });
      expect(result.success).toBe(false);
    });

    it("should reject empty reason", () => {
      const result = carryForwardSchema.safeParse({
        newDeadline: "2025-01-15",
        reason: "",
      });
      expect(result.success).toBe(false);
    });

    it("should reject missing reason", () => {
      const result = carryForwardSchema.safeParse({
        newDeadline: "2025-01-15",
      });
      expect(result.success).toBe(false);
    });
  });

  describe("edge cases", () => {
    it("should accept leap year date", () => {
      const result = carryForwardSchema.safeParse({
        newDeadline: "2024-02-29",
        reason: "Valid reason for carry forward",
      });
      expect(result.success).toBe(true);
    });

    it("should accept end of year date", () => {
      const result = carryForwardSchema.safeParse({
        newDeadline: "2025-12-31",
        reason: "Valid reason for carry forward",
      });
      expect(result.success).toBe(true);
    });

    it("should accept reason with special characters", () => {
      const result = carryForwardSchema.safeParse({
        newDeadline: "2025-01-15",
        reason: "Waiting for client's response & feedback!",
      });
      expect(result.success).toBe(true);
    });

    it("should accept reason with unicode characters", () => {
      const result = carryForwardSchema.safeParse({
        newDeadline: "2025-01-15",
        reason: "Esperando la respuesta del cliente",
      });
      expect(result.success).toBe(true);
    });
  });
});
