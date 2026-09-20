"use client";

import { useState } from "react";
import { Field, Input } from "@/components/ui/field";
import { formatNumber } from "@/lib/format";

type Unit = "quintal" | "kg" | "tonne";
const PER_QUINTAL: Record<Unit, number> = { quintal: 1, kg: 0.01, tonne: 10 };
export interface ConverterLabels {
  price: string;
  unit: string;
  perQuintalLabel: string;
  perKgLabel: string;
  perTonneLabel: string;
  perQuintalShort: string;
  perKgShort: string;
  perTonneShort: string;
  usdPerQuintal: string;
  usdPerTonne: string;
  rateLabel: string;
  rateHint: string;
  ratePlaceholder: string;
  caption: string;
  enterPrice: string;
}

export function UnitConverter({ labels }: { labels: ConverterLabels }) {
  const LABEL: Record<Unit, string> = {
    quintal: labels.perQuintalLabel,
    kg: labels.perKgLabel,
    tonne: labels.perTonneLabel,
  };
  const SHORT: Record<Unit, string> = {
    quintal: labels.perQuintalShort,
    kg: labels.perKgShort,
    tonne: labels.perTonneShort,
  };
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
              { label: labels.usdPerQuintal, value: `$${(perQuintal / rate).toFixed(2)}` },
              { label: labels.usdPerTonne, value: `$${((perQuintal * 10) / rate).toFixed(2)}` },
            ]
          : []),
      ]
    : [];

  return (
    <div className="grid gap-6 md:grid-cols-[minmax(0,22rem)_1fr]">
      <form className="space-y-4" onSubmit={(e) => e.preventDefault()}>
        <Field label={labels.price} htmlFor="amount">
          <Input
            id="amount"
            inputMode="decimal"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            aria-invalid={!valid}
          />
        </Field>
        <fieldset>
          <legend className="font-semibold">{labels.unit}</legend>
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
                  {SHORT[u]}
                </span>
              </label>
            ))}
          </div>
        </fieldset>
        <Field label={labels.rateLabel} htmlFor="usd" hint={labels.rateHint}>
          <Input
            id="usd"
            inputMode="decimal"
            value={usdRate}
            onChange={(e) => setUsdRate(e.target.value)}
            placeholder={labels.ratePlaceholder}
          />
        </Field>
      </form>
      <div>
        {valid ? (
          <table className="w-full text-left">
            <caption className="sr-only">{labels.caption}</caption>
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
            {labels.enterPrice}
          </p>
        )}
      </div>
    </div>
  );
}
