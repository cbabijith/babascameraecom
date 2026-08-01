"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { Loader2, AlertCircle } from "lucide-react";
import type {
  Address,
  CreateAddressPayload,
  AddressCategory,
  AddressType,
  PostalAPIResponse,
  UserProfile,
} from "@/types/profile";
import { getUserProfile, createAddress, updateAddress } from "@/instances/profileInstance";
import { State } from "country-state-city";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";

const FIELD_BG = "bg-gray-50";
const DEFAULT_ADDRESS_TYPES = ["Home", "Work", "Other"] as const;

/* ------------------------------ Skeleton UI ------------------------------ */
function ModalSkeleton() {
  return (
    <div className="p-6 animate-pulse">
      <div className="grid grid-cols-2 gap-6 mb-6">
        {[...Array(7)].map((_, i) => (
          <div key={i} className="space-y-2">
            <div className="h-4 w-28 bg-gray-200 rounded" />
            <div className="h-9 bg-gray-200 rounded" />
          </div>
        ))}
      </div>
      <div className="flex justify-end gap-3">
        <div className="h-10 w-24 bg-gray-200 rounded" />
        <div className="h-10 w-28 bg-gray-200 rounded" />
      </div>
    </div>
  );
}

type FormState = {
  // from profile (not user-editable in UI)
  name: string;
  phone: string;

  // address fields (no line2)
  building: string; // House / Flat / Apartment
  line1: string;    // Apartment / Road / Area
  landmark: string;

  postalCode: string;
  city: string;
  state: string;
  country: string; // India

  addressType: AddressType | string;
  category: AddressCategory | string;
};

interface AddressModalProps {
  isOpen: boolean;
  onClose: () => void;

  /** If provided, we PATCH this id; otherwise we POST (create). */
  initialAddress?: Address;

  ADDRESS_TYPES?: readonly string[];
  defaultCategory?: AddressCategory;

  /** REQUIRED: parent updates local list or re-fetches using saved Address. */
  onAfterSave: (saved: Address) => void | Promise<void>;

  /** Optional: auto-select saved/updated address in UI */
  onSelectAfterSave?: (id: string) => void;
}

