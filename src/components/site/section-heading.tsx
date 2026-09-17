import { cn } from "@/lib/utils";

/** Section header with optional eyebrow and an action on the right (NightLore pattern). */
export function SectionHeading({
  id,
  eyebrow,
  title,
  description,
  action,
  as: Tag = "h2",
  className,
}: {
  id?: string;
  eyebrow?: string;
  title: string;
  description?: string;
  action?: React.ReactNode;
  as?: "h1" | "h2" | "h3";
  className?: string;
}) {
  return (
    <div className={cn("mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between", className)}>
      <div className="max-w-2xl">
        {eyebrow && <p className="eyebrow mb-2">{eyebrow}</p>}
        <Tag id={id}>{title}</Tag>
        {description && <p className="text-muted-foreground mt-2">{description}</p>}
      </div>
      {action}
    </div>
  );
}
