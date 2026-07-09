import type { Metadata } from "next";
import Link from "next/link";
import { AppLayout } from "@/components/PageShell";
import { TableOfContents } from "@/components/guide/TableOfContents";

export const metadata: Metadata = {
  title: "How to Run a Node | AICW Node Network",
  description:
    "Step-by-step guide to running an AICW node. From setup to earning rewards.",
};

export default function GuidePage() {
  return (
    <AppLayout>
      <div className="mx-auto max-w-page px-4 py-6 sm:px-6 sm:py-8 lg:py-10">
        <div className="lg:grid lg:grid-cols-[1fr_220px] lg:gap-10">
          {/* Main content */}
          <div className="min-w-0">
      <h1 className="text-3xl font-bold text-content-primary">How to Run a Node</h1>
      <p className="mt-4 text-lg text-content-secondary">
        A complete guide for running your own AICW network node. No technical
        experience required — just follow the steps.
      </p>


      <section id="overview" className="mt-12">
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

      <section id="requirements" className="mt-12">
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

      <section id="quick-start" className="mt-12">
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
                <h3 className="font-medium text-content-primary">Create your node</h3>
                <p className="mt-1 text-sm text-content-secondary">
                  Go to the Dashboard, enter a name for your node, and click
                  "Create node". This generates your unique identity files and
                  downloads them automatically.
                </p>
                <Link
                  href="/dashboard"
                  className="mt-3 inline-flex items-center rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent-muted"
                >
                  Go to Dashboard
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
                <h3 className="font-medium text-content-primary">Download the program</h3>
                <p className="mt-1 text-sm text-content-secondary">
                  Get the node program for your operating system from GitHub
                  Releases. Choose Windows, macOS, or Linux.
                </p>
                <a
                  href="https://github.com/aicw-protocol/aicw_node/releases"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-3 inline-flex items-center rounded-lg border border-surface-border px-4 py-2 text-sm text-content-secondary hover:border-accent hover:text-content-primary"
                >
                  <i className="fa-brands fa-github mr-2" />
                  GitHub Releases
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
                <h3 className="font-medium text-content-primary">Organize your files</h3>
                <p className="mt-1 text-sm text-content-secondary">
                  Create a folder for your node. Put the program and config files
                  in it. Put your identity files in an "identity" subfolder.
                </p>
                <div className="mt-3 rounded bg-gray-900 p-3 font-mono text-sm text-content-secondary">
                  <p>my-node/</p>
                  <p className="ml-4">├── aicw-node (or .exe on Windows)</p>
                  <p className="ml-4">├── operator-config.yaml</p>
                  <p className="ml-4">├── network-config.yaml</p>
                  <p className="ml-4">├── password.txt</p>
                  <p className="ml-4">└── identity/</p>
                  <p className="ml-8">├── yourname_identity.json</p>
                  <p className="ml-8">└── yourname_private_key.txt</p>
                </div>
              </div>
            </div>
          </li>

          <li className="rounded-lg border border-surface-border bg-surface-panel p-5">
            <div className="flex items-start gap-4">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent text-sm font-bold text-white">
                4
              </span>
              <div>
                <h3 className="font-medium text-content-primary">Run the command</h3>
                <p className="mt-1 text-sm text-content-secondary">
                  Open a terminal, navigate to your folder, and run the start
                  command. Keep the window open — your node is now running!
                </p>
                <div className="mt-3 rounded bg-gray-900 p-3 font-mono text-sm text-emerald-300">
                  ./aicw-node start --name yourname --network-config
                  network-config.yaml --config operator-config.yaml --identity-dir
                  ./identity -f password.txt
                </div>
              </div>
            </div>
          </li>

          <li className="rounded-lg border border-surface-border bg-surface-panel p-5">
            <div className="flex items-start gap-4">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-500 text-sm font-bold text-white">
                5
              </span>
              <div>
                <h3 className="font-medium text-content-primary">Verify it's working</h3>
                <p className="mt-1 text-sm text-content-secondary">
                  Check your Dashboard — your node should show as "Active" within
                  a minute or two. That means it's connected and ready to earn!
                </p>
              </div>
            </div>
          </li>
        </ol>
      </section>

      <section id="detailed-steps" className="mt-12">
        <h2 className="text-2xl font-semibold text-content-primary">Detailed Steps</h2>

        <div className="mt-6 space-y-8">
          <div>
            <h3 className="text-xl font-medium text-content-primary">
              Opening a Terminal
            </h3>
            <p className="mt-2 text-content-secondary">
              A terminal (also called command prompt) is where you type commands
              to run your node.
            </p>
            <div className="mt-4 space-y-3">
              <div className="rounded-lg border border-surface-border bg-surface/60 p-4">
                <h4 className="font-medium text-content-primary">
                  <i className="fa-brands fa-windows mr-2" />
                  Windows
                </h4>
                <p className="mt-1 text-sm text-content-secondary">
                  Press <kbd className="rounded bg-gray-800 px-2 py-1">Win</kbd> +{" "}
                  <kbd className="rounded bg-gray-800 px-2 py-1">R</kbd>, type{" "}
                  <code className="text-content-primary">cmd</code>, press Enter. Or search
                  "PowerShell" in Start menu.
                </p>
              </div>
              <div className="rounded-lg border border-surface-border bg-surface/60 p-4">
                <h4 className="font-medium text-content-primary">
                  <i className="fa-brands fa-apple mr-2" />
                  macOS
                </h4>
                <p className="mt-1 text-sm text-content-secondary">
                  Press{" "}
                  <kbd className="rounded bg-gray-800 px-2 py-1">Cmd</kbd> +{" "}
                  <kbd className="rounded bg-gray-800 px-2 py-1">Space</kbd>, type{" "}
                  <code className="text-content-primary">Terminal</code>, press Enter.
                </p>
              </div>
              <div className="rounded-lg border border-surface-border bg-surface/60 p-4">
                <h4 className="font-medium text-content-primary">
                  <i className="fa-brands fa-linux mr-2" />
                  Linux
                </h4>
                <p className="mt-1 text-sm text-content-secondary">
                  Press{" "}
                  <kbd className="rounded bg-gray-800 px-2 py-1">Ctrl</kbd> +{" "}
                  <kbd className="rounded bg-gray-800 px-2 py-1">Alt</kbd> +{" "}
                  <kbd className="rounded bg-gray-800 px-2 py-1">T</kbd>, or find
                  Terminal in your applications.
                </p>
              </div>
            </div>
          </div>

          <div>
            <h3 className="text-xl font-medium text-content-primary">
              Creating password.txt
            </h3>
            <p className="mt-2 text-content-secondary">
              This file contains a password that encrypts your node's local
              database. It can be any text you choose.
            </p>
            <ol className="mt-4 list-inside list-decimal space-y-2 text-sm text-content-secondary">
              <li>Open Notepad (Windows) or TextEdit (Mac)</li>
              <li>
                Type a random password, like:{" "}
                <code className="text-content-primary">MySecretNodePass123!</code>
              </li>
              <li>
                Save the file as <code className="text-content-primary">password.txt</code>{" "}
                in your node folder
              </li>
            </ol>
            <p className="mt-3 text-sm text-amber-200">
              <i className="fa-solid fa-triangle-exclamation mr-2" />
              Don't lose this file. If you do, you'll need to reset your node's
              local data.
            </p>
          </div>

          <div>
            <h3 className="text-xl font-medium text-content-primary">
              Making the file executable (Mac/Linux only)
            </h3>
            <p className="mt-2 text-content-secondary">
              On Mac and Linux, you need to mark the program as executable before
              you can run it.
            </p>
            <div className="mt-3 rounded bg-gray-900 p-3 font-mono text-sm text-content-secondary">
              chmod +x aicw-node
            </div>
            <p className="mt-2 text-sm text-content-secondary">
              Run this command once in your node folder, then you can start the
              node normally.
            </p>
          </div>
        </div>
      </section>

      <section id="troubleshooting" className="mt-12">
        <h2 className="text-2xl font-semibold text-content-primary">Troubleshooting</h2>
        <p className="mt-4 text-content-secondary">
          Common problems and how to fix them.
        </p>

        <div className="mt-6 space-y-4">
          <details className="rounded-lg border border-surface-border bg-surface-panel">
            <summary className="cursor-pointer p-4 font-medium text-content-primary">
              Node doesn't show as Active
            </summary>
            <div className="border-t border-surface-border p-4 text-sm text-content-secondary">
              <ul className="space-y-2">
                <li>
                  <strong>Check your terminal</strong> — Look for error messages
                  (usually in red). The node should show "[READY]" when it's
                  running properly.
                </li>
                <li>
                  <strong>Verify file locations</strong> — Make sure identity
                  files are in the identity/ subfolder and config files are next
                  to the program.
                </li>
                <li>
                  <strong>Check your internet</strong> — The node needs to reach
                  our servers to report its status.
                </li>
                <li>
                  <strong>Firewall</strong> — Some firewalls block outgoing
                  connections. Try temporarily disabling it.
                </li>
                <li>
                  <strong>Wait a bit longer</strong> — It can take up to 2 minutes
                  for the first ping to register.
                </li>
              </ul>
            </div>
          </details>

          <details className="rounded-lg border border-surface-border bg-surface-panel">
            <summary className="cursor-pointer p-4 font-medium text-content-primary">
              "Permission denied" error
            </summary>
            <div className="border-t border-surface-border p-4 text-sm text-content-secondary">
              <p>On Mac/Linux, run:</p>
              <code className="mt-2 block rounded bg-gray-900 p-2">
                chmod +x aicw-node
              </code>
              <p className="mt-2">Then try starting the node again.</p>
            </div>
          </details>

          <details className="rounded-lg border border-surface-border bg-surface-panel">
            <summary className="cursor-pointer p-4 font-medium text-content-primary">
              "File not found" error
            </summary>
            <div className="border-t border-surface-border p-4 text-sm text-content-secondary">
              <ul className="space-y-2">
                <li>
                  Make sure you're in the correct folder (use{" "}
                  <code className="text-content-primary">cd path/to/your/folder</code>)
                </li>
                <li>
                  Check that all required files exist: the program, both config
                  files, password.txt, and the identity folder with its files
                </li>
                <li>
                  File names are case-sensitive on Mac/Linux. Make sure they match
                  exactly.
                </li>
              </ul>
            </div>
          </details>

          <details className="rounded-lg border border-surface-border bg-surface-panel">
            <summary className="cursor-pointer p-4 font-medium text-content-primary">
              Node was Active but now shows as offline
            </summary>
            <div className="border-t border-surface-border p-4 text-sm text-content-secondary">
              <ul className="space-y-2">
                <li>
                  <strong>Is the terminal still open?</strong> — Closing the
                  terminal stops the node. Keep it running.
                </li>
                <li>
                  <strong>Did your computer sleep?</strong> — The node stops when
                  your computer sleeps. Adjust power settings to prevent sleep, or
                  restart the node after waking.
                </li>
                <li>
                  <strong>Internet connection</strong> — If your connection
                  dropped briefly, the node may have lost contact. Usually it
                  reconnects automatically.
                </li>
              </ul>
            </div>
          </details>

          <details className="rounded-lg border border-surface-border bg-surface-panel">
            <summary className="cursor-pointer p-4 font-medium text-content-primary">
              How do I keep my node running 24/7?
            </summary>
            <div className="border-t border-surface-border p-4 text-sm text-content-secondary">
              <p>For continuous operation:</p>
              <ul className="mt-2 space-y-2">
                <li>
                  <strong>Disable sleep mode</strong> — In your computer's power
                  settings, set it to never sleep.
                </li>
                <li>
                  <strong>Use a server or VPS</strong> — For professional
                  operation, consider renting a small cloud server.
                </li>
                <li>
                  <strong>Use Docker</strong> — The node supports Docker for
                  automatic restarts. See the GitHub repo for instructions.
                </li>
              </ul>
            </div>
          </details>
        </div>
      </section>

      <section id="faq" className="mt-12">
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
              Yes, but each node needs its own identity and (if required) its own
              stake. Running multiple nodes from the same wallet is allowed.
            </div>
          </details>

          <details className="rounded-lg border border-surface-border bg-surface-panel">
            <summary className="cursor-pointer p-4 font-medium text-content-primary">
              What if I lose my private key file?
            </summary>
            <div className="border-t border-surface-border p-4 text-sm text-content-secondary">
              Your node's identity is tied to that private key. If lost, you'll
              need to create a new node from scratch. Always keep a backup of your
              identity files in a safe place.
            </div>
          </details>

          <details className="rounded-lg border border-surface-border bg-surface-panel">
            <summary className="cursor-pointer p-4 font-medium text-content-primary">
              How much bandwidth/CPU does the node use?
            </summary>
            <div className="border-t border-surface-border p-4 text-sm text-content-secondary">
              Very little. The node sends a small status ping every 90 seconds and
              only does real work when a wallet is being created through it. Most
              of the time it's idle.
            </div>
          </details>
        </div>
      </section>

      <section className="mt-12 rounded-lg border border-accent/30 bg-accent/5 p-6 text-center">
        <h2 className="text-xl font-semibold text-content-primary">Ready to start?</h2>
        <p className="mt-2 text-content-secondary">
          Create your node now and start earning rewards.
        </p>
        <Link
          href="/dashboard"
          className="mt-4 inline-flex items-center rounded-lg bg-accent px-6 py-3 text-sm font-medium text-white hover:bg-accent-muted"
        >
          Go to Dashboard
          <i className="fa-solid fa-arrow-right ml-2" />
        </Link>
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
