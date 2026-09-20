import { cn } from "@/lib/utils";

/** Table primitives, free of server-only imports so client components can use them. */

export function LedgerTable({
  caption,
  children,
  className,
}: {
  caption: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    // Keyboard users must be able to scroll the table sideways, so the container is focusable.
    <div
      role="region"
      aria-label={caption}
      tabIndex={0}
      className={cn("-mx-4 overflow-x-auto px-4 focus-visible:outline-3 sm:mx-0 sm:px-0", className)}
    >
      <table className="w-full min-w-[32rem] border-collapse text-left">
        <caption className="sr-only">{caption}</caption>
        {children}
      </table>
    </div>
  );
}

export const th = "border-b-2 px-2 py-2 text-sm font-semibold";
export const td = "border-b border-border px-2 py-3 align-top";
export const tdNum = "border-b border-border px-2 py-3 text-right figures font-semibold whitespace-nowrap";
