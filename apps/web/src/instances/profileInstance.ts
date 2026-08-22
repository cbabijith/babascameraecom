// instances/profileInstance.ts

import { apiClient } from '@/lib/apiClient';
import type {
  UserProfile,
  UserProfileResponse,
  UpdateUserProfilePayload,
  Address,
  AddressBookResponse,
  SingleAddressResponse,
  CreateAddressPayload,
  UpdateAddressPayload,
} from '@/types/profile';


// ========================
// USER PROFILE METHODS
// ========================

/**
 * Get current user profile
 */
export const getUserProfile = async (): Promise<UserProfile> => {
  try {
    const response = await apiClient.get<UserProfileResponse>("/user/profile");

    if (response.data.success && response.data.result) {
      return response.data.result;
    }

    throw new Error(response.data.message || "Failed to fetch user profile");
  } catch (error) {
    console.error("getUserProfile error:", error);
    throw error;
  }
};


/**
 * Update user profile
 */
export const updateUserProfile = async (profileData: UpdateUserProfilePayload): Promise<UserProfile> => {
  try {
    const response = await apiClient.patch<UserProfileResponse>('/user/profile', profileData);
    
    if (response.data.success) {
      return response.data.result;
    }
    
    throw new Error(response.data.message || 'Failed to update user profile');
  } catch (error) {
    console.error('updateUserProfile error:', error);
    throw error;
  }
};

// ========================
// ADDRESS MANAGEMENT METHODS
// ========================

/**
 * Get all user addresses
 */
export const getUserAddresses = async (): Promise<Address[]> => {
  try {
    const response = await apiClient.get<AddressBookResponse>('/addressbook/user');
    
    if (response.data.success) {
      return response.data.results || [];
    }
    
    throw new Error(response.data.message || 'Failed to fetch addresses');
  } catch (error) {
    console.error('getUserAddresses error:', error);
    throw error;
  }
};

/**
 * Create a new address
 */
export const createAddress = async (addressData: CreateAddressPayload): Promise<Address> => {
  try {
    const response = await apiClient.post<SingleAddressResponse>('/addressbook/user', addressData);
    
    if (response.data.success) {
      return response.data.result;
    }
    
    throw new Error(response.data.message || 'Failed to create address');
  } catch (error) {
    console.error('createAddress error:', error);
    throw error;
  }
};

/**
 * Update an existing address
 */
export const updateAddress = async (addressId: string, addressData: UpdateAddressPayload): Promise<Address> => {
  try {
    const response = await apiClient.patch<SingleAddressResponse>(`/addressbook/${addressId}`, addressData);
    
    if (response.data.success) {
      return response.data.result;
    }
    
    throw new Error(response.data.message || 'Failed to update address');
  } catch (error) {
    console.error('updateAddress error:', error);
    throw error;
  }
};

/**
 * Delete an address
 */
// export const deleteAddress = async (addressId: string): Promise<void> => {
//   try {
//     const response = await apiClient.delete<ApiResponse>(`/addressbook/user/${addressId}`);
    
//     if (!response.data.success) {
//       throw new Error(response.data.message || 'Failed to delete address');
//     }
//   } catch (error) {
//     console.error('deleteAddress error:', error);
//     throw error;
//   }
// };

// ========================
// UTILITY METHODS
// ========================

/**
 * Get complete user profile with addresses
 */
export const getCompleteUserProfile = async (): Promise<{
  profile: UserProfile;
  addresses: Address[];
}> => {
  try {
    const [profile, addresses] = await Promise.all([
      getUserProfile(),
      getUserAddresses()
    ]);

    return { profile, addresses };
  } catch (error) {
    console.error('getCompleteUserProfile error:', error);
    throw error;
  }
};
