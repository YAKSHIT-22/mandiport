import Link from "next/link";
import { SearchBox } from "@/components/site/search-box";

export default function NotFound() {
  return (
    <main className="container-mp space-y-4 py-10">
      <h1>Page not found</h1>
      <p>
        This page does not exist, or the crop or market name has changed. Search for it below or browse all
        crops.
      </p>
      <div className="max-w-xl">
        <SearchBox />
      </div>
      <p>
        <Link href="/crops" className="underline">
          Browse all crops
        </Link>
      </p>
    </main>
  );
}
