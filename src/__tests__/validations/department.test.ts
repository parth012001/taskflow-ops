import {
  createDepartmentSchema,
  updateDepartmentSchema,
  listDepartmentsQuerySchema,
} from "@/lib/validations/department";

describe("Department Validation Schemas", () => {
  describe("createDepartmentSchema", () => {
    describe("valid inputs", () => {
      it("should accept name only", () => {
        const result = createDepartmentSchema.safeParse({ name: "Engineering" });
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.name).toBe("Engineering");
          expect(result.data.description).toBeUndefined();
          expect(result.data.headId).toBeUndefined();
        }
      });

      it("should accept all fields", () => {
        const result = createDepartmentSchema.safeParse({
          name: "Engineering",
          description: "The engineering department",
          headId: "clxxxxxxxxxxxxxxxxxxxxxxxxx",
        });
        expect(result.success).toBe(true);
      });

      it("should accept null description and headId", () => {
        const result = createDepartmentSchema.safeParse({
          name: "Engineering",
          description: null,
          headId: null,
        });
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.description).toBeNull();
          expect(result.data.headId).toBeNull();
        }
      });

      it("should trim name and description", () => {
        const result = createDepartmentSchema.safeParse({
          name: "  Engineering  ",
          description: "  Some description  ",
        });
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.name).toBe("Engineering");
          expect(result.data.description).toBe("Some description");
        }
      });
    });

    describe("invalid inputs", () => {
      it("should reject empty name", () => {
        const result = createDepartmentSchema.safeParse({ name: "" });
        expect(result.success).toBe(false);
      });

      it("should reject whitespace-only name", () => {
        const result = createDepartmentSchema.safeParse({ name: "   " });
        expect(result.success).toBe(false);
      });

      it("should reject name over 100 characters", () => {
        const result = createDepartmentSchema.safeParse({
          name: "a".repeat(101),
        });
        expect(result.success).toBe(false);
      });

      it("should reject description over 500 characters", () => {
        const result = createDepartmentSchema.safeParse({
          name: "Test",
          description: "a".repeat(501),
        });
        expect(result.success).toBe(false);
      });

      it("should reject invalid headId format", () => {
        const result = createDepartmentSchema.safeParse({
          name: "Test",
          headId: "not-a-cuid",
        });
        expect(result.success).toBe(false);
      });

      it("should reject missing name", () => {
        const result = createDepartmentSchema.safeParse({});
        expect(result.success).toBe(false);
      });
    });
  });

  describe("updateDepartmentSchema", () => {
    describe("valid inputs", () => {
      it("should accept partial updates", () => {
        const result = updateDepartmentSchema.safeParse({ name: "New Name" });
        expect(result.success).toBe(true);
      });

      it("should accept empty object", () => {
        const result = updateDepartmentSchema.safeParse({});
        expect(result.success).toBe(true);
      });

      it("should accept null values", () => {
        const result = updateDepartmentSchema.safeParse({
          description: null,
          headId: null,
        });
        expect(result.success).toBe(true);
      });

      it("should accept all fields", () => {
        const result = updateDepartmentSchema.safeParse({
          name: "Updated",
          description: "Updated description",
          headId: "clxxxxxxxxxxxxxxxxxxxxxxxxx",
        });
        expect(result.success).toBe(true);
      });
    });

    describe("invalid inputs", () => {
      it("should reject empty name", () => {
        const result = updateDepartmentSchema.safeParse({ name: "" });
        expect(result.success).toBe(false);
      });

      it("should reject name over 100 characters", () => {
        const result = updateDepartmentSchema.safeParse({
          name: "a".repeat(101),
        });
        expect(result.success).toBe(false);
      });

      it("should reject description over 500 characters", () => {
        const result = updateDepartmentSchema.safeParse({
          description: "a".repeat(501),
        });
        expect(result.success).toBe(false);
      });

      it("should reject invalid headId", () => {
        const result = updateDepartmentSchema.safeParse({
          headId: "invalid",
        });
        expect(result.success).toBe(false);
      });
    });
  });

  describe("listDepartmentsQuerySchema", () => {
    describe("valid inputs", () => {
      it("should apply defaults for empty input", () => {
        const result = listDepartmentsQuerySchema.safeParse({});
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.page).toBe(1);
          expect(result.data.limit).toBe(20);
          expect(result.data.sortBy).toBe("name");
          expect(result.data.sortOrder).toBe("asc");
        }
      });

      it("should accept valid params", () => {
        const result = listDepartmentsQuerySchema.safeParse({
          page: 2,
          limit: 50,
          search: "eng",
          sortBy: "createdAt",
          sortOrder: "desc",
        });
        expect(result.success).toBe(true);
      });

      it("should coerce string numbers", () => {
        const result = listDepartmentsQuerySchema.safeParse({
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

    describe("invalid inputs", () => {
      it("should reject invalid sortBy", () => {
        const result = listDepartmentsQuerySchema.safeParse({
          sortBy: "invalid",
        });
        expect(result.success).toBe(false);
      });

      it("should reject invalid sortOrder", () => {
        const result = listDepartmentsQuerySchema.safeParse({
          sortOrder: "invalid",
        });
        expect(result.success).toBe(false);
      });

      it("should reject limit over 100", () => {
        const result = listDepartmentsQuerySchema.safeParse({ limit: 101 });
        expect(result.success).toBe(false);
      });

      it("should reject non-positive page", () => {
        const result = listDepartmentsQuerySchema.safeParse({ page: 0 });
        expect(result.success).toBe(false);
      });
    });
  });
});
