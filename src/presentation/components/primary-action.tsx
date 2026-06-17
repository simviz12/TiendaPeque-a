import type { LucideIcon } from "lucide-react";
import Link from "next/link";

type PrimaryActionProps = {
  icon: LucideIcon;
  label: string;
  helper: string;
  href?: string;
};

export function PrimaryAction({ icon: Icon, label, helper, href }: PrimaryActionProps) {
  const content = (
    <>
      <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-lg bg-emerald-100 text-emerald-800">
        <Icon aria-hidden="true" size={32} strokeWidth={2.4} />
      </span>
      <span className="min-w-0">
        <span className="block text-xl font-bold text-slate-950">{label}</span>
        <span className="mt-1 block text-base leading-6 text-slate-600">{helper}</span>
      </span>
    </>
  );

  const className = "flex min-h-28 w-full items-center gap-5 rounded-lg border border-slate-200 bg-white p-5 text-left shadow-sm transition hover:border-emerald-500 hover:bg-emerald-50 focus:outline-none focus:ring-4 focus:ring-emerald-200";

  if (href) {
    return (
      <Link href={href} className={className}>
        {content}
      </Link>
    );
  }

  return (
    <button className={className}>
      {content}
    </button>
  );
}
