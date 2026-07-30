import { NextResponse } from "next/server";
import {
  deletePendingBankTransferProof,
  uploadBankTransferProof,
} from "@/lib/server/checkout";
import { apiErrorResponse } from "@/lib/server/route-response";
import { asRow, asString } from "@/lib/server/shapes";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const form = await request.formData();
    const value = form.get("file");
    if (!(value instanceof File)) {
      return NextResponse.json(
        { success: false, message: "A proof file is required." },
        { status: 400 },
      );
    }
    const result = await uploadBankTransferProof(value);
    return NextResponse.json({
      success: true,
      message: "Proof uploaded.",
      result: { _id: result.path, ...result },
    });
  } catch (error) {
    return apiErrorResponse(error);
  }
}

export async function DELETE(request: Request) {
  try {
    const body = asRow(await request.json());
    const path = asString(body.path);
    if (!path) {
      return NextResponse.json(
        { success: false, message: "Proof path is required." },
        { status: 400 },
      );
    }
    await deletePendingBankTransferProof(path);
    return NextResponse.json({ success: true, message: "Proof removed." });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
