import { ClientProviders } from "@/app/ClientProviders";
import type { ReactNode } from "react";

export default function GuiAuthLayout({ children }: { children: ReactNode }) {
  return <ClientProviders>{children}</ClientProviders>;
}
