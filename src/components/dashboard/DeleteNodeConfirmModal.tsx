"use client";

import { useEffect, useId, useRef } from "react";
import type { NodeRecord } from "@/lib/db/types";
import { formatUnstakeReturnWait } from "@/lib/unstakeConstants";
import { isNodePingActive } from "@/lib/nodePing";

interface DeleteNodeConfirmModalProps {
  node: NodeRecord;
  open: boolean;
  deleting: boolean;
  isLastNode: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}

export function DeleteNodeConfirmModal({
  node,
  open,
  deleting,
  isLastNode,
  onCancel,
  onConfirm,
}: DeleteNodeConfirmModalProps) {
  const titleId = useId();
  const cancelRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;

    cancelRef.current?.focus();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !deleting) {
        onCancel();
      }
    };

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, deleting, onCancel]);

  if (!open) return null;

  const displayName = node.nodeName ?? node.nodeId;
  const nodeRunning = isNodePingActive(node.lastPingAt);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: "var(--color-overlay)" }}
      role="presentation"
      onClick={deleting ? undefined : onCancel}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="w-full max-w-md rounded-xl border border-surface-border bg-surface-panel p-6 shadow-xl"
        onClick={(event) => event.stopPropagation()}
      >
        <h3 id={titleId} className="text-base font-medium text-content-primary">
          Remove node?
        </h3>
        <p className="mt-2 text-sm text-content-secondary">
          <span className="text-content-primary">{displayName}</span> will be removed from
          the network registration.
        </p>
        <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-content-secondary">
          {nodeRunning ? (
            <li>
              This node is still sending pings. Stop it in the desktop app first, then wait a
              few minutes.
            </li>
          ) : null}
          <li>
            In the desktop app, use <strong className="text-content-primary">Remove node</strong>{" "}
            to stop the process and delete local identity files on your PC.
          </li>
          {isLastNode ? (
            <li>
              This is your last node — staked SOL will be scheduled for return{" "}
              {formatUnstakeReturnWait()}.
            </li>
          ) : (
            <li>Your other registered nodes are not affected.</li>
          )}
        </ul>
        <p className="mt-2 font-mono text-xs text-content-muted break-all">{node.nodeId}</p>

        <div className="mt-6 flex justify-end gap-4">
          <button
            ref={cancelRef}
            type="button"
            onClick={onCancel}
            disabled={deleting}
            className="text-sm text-content-muted transition hover:text-content-primary disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={deleting}
            className="rounded-lg border border-red-500/30 px-3 py-1.5 text-sm text-red-300 hover:bg-red-500/10 disabled:opacity-50"
          >
            {deleting ? "Removing…" : "Remove node"}
          </button>
        </div>
      </div>
    </div>
  );
}
