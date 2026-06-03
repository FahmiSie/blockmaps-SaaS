"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { prisma } from "@/server/db";
import { auth } from "@/server/auth";
import { sendVerificationEmail } from "./verify-token.email";
import { sendInvitationEmail } from "./invite.email";

// ── HELPERS ────────────────────────────────────────────────

type ActionResult<T = void> =
  | { success: true; data: T }
  | { success: false; error: string };

async function getAuthenticatedUser() {
  const session = await auth();
  if (!session?.user?.id) return null;
  return prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, role: true, companyId: true,name: true, email: true },
  });
}

// ── SCHEMAS ────────────────────────────────────────────────

const RegisterSchema = z.object({
  name: z.string().min(2).max(100),
  email: z.string().email(),
  password: z.string().min(8).max(100),
});

const UpdateProfileSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  image: z.string().url().optional(),
});

const UpdateRoleSchema = z.object({
  userId: z.string().cuid(),
  role: z.enum(["ADMIN", "MANAGER", "OPERATOR"]),
});

const InviteUserSchema = z.object({
  email: z.string().email(),
  role: z.enum(["MANAGER", "OPERATOR"]),
});

// ── REGISTER ──────────────────────────────────────────────

export async function registerAction(
  formData: z.infer<typeof RegisterSchema>,
): Promise<ActionResult<{ id: string }>> {
  const parsed = RegisterSchema.safeParse(formData);
  if (!parsed.success) {
    return { success: false, error: parsed.error.flatten().formErrors.join(", ") };
  }

  const { name, email, password } = parsed.data;

  try {
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      if (existing.password) {
        return { success: false, error: "Email already registered." };
      }
      
      const hashed = await bcrypt.hash(password, 12);
      const verifyToken = crypto.randomBytes(32).toString("hex");
      const verifyTokenExp = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

      const user = await prisma.user.update({
        where: { id: existing.id },
        data: { name, password: hashed, verifyToken, verifyTokenExp },
        select: { id: true },
      });
      await sendVerificationEmail(email, name, verifyToken).catch(console.error);

      console.log(`\n\n[DEV ONLY] Verify Email Link: http://localhost:3000/verify-email?token=${verifyToken}\n\n`);
      return { success: true, data: user };
    }

    const hashed = await bcrypt.hash(password, 12);
    const verifyToken = crypto.randomBytes(32).toString("hex");
    const verifyTokenExp = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    const user = await prisma.user.create({
      data: { name, email, password: hashed, verifyToken, verifyTokenExp },
      select: { id: true },
    });

    // Simulate sending email
    await sendVerificationEmail(email, name, verifyToken);
    return { success: true, data: user };
  } catch (err) {
    console.error("[registerAction]", err);
    return { success: false, error: "Registration failed. Please try again." };
  }
}

// ── RESEND VERIFICATION EMAIL ─────────────────────────────

export async function resendVerificationEmailAction(
  email: string
): Promise<ActionResult> {
  try {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return { success: false, error: "User not found." };
    }
    if (user.emailVerified) {
      return { success: false, error: "Email is already verified." };
    }

    const verifyToken = crypto.randomBytes(32).toString("hex");
    const verifyTokenExp = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    await prisma.user.update({
      where: { id: user.id },
      data: { verifyToken, verifyTokenExp },
    });

    console.log(`\n\n[DEV ONLY] Resend Verify Email Link: http://localhost:3000/verify-email?token=${verifyToken}\n\n`);
    await sendVerificationEmail(email, user.name || "User", verifyToken);
    
    return { success: true, data: undefined };
  } catch (err) {
    console.error("[resendVerificationEmailAction]", err);
    return { success: false, error: "Failed to resend verification email." };
  }
}

// ── UPDATE PROFILE ─────────────────────────────────────────

export async function updateProfileAction(
  formData: z.infer<typeof UpdateProfileSchema>,
): Promise<ActionResult<{ id: string; name: string | null }>> {
  const session = await auth();
  if (!session?.user?.id) return { success: false, error: "Unauthorized." };

  const parsed = UpdateProfileSchema.safeParse(formData);
  if (!parsed.success) {
    return { success: false, error: "Invalid form data." };
  }

  try {
    const user = await prisma.user.update({
      where: { id: session.user.id },
      data: parsed.data,
      select: { id: true, name: true },
    });
    revalidatePath("/profile");
    return { success: true, data: user };
  } catch (err) {
    console.error("[updateProfileAction]", err);
    return { success: false, error: "Failed to update profile." };
  }
}

// ── UPDATE ROLE ────────────────────────────────────────────

