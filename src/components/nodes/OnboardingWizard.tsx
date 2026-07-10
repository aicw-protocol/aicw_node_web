"use client";

import { useCallback, useEffect, useState } from "react";
import type { NodeIdentityFiles } from "@/lib/nodeIdentity";
import type { OnboardingConfig } from "@/lib/onboardingConfig";
import {
  detectOS,
  getOSLabel,
  getBinaryName,
  getStartCommand,
  getTerminalInstructions,
  type OperatingSystem,
} from "@/lib/detectOS";
import {
  buildOperatorConfigYaml,
  downloadTextFile,
} from "@/lib/nodeOnboarding";

interface OnboardingWizardProps {
  identity: NodeIdentityFiles;
  config: OnboardingConfig;
  onClose: () => void;
}

const STEPS = [
  { id: 1, title: "Node Created" },
  { id: 2, title: "Download Program" },
  { id: 3, title: "Place Files" },
  { id: 4, title: "Run Node" },
  { id: 5, title: "Verify" },
];

const NETWORK_CONFIG_TEMPLATE = `# Network configuration for AICW node

environment: development
event_initiator_algorithm: ed25519
event_initiator_pubkey: "085e3dd81362735e85deba4745751bb2fe2f947ab223be27d412f5adfced963d"
chain_code: "5c22c2856d3657a2835bfb05cb2a6dbc9456f9d582550f9f6c06670417ee4086"

nats:
  url: "nats://158.247.251.191:4222"

consul:
  address: "158.247.251.191:8500"

mpc_threshold: 2

eligibility:
  membership:
    mode: whitelist
    source: consul
    consul_path: mpc_eligibility/membership_whitelist/
`;

