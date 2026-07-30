"use client";

import {
  useActionState,
  useEffect,
  useRef,
  type ComponentProps,
} from "react";
import { toast } from "@babascamera/ui";
import type { StorefrontActionState } from "@/lib/action-state";

type ServerFormAction = (
  formData: FormData,
) => Promise<StorefrontActionState<unknown>>;

type ActionFormProps = Omit<ComponentProps<"form">, "action"> & {
  action: ServerFormAction;
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
      return;
    }
    toast.error(firstError(state));
  }, [resetOnSuccess, state]);

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
