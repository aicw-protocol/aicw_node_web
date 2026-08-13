import type { Metadata } from "next";
import Link from "next/link";
import { AppLayout } from "@/components/PageShell";
import { TableOfContents } from "@/components/guide/TableOfContents";
import { GuideFileLayout } from "@/components/guide/GuideFileLayout";
import { GuideDesktopDownload } from "@/components/guide/GuideDesktopDownload";
import { PAGE_CONTAINER } from "@/lib/layout";

export const metadata: Metadata = {
  title: "How to Run a Node | AICW Node Network",
  description:
    "Step-by-step guide to running an AICW node. From setup to earning rewards.",
};

export default function GuidePage() {
  return (
    <AppLayout>
      <div className={`${PAGE_CONTAINER} py-6 sm:py-8 lg:py-10`}>
        <div className="lg:grid lg:grid-cols-[1fr_220px] lg:gap-10">
          {/* Main content */}
          <div className="min-w-0">
      <h1 className="text-3xl font-bold text-content-primary">How to Run a Node</h1>
      <p className="mt-4 text-lg text-content-secondary">
        A complete guide for running your own AICW network node. No technical
        experience required — just follow the steps.
      </p>


      <section id="overview" className="scroll-mt-6 mt-12">
        <h2 className="text-2xl font-semibold text-content-primary">
          Overview — What is a node?
        </h2>
        <p className="mt-4 text-content-secondary">
          A <strong>node</strong> is a computer program that connects to the AICW
          network. When someone creates a new wallet, the network picks a node to
          help with the process. That node earns a small fee as a reward.
        </p>
        <p className="mt-3 text-content-secondary">
          Think of it like running a small business: your computer does a bit of
          work, and you get paid for it. The more your node helps, the more you
          earn.
        </p>
        <div className="mt-6 rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-4">
          <h3 className="font-medium text-emerald-300">Why run a node?</h3>
          <ul className="mt-2 space-y-1 text-sm text-content-secondary">
            <li>
              <i className="fa-solid fa-check mr-2 text-emerald-400" />
              Earn SOL rewards for every wallet created through your node
            </li>
            <li>
              <i className="fa-solid fa-check mr-2 text-emerald-400" />
              Support the decentralized network
            </li>
            <li>
              <i className="fa-solid fa-check mr-2 text-emerald-400" />
              Low resource usage — runs on any modern computer
            </li>
          </ul>
        </div>
      </section>

      <section id="requirements" className="scroll-mt-6 mt-12">
        <h2 className="text-2xl font-semibold text-content-primary">Requirements</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div className="rounded-lg border border-surface-border bg-surface-panel p-4">
            <h3 className="font-medium text-content-primary">
              <i className="fa-solid fa-desktop mr-2 text-accent" />
              Computer
            </h3>
            <p className="mt-2 text-sm text-content-secondary">
              Windows 10+, macOS 11+, or Linux. Any modern laptop or desktop works.
            </p>
          </div>
          <div className="rounded-lg border border-surface-border bg-surface-panel p-4">
            <h3 className="font-medium text-content-primary">
              <i className="fa-solid fa-wifi mr-2 text-accent" />
              Internet
            </h3>
            <p className="mt-2 text-sm text-content-secondary">
              Stable internet connection. The node uses minimal bandwidth.
            </p>
          </div>
          <div className="rounded-lg border border-surface-border bg-surface-panel p-4">
            <h3 className="font-medium text-content-primary">
              <i className="fa-solid fa-wallet mr-2 text-accent" />
              Solana Wallet
            </h3>
            <p className="mt-2 text-sm text-content-secondary">
              A wallet like Phantom or Solflare to receive your rewards.
            </p>
          </div>
          <div className="rounded-lg border border-surface-border bg-surface-panel p-4">
            <h3 className="font-medium text-content-primary">
              <i className="fa-solid fa-clock mr-2 text-accent" />
              Time
            </h3>
            <p className="mt-2 text-sm text-content-secondary">
              About 5-10 minutes for initial setup. Then it runs automatically.
            </p>
          </div>
        </div>
      </section>

      <section id="quick-start" className="scroll-mt-6 mt-12">
        <h2 className="text-2xl font-semibold text-content-primary">Quick Start</h2>
        <p className="mt-4 text-content-secondary">
          The fastest way to get started. Follow these steps in order.
        </p>

        <ol className="mt-6 space-y-6">
          <li className="rounded-lg border border-surface-border bg-surface-panel p-5">
            <div className="flex items-start gap-4">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent text-sm font-bold text-white">
                1
              </span>
              <div>
                <h3 className="font-medium text-content-primary">Stake if required</h3>
                <p className="mt-1 text-sm text-content-secondary">
                  Connect your wallet on the Staking page. Once enough nodes are
                  registered globally, you need active stake before registering a
                  new node.
                </p>
                <Link
                  href="/staking"
                  className="mt-3 inline-flex items-center rounded-lg border border-surface-border px-4 py-2 text-sm text-content-secondary hover:border-accent hover:text-content-primary"
                >
                  Go to Staking
                  <i className="fa-solid fa-arrow-right ml-2" />
                </Link>
              </div>
            </div>
          </li>

          <li className="rounded-lg border border-surface-border bg-surface-panel p-5">
            <div className="flex items-start gap-4">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent text-sm font-bold text-white">
                2
              </span>
              <div>
                <h3 className="font-medium text-content-primary">Install the desktop app</h3>
                <GuideDesktopDownload variant="inline" className="mt-1 text-sm text-content-secondary" />
                <a
                  href="https://github.com/aicw-protocol/aicw_node/releases"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-3 inline-flex items-center rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent-muted"
                >
                  <i className="fa-brands fa-github mr-2" />
                  Download desktop app
                </a>
              </div>
            </div>
          </li>

          <li className="rounded-lg border border-surface-border bg-surface-panel p-5">
            <div className="flex items-start gap-4">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent text-sm font-bold text-white">
                3
              </span>
              <div>
                <h3 className="font-medium text-content-primary">Register and start in the app</h3>
                <p className="mt-1 text-sm text-content-secondary">
                  Open the AICW Node app, sign in with Browser using the same wallet,
                  click <strong className="text-content-primary">+ Register Node</strong>,
                  approve the wallet signature, then click Start.
                </p>
                <Link
                  href="/dashboard"
                  className="mt-3 inline-flex items-center rounded-lg border border-surface-border px-4 py-2 text-sm text-content-secondary hover:border-accent hover:text-content-primary"
                >
                  Open dashboard to verify
                  <i className="fa-solid fa-arrow-right ml-2" />
                </Link>
              </div>
            </div>
          </li>

          <li className="rounded-lg border border-surface-border bg-surface-panel p-5">
            <div className="flex items-start gap-4">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-500 text-sm font-bold text-white">
                4
              </span>
              <div>
                <h3 className="font-medium text-content-primary">Verify it&apos;s working</h3>
                <p className="mt-1 text-sm text-content-secondary">
                  Check your Dashboard — your node should show as &quot;Active&quot; within
                  a minute or two. That means it&apos;s connected and ready to earn.
                </p>
              </div>
            </div>
          </li>
        </ol>
      </section>

      <section id="detailed-steps" className="scroll-mt-6 mt-12">
        <h2 className="text-2xl font-semibold text-content-primary">Detailed Steps</h2>
        <p className="mt-4 text-content-secondary">
          Step-by-step using the <strong>AICW Node desktop app</strong> on Windows,
          Linux, or macOS. Staking still happens on this website; everything else runs
          in the app.
        </p>

        <div className="mt-6 space-y-8">
          <div>
            <h3 className="text-xl font-medium text-content-primary">
              1. Stake on the website (if required)
            </h3>
            <p className="mt-2 text-content-secondary">
              Open the{" "}
              <Link href="/staking" className="text-accent hover:underline">
                Staking
              </Link>{" "}
              page and connect the same Solana wallet you will use in the desktop app.
              While fewer than 30 nodes exist globally, no stake is required. After
              that, you need active stake before the app will let you register a new node.
            </p>
          </div>

          <div>
            <h3 className="text-xl font-medium text-content-primary">
              2. Install the desktop app
            </h3>
            <GuideDesktopDownload variant="steps" className="mt-4" />
          </div>

          <div>
            <h3 className="text-xl font-medium text-content-primary">
              3. Sign in with your wallet
            </h3>
            <ol className="mt-4 list-inside list-decimal space-y-2 text-sm text-content-secondary">
              <li>Open the AICW Node app and go to the <strong>Nodes</strong> tab.</li>
              <li>
                Click <strong>Sign in with Browser</strong>. Your browser opens the
                sign-in page.
              </li>
              <li>
                Connect Phantom (or another Solana wallet) and approve the sign-in
                message.
              </li>
              <li>
                Return to the app — your wallet address should appear in the top bar.
                Use the <strong>same wallet</strong> you used for staking.
              </li>
            </ol>
          </div>

          <div>
            <h3 className="text-xl font-medium text-content-primary">
              4. Register a node in the app
            </h3>
            <ol className="mt-4 list-inside list-decimal space-y-2 text-sm text-content-secondary">
              <li>
                Click <strong>+ Register Node</strong> and enter a node name (2–64
                characters: letters, numbers, <code className="text-content-primary">._-</code>
                ).
              </li>
              <li>
                Approve the <strong>registration</strong> message in your wallet when
                the browser opens.
              </li>
              <li>
                The app creates your identity locally and registers the public key on
                the network. Your private key never leaves your computer.
              </li>
              <li>
                The app also writes{" "}
                <code className="text-content-primary">network-config.yaml</code>,{" "}
                <code className="text-content-primary">password.txt</code>, and{" "}
                <code className="text-content-primary">operator-config.yaml</code>{" "}
                if they are not already present.
              </li>
            </ol>
            <GuideFileLayout />
          </div>

          <div>
            <h3 className="text-xl font-medium text-content-primary">
              5. Start the node
            </h3>
            <ol className="mt-4 list-inside list-decimal space-y-2 text-sm text-content-secondary">
              <li>
                In the node list, expand your node and confirm badges show{" "}
                <strong>Local ready</strong> (and ideally <strong>Registered</strong>
                ).
              </li>
              <li>Click <strong>Start</strong>.</li>
              <li>
                Open the <strong>Logs</strong> tab to see output from the node process.
              </li>
              <li>
                On the website{" "}
                <Link href="/dashboard" className="text-accent hover:underline">
                  Dashboard
                </Link>
                , the node should become <strong>Active</strong> within a minute or two.
              </li>
            </ol>
            <p className="mt-3 text-sm text-content-secondary">
              One app instance can run up to <strong>5 nodes</strong> at the same time.
            </p>
          </div>

          <div>
            <h3 className="text-xl font-medium text-content-primary">
              6. Stop or repair
            </h3>
            <ul className="mt-4 list-inside list-disc space-y-2 text-sm text-content-secondary">
              <li>
                <strong>Stop</strong> — expand the node and click Stop, or sign out
                from the app header.
              </li>
              <li>
                <strong>Install Folder</strong> — opens the folder where config and
                identity files live.
              </li>
              <li>
                <strong>Repair Binary</strong> — reinstalls the bundled node engine from
                the app if the binary was deleted or corrupted.
              </li>
              <li>
                <strong>Generate Config Files</strong> — if shared files (
                <code className="text-content-primary">network-config.yaml</code>,{" "}
                <code className="text-content-primary">password.txt</code>) are missing
                for an older registration, use this button in the yellow banner on the
                Nodes tab.
              </li>
            </ul>
          </div>
        </div>
      </section>

      <section id="troubleshooting" className="scroll-mt-6 mt-12">
        <h2 className="text-2xl font-semibold text-content-primary">Troubleshooting</h2>
        <p className="mt-4 text-content-secondary">
          Common problems when using the desktop app. Check the{" "}
          <strong>Logs</strong> tab first — error messages usually appear there.
        </p>

        <div className="mt-6 space-y-4">
          <details className="rounded-lg border border-surface-border bg-surface-panel">
            <summary className="cursor-pointer p-4 font-medium text-content-primary">
              Node doesn&apos;t show as Active on the Dashboard
            </summary>
            <div className="border-t border-surface-border p-4 text-sm text-content-secondary">
              <ul className="space-y-2">
                <li>
                  <strong>Is the node running?</strong> — In the app, the node should
                  show a <strong>Running</strong> badge and the status strip should name
                  your node.
                </li>
                <li>
                  <strong>Check the Logs tab</strong> — Look for errors after Start. A
                  healthy start shows connection messages, not repeated failures.
                </li>
                <li>
                  <strong>Local ready</strong> — If you see <strong>Files missing</strong>
                  , register the node again or click{" "}
                  <strong>Generate Config Files</strong> for shared config files.
                </li>
                <li>
                  <strong>Same wallet</strong> — The app wallet must match the wallet
                  that owns the registered node on the Dashboard.
                </li>
                <li>
                  <strong>Internet / firewall</strong> — The node must reach AICW
                  servers (NATS, Consul, node web ping). Allow outbound connections.
                </li>
                <li>
                  <strong>Wait up to 2 minutes</strong> — The first ping can take a
                  little time to show as Active.
                </li>
              </ul>
            </div>
          </details>

          <details className="rounded-lg border border-surface-border bg-surface-panel">
            <summary className="cursor-pointer p-4 font-medium text-content-primary">
              &quot;Files missing&quot; or Start is disabled
            </summary>
            <div className="border-t border-surface-border p-4 text-sm text-content-secondary">
              <ul className="space-y-2">
                <li>
                  Expand the node row to see which files are missing (
                  <code className="text-content-primary">network-config.yaml</code>,{" "}
                  <code className="text-content-primary">password.txt</code>, identity
                  files, etc.).
                </li>
                <li>
                  For a <strong>new node</strong>, use{" "}
                  <strong>+ Register Node</strong> — the app creates everything
                  automatically.
                </li>
                <li>
                  For an <strong>older web-registered node</strong> without local
                  identity files, you must register again in the app with a new name, or
                  restore identity files from your backup into the{" "}
                  <code className="text-content-primary">identity/</code> folder.
                </li>
                <li>
                  Click <strong>Generate Config Files</strong> in the yellow banner if
                  only shared config files are missing.
                </li>
                <li>
                  Use <strong>Install Folder</strong> to verify files on disk.
                </li>
              </ul>
            </div>
          </details>

          <details className="rounded-lg border border-surface-border bg-surface-panel">
            <summary className="cursor-pointer p-4 font-medium text-content-primary">
              Registration fails or wallet sign-in fails
            </summary>
            <div className="border-t border-surface-border p-4 text-sm text-content-secondary">
              <ul className="space-y-2">
                <li>
                  <strong>Staking</strong> — If required stake is not met, stake on the{" "}
                  <Link href="/staking" className="text-accent hover:underline">
                    Staking
                  </Link>{" "}
                  page first.
                </li>
                <li>
                  <strong>Sign in with Browser</strong> — Use this before registering.
                  Pasting a wallet address alone is not enough; the app needs a verified
                  browser signature.
                </li>
                <li>
                  <strong>Approve both messages</strong> — One for sign-in, one for
                  node registration. Use the same wallet for both.
                </li>
                <li>
                  <strong>Pop-up blockers</strong> — Allow the browser window opened
                  from the app.
                </li>
                <li>
                  If registration succeeded on the network but local files failed, check
                  the install folder permissions and try again.
                </li>
              </ul>
            </div>
          </details>

          <details className="rounded-lg border border-surface-border bg-surface-panel">
            <summary className="cursor-pointer p-4 font-medium text-content-primary">
              Node was Active but now shows offline
            </summary>
            <div className="border-t border-surface-border p-4 text-sm text-content-secondary">
              <ul className="space-y-2">
                <li>
                  <strong>Did you click Stop?</strong> — Or close the app? Start the
                  node again from the Nodes tab.
                </li>
                <li>
                  <strong>Computer sleep</strong> — Sleep or shutdown stops the node.
                  Disable sleep for 24/7 operation, or Start again after waking.
                </li>
                <li>
                  <strong>Internet drop</strong> — The node usually reconnects when
                  network returns; if not, Stop then Start.
                </li>
                <li>
                  Check the <strong>Logs</strong> tab for crash or lock errors (for
                  example, another copy of the node already using the local database).
                </li>
              </ul>
            </div>
          </details>

          <details className="rounded-lg border border-surface-border bg-surface-panel">
            <summary className="cursor-pointer p-4 font-medium text-content-primary">
              How do I keep my node running 24/7?
            </summary>
            <div className="border-t border-surface-border p-4 text-sm text-content-secondary">
              <ul className="mt-2 space-y-2">
                <li>
                  <strong>Keep the app running</strong> — Leave AICW Node open with your
                  node started. Closing the app stops the node.
                </li>
                <li>
                  <strong>Disable sleep</strong> — In Windows power settings, prevent
                  the PC from sleeping while operating a node.
                </li>
                <li>
                  <strong>Use a always-on PC or VPS</strong> — For professional
                  operation, run the desktop app on a machine that stays online.
                </li>
              </ul>
            </div>
          </details>
        </div>
      </section>

      <section id="faq" className="scroll-mt-6 mt-12">
        <h2 className="text-2xl font-semibold text-content-primary">
          Frequently Asked Questions
        </h2>

        <div className="mt-6 space-y-4">
          <details className="rounded-lg border border-surface-border bg-surface-panel">
            <summary className="cursor-pointer p-4 font-medium text-content-primary">
              How much can I earn?
            </summary>
            <div className="border-t border-surface-border p-4 text-sm text-content-secondary">
              Nodes earn 0.001 SOL for each wallet created through them. Your
              earnings depend on how many wallets get created and how many active
              nodes are in the network (work is distributed randomly among active
              nodes).
            </div>
          </details>

          <details className="rounded-lg border border-surface-border bg-surface-panel">
            <summary className="cursor-pointer p-4 font-medium text-content-primary">
              Is staking required?
            </summary>
            <div className="border-t border-surface-border p-4 text-sm text-content-secondary">
              While fewer than 30 nodes are registered globally, staking is free.
              After that, new nodes need to stake SOL following a bonding curve — 
              the more nodes exist, the more stake is required. Check the Staking
              page for current requirements.
            </div>
          </details>

          <details className="rounded-lg border border-surface-border bg-surface-panel">
            <summary className="cursor-pointer p-4 font-medium text-content-primary">
              Can I run multiple nodes?
            </summary>
            <div className="border-t border-surface-border p-4 text-sm text-content-secondary">
              Yes. Register each node separately in the desktop app (each needs its
              own name and identity). One app window runs one node process at a time —
              run multiple app instances if you need several nodes online at once. Each
              node may require its own stake once the bonding curve applies.
            </div>
          </details>

          <details className="rounded-lg border border-surface-border bg-surface-panel">
            <summary className="cursor-pointer p-4 font-medium text-content-primary">
              What if I lose my private key file?
            </summary>
            <div className="border-t border-surface-border p-4 text-sm text-content-secondary">
              Your node identity is tied to that private key file in the{" "}
              <code className="text-content-primary">identity/</code> folder. If lost,
              create a new node with <strong>+ Register Node</strong> in the app. Back up
              the install folder (especially <code className="text-content-primary">identity/</code>
              ) in a safe place — never share the private key file.
            </div>
          </details>

          <details className="rounded-lg border border-surface-border bg-surface-panel">
            <summary className="cursor-pointer p-4 font-medium text-content-primary">
              How much bandwidth/CPU does the node use?
            </summary>
            <div className="border-t border-surface-border p-4 text-sm text-content-secondary">
              Very little. The node sends a small status ping every 90 seconds and
              only does real work when a wallet is being created through it. Most
              of the time it's idle. Each ping also updates your node's approximate
              location on the global map (from its network IP).
            </div>
          </details>
        </div>
      </section>

      <section className="mt-12 rounded-lg border border-accent/30 bg-accent/5 p-6 text-center">
        <h2 className="text-xl font-semibold text-content-primary">Ready to start?</h2>
        <p className="mt-2 text-content-secondary">
          Download the desktop app, register your node, and track status on the dashboard.
        </p>
        <GuideDesktopDownload
          variant="button"
          className="mt-4 inline-flex items-center rounded-lg bg-accent px-6 py-3 text-sm font-medium text-white hover:bg-accent-muted"
        />
      </section>
          </div>

          {/* Desktop sidebar TOC */}
          <aside className="hidden lg:block">
            <TableOfContents />
          </aside>
        </div>
      </div>
    </AppLayout>
  );
}
