import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "./prisma";

export const authOptions: NextAuthOptions = {
  session: {
    strategy: "jwt",
    maxAge: 8 * 60 * 60, // 8 hours (workday session)
  },
  pages: {
    signIn: "/login",
    error: "/login",
  },
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error("Email and password are required");
        }

        const user = await prisma.user.findUnique({
          where: {
            email: credentials.email,
            isActive: true,
            deletedAt: null,
          },
        });

        if (!user) {
          throw new Error("Invalid email or password");
        }

        const isValidPassword = await bcrypt.compare(
          credentials.password,
          user.passwordHash
        );

        if (!isValidPassword) {
          throw new Error("Invalid email or password");
        }

        // Update last login timestamp
        await prisma.user.update({
          where: { id: user.id },
          data: { lastLoginAt: new Date() },
        });

        return {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role,
          managerId: user.managerId,
          departmentId: user.departmentId,
          mustChangePassword: user.mustChangePassword,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user, trigger }) {
      if (user) {
        token.id = user.id;
        token.email = user.email;
        token.firstName = user.firstName;
        token.lastName = user.lastName;
        token.role = user.role;
        token.managerId = user.managerId;
        token.departmentId = user.departmentId;
        token.mustChangePassword = user.mustChangePassword;
      }

      // Refresh user data from DB when session update is triggered
      if (trigger === "update" && token.id) {
        try {
          const freshUser = await prisma.user.findUnique({
            where: { id: token.id as string },
            select: {
              firstName: true,
              lastName: true,
              role: true,
              managerId: true,
              departmentId: true,
              mustChangePassword: true,
            },
          });
          if (freshUser) {
            token.firstName = freshUser.firstName;
            token.lastName = freshUser.lastName;
            token.role = freshUser.role;
            token.managerId = freshUser.managerId;
            token.departmentId = freshUser.departmentId;
            token.mustChangePassword = freshUser.mustChangePassword;
          }
        } catch (error) {
          // Log error but don't break authentication - return token unchanged
          console.error(
            `[auth] Failed to refresh user data for token.id=${token.id}:`,
            error instanceof Error ? error.message : error
          );
        }
      }

      return token;
    },
    async session({ session, token }) {
      if (token) {
        session.user.id = token.id;
        session.user.email = token.email as string;
        session.user.firstName = token.firstName;
        session.user.lastName = token.lastName;
        session.user.role = token.role;
        session.user.managerId = token.managerId;
        session.user.departmentId = token.departmentId;
        session.user.mustChangePassword = token.mustChangePassword;
      }
      return session;
    },
  },
};