export function OnboardingWizard({
  identity,
  config,
  onClose,
}: OnboardingWizardProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const [os, setOs] = useState<OperatingSystem>("unknown");
  const [nodeStatus, setNodeStatus] = useState<"waiting" | "active" | "timeout">(
    "waiting",
  );
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [showTroubleshooting, setShowTroubleshooting] = useState(false);

  useEffect(() => {
    setOs(detectOS());
  }, []);

  const checkNodeStatus = useCallback(async () => {
    try {
      const res = await fetch(
        `/api/nodes/status?nodeId=${encodeURIComponent(identity.nodeId)}`,
        { cache: "no-store" },
      );
      if (res.ok) {
        const data = (await res.json()) as { active: boolean };
        if (data.active) {
          setNodeStatus("active");
          return true;
        }
      }
    } catch {
      // ignore
    }
    return false;
  }, [identity.nodeId]);

  useEffect(() => {
    if (currentStep !== 5) return;
    if (nodeStatus === "active") return;

    const interval = setInterval(async () => {
      setElapsedSeconds((prev) => {
        const next = prev + 5;
        if (next >= 120) {
          setShowTroubleshooting(true);
        }
        return next;
      });

      const isActive = await checkNodeStatus();
      if (isActive) {
        clearInterval(interval);
      }
    }, 5000);

    checkNodeStatus();

    return () => clearInterval(interval);
  }, [currentStep, nodeStatus, checkNodeStatus]);

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      // fallback
    }
  };

  const downloadIdentityFiles = () => {
    downloadTextFile(identity.identityFilename, identity.identityJson);
    downloadTextFile(identity.privateKeyFilename, identity.privateKeyHex);
  };

  const downloadConfigFile = () => {
    const yaml = buildOperatorConfigYaml({
      nodeWebUrl: config.nodeWebUrl,
      pingIntervalSeconds: config.pingIntervalSeconds,
    });
    downloadTextFile("operator-config.yaml", yaml);
  };

  const downloadNetworkConfig = () => {
    downloadTextFile("network-config.yaml", NETWORK_CONFIG_TEMPLATE);
  };

  const binaryName = getBinaryName(os);
  const startCommand = getStartCommand(os, identity.nodeName);

  const renderProgressBar = () => (
    <div className="mb-8">
      <div className="flex items-center justify-between">
        {STEPS.map((step, index) => (
          <div key={step.id} className="flex items-center">
            <div
              className={`flex h-10 w-10 items-center justify-center rounded-full border-2 text-sm font-medium transition-colors ${
                step.id < currentStep
                  ? "border-emerald-500 bg-emerald-500 text-content-primary"
                  : step.id === currentStep
                    ? "border-accent bg-accent text-white"
                    : "border-gray-600 bg-surface text-content-muted"
              }`}
            >
              {step.id < currentStep ? (
                <i className="fa-solid fa-check" aria-hidden />
              ) : (
                step.id
              )}
            </div>
            {index < STEPS.length - 1 && (
              <div
                className={`mx-2 h-1 w-8 rounded sm:w-12 md:w-16 ${
                  step.id < currentStep ? "bg-emerald-500" : "bg-gray-700"
                }`}
              />
            )}
          </div>
        ))}
      </div>
      <div className="mt-2 flex justify-between text-xs text-content-muted">
        {STEPS.map((step) => (
          <span
            key={step.id}
            className={`w-20 text-center ${
              step.id === currentStep ? "text-content-primary" : ""
            }`}
          >
            {step.title}
          </span>
        ))}
      </div>
    </div>
  );

  const renderStep1 = () => (
    <div className="space-y-6">
      <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-4">
        <h3 className="flex items-center gap-2 text-lg font-medium text-emerald-300">
          <i className="fa-solid fa-circle-check" aria-hidden />
          Your node has been created!
        </h3>
        <p className="mt-2 text-sm text-content-secondary">
          We generated unique identity files for your node. These files prove
          your node is yours — like a digital ID card.
        </p>
      </div>

      <div className="space-y-4">
        <h4 className="font-medium text-content-primary">Your files (3 total):</h4>

        <div className="space-y-3">
          <div className="rounded-lg border border-surface-border bg-surface/60 p-4">
            <div className="flex items-start gap-3">
              <i className="fa-solid fa-id-card mt-1 text-accent" aria-hidden />
              <div>
                <p className="font-mono text-sm text-content-primary">
                  {identity.identityFilename}
                </p>
                <p className="mt-1 text-sm text-content-secondary">
                  <strong>Identity file</strong> — Contains your node's public
                  ID. Safe to share if needed.
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-lg border border-red-500/30 bg-red-500/5 p-4">
            <div className="flex items-start gap-3">
              <i className="fa-solid fa-key mt-1 text-red-400" aria-hidden />
              <div>
                <p className="font-mono text-sm text-content-primary">
                  {identity.privateKeyFilename}
                </p>
                <p className="mt-1 text-sm text-content-secondary">
                  <strong className="text-red-300">Private key</strong> — Your
                  secret password. <strong>NEVER share this file!</strong> Anyone
                  with this file can pretend to be your node.
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-lg border border-surface-border bg-surface/60 p-4">
            <div className="flex items-start gap-3">
              <i className="fa-solid fa-gear mt-1 text-accent" aria-hidden />
              <div>
                <p className="font-mono text-sm text-content-primary">operator-config.yaml</p>
                <p className="mt-1 text-sm text-content-secondary">
                  <strong>Config file</strong> — Settings for your node. Already
                  filled in with your details.
                </p>
              </div>
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={downloadIdentityFiles}
          className="mt-2 text-sm text-accent hover:underline"
        >
          <i className="fa-solid fa-download mr-2" aria-hidden />
          Download identity files again
        </button>
      </div>
    </div>
  );

  const renderStep2 = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium text-content-primary">Download the node program</h3>
        <p className="mt-2 text-sm text-content-secondary">
          The node program is what actually runs on your computer and connects
          to the network. Download the version for your operating system.
        </p>
      </div>

      <div className="rounded-lg border border-surface-border bg-surface/60 p-4">
        <p className="text-sm text-content-secondary">
          <i className="fa-solid fa-desktop mr-2 text-accent" aria-hidden />
          We detected: <strong className="text-content-primary">{getOSLabel(os)}</strong>
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        {(["windows", "macos", "linux"] as const).map((targetOs) => (
          <a
            key={targetOs}
            href={config.releasesUrl}
            target="_blank"
            rel="noopener noreferrer"
            className={`flex flex-col items-center rounded-lg border p-4 transition-colors hover:border-accent ${
              os === targetOs
                ? "border-accent bg-accent/10"
                : "border-surface-border bg-surface/60"
            }`}
          >
            <i
              className={`fa-brands text-3xl ${
                targetOs === "windows"
                  ? "fa-windows"
                  : targetOs === "macos"
                    ? "fa-apple"
                    : "fa-linux"
              } ${os === targetOs ? "text-accent" : "text-content-secondary"}`}
              aria-hidden
            />
            <span
              className={`mt-2 text-sm font-medium ${
                os === targetOs ? "text-content-primary" : "text-content-secondary"
              }`}
            >
              {getOSLabel(targetOs)}
            </span>
            {os === targetOs && (
              <span className="mt-1 text-xs text-accent">Recommended</span>
            )}
          </a>
        ))}
      </div>

      <a
        href={config.releasesUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center rounded-lg bg-accent px-4 py-2.5 text-sm font-medium text-white hover:bg-accent-muted"
      >
        <i className="fa-solid fa-arrow-up-right-from-square mr-2" aria-hidden />
        Go to GitHub Releases
      </a>

      <p className="text-xs text-content-muted">
        On the releases page, download{" "}
        <code className="text-content-secondary">{binaryName}</code> for your
        system.
      </p>
    </div>
  );

  const renderStep3 = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium text-content-primary">Place your files</h3>
        <p className="mt-2 text-sm text-content-secondary">
          Create a folder for your node and organize the files like this. The
          program needs to find these files to work.
        </p>
      </div>

      <div className="rounded-lg border border-surface-border bg-surface/60 p-4 font-mono text-sm">
        <p className="text-content-secondary">my-node-folder/</p>
        <p className="ml-4 text-content-primary">
          ├── {binaryName}{" "}
          <span className="text-content-muted">(the program you downloaded)</span>
        </p>
        <p className="ml-4 text-content-primary">
          ├── operator-config.yaml{" "}
          <span className="text-content-muted">(your config)</span>
        </p>
        <p className="ml-4 text-content-primary">
          ├── network-config.yaml{" "}
          <span className="text-content-muted">(network settings)</span>
        </p>
        <p className="ml-4 text-content-primary">
          ├── password.txt{" "}
          <span className="text-content-muted">(you create this)</span>
        </p>
        <p className="ml-4 text-content-secondary">└── identity/</p>
        <p className="ml-8 text-content-primary">├── {identity.identityFilename}</p>
        <p className="ml-8 text-red-300">├── {identity.privateKeyFilename}</p>
      </div>

      <div className="space-y-4">
        <div className="rounded-lg border border-surface-border bg-surface/60 p-4">
          <h4 className="font-medium text-content-primary">
            <i className="fa-solid fa-1 mr-2 text-accent" aria-hidden />
            Create the folder structure
          </h4>
          <p className="mt-2 text-sm text-content-secondary">
            Make a new folder anywhere (like on your Desktop). Inside it, create
            another folder called <code className="text-content-primary">identity</code>.
          </p>
        </div>

        <div className="rounded-lg border border-surface-border bg-surface/60 p-4">
          <h4 className="font-medium text-content-primary">
            <i className="fa-solid fa-2 mr-2 text-accent" aria-hidden />
            Move the downloaded program
          </h4>
          <p className="mt-2 text-sm text-content-secondary">
            Put the program file ({binaryName}) in the main folder (not inside
            identity/).
          </p>
        </div>

        <div className="rounded-lg border border-surface-border bg-surface/60 p-4">
          <h4 className="font-medium text-content-primary">
            <i className="fa-solid fa-3 mr-2 text-accent" aria-hidden />
            Move identity files
          </h4>
          <p className="mt-2 text-sm text-content-secondary">
            Put both <code className="text-content-primary">{identity.identityFilename}</code>{" "}
            and <code className="text-content-primary">{identity.privateKeyFilename}</code>{" "}
            inside the <code className="text-content-primary">identity/</code> folder.
          </p>
        </div>

        <div className="rounded-lg border border-surface-border bg-surface/60 p-4">
          <h4 className="font-medium text-content-primary">
            <i className="fa-solid fa-4 mr-2 text-accent" aria-hidden />
            Download network config
          </h4>
          <div className="mt-2">
            <button
              type="button"
              onClick={downloadNetworkConfig}
              className="rounded border border-surface-border px-3 py-1.5 text-sm text-content-secondary hover:border-accent hover:text-content-primary"
            >
              <i className="fa-solid fa-download mr-2" aria-hidden />
              network-config.yaml
            </button>
          </div>
          <p className="mt-2 text-xs text-content-muted">
            Put this in the main folder (next to the program).
            <code className="ml-1 text-content-secondary">operator-config.yaml</code> was already downloaded in Step 1.
          </p>
        </div>

        <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-4">
          <h4 className="font-medium text-content-primary">
            <i className="fa-solid fa-5 mr-2 text-amber-400" aria-hidden />
            Create password.txt
          </h4>
          <p className="mt-2 text-sm text-content-secondary">
            Open Notepad (Windows) or TextEdit (Mac). Type a password that is{" "}
            <strong className="text-amber-200">exactly 16, 24, or 32 characters</strong>.
            Save as <code className="text-content-primary">password.txt</code> in the main folder.
          </p>
          <p className="mt-2 text-xs text-content-muted">
            Example (32 chars): <code className="text-content-secondary">MySecurePassword12345678!@#$%^&*</code>
          </p>
          <p className="mt-1 text-xs text-amber-300">
            <i className="fa-solid fa-triangle-exclamation mr-1" aria-hidden />
            Wrong length will cause an encryption error.
          </p>
        </div>
      </div>
    </div>
  );

  const renderStep4 = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium text-content-primary">Run your node</h3>
        <p className="mt-2 text-sm text-content-secondary">
          Open a terminal/command prompt and run the command below. This starts
          your node and connects it to the network.
        </p>
      </div>

      <div className="rounded-lg border border-surface-border bg-surface/60 p-4">
        <h4 className="text-sm font-medium text-content-secondary">
          How to open terminal:
        </h4>
        <p className="mt-2 text-sm text-content-primary">{getTerminalInstructions(os)}</p>
      </div>

      <div className="rounded-lg border border-surface-border bg-surface/60 p-4">
        <h4 className="text-sm font-medium text-content-secondary">
          First, navigate to your folder:
        </h4>
        <div className="mt-2 flex items-center gap-2">
          <code className="flex-1 rounded bg-gray-900 px-3 py-2 text-sm text-content-secondary">
            cd {os === "windows" ? "C:\\Users\\YourName\\Desktop\\my-node-folder" : "~/Desktop/my-node-folder"}
          </code>
          <button
            type="button"
            onClick={() =>
              copyToClipboard(
                `cd ${os === "windows" ? "C:\\Users\\YourName\\Desktop\\my-node-folder" : "~/Desktop/my-node-folder"}`,
              )
            }
            className="rounded border border-surface-border px-3 py-2 text-sm text-content-secondary hover:border-accent hover:text-content-primary"
          >
            <i className="fa-regular fa-copy" aria-hidden />
          </button>
        </div>
        <p className="mt-2 text-xs text-content-muted">
          Replace the path with where you actually put your folder.
        </p>
      </div>

      <div className="rounded-lg border border-accent/30 bg-accent/5 p-4">
        <h4 className="text-sm font-medium text-content-primary">
          Then run this command:
        </h4>
        <div className="mt-2 flex items-center gap-2">
          <code className="flex-1 overflow-x-auto rounded bg-gray-900 px-3 py-2 text-sm text-emerald-300">
            {startCommand}
          </code>
          <button
            type="button"
            onClick={() => copyToClipboard(startCommand)}
            className="shrink-0 rounded border border-accent px-3 py-2 text-sm text-accent hover:bg-accent hover:text-white"
          >
            <i className="fa-regular fa-copy mr-1" aria-hidden />
            Copy
          </button>
        </div>
      </div>

      <div className="rounded-lg border border-surface-border bg-surface/60 p-4">
        <h4 className="text-sm font-medium text-content-secondary">What to expect:</h4>
        <ul className="mt-2 space-y-1 text-sm text-content-secondary">
          <li>
            <i className="fa-solid fa-check mr-2 text-emerald-400" aria-hidden />
            Text will scroll showing the node starting up
          </li>
          <li>
            <i className="fa-solid fa-check mr-2 text-emerald-400" aria-hidden />
            Look for <code className="text-emerald-300">[READY]</code> — means
            it's running
          </li>
          <li>
            <i className="fa-solid fa-check mr-2 text-emerald-400" aria-hidden />
            Keep the terminal window open — closing it stops your node
          </li>
        </ul>
      </div>

      {os === "macos" || os === "linux" ? (
        <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-4">
          <p className="text-sm text-amber-200">
            <i className="fa-solid fa-info-circle mr-2" aria-hidden />
            On Mac/Linux, you might need to make the file executable first:
          </p>
          <code className="mt-2 block rounded bg-gray-900 px-3 py-2 text-sm text-content-secondary">
            chmod +x {binaryName}
          </code>
        </div>
      ) : null}
    </div>
  );

  const renderStep5 = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium text-content-primary">Verify your node is running</h3>
        <p className="mt-2 text-sm text-content-secondary">
          Once your node starts, it will automatically send a signal to this
          website. When we receive it, your status will change to Active.
        </p>
      </div>

      <div
        className={`rounded-lg border p-6 text-center ${
          nodeStatus === "active"
            ? "border-emerald-500/50 bg-emerald-500/10"
            : "border-surface-border bg-surface/60"
        }`}
      >
        {nodeStatus === "active" ? (
          <>
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/20">
              <i
                className="fa-solid fa-circle-check text-4xl text-emerald-400"
                aria-hidden
              />
            </div>
            <h4 className="mt-4 text-xl font-medium text-emerald-300">
              Congratulations!
            </h4>
            <p className="mt-2 text-content-secondary">
              Your node is now <strong className="text-emerald-300">Active</strong>{" "}
              and part of the network.
            </p>
            <p className="mt-1 text-sm text-content-secondary">
              Keep your terminal running to stay active and earn rewards.
            </p>
          </>
        ) : (
          <>
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-gray-700">
              <i
                className="fa-solid fa-spinner fa-spin text-3xl text-content-secondary"
                aria-hidden
              />
            </div>
            <h4 className="mt-4 text-lg font-medium text-content-primary">
              Waiting for your node...
            </h4>
            <p className="mt-2 text-sm text-content-secondary">
              Node ID:{" "}
              <code className="text-content-secondary">{identity.nodeId.slice(0, 8)}...</code>
            </p>
            <p className="mt-1 text-xs text-content-muted">
              Checking every 5 seconds — Waited {elapsedSeconds}s
            </p>
          </>
        )}
      </div>

      {showTroubleshooting && nodeStatus !== "active" && (
        <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-4">
          <h4 className="flex items-center gap-2 font-medium text-amber-200">
            <i className="fa-solid fa-triangle-exclamation" aria-hidden />
            Taking longer than expected?
          </h4>
          <p className="mt-2 text-sm text-content-secondary">Check these common issues:</p>
          <ul className="mt-3 space-y-2 text-sm text-content-secondary">
            <li className="flex items-start gap-2">
              <input type="checkbox" className="mt-1" />
              <span>Is the terminal showing errors? Look for red text.</span>
            </li>
            <li className="flex items-start gap-2">
              <input type="checkbox" className="mt-1" />
              <span>
                Are all files in the right places? Check the folder structure in
                Step 3.
              </span>
            </li>
            <li className="flex items-start gap-2">
              <input type="checkbox" className="mt-1" />
              <span>
                Does the terminal show <code className="text-content-secondary">[READY]</code>?
                If not, the node hasn't fully started.
              </span>
            </li>
            <li className="flex items-start gap-2">
              <input type="checkbox" className="mt-1" />
              <span>
                Is your internet connection working? The node needs to reach our
                servers.
              </span>
            </li>
            <li className="flex items-start gap-2">
              <input type="checkbox" className="mt-1" />
              <span>
                Firewall blocking? Try temporarily disabling your firewall.
              </span>
            </li>
          </ul>
          <p className="mt-4 text-sm text-content-secondary">
            Still stuck?{" "}
            <a
              href="/guide#troubleshooting"
              className="text-accent hover:underline"
            >
              See full troubleshooting guide
            </a>
          </p>
        </div>
      )}

      {nodeStatus === "active" && (
        <button
          type="button"
          onClick={onClose}
          className="w-full rounded-lg bg-accent px-4 py-3 text-sm font-medium text-white hover:bg-accent-muted"
        >
          Go to Dashboard
        </button>
      )}
    </div>
  );

  return (
    <div className="space-y-6">
      {renderProgressBar()}

      <div className="min-h-[400px]">
        {currentStep === 1 && renderStep1()}
        {currentStep === 2 && renderStep2()}
        {currentStep === 3 && renderStep3()}
        {currentStep === 4 && renderStep4()}
        {currentStep === 5 && renderStep5()}
      </div>

      <div className="flex items-center justify-between border-t border-surface-border pt-4">
        <button
          type="button"
          onClick={() => setCurrentStep((s) => Math.max(1, s - 1))}
          disabled={currentStep === 1}
          className="rounded-lg border border-surface-border px-4 py-2 text-sm text-content-secondary hover:border-gray-500 hover:text-content-primary disabled:opacity-30"
        >
          <i className="fa-solid fa-arrow-left mr-2" aria-hidden />
          Back
        </button>

        {currentStep < 5 ? (
          <button
            type="button"
            onClick={() => setCurrentStep((s) => Math.min(5, s + 1))}
            className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent-muted"
          >
            Next
            <i className="fa-solid fa-arrow-right ml-2" aria-hidden />
          </button>
        ) : nodeStatus !== "active" ? (
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-surface-border px-4 py-2 text-sm text-content-secondary hover:border-gray-500 hover:text-content-primary"
          >
            Close and check later
          </button>
        ) : null}
      </div>
    </div>
  );
}
