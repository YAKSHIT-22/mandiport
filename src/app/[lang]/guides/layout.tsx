/** Reading layout for guides. MDX pages get the prose width; index pages set their own. */
export default function GuidesLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="container-mp py-6">
      <div className="prose-mp [&_h1]:mb-2">{children}</div>
    </div>
  );
}
