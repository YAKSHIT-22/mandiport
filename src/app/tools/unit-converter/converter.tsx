"use client";

import { useState } from "react";
import { Field, Input } from "@/components/ui/field";
import { formatNumber } from "@/lib/format";

type Unit = "quintal" | "kg" | "tonne";
const PER_QUINTAL: Record<Unit, number> = { quintal: 1, kg: 0.01, tonne: 10 };
const LABEL: Record<Unit, string> = {
  quintal: "₹ per quintal (100 kg)",
  kg: "₹ per kg",
  tonne: "₹ per tonne (1,000 kg)",
};

export function UnitConverter() {
  const [value, setValue] = useState("2500");
  const [unit, setUnit] = useState<Unit>("quintal");
  const [usdRate, setUsdRate] = useState("");

  const amount = Number(value);
  const valid = Number.isFinite(amount) && amount >= 0 && value.trim() !== "";
  const perQuintal = valid ? amount / PER_QUINTAL[unit] : null;
  const rate = Number(usdRate);
  const usdValid = Number.isFinite(rate) && rate > 0;

  const rows: { label: string; value: string }[] = perQuintal
    ? [
        { label: LABEL.quintal, value: `₹${formatNumber(perQuintal)}` },
        { label: LABEL.kg, value: `₹${(perQuintal / 100).toFixed(2)}` },
        { label: LABEL.tonne, value: `₹${formatNumber(perQuintal * 10)}` },
        ...(usdValid
          ? [
              { label: "US$ per quintal", value: `$${(perQuintal / rate).toFixed(2)}` },
              { label: "US$ per tonne", value: `$${((perQuintal * 10) / rate).toFixed(2)}` },
            ]
          : []),
      ]
    : [];

  return (
    <div className="grid gap-6 md:grid-cols-[minmax(0,22rem)_1fr]">
      <form className="space-y-4" onSubmit={(e) => e.preventDefault()}>
        <Field label="Price" htmlFor="amount">
          <Input
            id="amount"
            inputMode="decimal"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            aria-invalid={!valid}
          />
        </Field>
        <fieldset>
          <legend className="font-semibold">Unit</legend>
          <div className="mt-1 flex flex-wrap gap-2">
            {(Object.keys(PER_QUINTAL) as Unit[]).map((u) => (
              <label key={u} className="relative">
                <input
                  type="radio"
                  name="unit"
                  className="peer absolute inset-0 opacity-0"
                  checked={unit === u}
                  onChange={() => setUnit(u)}
                />
                <span className="border-input peer-checked:bg-primary peer-checked:text-primary-foreground inline-flex min-h-11 cursor-pointer items-center rounded-md border px-3 font-semibold">
                  per {u}
                </span>
              </label>
            ))}
          </div>
        </fieldset>
        <Field
          label="Rupees per US dollar (optional)"
          htmlFor="usd"
          hint="Enter today’s rate from your bank to see dollar values."
        >
          <Input
            id="usd"
            inputMode="decimal"
            value={usdRate}
            onChange={(e) => setUsdRate(e.target.value)}
            placeholder="e.g. 88.50"
          />
        </Field>
      </form>
      <div>
        {valid ? (
          <table className="w-full text-left">
            <caption className="sr-only">Converted prices</caption>
            <tbody>
              {rows.map((r) => (
                <tr key={r.label} className="border-b">
                  <th scope="row" className="py-3 pr-4 font-normal">
                    {r.label}
                  </th>
                  <td className="figures py-3 text-right text-lg font-bold">{r.value}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p role="status" className="border-border bg-muted border-l-4 px-4 py-3">
            Enter a price to convert.
          </p>
        )}
      </div>
    </div>
  );
}
