"use client";

import { useId, useRef, useState, type KeyboardEvent } from "react";
import { ProductFrame, type ProductMode } from "./ProductFrame";

const tabs: { id: ProductMode; label: string }[] = [
    { id: "messages", label: "Messages" },
    { id: "voice", label: "Voice" },
    { id: "boards", label: "Boards" },
    { id: "docs", label: "Docs" },
    { id: "github", label: "GitHub" },
    { id: "incidents", label: "Incidents" },
];

export function ProductExplorer() {
    const [active, setActive] = useState<ProductMode>("messages");
    const refs = useRef<Array<HTMLButtonElement | null>>([]);
    const baseId = useId();

    function onKeyDown(event: KeyboardEvent, index: number) {
        if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
        event.preventDefault();
        let next = index;
        if (event.key === "ArrowRight") next = (index + 1) % tabs.length;
        if (event.key === "ArrowLeft") next = (index - 1 + tabs.length) % tabs.length;
        if (event.key === "Home") next = 0;
        if (event.key === "End") next = tabs.length - 1;
        setActive(tabs[next]!.id);
        refs.current[next]?.focus();
    }

    return (
        <section id="explorer" className="px-5 py-24 sm:px-8 sm:py-32">
            <div className="mx-auto max-w-[1120px]">
                <div className="mx-auto max-w-2xl text-center">
                    <p className="text-sm font-medium text-accent">Explore the workspace</p>
                    <h2 className="mt-4 text-[clamp(30px,4vw,46px)] font-semibold tracking-[-0.04em]">
                        One frame. The context your team needs.
                    </h2>
                    <p className="mt-4 text-[15px] leading-7 text-text-secondary">
                        Move between conversation and connected work without learning a different
                        visual language each time.
                    </p>
                </div>
                <div
                    role="tablist"
                    aria-label="Product surfaces"
                    className="scrollbar-none mx-auto mt-10 flex max-w-max snap-x overflow-x-auto rounded-lg bg-surface-raised p-1 shadow-e1"
                >
                    {tabs.map((tab, index) => (
                        <button
                            key={tab.id}
                            ref={(node) => {
                                refs.current[index] = node;
                            }}
                            id={`${baseId}-${tab.id}-tab`}
                            role="tab"
                            aria-selected={active === tab.id}
                            aria-controls={`${baseId}-panel`}
                            tabIndex={active === tab.id ? 0 : -1}
                            onClick={() => setActive(tab.id)}
                            onKeyDown={(event) => onKeyDown(event, index)}
                            className={`snap-start whitespace-nowrap rounded-md px-4 py-2 text-[12px] font-medium transition-colors ${active === tab.id ? "bg-background text-text-primary shadow-e1" : "text-text-muted hover:text-text-primary"}`}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>
                <div
                    id={`${baseId}-panel`}
                    role="tabpanel"
                    aria-labelledby={`${baseId}-${active}-tab`}
                    className="mt-7 animate-fade-in"
                >
                    <ProductFrame mode={active} />
                </div>
            </div>
        </section>
    );
}
