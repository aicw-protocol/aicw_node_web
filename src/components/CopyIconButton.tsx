"use client";

import toast from "react-hot-toast";

interface CopyIconButtonProps {
  value: string;
  label?: string;
}

export function CopyIconButton({ value, label = "Value" }: CopyIconButtonProps) {
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      toast.success(`${label} copied`);
    } catch {
      toast.error("Copy failed");
    }
  };

  return (
    <button
      type="button"
      onClick={handleCopy}
      className="inline-flex shrink-0 rounded p-1 text-content-muted transition hover:text-content-secondary"
      aria-label={`Copy ${label}`}
    >
      <i className="fa-regular fa-copy text-[0.7rem]" aria-hidden />
    </button>
  );
}
