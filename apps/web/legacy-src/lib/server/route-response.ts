import "server-only";

import { NextResponse } from "next/server";
import {
  AccountInactiveError,
  AuthenticationRequiredError,
} from "@/lib/supabase/user";
import { SupabaseConfigurationError } from "@/lib/supabase/config";
import { CheckoutError } from "./checkout";
import { CommerceDataError } from "./catalog";
import { CustomerDataError } from "./customer";

export function apiErrorResponse(error: unknown) {
  if (error instanceof AuthenticationRequiredError) {
    return NextResponse.json(
      { success: false, message: error.message },
      { status: 401 },
    );
  }
  if (error instanceof AccountInactiveError) {
    return NextResponse.json(
      { success: false, message: error.message },
      { status: 403 },
    );
  }
  if (
    error instanceof CheckoutError ||
    error instanceof CustomerDataError
  ) {
    return NextResponse.json(
      { success: false, message: error.message },
      { status: error.status },
    );
  }
  if (error instanceof CommerceDataError) {
    return NextResponse.json(
      { success: false, message: error.message },
      { status: 503 },
    );
  }
  if (error instanceof SupabaseConfigurationError) {
    return NextResponse.json(
      { success: false, message: error.message },
      { status: 503 },
    );
  }
  const message =
    error instanceof Error && error.message
      ? error.message
      : "Unexpected server error.";
  return NextResponse.json({ success: false, message }, { status: 500 });
}
