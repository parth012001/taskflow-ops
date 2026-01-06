import {
  createKpiBucketSchema,
  updateKpiBucketSchema,
  assignKpiSchema,
  updateKpiAssignmentSchema,
} from "@/lib/validations/kpi-management";

describe("KPI Management Validation Schemas", () => {
  describe("createKpiBucketSchema", () => {
    describe("valid inputs", () => {
      it("should accept valid name, description, and single role", () => {
        const result = createKpiBucketSchema.safeParse({
          name: "Purchase Accuracy",
          description: "Measures accuracy of purchase orders",
          applicableRoles: ["EMPLOYEE"],
        });
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.name).toBe("Purchase Accuracy");
          expect(result.data.description).toBe("Measures accuracy of purchase orders");
          expect(result.data.applicableRoles).toEqual(["EMPLOYEE"]);
        }
      });

      it("should accept valid name with all three roles", () => {
        const result = createKpiBucketSchema.safeParse({
          name: "Team Performance",
          applicableRoles: ["EMPLOYEE", "MANAGER", "DEPARTMENT_HEAD"],
        });
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.applicableRoles).toHaveLength(3);
        }
      });

      it("should accept name at minimum length (2 chars)", () => {
        const result = createKpiBucketSchema.safeParse({
          name: "AB",
          applicableRoles: ["EMPLOYEE"],
        });
        expect(result.success).toBe(true);
      });

      it("should accept name at maximum length (100 chars)", () => {
        const result = createKpiBucketSchema.safeParse({
          name: "a".repeat(100),
          applicableRoles: ["EMPLOYEE"],
        });
        expect(result.success).toBe(true);
      });

      it("should accept null description", () => {
        const result = createKpiBucketSchema.safeParse({
          name: "Test KPI",
          description: null,
          applicableRoles: ["MANAGER"],
        });
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.description).toBeNull();
        }
      });

      it("should accept undefined description", () => {
        const result = createKpiBucketSchema.safeParse({
          name: "Test KPI",
          applicableRoles: ["MANAGER"],
        });
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.description).toBeUndefined();
        }
      });

      it("should accept description at maximum length (500 chars)", () => {
        const result = createKpiBucketSchema.safeParse({
          name: "Test KPI",
          description: "a".repeat(500),
          applicableRoles: ["EMPLOYEE"],
        });
        expect(result.success).toBe(true);
      });
    });

    describe("invalid name", () => {
      it("should reject name shorter than 2 characters", () => {
        const result = createKpiBucketSchema.safeParse({
          name: "A",
          applicableRoles: ["EMPLOYEE"],
        });
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.issues[0].message).toContain("at least 2 characters");
        }
      });

      it("should reject name longer than 100 characters", () => {
        const result = createKpiBucketSchema.safeParse({
          name: "a".repeat(101),
          applicableRoles: ["EMPLOYEE"],
        });
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.issues[0].message).toContain("less than 100 characters");
        }
      });

      it("should reject empty name", () => {
        const result = createKpiBucketSchema.safeParse({
          name: "",
          applicableRoles: ["EMPLOYEE"],
        });
        expect(result.success).toBe(false);
      });

      it("should reject missing name", () => {
        const result = createKpiBucketSchema.safeParse({
          applicableRoles: ["EMPLOYEE"],
        });
        expect(result.success).toBe(false);
      });
    });

    describe("invalid description", () => {
      it("should reject description longer than 500 characters", () => {
        const result = createKpiBucketSchema.safeParse({
          name: "Test KPI",
          description: "a".repeat(501),
          applicableRoles: ["EMPLOYEE"],
        });
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.issues[0].message).toContain("less than 500 characters");
        }
      });
    });

    describe("invalid applicableRoles", () => {
      it("should reject empty roles array", () => {
        const result = createKpiBucketSchema.safeParse({
          name: "Test KPI",
          applicableRoles: [],
        });
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.issues[0].message).toContain("At least one role");
        }
      });

      it("should reject missing roles", () => {
        const result = createKpiBucketSchema.safeParse({
          name: "Test KPI",
        });
        expect(result.success).toBe(false);
      });

      it("should reject invalid role value (ADMIN)", () => {
        const result = createKpiBucketSchema.safeParse({
          name: "Test KPI",
          applicableRoles: ["ADMIN"],
        });
        expect(result.success).toBe(false);
      });

      it("should reject invalid role value (SUPERUSER)", () => {
        const result = createKpiBucketSchema.safeParse({
          name: "Test KPI",
          applicableRoles: ["SUPERUSER"],
        });
        expect(result.success).toBe(false);
      });

      it("should reject mix of valid and invalid roles", () => {
        const result = createKpiBucketSchema.safeParse({
          name: "Test KPI",
          applicableRoles: ["EMPLOYEE", "INVALID_ROLE"],
        });
        expect(result.success).toBe(false);
      });
    });
  });

  describe("updateKpiBucketSchema", () => {
    describe("partial updates", () => {
      it("should accept only name update", () => {
        const result = updateKpiBucketSchema.safeParse({
          name: "Updated Name",
        });
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.name).toBe("Updated Name");
          expect(result.data.description).toBeUndefined();
          expect(result.data.applicableRoles).toBeUndefined();
          expect(result.data.isActive).toBeUndefined();
        }
      });

      it("should accept only description update", () => {
        const result = updateKpiBucketSchema.safeParse({
          description: "New description",
        });
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.description).toBe("New description");
        }
      });

      it("should accept only applicableRoles update", () => {
        const result = updateKpiBucketSchema.safeParse({
          applicableRoles: ["MANAGER", "DEPARTMENT_HEAD"],
        });
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.applicableRoles).toEqual(["MANAGER", "DEPARTMENT_HEAD"]);
        }
      });

      it("should accept only isActive update", () => {
        const result = updateKpiBucketSchema.safeParse({
          isActive: false,
        });
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.isActive).toBe(false);
        }
      });

      it("should accept multiple partial updates", () => {
        const result = updateKpiBucketSchema.safeParse({
          name: "Updated Name",
          isActive: true,
        });
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.name).toBe("Updated Name");
          expect(result.data.isActive).toBe(true);
        }
      });

      it("should accept empty object (no changes)", () => {
        const result = updateKpiBucketSchema.safeParse({});
        expect(result.success).toBe(true);
      });
    });

    describe("invalid partial updates", () => {
      it("should still reject empty name if provided", () => {
        const result = updateKpiBucketSchema.safeParse({
          name: "",
        });
        expect(result.success).toBe(false);
      });

      it("should still reject invalid role if provided", () => {
        const result = updateKpiBucketSchema.safeParse({
          applicableRoles: ["ADMIN"],
        });
        expect(result.success).toBe(false);
      });
    });
  });

  describe("assignKpiSchema", () => {
    describe("valid inputs", () => {
      it("should accept valid userId and kpiBucketId without targetValue", () => {
        const result = assignKpiSchema.safeParse({
          userId: "user-123",
          kpiBucketId: "bucket-456",
        });
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.userId).toBe("user-123");
          expect(result.data.kpiBucketId).toBe("bucket-456");
          expect(result.data.targetValue).toBeUndefined();
        }
      });

      it("should accept valid input with targetValue", () => {
        const result = assignKpiSchema.safeParse({
          userId: "user-123",
          kpiBucketId: "bucket-456",
          targetValue: 100,
        });
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.targetValue).toBe(100);
        }
      });

      it("should accept targetValue of 0", () => {
        const result = assignKpiSchema.safeParse({
          userId: "user-123",
          kpiBucketId: "bucket-456",
          targetValue: 0,
        });
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.targetValue).toBe(0);
        }
      });

      it("should accept null targetValue", () => {
        const result = assignKpiSchema.safeParse({
          userId: "user-123",
          kpiBucketId: "bucket-456",
          targetValue: null,
        });
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.targetValue).toBeNull();
        }
      });

      it("should accept UUID format userId", () => {
        const result = assignKpiSchema.safeParse({
          userId: "550e8400-e29b-41d4-a716-446655440000",
          kpiBucketId: "bucket-123",
        });
        expect(result.success).toBe(true);
      });

      it("should accept CUID format kpiBucketId", () => {
        const result = assignKpiSchema.safeParse({
          userId: "user-123",
          kpiBucketId: "cm5abc123def456ghi",
        });
        expect(result.success).toBe(true);
      });

      it("should accept decimal targetValue", () => {
        const result = assignKpiSchema.safeParse({
          userId: "user-123",
          kpiBucketId: "bucket-456",
          targetValue: 95.5,
        });
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.targetValue).toBe(95.5);
        }
      });
    });

    describe("invalid userId", () => {
      it("should reject empty userId", () => {
        const result = assignKpiSchema.safeParse({
          userId: "",
          kpiBucketId: "bucket-456",
        });
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.issues[0].message).toContain("User is required");
        }
      });

      it("should reject missing userId", () => {
        const result = assignKpiSchema.safeParse({
          kpiBucketId: "bucket-456",
        });
        expect(result.success).toBe(false);
      });
    });

    describe("invalid kpiBucketId", () => {
      it("should reject empty kpiBucketId", () => {
        const result = assignKpiSchema.safeParse({
          userId: "user-123",
          kpiBucketId: "",
        });
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.issues[0].message).toContain("KPI bucket is required");
        }
      });

      it("should reject missing kpiBucketId", () => {
        const result = assignKpiSchema.safeParse({
          userId: "user-123",
        });
        expect(result.success).toBe(false);
      });
    });

    describe("invalid targetValue", () => {
      it("should reject negative targetValue", () => {
        const result = assignKpiSchema.safeParse({
          userId: "user-123",
          kpiBucketId: "bucket-456",
          targetValue: -1,
        });
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.issues[0].message).toContain("Target must be non-negative");
        }
      });

      it("should reject large negative targetValue", () => {
        const result = assignKpiSchema.safeParse({
          userId: "user-123",
          kpiBucketId: "bucket-456",
          targetValue: -100,
        });
        expect(result.success).toBe(false);
      });
    });
  });

  describe("updateKpiAssignmentSchema", () => {
    describe("valid inputs", () => {
      it("should accept valid targetValue", () => {
        const result = updateKpiAssignmentSchema.safeParse({
          targetValue: 150,
        });
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.targetValue).toBe(150);
        }
      });

      it("should accept targetValue of 0", () => {
        const result = updateKpiAssignmentSchema.safeParse({
          targetValue: 0,
        });
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.targetValue).toBe(0);
        }
      });

      it("should accept null targetValue", () => {
        const result = updateKpiAssignmentSchema.safeParse({
          targetValue: null,
        });
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.targetValue).toBeNull();
        }
      });

      it("should accept undefined targetValue", () => {
        const result = updateKpiAssignmentSchema.safeParse({});
        expect(result.success).toBe(true);
      });

      it("should accept decimal targetValue", () => {
        const result = updateKpiAssignmentSchema.safeParse({
          targetValue: 99.99,
        });
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.targetValue).toBe(99.99);
        }
      });

      it("should accept large targetValue", () => {
        const result = updateKpiAssignmentSchema.safeParse({
          targetValue: 1000000,
        });
        expect(result.success).toBe(true);
      });
    });

    describe("invalid inputs", () => {
      it("should reject negative targetValue", () => {
        const result = updateKpiAssignmentSchema.safeParse({
          targetValue: -1,
        });
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.issues[0].message).toContain("Target must be non-negative");
        }
      });

      it("should reject negative decimal targetValue", () => {
        const result = updateKpiAssignmentSchema.safeParse({
          targetValue: -0.5,
        });
        expect(result.success).toBe(false);
      });
    });
  });
});
