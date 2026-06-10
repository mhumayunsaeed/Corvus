"use client";

import { AuthShell, LoginForm } from "@/components/auth";

export default function Login() {
  return (
    <AuthShell tagline="Sign in to continue.">
      <LoginForm />
    </AuthShell>
  );
}
