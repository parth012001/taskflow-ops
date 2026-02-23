import {
  createUserSchema,
  updateUserSchema,
  resetPasswordSchema,
  listUsersQuerySchema,
  generateRandomPassword,
} from "@/lib/validations/user-management";

describe("User Management Validation Schemas", () => {
  describe("createUserSchema", () => {
    describe("valid inputs", () => {
      it("should accept valid user with auto-generated password", () => {
        const result = createUserSchema.safeParse({
          email: "test@example.com",
          firstName: "John",
          lastName: "Doe",
          role: "EMPLOYEE",
          autoGeneratePassword: true,
        });
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.email).toBe("test@example.com");
          expect(result.data.firstName).toBe("John");
          expect(result.data.lastName).toBe("Doe");
          expect(result.data.role).toBe("EMPLOYEE");
          expect(result.data.autoGeneratePassword).toBe(true);
        }
      });

      it("should accept valid user with manual password", () => {
        const result = createUserSchema.safeParse({
          email: "test@example.com",
          firstName: "Jane",
          lastName: "Smith",
          role: "MANAGER",
          password: "SecurePass123",
          autoGeneratePassword: false,
        });
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.password).toBe("SecurePass123");
        }
      });

      it("should accept all valid roles", () => {
        const roles = ["EMPLOYEE", "MANAGER", "DEPARTMENT_HEAD", "ADMIN"];
        for (const role of roles) {
          const result = createUserSchema.safeParse({
            email: "test@example.com",
            firstName: "Test",
            lastName: "User",
            role,
            autoGeneratePassword: true,
          });
          expect(result.success).toBe(true);
        }
      });

      it("should accept optional departmentId and managerId", () => {
        const result = createUserSchema.safeParse({
          email: "test@example.com",
          firstName: "Test",
          lastName: "User",
          role: "EMPLOYEE",
          departmentId: "cm7qk0b0a0000abcddeptid01",
          managerId: "cm7qk0b0a0000abcdmgrid001",
          autoGeneratePassword: true,
        });
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.departmentId).toBe("cm7qk0b0a0000abcddeptid01");
          expect(result.data.managerId).toBe("cm7qk0b0a0000abcdmgrid001");
        }
      });

      it("should accept null departmentId and managerId", () => {
        const result = createUserSchema.safeParse({
          email: "test@example.com",
          firstName: "Test",
          lastName: "User",
          role: "EMPLOYEE",
          departmentId: null,
          managerId: null,
          autoGeneratePassword: true,
        });
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.departmentId).toBeNull();
          expect(result.data.managerId).toBeNull();
        }
      });

      it("should lowercase email", () => {
        const result = createUserSchema.safeParse({
          email: "Test@EXAMPLE.com",
          firstName: "Test",
          lastName: "User",
          role: "EMPLOYEE",
          autoGeneratePassword: true,
        });
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.email).toBe("test@example.com");
        }
      });

      it("should trim firstName and lastName", () => {
        const result = createUserSchema.safeParse({
          email: "test@example.com",
          firstName: "  John  ",
          lastName: "  Doe  ",
          role: "EMPLOYEE",
          autoGeneratePassword: true,
        });
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.firstName).toBe("John");
          expect(result.data.lastName).toBe("Doe");
        }
      });
    });

    describe("invalid email", () => {
      it("should reject invalid email format", () => {
        const result = createUserSchema.safeParse({
          email: "not-an-email",
          firstName: "Test",
          lastName: "User",
          role: "EMPLOYEE",
          autoGeneratePassword: true,
        });
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.issues[0].message).toContain("email");
        }
      });

      it("should reject empty email", () => {
        const result = createUserSchema.safeParse({
          email: "",
          firstName: "Test",
          lastName: "User",
          role: "EMPLOYEE",
          autoGeneratePassword: true,
        });
        expect(result.success).toBe(false);
      });

      it("should reject email longer than 255 characters", () => {
        const longEmail = "a".repeat(250) + "@example.com";
        const result = createUserSchema.safeParse({
          email: longEmail,
          firstName: "Test",
          lastName: "User",
          role: "EMPLOYEE",
          autoGeneratePassword: true,
        });
        expect(result.success).toBe(false);
      });
    });

    describe("invalid names", () => {
      it("should reject empty firstName", () => {
        const result = createUserSchema.safeParse({
          email: "test@example.com",
          firstName: "",
          lastName: "User",
          role: "EMPLOYEE",
          autoGeneratePassword: true,
        });
        expect(result.success).toBe(false);
      });

      it("should reject empty lastName", () => {
        const result = createUserSchema.safeParse({
          email: "test@example.com",
          firstName: "Test",
          lastName: "",
          role: "EMPLOYEE",
          autoGeneratePassword: true,
        });
        expect(result.success).toBe(false);
      });

      it("should reject firstName longer than 50 characters", () => {
        const result = createUserSchema.safeParse({
          email: "test@example.com",
          firstName: "a".repeat(51),
          lastName: "User",
          role: "EMPLOYEE",
          autoGeneratePassword: true,
        });
        expect(result.success).toBe(false);
      });

      it("should reject lastName longer than 50 characters", () => {
        const result = createUserSchema.safeParse({
          email: "test@example.com",
          firstName: "Test",
          lastName: "a".repeat(51),
          role: "EMPLOYEE",
          autoGeneratePassword: true,
        });
        expect(result.success).toBe(false);
      });
    });

    describe("invalid role", () => {
      it("should reject invalid role", () => {
        const result = createUserSchema.safeParse({
          email: "test@example.com",
          firstName: "Test",
          lastName: "User",
          role: "SUPERUSER",
          autoGeneratePassword: true,
        });
        expect(result.success).toBe(false);
      });
    });

    describe("password validation", () => {
      it("should reject when neither password nor autoGeneratePassword is provided", () => {
        const result = createUserSchema.safeParse({
          email: "test@example.com",
          firstName: "Test",
          lastName: "User",
          role: "EMPLOYEE",
        });
        expect(result.success).toBe(false);
      });

      it("should reject password shorter than 8 characters", () => {
        const result = createUserSchema.safeParse({
          email: "test@example.com",
          firstName: "Test",
          lastName: "User",
          role: "EMPLOYEE",
          password: "Short1",
          autoGeneratePassword: false,
        });
        expect(result.success).toBe(false);
      });

      it("should reject password without uppercase letter", () => {
        const result = createUserSchema.safeParse({
          email: "test@example.com",
          firstName: "Test",
          lastName: "User",
          role: "EMPLOYEE",
          password: "lowercase123",
          autoGeneratePassword: false,
        });
        expect(result.success).toBe(false);
      });

      it("should reject password without lowercase letter", () => {
        const result = createUserSchema.safeParse({
          email: "test@example.com",
          firstName: "Test",
          lastName: "User",
          role: "EMPLOYEE",
          password: "UPPERCASE123",
          autoGeneratePassword: false,
        });
        expect(result.success).toBe(false);
      });

      it("should reject password without number", () => {
        const result = createUserSchema.safeParse({
          email: "test@example.com",
          firstName: "Test",
          lastName: "User",
          role: "EMPLOYEE",
          password: "NoNumbersHere",
          autoGeneratePassword: false,
        });
        expect(result.success).toBe(false);
      });

      it("should reject password longer than 128 characters", () => {
        const result = createUserSchema.safeParse({
          email: "test@example.com",
          firstName: "Test",
          lastName: "User",
          role: "EMPLOYEE",
          password: "Aa1" + "x".repeat(126),
          autoGeneratePassword: false,
        });
        expect(result.success).toBe(false);
      });
    });
  });

  describe("updateUserSchema", () => {
    describe("valid inputs", () => {
      it("should accept partial update with firstName only", () => {
        const result = updateUserSchema.safeParse({
          firstName: "Updated",
        });
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.firstName).toBe("Updated");
        }
      });

      it("should accept partial update with lastName only", () => {
        const result = updateUserSchema.safeParse({
          lastName: "Name",
        });
        expect(result.success).toBe(true);
      });

      it("should accept partial update with role only", () => {
        const result = updateUserSchema.safeParse({
          role: "MANAGER",
        });
        expect(result.success).toBe(true);
      });

      it("should accept partial update with isActive only", () => {
        const result = updateUserSchema.safeParse({
          isActive: false,
        });
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.isActive).toBe(false);
        }
      });

      it("should accept empty object (no changes)", () => {
        const result = updateUserSchema.safeParse({});
        expect(result.success).toBe(true);
      });

      it("should accept full update", () => {
        const result = updateUserSchema.safeParse({
          firstName: "John",
          lastName: "Smith",
          role: "DEPARTMENT_HEAD",
          departmentId: "cm7qk0b0a0000abcddeptid01",
          managerId: "cm7qk0b0a0000abcdmgrid001",
          isActive: true,
        });
        expect(result.success).toBe(true);
      });

      it("should accept null for departmentId", () => {
        const result = updateUserSchema.safeParse({
          departmentId: null,
        });
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.departmentId).toBeNull();
        }
      });

      it("should accept null for managerId", () => {
        const result = updateUserSchema.safeParse({
          managerId: null,
        });
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.managerId).toBeNull();
        }
      });
    });

    describe("invalid inputs", () => {
      it("should reject empty firstName if provided", () => {
        const result = updateUserSchema.safeParse({
          firstName: "",
        });
        expect(result.success).toBe(false);
      });

      it("should reject empty lastName if provided", () => {
        const result = updateUserSchema.safeParse({
          lastName: "",
        });
        expect(result.success).toBe(false);
      });

      it("should reject invalid role if provided", () => {
        const result = updateUserSchema.safeParse({
          role: "INVALID",
        });
        expect(result.success).toBe(false);
      });
    });
  });

  describe("resetPasswordSchema", () => {
    describe("valid inputs", () => {
      it("should accept autoGenerate true", () => {
        const result = resetPasswordSchema.safeParse({
          autoGenerate: true,
        });
        expect(result.success).toBe(true);
      });

      it("should accept valid newPassword", () => {
        const result = resetPasswordSchema.safeParse({
          newPassword: "NewSecurePass1",
          autoGenerate: false,
        });
        expect(result.success).toBe(true);
      });
    });

    describe("invalid inputs", () => {
      it("should reject when neither newPassword nor autoGenerate is true", () => {
        const result = resetPasswordSchema.safeParse({
          autoGenerate: false,
        });
        expect(result.success).toBe(false);
      });

      it("should reject invalid password format", () => {
        const result = resetPasswordSchema.safeParse({
          newPassword: "weak",
          autoGenerate: false,
        });
        expect(result.success).toBe(false);
      });
    });
  });

  describe("listUsersQuerySchema", () => {
    describe("valid inputs", () => {
      it("should accept empty object with defaults", () => {
        const result = listUsersQuerySchema.safeParse({});
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.page).toBe(1);
          expect(result.data.limit).toBe(20);
          expect(result.data.sortBy).toBe("firstName");
          expect(result.data.sortOrder).toBe("asc");
        }
      });

      it("should accept valid page and limit", () => {
        const result = listUsersQuerySchema.safeParse({
          page: "5",
          limit: "50",
        });
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.page).toBe(5);
          expect(result.data.limit).toBe(50);
        }
      });

      it("should accept valid search string", () => {
        const result = listUsersQuerySchema.safeParse({
          search: "john",
        });
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.search).toBe("john");
        }
      });

      it("should accept valid role filter", () => {
        const result = listUsersQuerySchema.safeParse({
          role: "MANAGER",
        });
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.role).toBe("MANAGER");
        }
      });

      it("should accept valid isActive filter", () => {
        const result = listUsersQuerySchema.safeParse({
          isActive: "true",
        });
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.isActive).toBe("true");
        }
      });

      it("should accept valid sortBy options", () => {
        const sortOptions = ["firstName", "lastName", "email", "role", "createdAt"];
        for (const sortBy of sortOptions) {
          const result = listUsersQuerySchema.safeParse({ sortBy });
          expect(result.success).toBe(true);
        }
      });

      it("should accept valid sortOrder options", () => {
        const result1 = listUsersQuerySchema.safeParse({ sortOrder: "asc" });
        const result2 = listUsersQuerySchema.safeParse({ sortOrder: "desc" });
        expect(result1.success).toBe(true);
        expect(result2.success).toBe(true);
      });
    });

    describe("invalid inputs", () => {
      it("should reject page less than 1", () => {
        const result = listUsersQuerySchema.safeParse({
          page: "0",
        });
        expect(result.success).toBe(false);
      });

      it("should reject negative page", () => {
        const result = listUsersQuerySchema.safeParse({
          page: "-1",
        });
        expect(result.success).toBe(false);
      });

      it("should reject limit greater than 100", () => {
        const result = listUsersQuerySchema.safeParse({
          limit: "101",
        });
        expect(result.success).toBe(false);
      });

      it("should reject invalid role", () => {
        const result = listUsersQuerySchema.safeParse({
          role: "INVALID",
        });
        expect(result.success).toBe(false);
      });

      it("should reject invalid isActive value", () => {
        const result = listUsersQuerySchema.safeParse({
          isActive: "yes",
        });
        expect(result.success).toBe(false);
      });

      it("should reject invalid sortBy", () => {
        const result = listUsersQuerySchema.safeParse({
          sortBy: "invalid",
        });
        expect(result.success).toBe(false);
      });

      it("should reject invalid sortOrder", () => {
        const result = listUsersQuerySchema.safeParse({
          sortOrder: "random",
        });
        expect(result.success).toBe(false);
      });
    });
  });

  describe("generateRandomPassword", () => {
    it("should generate password with default length of 16", () => {
      const password = generateRandomPassword();
      expect(password.length).toBe(16);
    });

    it("should generate password with specified length", () => {
      const password = generateRandomPassword(20);
      expect(password.length).toBe(20);
    });

    it("should contain at least one uppercase letter", () => {
      const password = generateRandomPassword();
      expect(/[A-Z]/.test(password)).toBe(true);
    });

    it("should contain at least one lowercase letter", () => {
      const password = generateRandomPassword();
      expect(/[a-z]/.test(password)).toBe(true);
    });

    it("should contain at least one number", () => {
      const password = generateRandomPassword();
      expect(/[0-9]/.test(password)).toBe(true);
    });

    it("should contain at least one special character", () => {
      const password = generateRandomPassword();
      expect(/[!@#$%^&*]/.test(password)).toBe(true);
    });

    it("should generate unique passwords", () => {
      const passwords = new Set();
      for (let i = 0; i < 100; i++) {
        passwords.add(generateRandomPassword());
      }
      // All 100 passwords should be unique
      expect(passwords.size).toBe(100);
    });

    it("should pass createUserSchema password validation", () => {
      // Test multiple generated passwords
      for (let i = 0; i < 10; i++) {
        const password = generateRandomPassword();
        const result = createUserSchema.safeParse({
          email: "test@example.com",
          firstName: "Test",
          lastName: "User",
          role: "EMPLOYEE",
          password,
          autoGeneratePassword: false,
        });
        expect(result.success).toBe(true);
      }
    });
  });
});
