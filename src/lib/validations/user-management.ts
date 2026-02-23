import { z } from "zod";

export const roleEnum = z.enum(["EMPLOYEE", "MANAGER", "DEPARTMENT_HEAD", "ADMIN"]);

// Password validation - at least 8 chars, one uppercase, one lowercase, one number
const passwordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .max(128, "Password must be less than 128 characters")
  .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
  .regex(/[a-z]/, "Password must contain at least one lowercase letter")
  .regex(/[0-9]/, "Password must contain at least one number");

// Email validation
const emailSchema = z
  .string()
  .email("Invalid email address")
  .max(255, "Email must be less than 255 characters")
  .toLowerCase();

// For creating a new user
export const createUserSchema = z.object({
  email: emailSchema,
  firstName: z
    .string()
    .min(1, "First name is required")
    .max(50, "First name must be less than 50 characters")
    .trim(),
  lastName: z
    .string()
    .min(1, "Last name is required")
    .max(50, "Last name must be less than 50 characters")
    .trim(),
  role: roleEnum,
  departmentId: z.string().cuid().optional().nullable(),
  managerId: z.string().cuid().optional().nullable(),
  password: passwordSchema.optional(),
  autoGeneratePassword: z.boolean().default(false),
}).refine(
  (data) => data.password || data.autoGeneratePassword,
  {
    message: "Either provide a password or enable auto-generate",
    path: ["password"],
  }
);

// For updating an existing user
export const updateUserSchema = z.object({
  firstName: z
    .string()
    .min(1, "First name is required")
    .max(50, "First name must be less than 50 characters")
    .trim()
    .optional(),
  lastName: z
    .string()
    .min(1, "Last name is required")
    .max(50, "Last name must be less than 50 characters")
    .trim()
    .optional(),
  role: roleEnum.optional(),
  departmentId: z.string().cuid().optional().nullable(),
  managerId: z.string().cuid().optional().nullable(),
  isActive: z.boolean().optional(),
});

// For resetting a user's password
export const resetPasswordSchema = z.object({
  newPassword: passwordSchema.optional(),
  autoGenerate: z.boolean().default(false),
}).refine(
  (data) => data.newPassword || data.autoGenerate,
  {
    message: "Either provide a new password or enable auto-generate",
    path: ["newPassword"],
  }
);

// Query params for listing users
export const listUsersQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  search: z.string().optional(),
  role: roleEnum.optional(),
  departmentId: z.string().cuid().optional(),
  isActive: z.enum(["true", "false"]).optional(),
  sortBy: z.enum(["firstName", "lastName", "email", "role", "createdAt"]).default("firstName"),
  sortOrder: z.enum(["asc", "desc"]).default("asc"),
});

export type CreateUserInput = z.infer<typeof createUserSchema>;
export type UpdateUserInput = z.infer<typeof updateUserSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
export type ListUsersQuery = z.infer<typeof listUsersQuerySchema>;

// Helper function to generate a random password
export function generateRandomPassword(length = 16): string {
  const uppercase = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  const lowercase = "abcdefghijklmnopqrstuvwxyz";
  const numbers = "0123456789";
  const special = "!@#$%^&*";
  const allChars = uppercase + lowercase + numbers + special;

  // Ensure at least one of each required type
  let password = "";
  password += uppercase[Math.floor(Math.random() * uppercase.length)];
  password += lowercase[Math.floor(Math.random() * lowercase.length)];
  password += numbers[Math.floor(Math.random() * numbers.length)];
  password += special[Math.floor(Math.random() * special.length)];

  // Fill the rest randomly
  for (let i = password.length; i < length; i++) {
    password += allChars[Math.floor(Math.random() * allChars.length)];
  }

  // Shuffle the password
  return password
    .split("")
    .sort(() => Math.random() - 0.5)
    .join("");
}
