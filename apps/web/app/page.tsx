"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Navbar,
  Hero,
  FeaturePills,
  UIShowcase,
  FeatureCallouts,
  Pricing,
  Footer,
} from "@/components/landing";

export default function LandingPage() {
  const router = useRouter();

  // Redirect to login if running inside Tauri desktop shell
  useEffect(() => {
    if (
      typeof window !== "undefined" &&
      "__TAURI__" in window &&
      window.__TAURI__ !== undefined
    ) {
      router.replace("/login");
    }
  }, [router]);
  return (
    <>
      <Navbar />
      <div
        id="landing-scroll"
        className="h-full overflow-y-auto overflow-x-hidden scroll-smooth"
      >
        <Hero />
        <FeaturePills />
        <UIShowcase />
        <FeatureCallouts />
        <Pricing />
        <Footer />
      </div>
    </>
  );
}