export async function updateUserRoleAction(
  formData: z.infer<typeof UpdateRoleSchema>,
): Promise<ActionResult<{ id: string; role: string }>> {
  const actor = await getAuthenticatedUser();
  if (!actor) return { success: false, error: "Unauthorized." };
  if (actor.role !== "ADMIN") return { success: false, error: "Only admins can change roles." };

  const parsed = UpdateRoleSchema.safeParse(formData);
  if (!parsed.success) return { success: false, error: "Invalid data." };

  if (parsed.data.userId === actor.id) {
    return { success: false, error: "You cannot change your own role." };
  }

  try {
    const target = await prisma.user.findFirst({
      where: { id: parsed.data.userId, companyId: actor.companyId },
    });
    if (!target) return { success: false, error: "User not found in your company." };

    const user = await prisma.user.update({
      where: { id: parsed.data.userId },
      data: { role: parsed.data.role },
      select: { id: true, role: true },
    });

    revalidatePath("/admin/users");
    return { success: true, data: { id: user.id, role: user.role } };
  } catch (err) {
    console.error("[updateUserRoleAction]", err);
    return { success: false, error: "Failed to update role." };
  }
}

// ── INVITE USER ────────────────────────────────────────────

export async function inviteUserAction(
  formData: z.infer<typeof InviteUserSchema>,
): Promise<ActionResult<{ id: string; name: string | null }>> {
  const actor = await getAuthenticatedUser();
  if (!actor) return { success: false, error: "Unauthorized." };
  if (actor.role !== "ADMIN") return { success: false, error: "Only admins can invite users." };
  if (!actor.companyId) return { success: false, error: "No company assigned." };

  const parsed = InviteUserSchema.safeParse(formData);
  if (!parsed.success) return { success: false, error: "Invalid data." };

  try {
    const target = await prisma.user.findUnique({ where: { email: parsed.data.email } });
    if (!target) {
      const user = await prisma.user.create({
        data: {
          email: parsed.data.email,
          companyId: actor.companyId,
          role: parsed.data.role,
        },
        select: { id: true, name: true },
      });
      await sendInvitationEmail(parsed.data.email, parsed.data.role, actor.name ?? actor.email ?? "Admin").catch(console.error);
      revalidatePath("/admin/users");
      return { success: true, data: user };
    }
    if (target.companyId) return { success: false, error: "User already belongs to a company." };

    const user = await prisma.user.update({
      where: { id: target.id },
      data: { companyId: actor.companyId, role: parsed.data.role },
      select: { id: true, name: true },
    });
    await sendInvitationEmail(parsed.data.email, parsed.data.role, actor.name ?? actor.email ?? "Admin").catch(console.error);
    revalidatePath("/admin/users");
    return { success: true, data: user };
  } catch (err) {
    console.error("[inviteUserAction]", err);
    return { success: false, error: "Failed to invite user." };
  }
}

// ── REMOVE USER FROM COMPANY ───────────────────────────────

export async function removeUserFromCompanyAction(
  userId: string,
): Promise<ActionResult> {
  const actor = await getAuthenticatedUser();
  if (!actor) return { success: false, error: "Unauthorized." };
  if (actor.role !== "ADMIN") return { success: false, error: "Only admins can remove users." };
  if (actor.id === userId) return { success: false, error: "Cannot remove yourself." };

  try {
    const target = await prisma.user.findFirst({
      where: { id: userId, companyId: actor.companyId },
    });
    if (!target) return { success: false, error: "User not found in your company." };

    await prisma.user.update({
      where: { id: userId },
      data: { companyId: null },
    });

    revalidatePath("/admin/users");
    return { success: true, data: undefined };
  } catch (err) {
    console.error("[removeUserFromCompanyAction]", err);
    return { success: false, error: "Failed to remove user." };
  }
}

// ── EMAIL VERIFICATION ─────────────────────────────────────

export async function verifyEmailAction(token: string): Promise<ActionResult> {
  if (!token) return { success: false, error: "No verification token provided." };

  try {
    const user = await prisma.user.findUnique({ where: { verifyToken: token } });
    
    if (!user) {
      return { success: false, error: "Invalid verification link." };
    }
    if (user.emailVerified) {
      return { success: false, error: "Email is already verified." };
    }
    if (user.verifyTokenExp && user.verifyTokenExp < new Date()) {
      return { success: false, error: "Verification link has expired." };
    }

    await prisma.user.update({
      where: { id: user.id },
      data: { 
        emailVerified: new Date(),
        verifyToken: null,
        verifyTokenExp: null,
      },
    });

    return { success: true, data: undefined };
  } catch (err) {
    console.error("[verifyEmailAction]", err);
    return { success: false, error: "Failed to verify email." };
  }
}

export async function resendVerificationAction(email: string): Promise<ActionResult> {
  if (!email) return { success: false, error: "Email is required." };

  try {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) return { success: false, error: "Account not found." };
    if (user.emailVerified) return { success: false, error: "Email already verified." };

    const verifyToken = crypto.randomBytes(32).toString("hex");
    const verifyTokenExp = new Date(Date.now() + 24 * 60 * 60 * 1000);

    await prisma.user.update({
      where: { id: user.id },
      data: { verifyToken, verifyTokenExp },
    });

    console.log(`\n\n[DEV ONLY] New Verify Email Link: http://localhost:3000/verify-email?token=${verifyToken}\n\n`);

    return { success: true, data: undefined };
  } catch (err) {
    console.error("[resendVerificationAction]", err);
    return { success: false, error: "Failed to resend verification email." };
  }
}