export default function AddressModal({
  isOpen,
  onClose,
  initialAddress,
  ADDRESS_TYPES = DEFAULT_ADDRESS_TYPES,
  defaultCategory = "Shipping",
  onAfterSave,
  onSelectAfterSave,
}: AddressModalProps) {
  const [form, setForm] = useState<FormState>({
    name: "",
    phone: "",

    building: "",
    line1: "",
    landmark: "",

    postalCode: "",
    city: "",
    state: "",
    country: "India",

    addressType: (ADDRESS_TYPES[0] as string) ?? "Home",
    category: defaultCategory,
  });

  const [error, setError] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isPriming, setIsPriming] = useState(false);

  const editingId = initialAddress?._id;

  const indianStates = useMemo(() => State.getStatesOfCountry("IN") ?? [], []);
  const stateOptions = useMemo(
    () => indianStates.map((s) => s.name).sort((a, b) => a.localeCompare(b)),
    [indianStates]
  );

  /* ------------------------- Prime: profile + edit data ------------------------ */
  useEffect(() => {
    if (!isOpen) return;
    let cancelled = false;

    (async () => {
      setIsPriming(true);
      try {
        const profile: UserProfile = await getUserProfile();
        const base: FormState = {
          name: profile?.name?.trim() ?? "",
          phone: (profile?.phone ?? "").replace(/\D/g, "").slice(0, 10),

          building: initialAddress?.building ?? "",
          line1: initialAddress?.line1 ?? "",
          landmark: initialAddress?.landmark ?? "",

          postalCode: initialAddress?.postalCode ?? "",
          city: initialAddress?.city ?? "",
          state: initialAddress?.state ?? "",
          country: "India",

          addressType: initialAddress?.addressType ?? (ADDRESS_TYPES[0] as string) ?? "Home",
          category: initialAddress?.category ?? defaultCategory,
        };
        if (!cancelled) {
          setForm(base);
          setError("");
        }
      } catch {
        if (!cancelled) {
          setError("Could not load your profile. Please ensure your name and phone are set.");
        }
      } finally {
        if (!cancelled) setIsPriming(false);
      }
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, initialAddress]);

  /* -------------------------------- Handlers -------------------------------- */
  const handleInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setForm((p) => ({ ...p, [name]: value }));
    if (error) setError("");
  };

  // Pincode numeric + autofill city/state with toasts
  const handlePincodeInput = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const postalCode = e.target.value.replace(/\D/g, "").slice(0, 6);
    setForm((p) => ({ ...p, postalCode }));
    if (postalCode.length === 6) {
      try {
        const res = await fetch(`https://api.postalpincode.in/pincode/${postalCode}`);
        const data: PostalAPIResponse = await res.json();
        if (Array.isArray(data) && data[0]?.Status === "Success" && data[0].PostOffice?.length) {
          const { District, State: StateName } = data[0].PostOffice[0];
          setForm((prev) => ({
            ...prev,
            city: prev.city || District || "",
            state: prev.state || StateName || "",
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

  const validate = (): string | null => {
    if (!form.name.trim()) return "Profile name is required.";
    if (!/^\d{10}$/.test(form.phone)) return "Valid 10-digit phone is required.";
    if (!form.building.trim()) return "House / Flat / Apartment is required.";
    if (!form.line1.trim()) return "Apartment / Road / Area is required.";
    if (!/^\d{6}$/.test(form.postalCode)) return "Enter a valid 6-digit pincode.";
    if (!form.city.trim()) return "City is required.";
    if (!form.state.trim()) return "State is required.";
    return null;
  };

  const buildPayload = (): CreateAddressPayload => ({
    // Name & phone ONLY from profile (pre-filled above)
    name: form.name.trim(),
    phone: form.phone.trim(),
    alternatePhone: "",
    building: form.building.trim(),
    line1: form.line1.trim(),
    landmark: form.landmark.trim(),
    city: form.city.trim(),
    state: form.state.trim(),
    country: "India",
    postalCode: form.postalCode.trim(),
    addressType: form.addressType as AddressType,
    category: (form.category as AddressCategory) || "Shipping",
  });

  const handleSave = async () => {
    const err = validate();
    if (err) {
      setError(err);
      toast.error(err);
      return;
    }

    const payload = buildPayload();
    setIsSubmitting(true);
    try {
      const run = async (): Promise<Address> => {
        if (editingId) {
          // PATCH (update)
          const updated = await updateAddress(editingId, payload);
          return updated;
        } else {
          // POST (create)
          const created = await createAddress(payload);
          return created;
        }
      };

      // IMPORTANT: toast.promise returns a toast id, not the resolved value.
      // So we trigger it on the promise, then await the original promise for the Address.
      const promise = run();
      toast.promise(promise, {
        loading: editingId ? "Updating address…" : "Saving address…",
        success: editingId ? "Address updated successfully!" : "Address saved successfully!",
        error: "Failed to save address",
      });
      const saved = await promise; // <- this is Address

      await onAfterSave(saved);
      onSelectAfterSave?.(saved._id);

      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  const inputClass = `${FIELD_BG}`;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {isPriming ? (
          <ModalSkeleton />
        ) : (
          <div className="p-6">
            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md flex items-center gap-2 text-red-700">
                <AlertCircle className="h-4 w-4 flex-shrink-0" />
                <span className="text-sm">{error}</span>
              </div>
            )}

            <div className="grid grid-cols-2 gap-6 mb-6">
              {/* Save As */}
              <div className="col-span-2">
                <label className="block text-sm font-medium mb-1">
                  Save As <span className="text-red-500">*</span>
                </label>
                <Select
                  value={String(form.addressType)}
                  onValueChange={(val) => setForm((p) => ({ ...p, addressType: val }))}
                >
                  <SelectTrigger className={`w-full h-9 ${FIELD_BG}`}>
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent className="w-[var(--radix-select-trigger-width)]">
                    {ADDRESS_TYPES.map((t) => (
                      <SelectItem key={t} value={t}>
                        {t}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* House / Flat / Apartment */}
              <div>
                <label className="block text-sm font-medium mb-1">
                  House / Flat / Apartment <span className="text-red-500">*</span>
                </label>
                <Input
                  name="building"
                  type="text"
                  placeholder="Building, House No, Flat No"
                  value={form.building}
                  onChange={handleInput}
                  className={inputClass}
                />
              </div>

              {/* Apartment / Road / Area */}
              <div>
                <label className="block text-sm font-medium mb-1">
                  Apartment / Road / Area <span className="text-red-500">*</span>
                </label>
                <Input
                  name="line1"
                  type="text"
                  placeholder="Apartment / Road / Area"
                  value={form.line1}
                  onChange={handleInput}
                  className={inputClass}
                />
              </div>

              {/* Landmark */}
              <div className="col-span-2">
                <label className="block text-sm font-medium mb-1">Landmark</label>
                <Input
                  name="landmark"
                  type="text"
                  placeholder="Nearby landmark (optional)"
                  value={form.landmark}
                  onChange={handleInput}
                  className={inputClass}
                />
              </div>

              {/* Pincode → City, State, Country */}
              <div>
                <label className="block text-sm font-medium mb-1">
                  Pincode <span className="text-red-500">*</span>
                </label>
                <Input
                  name="postalCode"
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  placeholder="6-digit pincode"
                  maxLength={6}
                  value={form.postalCode}
                  onChange={handlePincodeInput}
                  className={inputClass}
                />
              </div>

              {/* City */}
              <div>
                <label className="block text-sm font-medium mb-1">
                  City <span className="text-red-500">*</span>
                </label>
                <Input
                  name="city"
                  type="text"
                  placeholder="Enter city name"
                  value={form.city}
                  onChange={handleInput}
                  className={inputClass}
                />
              </div>

              {/* State */}
              <div>
                <label className="block text-sm font-medium mb-1">
                  State <span className="text-red-500">*</span>
                </label>
                <Select
                  value={form.state}
                  onValueChange={(val) => setForm((p) => ({ ...p, state: val }))}
                >
                  <SelectTrigger className={`w-full h-9 ${FIELD_BG}`}>
                    <SelectValue placeholder="Select state" />
                  </SelectTrigger>
                  <SelectContent className="w-[var(--radix-select-trigger-width)] max-h-64">
                    {stateOptions.map((s) => (
                      <SelectItem key={s} value={s}>
                        {s}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Country (fixed India) */}
              <div>
                <label className="block text-sm font-medium mb-1">Country</label>
                <Input name="country" type="text" value="India" readOnly disabled className={FIELD_BG} />
              </div>
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-3">
              <button
                type="button"
                className="px-4 py-2 h-10 rounded-md bg-white border border-slate-300 text-slate-800 hover:bg-slate-50 disabled:opacity-50"
                onClick={onClose}
                disabled={isSubmitting}
              >
                Cancel
              </button>
              <button
                type="button"
                className="px-4 py-2 h-10 rounded-md bg-[#1E293B] text-white hover:bg-[#1E293B]/90 disabled:opacity-50 inline-flex items-center gap-2"
                onClick={handleSave}
                disabled={isSubmitting}
              >
                {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
                {editingId ? "Update" : "Save"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
