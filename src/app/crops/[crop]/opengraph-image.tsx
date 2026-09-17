import { ImageResponse } from "next/og";
import { formatDataDate } from "@/lib/dates";
import { formatRupees } from "@/lib/format";
import { getCropBySlug, getNationalSeries } from "@/lib/queries/crop";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "Crop price summary from Mandiport";
export const revalidate = 21600;

/** Dynamic OG image: crop name, latest national median price and its date (SPEC §9.1). */
export default async function Image({ params }: { params: Promise<{ crop: string }> }) {
  const { crop: slug } = await params;
  const crop = await getCropBySlug(slug);
  const latest = crop ? (await getNationalSeries(crop.id)).at(-1) : undefined;

  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        background: "#1e3a2f",
        color: "#f8f4ea",
        padding: 72,
      }}
    >
      <div style={{ fontSize: 40, fontWeight: 700 }}>Mandiport</div>
      <div style={{ display: "flex", flexDirection: "column" }}>
        <div style={{ fontSize: 64, fontWeight: 700 }}>{crop ? `${crop.name} prices` : "Mandi prices"}</div>
        {latest ? (
          <>
            <div
              style={{ fontSize: 120, fontWeight: 800, marginTop: 12 }}
            >{`${formatRupees(latest.value)}/quintal`}</div>
            <div
              style={{ fontSize: 36, marginTop: 8 }}
            >{`National median · data from ${formatDataDate(latest.date)}`}</div>
          </>
        ) : (
          <div style={{ fontSize: 40, marginTop: 12 }}>Official Government of India market data</div>
        )}
      </div>
      <div style={{ fontSize: 28, color: "#e3a21a" }}>Source: Agmarknet via data.gov.in</div>
    </div>,
    size,
  );
}
