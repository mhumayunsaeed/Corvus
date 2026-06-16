"use client";

import { AuthShell, SignupForm } from "@/features/auth";

export default function Register() {
  return (
    <AuthShell tagline="Create your account.">
      <SignupForm />
    </AuthShell>
  );
}
