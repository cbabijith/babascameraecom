"use client";

import { useMemo } from "react";
import { Loader2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { GSTData, UserProfile } from "@/types/profile";

/* --------------------------- Configurable limits --------------------------- */
const MAX_NAME_LEN = 50;
const GST_REGEX = /^\d{2}[A-Z]{5}\d{4}[A-Z]{1}[A-Z\d]{1}Z[A-Z\d]{1}$/i;

/* ------------------------------- Skeleton UI ------------------------------- */
function ProfileInfoSkeleton() {
  return (
    <div className="animate-pulse">
      <div className="flex justify-between items-start mb-6 md:mb-8">
        <div className="h-6 w-40 bg-gray-200 rounded" />
        <div className="h-9 w-16 bg-gray-200 rounded" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="space-y-2">
            <div className="h-4 w-32 bg-gray-200 rounded" />
            <div className="h-10 bg-gray-200 rounded" />
          </div>
        ))}
      </div>
    </div>
  );
}

/* ---------------------------------- Props --------------------------------- */
export type ProfileInfoContentProps = {
  loading: boolean;
  isEditing: boolean;
  submitting: boolean;
  profile: UserProfile | null;
  draft: Partial<UserProfile>;
  error: string | null;
  successMessage: string | null;
  startEdit: () => void;
  cancelEdit: () => void;
  saveEdit: () => void;
  onChange: <K extends keyof UserProfile>(key: K, value: UserProfile[K]) => void;
  onGSTDataChange: (key: keyof GSTData, value: string) => void;
  reload: () => void;
  USER_TYPES: ("Retailer" | "Consumer")[];
};

