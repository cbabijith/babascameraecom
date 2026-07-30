"use client";

import React, { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useDispatch } from "react-redux";
import { toast } from "sonner";

import { Card, CardContent } from "@/components/ui/card";
import AppBreadcrumb from "@/components/common/app-breadcrumb";
import LogoutConfirmDialog from "@/components/common/LogoutConfirmDialog";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Power } from "lucide-react";

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
} from "@/types/profile";

import ProfileInfoContent from "./ProfileInfoContent";
import AddressContent from "./AddressContent";

/* ------------------------------ Local consts ------------------------------ */

const USER_TYPES: Array<"Retailer" | "Consumer"> = ["Consumer", "Retailer"];

const emptyProfile: Partial<UserProfile> = {
  name: "",
  email: "",
  phone: "",
  userType: "Consumer",
  isGSTRegistered: false,
  gstData: { gstNumber: "", registeredCompanyName: "" },
};

const emptyForm: CreateAddressPayload = {
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

export default function ProfilePageClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const dispatch = useDispatch();

  const [currentView, setCurrentView] = useState<"info" | "address">("info");

  // Logout confirm
  const [logoutOpen, setLogoutOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  // Profile state
  const [isEditing, setIsEditing] = useState(false);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [draft, setDraft] = useState<Partial<UserProfile>>(emptyProfile);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Address state
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [showAddressForm, setShowAddressForm] = useState(false);
  const [addressForm, setAddressForm] = useState<CreateAddressPayload>(emptyForm);
  const [editAddressId, setEditAddressId] = useState<string | null>(null);
  const [addressLoading, setAddressLoading] = useState(false);
  const [addressSubmitting, setAddressSubmitting] = useState(false);
  const [addressError, setAddressError] = useState<string | null>(null);
  const [addFormLoading, setAddFormLoading] = useState(false);

  /* ------------------------------- Navigation ------------------------------ */

  useEffect(() => {
    const viewFromUrl = (searchParams?.get("view") as "info" | "address") || "info";
    setCurrentView(viewFromUrl);
  }, [searchParams]);

  useEffect(() => {
    if (currentView === "info") loadUserProfile();
    if (currentView === "address") loadAddresses();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentView]);

  const handleNavigation = (view: "info" | "address") => {
    setCurrentView(view);
    router.push(`/profile?view=${view}`);
    if (view === "address") loadAddresses();
  };

  /* --------------------------------- Logout -------------------------------- */

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

  /* -------------------------------- Profile -------------------------------- */

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

  /* ------------------------------- Addresses ------------------------------- */

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

      if (!profile?.name || !profile?.phone) {
        setAddressError(
          "Please complete your Name and Mobile Number in Profile Info before saving an address."
        );
        setAddressSubmitting(false);
        return;
      }

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
        setAddresses((prev) => [newAddress, ...prev]);
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
      name: "",
      phone: "",
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

  /* --------------------------------- Render -------------------------------- */

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-6 md:px-4 md:py-8">
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

        <div className="mb-4">
          <Tabs value={currentView} onValueChange={(v) => handleNavigation(v as "info" | "address")}>
            <div className="flex justify-center">
              <TabsList className="inline-flex bg-white border border-[#E4E4E7] rounded-xl p-0 gap-1 overflow-hidden max-w-[360px] w-full">
                <TabsTrigger
                  value="info"
                  className="flex-1 h-9 md:h-10 px-3 text-sm font-medium rounded-xl transition-all duration-200 data-[state=active]:bg-[#F6DEDF] data-[state=active]:text-[#1E293B] data-[state=inactive]:text-[#1E293B]"
                >
                  Profile Info
                </TabsTrigger>
                <TabsTrigger
                  value="address"
                  className="flex-1 h-9 md:h-10 px-3 text-sm font-medium rounded-xl transition-all duration-200 data-[state=active]:bg-[#F6DEDF] data-[state=active]:text-[#1E293B] data-[state=inactive]:text-[#1E293B]"
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
                saveEdit={saveEdit}
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

      <LogoutConfirmDialog
        open={logoutOpen}
        onOpenChange={setLogoutOpen}
        onConfirm={handleLogoutConfirmed}
        loading={loggingOut}
      />
    </div>
  );
}
