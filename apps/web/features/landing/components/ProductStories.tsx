import { ArrowDownRight, Check, GitPullRequest, MessageSquare, PanelsTopLeft } from "lucide-react";
import { ProductFrame } from "./ProductFrame";

const pointsA = [
    "Spaces and channels",
    "Threads and reactions",
    "Search and attachments",
    "Direct messages and presence",
];

export function ProductStories() {
    return (
        <section id="product" className="overflow-hidden py-24 sm:py-32">
            <div className="mx-auto max-w-[1280px] px-5 sm:px-8">
                <div className="max-w-2xl">
                    <p className="text-sm font-medium text-accent">
                        Communication stays at the centre
                    </p>
                    <h2 className="mt-4 text-[clamp(32px,5vw,52px)] font-semibold leading-[1.08] tracking-[-0.04em]">
                        A calmer place for the work that begins in conversation.
                    </h2>
                    <p className="mt-5 max-w-[65ch] text-base leading-7 text-text-secondary">
                        Corvus keeps channels, direct messages and calls understandable, then gives
                        the surrounding work a clear place to live.
                    </p>
                </div>

                <article className="mt-24 grid items-center gap-12 lg:grid-cols-[0.72fr_1.28fr]">
                    <div>
                        <span className="grid h-10 w-10 place-items-center rounded-lg bg-accent-soft text-accent">
                            <MessageSquare size={18} />
                        </span>
                        <h3 className="mt-6 text-3xl font-semibold tracking-[-0.035em]">
                            Conversations that stay organised
                        </h3>
                        <p className="mt-4 max-w-[52ch] text-[15px] leading-7 text-text-secondary">
                            Gather technical teams and private communities into spaces. Keep topics
                            in channels, move details into threads, and find the context again when
                            you need it.
                        </p>
                        <ul className="mt-6 grid grid-cols-2 gap-x-5 gap-y-3">
                            {pointsA.map((point) => (
                                <li
                                    key={point}
                                    className="flex items-center gap-2 text-[12px] text-text-secondary"
                                >
                                    <Check size={13} className="text-live" />
                                    {point}
                                </li>
                            ))}
                        </ul>
                    </div>
                    <ProductFrame className="lg:translate-x-10" />
                </article>
            </div>

            <article className="mt-28 bg-surface/50 py-20 sm:py-24">
                <div className="mx-auto max-w-[1280px] px-5 sm:px-8">
                    <div className="flex flex-col justify-between gap-6 lg:flex-row lg:items-end">
                        <div className="max-w-xl">
                            <span className="grid h-10 w-10 place-items-center rounded-lg bg-live-soft text-live">
                                <PanelsTopLeft size={18} />
                            </span>
                            <h3 className="mt-6 text-3xl font-semibold tracking-[-0.035em]">
                                Move from conversation to action
                            </h3>
                            <p className="mt-4 text-[15px] leading-7 text-text-secondary">
                                Boards, docs and GitHub activity are connected work surfaces—not a
                                second product competing for attention.
                            </p>
                        </div>
                        <p className="max-w-sm text-[13px] leading-6 text-text-muted">
                            A decision in a channel can become a board card, reference a runbook or
                            pull request, and return updates to the conversation where it started.
                        </p>
                    </div>
                    <div className="mt-12 grid gap-3 md:grid-cols-[1fr_auto_1fr_auto_1fr] md:items-stretch">
                        {[
                            [MessageSquare, "Discuss", "Reconnect state needs a clear fallback"],
                            [PanelsTopLeft, "Track", "Card added to Desktop release board"],
                            [GitPullRequest, "Ship", "Pull request #184 linked back to channel"],
                        ].map(([Icon, title, body], i) => (
                            <div key={String(title)} className="contents">
                                <div className="rounded-xl bg-background p-5 shadow-e1">
                                    <Icon
                                        size={17}
                                        className={i === 2 ? "text-live" : "text-accent"}
                                    />
                                    <p className="mt-8 text-[11px] font-semibold">
                                        {i + 1}. {String(title)}
                                    </p>
                                    <p className="mt-2 text-[12px] leading-5 text-text-secondary">
                                        {String(body)}
                                    </p>
                                </div>
                                {i < 2 && (
                                    <ArrowDownRight
                                        className="mx-auto self-center text-text-faint md:-rotate-45"
                                        size={18}
                                    />
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            </article>

            <div className="mx-auto mt-28 grid max-w-[1280px] items-center gap-12 px-5 sm:px-8 lg:grid-cols-[1.15fr_0.85fr]">
                <ProductFrame mode="voice" />
                <div>
                    <p className="text-sm font-medium text-live">Voice with channel context</p>
                    <h3 className="mt-4 text-3xl font-semibold tracking-[-0.035em]">
                        Talk without scheduling another meeting
                    </h3>
                    <p className="mt-4 max-w-[52ch] text-[15px] leading-7 text-text-secondary">
                        Join a voice room from the space you are already working in. See who is
                        present, who is speaking and keep the surrounding channel close at hand.
                    </p>
                    <p className="mt-6 border-l-2 border-live/50 pl-4 text-[12px] leading-5 text-text-muted">
                        Voice and video are powered by LiveKit. Call controls and speaking state
                        stay consistent with the rest of the workspace.
                    </p>
                </div>
            </div>
        </section>
    );
}
