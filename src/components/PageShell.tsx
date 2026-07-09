import type { ReactNode } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { PAGE_CONTAINER } from "@/lib/layout";

export function PageShell({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children?: ReactNode;
}) {
  return (
    <div className={`${PAGE_CONTAINER} py-6 sm:py-8 lg:py-10`}>
      <div className="mb-6 sm:mb-8">
        <h1 className="text-2xl font-semibold tracking-tight text-content-primary sm:text-3xl">
          {title}
        </h1>
        {description ? (
          <p className="mt-2 max-w-2xl text-sm text-content-secondary sm:text-base">
            {description}
          </p>
        ) : null}
      </div>
      {children}
    </div>
  );
}

export function AppLayout({ children }: { children: ReactNode }) {
  return <AppShell>{children}</AppShell>;
}
