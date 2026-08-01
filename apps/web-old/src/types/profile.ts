// types/profile.ts

// ========================
// USER PROFILE TYPES
// ========================

export interface GSTData {
  gstNumber: string;
  registeredCompanyName: string;
}

export interface UserProfile {
  _id: string;
  name: string;
  email: string;
  phone: string;
  userType: "Retailer" | "Consumer";
  isGSTRegistered: boolean;
  gstData?: GSTData;
  status: "Active" | "Inactive";
  createdAt: string;
  code: string;
}

export interface UserProfileResponse {
  success: boolean;
  message: string;
  result: UserProfile;
}

export interface UpdateUserProfilePayload {
  name?: string;
  email?: string;
  phone?: string;
  userType?: "Retailer" | "Consumer";
  gstData?: GSTData;
}

// ========================
// ADDRESS TYPES
// ========================

export type AddressType = "Home" | "Work" | "Other";
export type AddressCategory = "Billing" | "Shipping";

export interface Address {
  _id: string;
  user: string;
  name: string;
  phone: string;
  alternatePhone?: string;
  building: string;
  line1: string;
  line2?: string;
  landmark?: string;
  city: string;
  state: string;
  country: string;
  postalCode: string;
  addressType: AddressType;
  category?: AddressCategory;
  isDefault: boolean;
  status: "Active" | "Inactive";
  createdAt: string;
}

export interface AddressBookResponse {
  success: boolean;
  message: string;
  currentPage: number;
  results: Address[];
  latestCount: number;
  totalCount: number;
  totalPages: number;
}

export interface SingleAddressResponse {
  success: boolean;
  message: string;
  result: Address;
}

export interface CreateAddressPayload {
  name: string;
  phone: string;
  alternatePhone?: string;
  building: string;
  line1: string;
  line2?: string;
  landmark?: string;
  city: string;
  state: string;
  country: string;
  postalCode: string;
  addressType: AddressType;
  category: AddressCategory;
}

export type UpdateAddressPayload = Partial<CreateAddressPayload>;
// ========================
// COMMON API RESPONSE TYPES
// ======================== 

export interface ApiResponse<T = unknown> {
  success: boolean;
  message: string;
  result?: T;
  data?: T;
}


export type PostalAPIResponse = Array<{
  Status: "Success" | "Error";
  PostOffice?: Array<{
    District?: string;
    State?: string;
  }>;
}>;
