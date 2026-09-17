import { Breadcrumbs } from "./breadcrumbs";

export function StaticPage({
  title,
  path,
  updated,
  children,
}: {
  title: string;
  path: string;
  updated?: string;
  children: React.ReactNode;
}) {
  return (
    <main className="container-mp space-y-6 py-6">
      <Breadcrumbs
        crumbs={[
          { name: "Home", path: "/" },
          { name: title, path },
        ]}
      />
      <h1>{title}</h1>
      {updated && <p className="text-muted-foreground text-sm">Last updated {updated}</p>}
      <div className="static-prose prose-mp space-y-4 [&_a]:underline [&_h2]:mt-8 [&_li]:mt-1 [&_ol]:list-decimal [&_ol]:pl-6 [&_ul]:list-disc [&_ul]:pl-6">
        {children}
      </div>
    </main>
  );
}
