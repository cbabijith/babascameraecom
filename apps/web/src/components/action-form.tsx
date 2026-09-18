"use client";

import {
  useActionState,
  useEffect,
  useRef,
  type ComponentProps,
} from "react";
import { useRouter } from "next/navigation";
import { toast } from "@babascamera/ui";
import type { StorefrontActionState } from "@/lib/action-state";

type FormSubmitter = (
  formData: FormData,
) => Promise<StorefrontActionState<unknown>>;

type ActionFormProps = Omit<ComponentProps<"form">, "action"> & {
  action: FormSubmitter;
  showMessage?: boolean;
  resetOnSuccess?: boolean;
};

function firstError(state: StorefrontActionState<unknown>): string {
  if (state.success) return state.message;
  if (typeof state.error === "string") return state.error;
  return (
    state.error.formErrors[0] ??
    Object.values(state.error.fieldErrors).flat().find(Boolean) ??
    state.message
  );
}

export function ActionForm({
  action,
  children,
  showMessage = false,
  resetOnSuccess = false,
  ...props
}: ActionFormProps) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const handledState = useRef<StorefrontActionState<unknown> | null>(null);
  const [state, formAction, pending] = useActionState(
    async (
      _previous: StorefrontActionState<unknown> | null,
      formData: FormData,
    ) => action(formData),
    null,
  );

  useEffect(() => {
    if (!state || handledState.current === state) return;
    handledState.current = state;
    if (state.success) {
      toast.success(state.message);
      if (resetOnSuccess) formRef.current?.reset();
      // Server actions refreshed the tree automatically; API mutations
      // must ask for it explicitly.
      router.refresh();
      return;
    }
    toast.error(firstError(state));
    if (!state.success && state.redirectTo) {
      router.push(state.redirectTo);
    }
  }, [resetOnSuccess, router, state]);

  return (
    <form
      {...props}
      ref={formRef}
      action={formAction}
      aria-busy={pending}
    >
      <fieldset disabled={pending} className="contents">
        {children}
      </fieldset>
      {showMessage && state ? (
        <p
          role={state.success ? "status" : "alert"}
          className={`mt-2 text-sm ${
            state.success ? "text-emerald-700" : "text-red-600"
          }`}
        >
          {state.success ? state.message : firstError(state)}
        </p>
      ) : null}
    </form>
  );
}
