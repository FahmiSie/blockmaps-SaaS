"use client";

import Link from "next/link";
import { signIn } from "next-auth/react";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { User, Mail, Lock, Eye, EyeOff, ArrowRight } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { registerAction } from "@/server/actions/users.action";

const registerSchema = z
  .object({
    name: z.string().min(1, "Full name is required"),
    email: z.string().email("Invalid email address"),
    password: z.string().min(8, "Password must be at least 8 characters long"),
    confirmPassword: z.string().min(1, "Password confirmation is required"),
    agreeTerms: z.boolean().refine((val) => val === true, {
      message: "You must agree to the Terms and Conditions",
    }),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "The password does not match",
    path: ["confirmPassword"],
  });

type RegisterSchema = z.infer<typeof registerSchema>;

export default function RegisterPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [serverError, setServerError] = useState("");
  const [success, setSuccess] = useState(false);

  const form = useForm<RegisterSchema>({
    defaultValues: {
      name: "",
      email: "",
      password: "",
      confirmPassword: "",
      agreeTerms: false,
    },
    resolver: zodResolver(registerSchema),
  });

  const onSubmit = form.handleSubmit(async (data: RegisterSchema) => {
    setLoading(true);
    setServerError("");

    try {
      const result = await registerAction({
        name: data.name,
        email: data.email,
        password: data.password,
      });

      if (!result.success) {
        setServerError(result.error);
        setLoading(false);
        return;
      }

      setSuccess(true);
      setLoading(false);
    } catch (error) {
      setLoading(false);
      setServerError((error as Error).message);
    }
  });

  if (success) {
    return (
      <main className="flex min-h-screen items-center justify-center p-6">
        <div className="w-full max-w-md rounded-xl border bg-white p-8 text-center shadow-sm">
          <h2 className="mb-2 text-xl font-semibold text-neutral-900">
            Registration Successful!
          </h2>
          <p className="mb-6 text-sm text-neutral-500">
            Your account has been created. You can now sign in.
          </p>
          <Link
            href="/signin"
            className="inline-flex items-center gap-2 rounded-full bg-black px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-neutral-800"
          >
            Go to Sign In <ArrowRight size={16} />
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen items-center justify-center p-6">
      <div className="w-full max-w-[440px] rounded-xl border bg-white p-8 shadow-sm">
        {/* Header */}
        <div className="mb-8 flex flex-col gap-1.5">
          <h1 className="text-2xl font-semibold text-neutral-900">
            Create your account
          </h1>
          <p className="text-sm text-neutral-500">
            Already have an account?{" "}
            <Link
              href="/signin"
              className="font-semibold text-blue-600 transition-colors hover:text-blue-500"
            >
              Login
            </Link>
          </p>
        </div>

        {/* Google Button */}
        <button
          type="button"
          onClick={() => signIn("google", { callbackUrl: "/" })}
          className="mb-5 flex w-full cursor-pointer items-center justify-center gap-2.5 rounded-xl border border-neutral-200 bg-white px-4 py-3 text-sm font-medium text-neutral-700 transition-colors hover:bg-neutral-50"
        >
          Register with Google
        </button>

        <div className="mb-5 flex items-center gap-3 text-xs text-neutral-400">
          <span className="h-px flex-1 bg-neutral-200" />
          Or use email
          <span className="h-px flex-1 bg-neutral-200" />
        </div>

        {serverError && (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
            {serverError}
          </div>
        )}

        <Form {...form}>
          <form onSubmit={onSubmit} className="flex flex-col gap-4">
            <FormField
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Full Name</FormLabel>
                  <FormControl>
                    <div className="relative flex items-center">
                      <User size={16} className="pointer-events-none absolute left-3.5 text-neutral-400" />
                      <Input type="text" placeholder="Enter your full name" className="pl-10" {...field} />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <div className="relative flex items-center">
                      <Mail size={16} className="pointer-events-none absolute left-3.5 text-neutral-400" />
                      <Input type="email" placeholder="Enter your email address" className="pl-10" {...field} />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Password</FormLabel>
                  <FormControl>
                    <div className="relative flex items-center">
                      <Lock size={16} className="pointer-events-none absolute left-3.5 text-neutral-400" />
                      <Input type={showPassword ? "text" : "password"} placeholder="Enter your password" className="px-10" {...field} />
                      <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3.5 cursor-pointer text-neutral-400 hover:text-neutral-600" tabIndex={-1}>
                        {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              name="confirmPassword"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Confirm Password</FormLabel>
                  <FormControl>
                    <div className="relative flex items-center">
                      <Lock size={16} className="pointer-events-none absolute left-3.5 text-neutral-400" />
                      <Input type={showConfirmPassword ? "text" : "password"} placeholder="Confirm your password" className="px-10" {...field} />
                      <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} className="absolute right-3.5 cursor-pointer text-neutral-400 hover:text-neutral-600" tabIndex={-1}>
                        {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              name="agreeTerms"
              render={({ field }) => (
                <FormItem>
                  <div className="flex items-start gap-2.5">
                    <FormControl>
                      <input
                        id="terms"
                        type="checkbox"
                        checked={field.value}
                        onChange={field.onChange}
                        className="mt-0.5 h-4 w-4 shrink-0 cursor-pointer"
                      />
                    </FormControl>
                    <FormLabel htmlFor="terms" className="cursor-pointer text-sm font-normal leading-relaxed text-neutral-500">
                      I agree to the{" "}
                      <Link href="/terms" className="font-semibold text-blue-600 hover:text-blue-500">
                        Terms and Conditions
                      </Link>
                    </FormLabel>
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button type="submit" disabled={loading} className="mt-1 h-12 w-full rounded-full text-sm font-semibold">
              {loading ? "Processing..." : "Register"}
              {!loading && <ArrowRight size={16} />}
            </Button>
          </form>
        </Form>
      </div>
    </main>
  );
}