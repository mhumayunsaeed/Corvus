"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import {
    Nav,
    Hero,
    Waitlist,
    StatsBar,
    ProductStories,
    ProductExplorer,
    DeveloperSection,
    SelfHostSection,
    FinalCTA,
    Footer,
} from "@/features/landing";

export default function LandingPage() {
    const router = useRouter();

    // Redirect to login if running inside the Tauri desktop shell.
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
        <div id="landing-scroll" className="h-full overflow-y-auto overflow-x-hidden bg-background">
            <Nav />
            <main>
                <Hero />
                <StatsBar />
                <ProductStories />
                <ProductExplorer />
                <SelfHostSection />
                <DeveloperSection />
                <Waitlist />
                <FinalCTA />
            </main>
            <Footer />
        </div>
    );
}
