"use client";

import React, { useMemo } from "react";
import { Loader2, AlertCircle } from "lucide-react";
import { Input } from "@/components/ui/input";
import { State as CscState } from "country-state-city";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";

import type {
  Address,
  AddressType,
  CreateAddressPayload,
  PostalAPIResponse,
  UserProfile,
} from "@/types/profile";

/* ------------------------------ Skeleton UI ------------------------------ */
function AddressSkeleton() {
  return (
    <div className="animate-pulse">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-6">
        <div className="h-6 w-40 bg-gray-200 rounded" />
        <div className="h-9 w-24 bg-gray-200 rounded" />
      </div>
      <div className="space-y-4">
        <div className="h-px bg-gray-200" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[...Array(7)].map((_, i) => (
            <div key={i} className="space-y-2">
              <div className="h-4 w-28 bg-gray-200 rounded" />
              <div className="h-10 bg-gray-200 rounded" />
            </div>
          ))}
        </div>
        <div className="flex justify-end gap-3">
          <div className="h-10 w-28 bg-gray-200 rounded" />
          <div className="h-10 w-24 bg-gray-200 rounded" />
        </div>
      </div>
    </div>
  );
}

/* ---------------------------------- Props --------------------------------- */
export type AddressContentProps = {
  addressLoading: boolean;
  addressSubmitting: boolean;
  addressError: string | null;
  addresses: Address[];
  addressForm: CreateAddressPayload;
  showAddressForm: boolean;
  loadAddresses: () => void;
  setShowAddressForm: (v: boolean) => void;
  setEditAddressId: (v: string | null) => void;
  setAddressForm: React.Dispatch<React.SetStateAction<CreateAddressPayload>>;
  handleAddressInput: (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => void;
  /** Should throw on failure and resolve on success */
  handleAddressSave: () => Promise<void>;
  handleAddressEdit: (a: Address) => void;
  setAddressError: (v: string | null) => void;
  profile: UserProfile | null;
  addFormLoading: boolean;
  onOpenAddForm: () => Promise<void>;
};

const EMPTY_FORM: CreateAddressPayload = {
  name: "",
  phone: "",
  alternatePhone: "",
  building: "",
  line1: "",
  line2: "",
  landmark: "",
  city: "",
  state: "",
  country: "India",
  postalCode: "",
  addressType: "Home",
  category: "Shipping",
};

export default function AddressContent({
  addressLoading,
  addressSubmitting,
  addressError,
  addresses,
  addressForm,
  showAddressForm,
  loadAddresses,
  setShowAddressForm,
  setEditAddressId,
  setAddressForm,
  handleAddressInput,
  handleAddressSave,
  handleAddressEdit,
  setAddressError,
  profile,
  addFormLoading,
  onOpenAddForm,
}: AddressContentProps) {
  const stateOptions = useMemo(
    () =>
      (CscState.getStatesOfCountry("IN") ?? [])
        .map((s) => s.name)
        .sort((a, b) => a.localeCompare(b)),
    []
  );

  const profileReady = Boolean(profile?.name && profile?.phone);

  /* --------------------------- Pincode -> autofill -------------------------- */
  const handlePincodeChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/\D/g, "");
    setAddressForm({ ...addressForm, postalCode: val });

    if (/^\d{6}$/.test(val)) {
      try {
        const res = await fetch(`https://api.postalpincode.in/pincode/${val}`);
        const data: PostalAPIResponse = await res.json();

        if (Array.isArray(data) && data[0]?.Status === "Success" && data[0].PostOffice?.length) {
          const { District, State } = data[0].PostOffice[0] ?? {};
          setAddressForm((prev) => ({
            ...prev,
            city: District || prev.city || "",
            state: State || prev.state || "",
          }));
          toast.success("Location auto-filled from pincode");
        } else {
          toast.error("Couldn’t auto-fill from pincode. Please enter City & State.");
        }
      } catch {
        toast.error("Pincode lookup failed. Please enter City & State.");
      }
    }
  };

  /* ------------------------------- Save action ------------------------------ */
  const onSaveWithToasts = async () => {
    // Guard: name & phone MUST come from profile (not the form)
    if (!profileReady) {
      toast.error("Please complete your Name & Mobile in Profile Info first.");
      return;
    }

    await toast.promise(
      (async () => {
        // Parent `handleAddressSave` already injects name & phone from profile
        // and will error if not present. This ensures we never take it from form.
        await handleAddressSave();
      })(),
      {
        loading: "Saving address…",
        success: "Address saved successfully!",
        error: (e) => (e instanceof Error ? e.message : "Failed to save address"),
      }
    );
  };

  /* -------------------------------- Skeleton -------------------------------- */
  if (addressLoading) {
    return <AddressSkeleton />;
  }

  const FIELD_BG = "bg-gray-50";

  const addressFormElement = (
    <div className="border border-[#E4E4E7] rounded-lg p-4 md:p-[16px] mt-[24px]">
      {addressError && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md flex items-center gap-2 text-red-700">
          <AlertCircle className="h-4 w-4 flex-shrink-0" />
          <span className="text-sm">{addressError}</span>
        </div>
      )}

      {/* NOTE: Name & Phone are hidden; taken ONLY from profile on save */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-[24px] mb-6">
        {/* Save As */}
        <div className="md:col-span-2">
          <label className="block text-sm font-medium mb-1">
            Save As <span className="text-red-500">*</span>
          </label>
          <Select
            value={addressForm.addressType}
            onValueChange={(val) =>
              setAddressForm({ ...addressForm, addressType: val as AddressType })
            }
          >
            <SelectTrigger className={`w-full h-10 md:h-9 ${FIELD_BG}`}>
              <SelectValue placeholder="Select type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Home">Home</SelectItem>
              <SelectItem value="Work">Work</SelectItem>
              <SelectItem value="Other">Other</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* House / Flat / Apartment */}
        <div>
          <label className="block text-sm font-medium mb-1">
            House / Flat / Apartment <span className="text-red-500">*</span>
          </label>
          <Input
            type="text"
            name="building"
            placeholder="House / Flat / Apartment no."
            value={addressForm.building}
            onChange={handleAddressInput}
            disabled={addressSubmitting}
            className={`h-10 md:h-9 ${FIELD_BG}`}
            autoComplete="off"
          />
        </div>

        {/* Apartment / Road / Area */}
        <div>
          <label className="block text-sm font-medium mb-1">
            Apartment / Road / Area <span className="text-red-500">*</span>
          </label>
          <Input
            type="text"
            name="line1"
            placeholder="Apartment / Road / Area Details"
            value={addressForm.line1}
            onChange={handleAddressInput}
            disabled={addressSubmitting}
            className={`h-10 md:h-9 ${FIELD_BG}`}
            autoComplete="off"
          />
        </div>

        {/* Landmark (NEW) */}
        <div className="md:col-span-2">
          <label className="block text-sm font-medium mb-1">Landmark</label>
          <Input
            type="text"
            name="landmark"
            placeholder="Nearby landmark (optional)"
            value={addressForm.landmark ?? ""}
            onChange={handleAddressInput}
            disabled={addressSubmitting}
            className={`h-10 md:h-9 ${FIELD_BG}`}
            autoComplete="off"
          />
        </div>

        {/* Pincode (then City, State, Country) */}
        <div>
          <label className="block text-sm font-medium mb-1">
            Pincode <span className="text-red-500">*</span>
          </label>
          <Input
            type="text"
            name="postalCode"
            placeholder="Enter Pincode"
            value={addressForm.postalCode}
            onChange={handlePincodeChange}
            disabled={addressSubmitting}
            className={`h-10 md:h-9 ${FIELD_BG}`}
            inputMode="numeric"
            pattern="[0-9]*"
            autoComplete="off"
            maxLength={6}
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">
            City <span className="text-red-500">*</span>
          </label>
          <Input
            type="text"
            name="city"
            placeholder="Enter city"
            value={addressForm.city}
            onChange={handleAddressInput}
            disabled={addressSubmitting}
            className={`h-10 md:h-9 ${FIELD_BG}`}
            autoComplete="off"
          />
        </div>

        {/* State */}
        <div>
          <label className="block text-sm font-medium mb-1">
            State <span className="text-red-500">*</span>
          </label>
          <Select
            value={addressForm.state}
            onValueChange={(val) => setAddressForm({ ...addressForm, state: val })}
          >
            <SelectTrigger className={`w-full h-10 md:h-9 ${FIELD_BG}`}>
              <SelectValue placeholder="Select state" />
            </SelectTrigger>
            <SelectContent className="max-h-64">
              {stateOptions.map((s) => (
                <SelectItem key={s} value={s}>
                  {s}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Country (read-only India) */}
        <div>
          <label className="block text-sm font-medium mb-1">Country</label>
          <Input
            type="text"
            name="country"
            value="India"
            readOnly
            disabled
            className="h-10 md:h-9 bg-gray-100"
            autoComplete="off"
          />
        </div>
      </div>

      {/* Actions */}
      <div className="flex flex-col-reverse md:flex-row justify-end gap-3">
        {/* Cancel – visible on light backgrounds */}
        <button
          type="button"
          className="w-full md:w-auto px-4 py-2 h-10 rounded-md bg-white border border-slate-300 text-slate-800 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
          onClick={() => {
            setShowAddressForm(false);
            setEditAddressId(null);
            setAddressForm({
              ...EMPTY_FORM,
              // these are injected from API-backed profile on open/save only
              name: "",
              phone: "",
            });
            setAddressError(null);
          }}
          disabled={addressSubmitting}
        >
          Cancel
        </button>

        <button
          type="button"
          className="w-full md:w-auto px-4 py-2 h-10 rounded-md bg-[#1E293B] text-white hover:bg-[#1E293B]/90 disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center justify-center gap-2"
          onClick={onSaveWithToasts}
          disabled={addressSubmitting || !profileReady}
          title={!profileReady ? "Complete Profile Info (Name & Mobile) to save" : undefined}
        >
          {addressSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
          Save
        </button>
      </div>
    </div>
  );

  /* --------------------------- Empty state (list) --------------------------- */
  if (addresses.length === 0 && !showAddressForm) {
    return (
      <div>
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-[24px]">
          <h2 className="text-[18px] md:text-[20px] font-bold text-[#100C08]">Address Details</h2>

          {!profileReady && (
            <div className="w-full md:w-auto text-[13px] md:text-[14px] bg-amber-50 border border-amber-200 text-amber-800 px-3 py-2 rounded">
              Please complete your <strong>Name</strong> and <strong>Mobile Number</strong> in{" "}
              <em>Profile Info</em> to start adding addresses.
            </div>
          )}

          <button
            className="px-3 py-1.5 md:px-4 md:py-2 rounded-[6px] bg-[#1E293B] text-white font-medium text-[12px] md:text-[14px] hover:bg-[#1E293B]/90 disabled:opacity-50"
            onClick={onOpenAddForm}
            disabled={addFormLoading || !profileReady}
          >
            {addFormLoading ? (
              <span className="inline-flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" /> Opening…
              </span>
            ) : (
              "Add New"
            )}
          </button>
        </div>

        <hr className="border-[#E2E3DE]" />

        {addressError && (
          <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-md flex items-center gap-2 text-red-700">
            <AlertCircle className="h-4 w-4 flex-shrink-0" />
            <span className="text-sm">{addressError}</span>
            <button onClick={loadAddresses} className="ml-auto text-sm underline hover:no-underline">
              Retry
            </button>
          </div>
        )}

        <div className="mt-[24px] flex flex-col gap-[5px] text-center md:text-left">
          <h2 className="text-[#0F172A] font-medium text-[16px] md:text-[18px]">Address Name</h2>
          <p className="text-[#475569] text-[14px]">Delivery address not added</p>
        </div>
      </div>
    );
  }

  /* ------------------------------- List + Form ------------------------------ */
  return (
    <div>
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-[24px]">
        <h2 className="text-[18px] md:text-[20px] font-bold text-[#100C08]">Address Details</h2>

        {!profileReady && (
          <div className="w-full md:w-auto text-[13px] md:text-[14px] bg-amber-50 border border-amber-200 text-amber-800 px-3 py-2 rounded">
            Please complete your <strong>Name</strong> and <strong>Mobile Number</strong> in{" "}
            <em>Profile Info</em> to start adding addresses.
          </div>
        )}

        <button
          className="px-3 py-1.5 md:px-4 md:py-2 rounded-[6px] bg-[#1E293B] text-white font-medium text-[12px] md:text-[14px] hover:bg-[#1E293B]/90 disabled:opacity-50"
          onClick={onOpenAddForm}
          disabled={addFormLoading || !profileReady}
        >
          {addFormLoading ? (
            <span className="inline-flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" /> Opening…
            </span>
          ) : (
            "Add New"
          )}
        </button>
      </div>

      <hr className="border-[#E2E3DE]" />

      {/* Show form at top when open */}
      {showAddressForm && addressFormElement}

      {/* Addresses list below */}
      <div className="space-y-4 mt-6">
        {addresses.map((address) => (
          <div
            key={address._id}
            className="border rounded-md p-4 flex flex-col md:flex-row justify-between md:items-start gap-4"
          >
            <div className="flex flex-col gap-[12px] flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-[600] text-[#0F172A] text-[16px] md:text-[18px]">
                  {address.addressType}
                </span>
                {address.category && (
                  <span className="px-2 py-1 bg-purple-100 text-purple-800 text-xs rounded-full">
                    {address.category}
                  </span>
                )}
              </div>

              <div>
                <div className="text-sm">
                  <div className="font-[400] text-[14px] text-[#1E293B]">
                    {address.name}, <strong>{address.phone}</strong>
                    {address.alternatePhone ? ` / ${address.alternatePhone}` : ""}
                  </div>
                </div>

                <div className="text-[14px] text-[#475569] mt-1">
                  {address.building}, {address.line1}
                  {address.line2 ? `, ${address.line2}` : ""}
                  {address.landmark ? <div className="mt-1">Near: {address.landmark}</div> : null}
                  <div className="mt-1">
                    {address.city}, {address.state}, {address.country} - {address.postalCode}
                  </div>
                </div>
              </div>
            </div>

            <div className="flex gap-2 md:flex-col md:items-end">
              <button
                className="text-[#0D1DC6] text-[14px] font-[500] hover:underline"
                onClick={() => handleAddressEdit(address)}
              >
                Edit
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
