const K = ({ children }: { children: React.ReactNode }) => (
  <span className="text-accent-violet">{children}</span>
);
const S = ({ children }: { children: React.ReactNode }) => (
  <span className="text-accent-teal">{children}</span>
);
const C = ({ children }: { children: React.ReactNode }) => (
  <span className="text-text-muted">{children}</span>
);

export function DeveloperSection() {
  return (
    <section id="developers" className="px-6 py-24 sm:py-28">
      <div className="mx-auto grid max-w-6xl items-center gap-12 lg:grid-cols-[3fr_2fr]">
        {/* Left — copy */}
        <div>
          <p className="text-[12px] uppercase tracking-[0.12em] text-accent-violet">
            Developer first
          </p>
          <h2 className="mt-4 text-[28px] font-medium leading-[1.2] tracking-[-0.02em] text-text-primary">
            Integrate in minutes. Ship in days.
          </h2>
          <p className="mt-4 max-w-[420px] text-[15px] leading-[1.6] text-text-secondary">
            One client, every transport. Connect over WebSocket, subscribe to a
            channel, and start sending — typed end to end. No glue code, no media
            servers to operate.
          </p>
          <a
            href="#"
            className="mt-6 inline-block text-[15px] font-medium text-accent-violet transition-colors hover:text-accent-violet-bright"
          >
            Read the full docs →
          </a>
        </div>

        {/* Right — code */}
        <div
          className="overflow-x-auto rounded-[10px] border border-border p-6"
          style={{ background: "#0d0d14" }}
        >
          <pre className="font-mono text-[13px] leading-[1.7] text-text-primary/85">
            <code>
              <K>import</K> {"{ CorvusClient }"} <K>from</K> <S>&apos;@corvus/sdk&apos;</S>
              {"\n\n"}
              <K>const</K> client = <K>new</K> CorvusClient({"({"}
              {"\n"}
              {"  apiKey: process.env.CORVUS_API_KEY,"}
              {"\n"}
              {"})"}
              {"\n\n"}
              <C>{"// Send a message to a channel"}</C>
              {"\n"}
              <K>await</K> client.channel(<S>&apos;eng-general&apos;</S>).send({"({"}
              {"\n"}
              {"  text: "}
              <S>&apos;PR #42 is ready for review&apos;</S>,
              {"\n"}
              {"})"}
              {"\n\n"}
              <C>{"// Create a kanban card from code"}</C>
              {"\n"}
              <K>await</K> client.board(<S>&apos;sprint-12&apos;</S>).cards.create({"({"}
              {"\n"}
              {"  title:    "}
              <S>&apos;Review PR #42&apos;</S>,
              {"\n"}
              {"  assignee: "}
              <S>&apos;humayun&apos;</S>,
              {"\n"}
              {"  due:      "}
              <S>&apos;2025-06-15&apos;</S>,
              {"\n"}
              {"})"}
            </code>
          </pre>
        </div>
      </div>
    </section>
  );
}