export default function ProfileInfoContent({
  loading,
  isEditing,
  submitting,
  profile,
  draft,
  error,
  successMessage,
  startEdit,
  cancelEdit,
  saveEdit,
  onChange,
  onGSTDataChange,
  reload,
  USER_TYPES,
}: ProfileInfoContentProps) {
  /* ------------------------------ Validations ------------------------------ */
  const { nameError, phoneError, emailError, gstError, isFormValid } = useMemo(() => {
    const name = (draft.name ?? "").trim();
    const phoneDigits = (draft.phone ?? "").replace(/\D/g, "");
    const email = (draft.email ?? "").trim();
    const gstNumber = draft.gstData?.gstNumber?.trim().toUpperCase() ?? "";

    const nameError =
      !name ? "Name is required" : name.length > MAX_NAME_LEN ? `Max ${MAX_NAME_LEN} characters` : undefined;

    const phoneError =
      !phoneDigits
        ? "Mobile number is required"
        : /^\d{10}$/.test(phoneDigits)
        ? undefined
        : "Enter a valid 10-digit mobile number";

    const emailError =
      !email
        ? "Email is required"
        : /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i.test(email)
        ? undefined
        : "Enter a valid email address";

    let gstError: string | undefined;
    if (draft.isGSTRegistered) {
      gstError = !gstNumber
        ? "GST number is required"
        : GST_REGEX.test(gstNumber)
        ? undefined
        : "Enter a valid GSTIN (15 chars)";
    }

    const isFormValid = !nameError && !phoneError && !emailError && !gstError;
    return { nameError, phoneError, emailError, gstError, isFormValid };
  }, [draft.name, draft.phone, draft.email, draft.isGSTRegistered, draft.gstData?.gstNumber]);

  const gstEnabled = !!draft.isGSTRegistered;

  /* ----------------------------- Loading state ----------------------------- */
  if (loading) return <ProfileInfoSkeleton />;

  /* --------------------------------- Render -------------------------------- */
  return (
    <div>
      {/* Header */}
      <div className="flex justify-between items-start mb-6 md:mb-8">
        <h1 className="text-[20px] md:text-[24px] font-[650] text-[#1E293B]">Profile Info</h1>
        {!isEditing && profile ? (
          <Button
            variant="outline"
            onClick={startEdit}
            className="text-[12px] md:text-[14px] font-[500] text-[#1E293B] border-[#E4E4E7] hover:bg-gray-50 px-3 py-1 md:px-4 md:py-2"
          >
            Edit
          </Button>
        ) : null}
      </div>

      {/* Error */}
      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md flex items-center gap-2 text-red-700">
          <AlertCircle className="h-4 w-4 flex-shrink-0" />
          <span className="text-sm">{error}</span>
          {!profile && (
            <button onClick={reload} className="ml-auto text-sm underline hover:no-underline">
              Retry
            </button>
          )}
        </div>
      )}

      {/* Success */}
      {successMessage && (
        <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-md flex items-center gap-2 text-green-700">
          <div className="h-4 w-4 rounded-full bg-green-500 flex items-center justify-center">
            <div className="h-2 w-2 bg-white rounded-full" />
          </div>
          <span className="text-sm">{successMessage}</span>
        </div>
      )}

      {/* Body */}
      {profile ? (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
            {/* Name */}
            <div>
              <label className="block text-[14px] font-[500] text-[#1E293B] mb-2">Your Full Name *</label>
              <Input
                type="text"
                value={draft.name || ""}
                onChange={(e) => onChange("name", e.target.value)}
                disabled={!isEditing || submitting}
                maxLength={MAX_NAME_LEN}
                className={`h-10 md:h-9 text-[14px] ${nameError && isEditing ? "border-red-500" : ""}`}
              />
              {isEditing && nameError && <p className="mt-1 text-xs text-red-600">{nameError}</p>}
              {isEditing && draft.name && (
                <p className="mt-1 text-[11px] text-gray-500">
                  {(draft.name ?? "").length}/{MAX_NAME_LEN}
                </p>
              )}
            </div>

            {/* Phone */}
            <div>
              <label className="block text-[14px] font-[500] text-[#1E293B] mb-2">Mobile Number *</label>
              <Input
                type="tel"
                value={draft.phone || ""}
                onChange={(e) => onChange("phone", e.target.value.replace(/\D/g, ""))}
                disabled={!isEditing || submitting}
                maxLength={10}
                inputMode="numeric"
                className={`h-10 md:h-9 text-[14px] ${phoneError && isEditing ? "border-red-500" : ""}`}
              />
              {isEditing && phoneError && <p className="mt-1 text-xs text-red-600">{phoneError}</p>}
            </div>

            {/* Email */}
            <div>
              <label className="block text-[14px] font-[500] text-[#1E293B] mb-2">Email *</label>
              <Input
                type="email"
                value={draft.email || ""}
                onChange={(e) => onChange("email", e.target.value)}
                disabled={!isEditing || submitting}
                className={`h-10 md:h-9 text-[14px] ${emailError && isEditing ? "border-red-500" : ""}`}
              />
              {isEditing && emailError && <p className="mt-1 text-xs text-red-600">{emailError}</p>}
            </div>

            {/* Type */}
            <div>
              <label className="block text-[14px] font-[500] text-[#1E293B] mb-2">Type</label>
              <select
                value={draft.userType || "Consumer"}
                onChange={(e) => onChange("userType", e.target.value as "Retailer" | "Consumer")}
                disabled={!isEditing || submitting}
                className="w-full border border-input bg-background p-2 rounded-md h-10 md:h-9 text-[14px] disabled:opacity-50"
              >
                {USER_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* GST (always visible) */}
          <div className="mt-6 md:mt-8">
            <div className="flex items-start gap-3 mb-4">
              <input
                type="checkbox"
                checked={draft.isGSTRegistered || false}
                onChange={(e) => {
                  const checked = e.target.checked;
                  onChange("isGSTRegistered", checked);
                  if (!checked) {
                    // clear on uncheck
                    onGSTDataChange("gstNumber", "");
                    onGSTDataChange("registeredCompanyName", "");
                  }
                }}
                disabled={!isEditing || submitting}
                className="w-4 h-4 mt-0.5 text-[#E72429]"
              />
              <span className="text-[14px] font-[500] text-[#64748B] leading-5">
                Customer has GST No. (Optional)
              </span>
            </div>

            <div
              className={`grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6 transition-opacity ${
                !gstEnabled ? "opacity-60" : "opacity-100"
              }`}
              aria-disabled={!gstEnabled}
            >
              {/* GST Number */}
              <div>
                <label className="block text-[14px] font-[500] text-[#1E293B] mb-2">
                  GST Number {gstEnabled && <span className="text-red-500">*</span>}
                </label>
                <Input
                  type="text"
                  value={draft.gstData?.gstNumber || ""}
                  onChange={(e) => onGSTDataChange("gstNumber", e.target.value.toUpperCase())}
                  placeholder="15-character GSTIN"
                  disabled={!isEditing || submitting || !gstEnabled}
                  className={`h-10 md:h-9 text-[14px] ${
                    gstEnabled && isEditing && !!gstError ? "border-red-500" : ""
                  } ${!gstEnabled ? "bg-gray-100" : ""}`}
                  maxLength={15}
                />
                {gstEnabled && isEditing && !!gstError && (
                  <p className="mt-1 text-xs text-red-600">{gstError}</p>
                )}
              </div>

              {/* Company Name */}
              <div>
                <label className="block text-[14px] font-[500] text-[#1E293B] mb-2">
                  Company Name {gstEnabled && <span className="text-red-500">*</span>}
                </label>
                <Input
                  type="text"
                  value={draft.gstData?.registeredCompanyName || ""}
                  onChange={(e) => onGSTDataChange("registeredCompanyName", e.target.value)}
                  placeholder="Registered company name"
                  disabled={!isEditing || submitting || !gstEnabled}
                  className={`h-10 md:h-9 text-[14px] ${!gstEnabled ? "bg-gray-100" : ""}`}
                  maxLength={80}
                />
              </div>
            </div>
          </div>

          {/* Actions */}
          {isEditing && (
            <div className="flex flex-col-reverse md:flex-row justify-end gap-3 mt-8 md:mt-10">
              {/* cancel: force visible styles */}
              <button
                type="button"
                onClick={cancelEdit}
                disabled={submitting}
                className="w-full md:w-auto h-10 md:h-9 rounded-md bg-white border border-slate-300 text-slate-800 px-4 hover:bg-slate-50 disabled:opacity-50"
              >
                Cancel
              </button>

              <Button
                onClick={saveEdit}
                disabled={submitting || !isFormValid}
                className="w-full md:w-auto h-10 md:h-9 bg-[#1E293B] hover:bg-[#1E293B]/90 text-white disabled:opacity-50 flex items-center justify-center gap-2"
                title={!isFormValid ? "Fix validation errors to continue" : undefined}
              >
                {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
                Save
              </Button>
            </div>
          )}
        </>
      ) : (
        <div className="text-center py-8">
          <p className="text-gray-500 mb-4">Failed to load profile information</p>
          <Button onClick={reload} variant="outline">
            Try Again
          </Button>
        </div>
      )}
    </div>
  );
}
