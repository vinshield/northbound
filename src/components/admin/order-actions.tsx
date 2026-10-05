"use client";

import { useActionState } from "react";

import { resendConfirmation, updateOrderStatus, type ActionState } from "@/app/admin/actions";
import type { OrderStatus } from "@/lib/types";

const TRANSITIONS: { value: OrderStatus; label: string; hint: string }[] = [
  { value: "fulfilled", label: "Mark as shipped", hint: "The order has left the warehouse." },
  { value: "paid", label: "Move back to paid", hint: "Undo a premature dispatch." },
  { value: "cancelled", label: "Cancel order", hint: "Stock is not returned automatically." },
];

function Feedback({ state }: { state: ActionState }) {
  if (!state) return null;
  return (
    <p
      role="status"
      className={`mt-3 rounded-lg px-3 py-2 text-[13px] ${
        state.ok ? "bg-emerald-50 text-emerald-900" : "bg-sale/10 text-sale"
      }`}
    >
      {state.message}
    </p>
  );
}

export function OrderActions({ orderId, status }: { orderId: string; status: OrderStatus }) {
  const [statusState, statusAction, statusPending] = useActionState<ActionState, FormData>(
    updateOrderStatus,
    null,
  );
  const [emailState, emailAction, emailPending] = useActionState<ActionState, FormData>(
    resendConfirmation,
    null,
  );

  const available = TRANSITIONS.filter((t) => t.value !== status);

  return (
    <>
      <section className="card p-5">
        <h3 className="text-sm font-semibold">Fulfilment</h3>
        <div className="mt-3 space-y-2">
          {available.map((transition) => (
            <form key={transition.value} action={statusAction}>
              <input type="hidden" name="id" value={orderId} />
              <input type="hidden" name="status" value={transition.value} />
              <button
                type="submit"
                disabled={statusPending}
                title={transition.hint}
                className="w-full rounded-lg border border-line-strong bg-surface px-3 py-2.5 text-left text-sm text-ink transition-colors hover:border-ink disabled:opacity-50"
              >
                {transition.label}
              </button>
            </form>
          ))}
          {available.length === 0 && (
            <p className="text-sm text-ink-faint">No further steps from here.</p>
          )}
        </div>
        <Feedback state={statusState} />
      </section>

      <section className="card p-5">
        <h3 className="text-sm font-semibold">Confirmation email</h3>
        <p className="mt-1.5 text-[13px] leading-relaxed text-ink-faint">
          Resends the order confirmation through Mailgun.
        </p>
        <form action={emailAction} className="mt-3">
          <input type="hidden" name="id" value={orderId} />
          <button
            type="submit"
            disabled={emailPending}
            className="btn btn-secondary w-full py-2 text-sm"
          >
            {emailPending ? "Sending…" : "Resend confirmation"}
          </button>
        </form>
        <Feedback state={emailState} />
      </section>
    </>
  );
}
