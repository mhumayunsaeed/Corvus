"use client";

import { AuthShell, LoginForm } from "@/features/auth";

export default function Login() {
  return (
    <AuthShell tagline="Sign in to continue.">
      <LoginForm />
    </AuthShell>
  );
}
