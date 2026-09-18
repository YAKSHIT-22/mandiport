import type { MDXComponents } from "mdx/types";
import Link from "next/link";

/** Guide typography (SPEC §9.5). Internal links use next/link. */
export function useMDXComponents(components: MDXComponents): MDXComponents {
  return {
    h2: (props) => <h2 className="mt-10 mb-3" {...props} />,
    h3: (props) => <h3 className="mt-8 mb-2" {...props} />,
    p: (props) => <p className="mt-4" {...props} />,
    ul: (props) => <ul className="mt-4 list-disc space-y-1 pl-6" {...props} />,
    ol: (props) => <ol className="mt-4 list-decimal space-y-1 pl-6" {...props} />,
    table: (props) => (
      <div className="mt-4 overflow-x-auto" role="region" tabIndex={0} aria-label="Table">
        <table className="w-full text-left" {...props} />
      </div>
    ),
    th: (props) => <th className="border-b-2 px-2 py-2 text-sm" {...props} />,
    td: (props) => <td className="border-b px-2 py-2" {...props} />,
    blockquote: (props) => <blockquote className="text-muted-foreground mt-4 border-l-4 pl-4" {...props} />,
    a: ({ href = "", children, ...props }) =>
      href.startsWith("/") ? (
        <Link href={href} className="underline" {...props}>
          {children}
        </Link>
      ) : (
        <a href={href} className="underline" rel="noopener" target="_blank" {...props}>
          {children}
        </a>
      ),
    ...components,
  };
}
