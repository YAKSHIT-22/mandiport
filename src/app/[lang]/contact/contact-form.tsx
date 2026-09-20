"use client";

import { useActionState } from "react";
import { Field, Input, Textarea } from "@/components/ui/field";
import { sendContact, type ContactState } from "./actions";

export function ContactForm() {
  const [state, action, pending] = useActionState<ContactState, FormData>(sendContact, { status: "idle" });
  if (state.status === "sent") {
    return (
      <p role="status" className="border-primary bg-muted border-l-4 px-4 py-3 font-semibold">
        Thank you. Your message has been received.
      </p>
    );
  }
  const err = state.fieldErrors ?? {};
  return (
    <form action={action} className="space-y-4" noValidate>
      {state.status === "error" && state.message && (
        <p role="alert" className="text-fall font-semibold">
          {state.message}
        </p>
      )}
      <Field label="Your name" htmlFor="name" error={err.name}>
        <Input id="name" name="name" autoComplete="name" required aria-invalid={Boolean(err.name)} />
      </Field>
      <Field label="Email address" htmlFor="email" hint="Only used to reply to you." error={err.email}>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          aria-invalid={Boolean(err.email)}
        />
      </Field>
      <Field label="Message" htmlFor="message" error={err.message}>
        <Textarea id="message" name="message" rows={6} required aria-invalid={Boolean(err.message)} />
      </Field>
      <div aria-hidden="true" className="absolute -left-[9999px]">
        <label htmlFor="website">Website</label>
        <input id="website" name="website" tabIndex={-1} autoComplete="off" />
      </div>
      <button
        type="submit"
        disabled={pending}
        className="bg-panel text-panel-foreground min-h-12 rounded-sm px-6 font-semibold"
      >
        {pending ? "Sending…" : "Send message"}
      </button>
    </form>
  );
}
