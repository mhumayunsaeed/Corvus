import { notFound } from "next/navigation";
import { MarketingPage, type MarketingPageContent } from "@/components/landing/MarketingPage";

const PAGES: Record<string, MarketingPageContent> = {
  terms: {
    eyebrow: "Legal · Terms",
    title: "Terms of Service.",
    lede: "The agreement between you and Corvus when you use the hosted service or run your own instance.",
    updated: "Last updated June 10, 2026",
    blocks: [
      { kind: "h2", text: "1. The service" },
      {
        kind: "p",
        text:
          "Corvus provides a team workspace — messaging, voice and video, project boards, documents, and integrations — as a hosted service at corvus.app and as software you can deploy on your own infrastructure. These terms cover both, except where a section says otherwise.",
      },
      { kind: "h2", text: "2. Your account" },
      {
        kind: "ul",
        items: [
          "You must provide accurate information and keep your credentials secure.",
          "You are responsible for activity under your account, including API keys you create.",
          "Accounts may not be shared, sold, or transferred without our written consent.",
        ],
      },
      { kind: "h2", text: "3. Acceptable use" },
      {
        kind: "p",
        text:
          "Don't use Corvus to break the law, to harass people, to distribute malware, or to disrupt the service or other users. We may suspend accounts that do. On self-hosted instances, the instance owner sets and enforces their own acceptable-use rules.",
      },
      { kind: "h2", text: "4. Your content" },
      {
        kind: "p",
        text:
          "You own what you post. You grant us only the rights needed to store, transmit, and display your content to the people you share it with — nothing more. We do not mine your messages for advertising or train models on your data.",
      },
      { kind: "h2", text: "5. Self-hosted instances" },
      {
        kind: "p",
        text:
          "When you run Corvus on your own hardware, you are the data controller. We have no access to your instance, its users, or its content. The software is provided under the Corvus License (see the License page); these terms apply to your use of our update servers, downloads, and trademarks.",
      },
      { kind: "h2", text: "6. Termination" },
      {
        kind: "p",
        text:
          "You can delete your account at any time; hosted data is removed within 30 days. We may terminate accounts that violate these terms, with notice where practical. Sections that by their nature should survive (content ownership, disclaimers, limitation of liability) survive termination.",
      },
      { kind: "h2", text: "7. Disclaimers" },
      {
        kind: "p",
        text:
          "The service is provided “as is.” To the maximum extent permitted by law, we disclaim implied warranties and limit our aggregate liability to the amount you paid us in the twelve months before the claim. Some jurisdictions don't allow these limits; where that's the case, they apply to the fullest extent permitted.",
      },
      { kind: "h2", text: "8. Changes" },
      {
        kind: "p",
        text:
          "We may update these terms. Material changes are announced in-app and by email at least 14 days before they take effect. Continued use after that date is acceptance.",
      },
      { kind: "note", text: "Questions about these terms: legal@corvus.app." },
    ],
  },
  privacy: {
    eyebrow: "Legal · Privacy",
    title: "Privacy Policy.",
    lede: "What we collect, why, and the short version: your conversations are yours.",
    updated: "Last updated June 10, 2026",
    blocks: [
      { kind: "h2", text: "The short version" },
      {
        kind: "ul",
        items: [
          "Direct messages and private channels are end-to-end encrypted — we cannot read them.",
          "We don't sell data, run ads, or share content with third parties.",
          "Self-hosted instances send us nothing except an optional update check.",
          "You can export or delete your data at any time.",
        ],
      },
      { kind: "h2", text: "What we collect (hosted service)" },
      {
        kind: "table",
        head: ["Data", "Why"],
        rows: [
          ["Account info (email, username)", "Sign-in, recovery, and notifications you ask for."],
          ["Content you create", "Delivering it to the people you share it with. E2E-encrypted where applicable."],
          ["Connection metadata (IP, device)", "Security, abuse prevention, and session management."],
          ["Aggregate usage metrics", "Capacity planning. Never tied to message content."],
        ],
      },
      { kind: "h2", text: "What we don't do" },
      {
        kind: "p",
        text:
          "We do not read your messages, scan attachments for advertising signals, build behavioral profiles, or train machine-learning models on customer content. Crash reports and diagnostics are opt-in.",
      },
      { kind: "h2", text: "Self-hosted instances" },
      {
        kind: "p",
        text:
          "On your own instance, all data lives on your hardware. The only outbound request the software makes is a version check against our update server, and you can disable it with one environment variable. We receive no usage data, no account data, and no content from self-hosted deployments.",
      },
      { kind: "h2", text: "Retention and deletion" },
      {
        kind: "p",
        text:
          "Hosted data is retained while your account is active. Deleting a message removes it for everyone; deleting your account removes your data within 30 days, with encrypted backups aging out within 90. Export is available from Settings at any time.",
      },
      { kind: "h2", text: "Your rights" },
      {
        kind: "p",
        text:
          "Depending on where you live, you may have rights to access, correct, port, or erase your data (GDPR, CCPA, and similar). Write to privacy@corvus.app and we'll handle it — no forms, no dark patterns.",
      },
    ],
  },
  license: {
    eyebrow: "Legal · License",
    title: "License.",
    lede: "How you may use, deploy, and modify the Corvus software.",
    updated: "Last updated June 10, 2026",
    blocks: [
      { kind: "h2", text: "The grant" },
      {
        kind: "p",
        text:
          "Corvus is source-available. You receive a perpetual, royalty-free license to run Corvus on your own infrastructure for any number of users, to read its source, and to modify it for your own deployment. Free forever for self-hosting — no per-seat fees, no feature gates.",
      },
      { kind: "h2", text: "What you may do" },
      {
        kind: "ul",
        items: [
          "Deploy on any hardware you control — VPS, bare metal, Kubernetes, a Raspberry Pi.",
          "Modify the software and run your modified version internally.",
          "Build on the API and SDK, and distribute the integrations you build under any license you like.",
          "Use Corvus commercially inside your organization or community.",
        ],
      },
      { kind: "h2", text: "What you may not do" },
      {
        kind: "ul",
        items: [
          "Resell Corvus, or offer it to third parties as a hosted service, without a commercial agreement.",
          "Remove license notices or misrepresent the software's origin.",
          "Use the Corvus name or logo to imply endorsement of a modified distribution.",
        ],
      },
      { kind: "h2", text: "Contributions" },
      {
        kind: "p",
        text:
          "Contributions to the Corvus repositories are accepted under a contributor license agreement that lets us ship your change in both the self-hosted and hosted editions, with credit preserved in the commit history.",
      },
      { kind: "h2", text: "Third-party software" },
      {
        kind: "p",
        text:
          "Corvus bundles open-source components, each under its own license (MIT, Apache-2.0, BSD, and similar). The complete list with license texts ships in every release at /licenses and in the THIRD_PARTY file of the source tree.",
      },
      { kind: "note", text: "Commercial hosting or OEM licensing: sales@corvus.app." },
    ],
  },
  security: {
    eyebrow: "Legal · Security",
    title: "Security.",
    lede: "How Corvus protects your data, and how to tell us when we got something wrong.",
    updated: "Last updated June 10, 2026",
    blocks: [
      { kind: "h2", text: "Architecture" },
      {
        kind: "ul",
        items: [
          "End-to-end encryption for DMs and private channels — keys never leave your devices.",
          "TLS 1.3 for every connection; HSTS everywhere on the hosted service.",
          "Encryption at rest for databases, attachments, and backups.",
          "Per-space API keys with scoped permissions and instant revocation.",
          "Signed webhooks (HMAC-SHA256) and timestamped delivery verification.",
        ],
      },
      { kind: "h2", text: "Operations" },
      {
        kind: "p",
        text:
          "Production access requires hardware-key MFA and is logged. Dependencies are scanned continuously and patched on a defined SLA: critical within 24 hours, high within 7 days. Self-hosted releases get the same fixes on the same schedule, announced in the changelog and the admin panel's update feed.",
      },
      { kind: "h2", text: "Your responsibilities, self-hosted" },
      {
        kind: "p",
        text:
          "On your own instance, you own the perimeter: keep the host patched, restrict the admin panel, set strong SMTP credentials, and take the automatic backups somewhere off the box. The deployment guide's hardening section covers all of it.",
      },
      { kind: "h2", text: "Reporting a vulnerability" },
      {
        kind: "p",
        text:
          "Email security@corvus.app — PGP key and a security.txt are published at /.well-known/security.txt. We acknowledge within 48 hours, keep you informed, and credit reporters who want credit. Good-faith research within the program's scope will never result in legal action.",
      },
      {
        kind: "code",
        title: "Scope",
        code: `in scope:  corvus.app, *.corvus.app, the desktop app,
           current self-hosted releases
out:       social engineering, physical attacks,
           denial of service, third-party services`,
      },
    ],
  },
};

export function generateStaticParams() {
  return Object.keys(PAGES).map((slug) => ({ slug }));
}

export default async function LegalPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const content = PAGES[slug];
  if (!content) notFound();
  return <MarketingPage content={content} />;
}
