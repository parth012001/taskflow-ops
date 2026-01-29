import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import {
  resetPasswordSchema,
  generateRandomPassword,
} from "@/lib/validations/user-management";

// POST /api/admin/users/[id]/reset-password - Reset a user's password
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (session.user.role !== "ADMIN") {
      return NextResponse.json(
        { error: "Forbidden: Admin access required" },
        { status: 403 }
      );
    }

    const { id } = await params;
    const body = await request.json();

    const validationResult = resetPasswordSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        { error: "Validation failed", details: validationResult.error.flatten() },
        { status: 400 }
      );
    }

    const { newPassword, autoGenerate } = validationResult.data;

    // Find the user
    const existingUser = await prisma.user.findUnique({
      where: { id, deletedAt: null },
      select: { id: true, email: true, firstName: true, lastName: true },
    });

    if (!existingUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Generate or use provided password
    const finalPassword = autoGenerate ? generateRandomPassword() : newPassword!;
    const passwordHash = await bcrypt.hash(finalPassword, 12);

    // Update password and set mustChangePassword flag
    await prisma.user.update({
      where: { id },
      data: {
        passwordHash,
        mustChangePassword: true,
        passwordChangedAt: null,
      },
    });

    return NextResponse.json({
      message: `Password reset successfully for ${existingUser.firstName} ${existingUser.lastName}`,
      ...(autoGenerate && { temporaryPassword: finalPassword }),
    });
  } catch (error) {
    console.error("POST /api/admin/users/[id]/reset-password error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
