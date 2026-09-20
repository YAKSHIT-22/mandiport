"use client";

import type { Dictionary } from "@/content/i18n/en";

import { useActionState, useState } from "react";
import { Button } from "@/components/ui/button";
import { Field, Input, Select } from "@/components/ui/field";
import { track } from "@/lib/analytics";
import type { CropOption, StateOption } from "@/lib/queries/tools";
import { createAlert, type AlertState } from "./actions";

export function AlertForm({
  crops,
  states,
  initialCrop,
  disabled,
  labels,
}: {
  crops: CropOption[];
  states: StateOption[];
  initialCrop?: string;
  disabled: boolean;
  labels: Dictionary["alerts"];
}) {
  const [state, action, pending] = useActionState<AlertState, FormData>(createAlert, { status: "idle" });
  const [direction, setDirection] = useState<"above" | "below">("above");
  const [crop, setCrop] = useState(initialCrop ?? crops[0]?.slug ?? "");

  if (state.status === "created") {
    return (
      <p role="status" className="border-primary bg-muted border-l-4 px-4 py-3 font-semibold">
        Alert saved. You will get a Telegram message when the price crosses your level. Send /stop to the bot
        to remove it.
      </p>
    );
  }

  const err = state.fieldErrors ?? {};
  return (
    <form
      action={(formData) => {
        track("alert_created", { crop, direction });
        return action(formData);
      }}
      className="bg-card grid max-w-2xl gap-4 rounded-lg border p-4"
    >
      {state.status === "error" && state.message && (
        <p role="alert" className="text-destructive font-semibold">
          {state.message}
        </p>
      )}
      <Field label={labels.code} htmlFor="code" error={err.code}>
        <Input
          id="code"
          name="code"
          maxLength={6}
          autoCapitalize="characters"
          required
          disabled={disabled}
          aria-invalid={Boolean(err.code)}
        />
      </Field>
      <Field label={labels.crop} htmlFor="crop" error={err.crop}>
        <Select
          id="crop"
          name="crop"
          value={crop}
          onChange={(e) => setCrop(e.target.value)}
          required
          disabled={disabled}
        >
          {crops.map((c) => (
            <option key={c.slug} value={c.slug}>
              {c.name}
            </option>
          ))}
        </Select>
      </Field>
      <Field label={labels.state} htmlFor="state" hint={labels.stateHint}>
        <Select id="state" name="state" defaultValue="" disabled={disabled}>
          <option value="">{labels.allIndia}</option>
          {states.map((s) => (
            <option key={s.slug} value={s.slug}>
              {s.name}
            </option>
          ))}
        </Select>
      </Field>
      <fieldset>
        <legend className="font-semibold">Tell me when the price is</legend>
        <div className="mt-1 flex gap-2">
          {(["above", "below"] as const).map((value) => (
            <label key={value} className="relative">
              <input
                type="radio"
                name="direction"
                value={value}
                checked={direction === value}
                onChange={() => setDirection(value)}
                className="peer absolute inset-0 opacity-0"
                disabled={disabled}
              />
              <span className="border-input peer-checked:bg-primary peer-checked:text-primary-foreground inline-flex min-h-11 cursor-pointer items-center rounded-md border px-4 font-semibold">
                {value}
              </span>
            </label>
          ))}
        </div>
      </fieldset>
      <Field label={labels.threshold} htmlFor="threshold" error={err.threshold}>
        <Input
          id="threshold"
          name="threshold"
          inputMode="numeric"
          required
          disabled={disabled}
          aria-invalid={Boolean(err.threshold)}
        />
      </Field>
      <Button type="submit" disabled={disabled || pending}>
        {pending ? labels.saving : labels.create}
      </Button>
      <p className="text-muted-foreground text-sm">
        At most one message per alert per day. Prices are as reported by markets and may be a few days old.
      </p>
    </form>
  );
}
