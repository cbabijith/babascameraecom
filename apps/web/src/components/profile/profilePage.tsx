// src/app/(main)/profile/ProfilePageClient.tsx
"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useDispatch } from "react-redux";
import { toast } from "sonner";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import AppBreadcrumb from "../common/app-breadcrumb";
import LogoutConfirmDialog from "@/components/common/LogoutConfirmDialog";

import { Loader2, AlertCircle, Power } from "lucide-react";

import {
  getUserProfile,
  updateUserProfile,
  getUserAddresses,
  createAddress,
  updateAddress,
} from "@/instances/profileInstance";

import { logout as logoutAction } from "@/store/slice/authSlice";
import { logoutUser } from "@/instances/authInstance";

import type {
  GSTData,
  UpdateUserProfilePayload,
  UserProfile,
  Address,
  CreateAddressPayload,
  UpdateAddressPayload,
  AddressType,
  PostalAPIResponse,
} from "@/types/profile";

import { State as CscState } from "country-state-city";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import {
  Tabs,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";

/* ---------------------------------- Consts --------------------------------- */

const USER_TYPES: ("Retailer" | "Consumer")[] = ["Consumer", "Retailer"];

const emptyProfile: Partial<UserProfile> = {
  name: "",
  email: "",
  phone: "",
  userType: "Consumer",
  isGSTRegistered: false,
  gstData: { gstNumber: "", registeredCompanyName: "" },
};

const emptyForm: CreateAddressPayload = {
  name: "",              // will be set from profile when opening form
  phone: "",             // will be set from profile when opening form
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

/* ------------------------------- Subsections ------------------------------- */

interface ProfileInfoContentProps {
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
}

function ProfileInfoContent({
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
  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-8 w-8 animate-spin text-gray-500" />
        <span className="ml-2 text-gray-500">Loading profile...</span>
      </div>
    );
  }

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
        <div className="mb-4 md:mb-6 p-3 bg-red-50 border border-red-200 rounded-md flex items-center gap-2 text-red-700">
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
        <div className="mb-4 md:mb-6 p-3 bg-green-50 border border-green-200 rounded-md flex items-center gap-2 text-green-700">
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
            <div>
              <label className="block text-[14px] font-[500] text-[#1E293B] mb-2">
                Your Full Name *
              </label>
              <Input
                type="text"
                value={draft.name || ""}
                onChange={(e) => onChange("name", e.target.value)}
                placeholder="Enter full name"
                disabled={!isEditing || submitting}
                className="text-[14px] h-10 md:h-9"
              />
            </div>

            <div>
              <label className="block text-[14px] font-[500] text-[#1E293B] mb-2">
                Mobile Number *
              </label>
              <Input
                type="tel"
                value={draft.phone || ""}
                onChange={(e) => onChange("phone", e.target.value)}
                placeholder="Enter your number"
                disabled={!isEditing || submitting}
                className="text-[14px] h-10 md:h-9"
              />
            </div>

            <div className="md:col-span-1">
              <label className="block text-[14px] font-[500] text-[#1E293B] mb-2">
                Email *
              </label>
              <Input
                type="email"
                value={draft.email || ""}
                onChange={(e) => onChange("email", e.target.value)}
                disabled={!isEditing || submitting}
                className="text-[14px] h-10 md:h-9"
              />
            </div>

            <div className="md:col-span-1">
              <label className="block text-[14px] font-[500] text-[#1E293B] mb-2">
                Type
              </label>
              <select
                value={draft.userType || "Consumer"}
                onChange={(e) => onChange("userType", e.target.value as "Retailer" | "Consumer")}
                disabled={!isEditing || submitting}
                className="w-full border border-input bg-background p-2 rounded-md h-10 md:h-9 text-base md:text-sm disabled:opacity-50 disabled:cursor-not-allowed text-[14px]"
              >
                {USER_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* GST */}
          <div className="mt-6 md:mt-8">
            <div className="flex items-start gap-3 mb-4">
              <input
                type="checkbox"
                checked={draft.isGSTRegistered || false}
                onChange={(e) => onChange("isGSTRegistered", e.target.checked)}
                disabled={!isEditing || submitting}
                className="w-4 h-4 mt-0.5 text-[#E72429] focus:ring-[#E72429] disabled:opacity-60"
              />
              <span className="text-[14px] font-[500] text-[#64748B] leading-5">
                Customer has GST No. (Optional)
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
              <div>
                <label className="block text-[14px] font-[500] text-[#1E293B] mb-2">
                  GST Number
                </label>
                <Input
                  type="text"
                  value={draft.gstData?.gstNumber || ""}
                  onChange={(e) => onGSTDataChange("gstNumber", e.target.value)}
                  placeholder="Company GST Number"
                  disabled={!isEditing || !draft.isGSTRegistered || submitting}
                  className="text-[14px] h-10 md:h-9"
                />
              </div>

              <div>
                <label className="block text-[14px] font-[500] text-[#1E293B] mb-2">
                  Company Name
                </label>
                <Input
                  type="text"
                  value={draft.gstData?.registeredCompanyName || ""}
                  onChange={(e) => onGSTDataChange("registeredCompanyName", e.target.value)}
                  placeholder="Enter your company name"
                  disabled={!isEditing || !draft.isGSTRegistered || submitting}
                  className="text-[14px] h-10 md:h-9"
                />
              </div>
            </div>
          </div>

          {/* Actions */}
          {isEditing && (
            <div className="flex flex-col-reverse md:flex-row justify-end gap-3 mt-8 md:mt-10">
              <Button
                variant="outline"
                onClick={cancelEdit}
                disabled={submitting}
                className="w-full md:w-auto text-[14px] font-[500] text-[#1E293B] border-[#E4E4E7] hover:bg-gray-50 disabled:opacity-50 h-10 md:h-9"
              >
                Cancel
              </Button>
              <Button
                onClick={saveEdit}
                disabled={submitting}
                className="w-full md:w-auto text-[14px] font-[600] bg-[#1E293B] hover:bg-[#1E293B]/90 text-white disabled:opacity-50 flex items-center justify-center gap-2 h-10 md:h-9"
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

interface AddressContentProps {
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
  handleAddressSave: () => Promise<void>;
  handleAddressEdit: (a: Address) => void;
  setAddressError: (v: string | null) => void;
  profile: UserProfile | null;
  addFormLoading: boolean;
  onOpenAddForm: () => Promise<void>;
}

function AddressContent({
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

  if (addressLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-8 w-8 animate-spin text-gray-500" />
        <span className="ml-2 text-gray-500">Loading addresses...</span>
      </div>
    );
  }

  // Is profile ready (name + phone present)?
  const profileReady = Boolean(profile?.name && profile?.phone);

  // numeric-only pincode change + autofill city/state via API
  const handlePincodeChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/\D/g, "");
    setAddressForm({ ...addressForm, postalCode: val });

    if (/^\d{6}$/.test(val)) {
      try {
        const res = await fetch(`https://api.postalpincode.in/pincode/${val}`);
        const data: PostalAPIResponse = await res.json();

        if (Array.isArray(data) && data[0]?.Status === "Success" && data[0].PostOffice?.length) {
          const { District, State } = data[0].PostOffice[0];
          setAddressForm((prev) => ({
            ...prev,
            city: prev.city || District || "",
            state: prev.state || State || "",
          }));
        }
      } catch {
        // ignore errors
      }
    }
  };

  const FIELD_BG = "bg-gray-50";

  const addressFormElement = (
    <div className="border border-[#E4E4E7] rounded-lg p-4 md:p-[16px] mt-[24px]">
      {addressError && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md flex items-center gap-2 text-red-700">
          <AlertCircle className="h-4 w-4 flex-shrink-0" />
          <span className="text-sm">{addressError}</span>
        </div>
      )}

      {/* NOTE: Name & Phone are hidden; they come from profile when saving */}
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

        <div>
          <label className="block text-sm font-medium mb-1">
            City <span className="text-red-500">*</span>
          </label>
          <Input
            type="text"
            name="city"
            placeholder="Enter city name"
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
            onValueChange={(val) =>
              setAddressForm({ ...addressForm, state: val })
            }
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

        {/* Pincode */}
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

        {/* Country */}
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

      <div className="flex flex-col-reverse md:flex-row justify-end gap-3">
        <button
          className="w-full md:w-auto px-4 py-2 bg-gray-200 text-gray-700 rounded disabled:opacity-50 disabled:cursor-not-allowed h-10 md:h-auto"
          onClick={() => {
            setShowAddressForm(false);
            setEditAddressId(null);
            setAddressForm({
              ...emptyForm,
              // keep profile-derived fields reset via opener
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
          className="w-full md:w-auto px-4 py-2 bg-[#1E293B] text-white rounded disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 h-10 md:h-auto"
          onClick={handleAddressSave}
          disabled={addressSubmitting}
        >
          {addressSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
          Save
        </button>
      </div>
    </div>
  );

  // If there are no addresses and form not shown
  if (addresses.length === 0 && !showAddressForm) {
    return (
      <div>
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-[24px]">
          <h2 className="text-[18px] md:text-[20px] font-bold text-[#100C08]">
            Address Details
          </h2>

          {!profileReady && (
            <div className="w-full md:w-auto text-[13px] md:text-[14px] bg-amber-50 border border-amber-200 text-amber-800 px-3 py-2 rounded">
              Please complete your <strong>Name</strong> and <strong>Mobile Number</strong> in <em>Profile Info</em> to start adding addresses.
            </div>
          )}

          <button
            className="px-3 py-1.5 md:px-4 md:py-2 rounded-[6px] bg-[#1E293B] text-white font-medium text-[12px] md:text-[14px] cursor-pointer hover:bg-[#1E293B]/90 disabled:opacity-50"
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
          <h2 className="text-[#0F172A] font-medium text-[16px] md:text-[18px]">
            Address Name
          </h2>
          <p className="text-[#475569] text-[14px] font-normal">
            Delivery address not added
          </p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-[24px]">
        <h2 className="text-[18px] md:text-[20px] font-bold text-[#100C08]">
          Address Details
        </h2>

        {!profileReady && (
          <div className="w-full md:w-auto text-[13px] md:text-[14px] bg-amber-50 border border-amber-200 text-amber-800 px-3 py-2 rounded">
            Please complete your <strong>Name</strong> and <strong>Mobile Number</strong> in <em>Profile Info</em> to start adding addresses.
          </div>
        )}

        <button
          className="px-3 py-1.5 md:px-4 md:py-2 rounded-[6px] bg-[#1E293B] text-white font-medium text-[12px] md:text-[14px] cursor-pointer hover:bg-[#1E293B]/90 disabled:opacity-50"
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

      {/* Show form at the TOP when open */}
      {showAddressForm && addressFormElement}

      {/* Existing addresses listed BELOW the form */}
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

                <div className="text-[14px] text-[#475569] font-[400] mt-1">
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

/* ---------------------------------- Page ----------------------------------- */

export default function ProfilePageClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const dispatch = useDispatch();

  const [currentView, setCurrentView] = useState<string>("info");

  // Logout confirm dialog
  const [logoutOpen, setLogoutOpen] = useState(false);

  // Profile
  const [isEditing, setIsEditing] = useState(false);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [draft, setDraft] = useState<Partial<UserProfile>>(emptyProfile);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Addresses
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [showAddressForm, setShowAddressForm] = useState(false);
  const [addressForm, setAddressForm] = useState<CreateAddressPayload>(emptyForm);
  const [editAddressId, setEditAddressId] = useState<string | null>(null);
  const [addressLoading, setAddressLoading] = useState(false);
  const [addressSubmitting, setAddressSubmitting] = useState(false);
  const [addressError, setAddressError] = useState<string | null>(null);
  const [addFormLoading, setAddFormLoading] = useState(false);

  // Logout
  const [loggingOut, setLoggingOut] = useState(false);

  const handleLogoutConfirmed = async () => {
    if (loggingOut) return;
    setLoggingOut(true);
    try {
      await toast.promise(
        (async () => {
          await logoutUser();
          dispatch(logoutAction());
        })(),
        {
          loading: "Signing you out...",
          success: "You’ve been logged out.",
          error: "Failed to log out. Please try again.",
        }
      );
      router.replace("/login");
    } finally {
      setLoggingOut(false);
      setLogoutOpen(false);
    }
  };

  // Sync view from URL
  useEffect(() => {
    const viewFromUrl = searchParams?.get("view");
    if (viewFromUrl) setCurrentView(viewFromUrl);
  }, [searchParams]);

  // Load data on view change
  useEffect(() => {
    if (currentView === "info") loadUserProfile();
    if (currentView === "address") loadAddresses();
     
  }, [currentView]);

  const handleNavigation = (view: "info" | "address") => {
    setCurrentView(view);
    router.push(`/profile?view=${view}`);
    if (view === "address") loadAddresses();
  };

  // Profile functions
  const loadUserProfile = async () => {
    try {
      setLoading(true);
      setError(null);
      const userProfile = await getUserProfile();
      if (!userProfile) throw new Error("You are not logged in. Please log in first.");
      setProfile(userProfile);
      setDraft(userProfile);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load user profile");
      setProfile(null);
    } finally {
      setLoading(false);
    }
  };

  const saveEdit = async () => {
    try {
      setSubmitting(true);
      setError(null);
      setSuccessMessage(null);

      const payload: UpdateUserProfilePayload = {
        name: draft.name,
        email: draft.email,
        phone: draft.phone,
        userType: draft.userType,
        gstData: draft.gstData ?? { gstNumber: "", registeredCompanyName: "" },
      };

      const updatedProfile = await updateUserProfile(payload);
      setProfile(updatedProfile);
      setDraft(updatedProfile);
      setIsEditing(false);
      setSuccessMessage("Profile updated successfully!");
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update profile");
    } finally {
      setSubmitting(false);
    }
  };

  const onChange = <K extends keyof UserProfile>(key: K, value: UserProfile[K]) => {
    setDraft((d) => ({ ...d, [key]: value }));
    if (error) setError(null);
    if (successMessage) setSuccessMessage(null);
  };

  const onGSTDataChange = (key: keyof GSTData, value: string) => {
    setDraft((d) => ({
      ...d,
      gstData: {
        ...(d.gstData || { gstNumber: "", registeredCompanyName: "" }),
        [key]: value,
      } as GSTData,
    }));
    if (error) setError(null);
    if (successMessage) setSuccessMessage(null);
  };

  // Address functions
  const loadAddresses = async () => {
    try {
      setAddressLoading(true);
      setAddressError(null);
      const fetchedAddresses = await getUserAddresses();
      setAddresses(fetchedAddresses);
    } catch (err) {
      setAddressError(err instanceof Error ? err.message : "Failed to load addresses");
    } finally {
      setAddressLoading(false);
    }
  };

  const handleAddressInput = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setAddressForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleAddressSave = async () => {
    try {
      setAddressSubmitting(true);
      setAddressError(null);

      // Require profile name & phone to proceed
      if (!profile?.name || !profile?.phone) {
        setAddressError("Please complete your Name and Mobile Number in Profile Info before saving an address.");
        setAddressSubmitting(false);
        return;
      }

      // Override name & phone from profile
      const payload: CreateAddressPayload | UpdateAddressPayload = {
        ...addressForm,
        name: profile.name,
        phone: profile.phone,
      };

      if (editAddressId !== null) {
        const updatedAddress = await updateAddress(editAddressId, payload as UpdateAddressPayload);
        setAddresses((prev) => prev.map((a) => (a._id === editAddressId ? updatedAddress : a)));
      } else {
        const newAddress = await createAddress(payload as CreateAddressPayload);
        setAddresses((prev) => [newAddress, ...prev]); // keep newest first as we show form on top
      }

      setShowAddressForm(false);
      setEditAddressId(null);
      setAddressForm(emptyForm);
    } catch (err) {
      setAddressError(err instanceof Error ? err.message : "Failed to save address");
    } finally {
      setAddressSubmitting(false);
    }
  };

  const handleAddressEdit = (address: Address) => {
    setShowAddressForm(true);
    setEditAddressId(address._id);
    const form: CreateAddressPayload = {
      name: "", // not shown; will be injected from profile on save
      phone: "", // not shown; will be injected from profile on save
      alternatePhone: address.alternatePhone || "",
      building: address.building,
      line1: address.line1,
      line2: address.line2 || "",
      landmark: address.landmark || "",
      city: address.city,
      state: address.state,
      country: "India",
      postalCode: address.postalCode,
      addressType: address.addressType,
      category: address.category || "Shipping",
    };
    setAddressForm(form);
    setAddressError(null);
  };

  // open Add New handler with loading + inject name/phone from profile
  const onOpenAddForm = async () => {
    if (!profile?.name || !profile?.phone) {
      toast.error("Please complete your Name and Mobile Number in Profile Info first.");
      return;
    }
    setAddFormLoading(true);
    try {
      setEditAddressId(null);
      setAddressForm({
        ...emptyForm,
        name: profile.name ?? "",
        phone: profile.phone ?? "",
      });
      setShowAddressForm(true);
      setAddressError(null);
    } finally {
      setAddFormLoading(false);
    }
  };

  /* --------------------------------- Render --------------------------------- */

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-6 md:px-4 md:py-8">
        {/* Breadcrumb row with Logout on the right */}
        <div className="mb-3 md:mb-6 flex items-center justify-between gap-2">
          <div className="min-w-0 flex-1">
            <AppBreadcrumb
              items={[
                { label: "Home", href: "/" },
                { label: "Account", href: "/profile" },
              ]}
            />
          </div>

          <button
            type="button"
            onClick={() => setLogoutOpen(true)}
            className="shrink-0 inline-flex items-center gap-2 text-[#E72429] text-sm md:text-base hover:opacity-80"
          >
            <Power className="h-4 w-4" />
            <span>Logout</span>
          </button>
        </div>


        {/* Tabs nav (replaces chip buttons) */}
        <div className="mb-4">
          <Tabs value={currentView} onValueChange={(v) => handleNavigation(v as "info" | "address")}>
            <div className="flex justify-center">
              <TabsList
                className="
                  inline-flex bg-white border border-[#E4E4E7]
                  rounded-xl p-0 gap-1 overflow-hidden max-w-[360px] w-full
                "
              >
                <TabsTrigger
                  value="info"
                  className="
                    flex-1 h-9 md:h-10 px-3 text-sm font-medium rounded-xl
                    transition-all duration-200 ease-in-out
                    data-[state=active]:bg-[#F6DEDF] data-[state=active]:text-[#1E293B]
                    data-[state=inactive]:text-[#1E293B]
                  "
                >
                  Profile Info
                </TabsTrigger>

                <TabsTrigger
                  value="address"
                  className="
                    flex-1 h-9 md:h-10 px-3 text-sm font-medium rounded-xl
                    transition-all duration-200 ease-in-out
                    data-[state=active]:bg-[#F6DEDF] data-[state=active]:text-[#1E293B]
                    data-[state=inactive]:text-[#1E293B]
                  "
                >
                  Manage Addresses
                </TabsTrigger>
              </TabsList>
            </div>
          </Tabs>
        </div>



        <Card className="shadow-sm border border-[#E4E4E7]">
          <CardContent className="p-4 md:p-8">
            {currentView === "info" && (
              <ProfileInfoContent
                loading={loading}
                isEditing={isEditing}
                submitting={submitting}
                profile={profile}
                draft={draft}
                error={error}
                successMessage={successMessage}
                startEdit={() => {
                  if (profile) setDraft(profile);
                  setIsEditing(true);
                  setError(null);
                  setSuccessMessage(null);
                }}
                cancelEdit={() => {
                  if (profile) setDraft(profile);
                  setIsEditing(false);
                  setError(null);
                  setSuccessMessage(null);
                }}
                saveEdit={async () => {
                  await saveEdit();
                }}
                onChange={onChange}
                onGSTDataChange={onGSTDataChange}
                reload={loadUserProfile}
                USER_TYPES={USER_TYPES}
              />
            )}

            {currentView === "address" && (
              <AddressContent
                addressLoading={addressLoading}
                addressSubmitting={addressSubmitting}
                addressError={addressError}
                addresses={addresses}
                addressForm={addressForm}
                showAddressForm={showAddressForm}
                loadAddresses={loadAddresses}
                setShowAddressForm={setShowAddressForm}
                setEditAddressId={setEditAddressId}
                setAddressForm={setAddressForm}
                handleAddressInput={handleAddressInput}
                handleAddressSave={handleAddressSave}
                handleAddressEdit={handleAddressEdit}
                setAddressError={setAddressError}
                profile={profile}
                addFormLoading={addFormLoading}
                onOpenAddForm={onOpenAddForm}
              />
            )}
          </CardContent>
        </Card>
      </div>

      {/* Logout confirmation dialog */}
      <LogoutConfirmDialog
        open={logoutOpen}
        onOpenChange={setLogoutOpen}
        onConfirm={handleLogoutConfirmed}
        loading={loggingOut}
      />
    </div>
  );
}
