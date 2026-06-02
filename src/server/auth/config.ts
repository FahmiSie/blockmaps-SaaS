import { PrismaAdapter } from "@auth/prisma-adapter";
import { type AuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import bcrypt from "bcryptjs";
import { prisma } from "@/server/db";
import { env } from "@/env";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: string;
      companyId: string | null;
      name?: string | null;
      email?: string | null;
      image?: string | null;

    };
  }

  interface User {
    role?: string;
    companyId?: string | null;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string;
    role?: string;
    companyId?: string | null;
  }
}

export const authConfig: AuthOptions = {
  providers: [
    GoogleProvider({
      clientId: env.GOOGLE_CLIENT_ID,
      clientSecret: env.GOOGLE_CLIENT_SECRET,
      allowDangerousEmailAccountLinking: true,
    }),
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        console.log("LOGIN_ATTEMPT:", credentials);

        if (!credentials?.email || !credentials?.password) {
          console.log("LOGIN_ERROR: Missing credentials");
          return null;
        }

        const user = await prisma.user.findUnique({
          where: { email: credentials.email },
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
            password: true,
            role: true,
            companyId: true,
            emailVerified: true,
          },
        });

        if (!user) {
          console.log("LOGIN_ERROR: User tidak ditemukan:", credentials.email);
          return null;
        }

        if (!user.password) {
          console.log("LOGIN_ERROR: User tidak punya password (OAuth user?)");
          return null;
        }

        const isValid = await bcrypt.compare(
          credentials.password,
          user.password,
        );

        if (!isValid) {
          console.log("LOGIN_ERROR: Password salah untuk:", credentials.email);
          return null;
        }

        // EMAIL VERIFICATION DINONAKTIFKAN
        // TODO: aktifkan kembali setelah flow verifikasi email siap
        if (!user.emailVerified) {
          console.log("LOGIN_ERROR: Email belum diverifikasi:", credentials.email);
          throw new Error("EMAIL_NOT_VERIFIED");
        }

        console.log("LOGIN_SUCCESS:", user.email);

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          image: user.image,
          role: user.role,
          companyId: user.companyId,
          emailVerified: user.emailVerified,
        };
      },
    }),
  ],

  adapter: PrismaAdapter(prisma),

  session: {
    strategy: "jwt",
    maxAge: 60 * 60 * 24 * 365 * 100,
  },

  jwt: {
    maxAge: 60 * 60 * 24 * 365 * 100,
  },

  callbacks: {
    async jwt({ token, user, trigger, session }) {
      // On initial sign-in, populate token from the user object
      if (user) {
        token.id = user.id;
        token.role = user.role;
        token.companyId = user.companyId;
      }

      // Allow client-side session.update() calls to patch the token as well
      // (used when creating/joining a company via onboarding)
      if (trigger === "update" && session) {
        if (session.companyId !== undefined) token.companyId = session.companyId;
        if (session.role !== undefined) token.role = session.role;
      }

      return token;
    },

    async session({ session, token }) {
      if (session.user && token) {
        session.user.id = token.id!;
        session.user.role = token.role ?? "OPERATOR";
        session.user.companyId = token.companyId ?? null;
      }
      return session;
    },
  },

  pages: {
    signIn: "/signin",
    error: "/signin",
  },

  secret: env.AUTH_SECRET,
  debug: env.NODE_ENV === "development",
};