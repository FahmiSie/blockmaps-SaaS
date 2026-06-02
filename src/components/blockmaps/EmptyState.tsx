import type { LucideIcon } from "lucide-react";
import React from "react";

export interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: React.ReactNode;
}

export function EmptyState({ icon: Icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex h-[320px] w-full flex-col items-center justify-center rounded-md border border-[var(--border-base)] bg-[var(--bg-surface)] p-6 text-center">
      <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[var(--bg-subtle)] text-[var(--text-secondary)] shadow-sm border border-[var(--border-base)]">
        <Icon className="h-8 w-8" />
      </div>
      <h3 className="mb-2 text-[18px] font-medium tracking-tight text-[var(--text-primary)]">
        {title}
      </h3>
      <p className="mb-6 max-w-sm text-[14px] text-[var(--text-secondary)] leading-relaxed">
        {description}
      </p>
      {action && (
        <div className="mt-2">
          {action}
        </div>
      )}
    </div>
  );
}
