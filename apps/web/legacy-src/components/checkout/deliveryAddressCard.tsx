import React from "react";
import { Button } from "@/components/ui/button";
import type { Address } from "@/types/profile";
import Link from "next/link";

/* ------------------------------ Skeleton UI ------------------------------ */
function AddressListSkeleton() {
  return (
    <div className="mt-4 space-y-3 animate-pulse">
      {[...Array(3)].map((_, i) => (
        <div key={i} className="p-3 border border-[#E4E4E7] rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <div className="h-5 w-16 bg-gray-200 rounded" />
            <div className="h-4 w-12 bg-gray-200 rounded" />
          </div>
          <div className="h-4 w-40 bg-gray-200 rounded mb-2" />
          <div className="h-4 w-64 bg-gray-200 rounded" />
        </div>
      ))}
    </div>
  );
}

interface Props {
  addresses: Address[];
  selectedAddressId: string | null;
  onSelectAddress: (id: string) => void;
  onAddAddress: () => void;
  onEditAddress?: (addr: Address) => void;

  loading?: boolean;
  error?: string | null;
  onRetryLoad?: () => void;

  /** If false: require user to complete Profile Info (name + phone) before adding addresses */
  profileReady?: boolean;
}

const DeliveryAddressCard: React.FC<Props> = ({
  addresses,
  selectedAddressId,
  onSelectAddress,
  onAddAddress,
  onEditAddress,
  loading = false,
  error = null,
  onRetryLoad,
  profileReady = true,
}) => {
  const hasAddresses = Array.isArray(addresses) && addresses.length > 0;

  return (
    <div className="px-[16px] py-[14px] border border-[#E4E4E7] rounded-[20px] bg-white">
      <div className="flex items-center justify-between">
        <h2 className="text-[16px] lg:text-[20px] font-[650] text-[#000000]">
          Delivery Address
        </h2>

        {hasAddresses && (
          <Button
            variant="babas"
            onClick={onAddAddress}
            className="text-[14px] px-4 py-2 rounded-[24px]"
            disabled={!profileReady}
            title={!profileReady ? "Complete Profile Info (Name & Mobile) first" : undefined}
          >
            Add New Address
          </Button>
        )}
      </div>
      {!profileReady && (
        <>
          {/* Warning box without inline link */}
          <div className="mt-3 text-xs md:text-sm bg-amber-50 border border-amber-200 text-amber-800 px-3 py-2 rounded">
            Please complete your <strong>Name</strong> and <strong>Mobile Number</strong> in your Profile to add or edit addresses.
          </div>

          {/* Clear, standalone action button */}
          <div className="mt-2">
            <Button
              asChild
              className="text-xs md:text-sm px-3 py-2 rounded-[20px] bg-amber-600 hover:bg-amber-700"
              title="Go to Profile Info"
            >
              <Link href="/profile">Go to Profile Info</Link>
            </Button>
          </div>
        </>
      )}

      {loading ? (
        <AddressListSkeleton />
      ) : error ? (
        <div className="py-6">
          <p className="text-sm text-red-600 mb-2">{error}</p>
          {onRetryLoad && (
            <Button size="sm" variant="outline" onClick={onRetryLoad}>
              Retry
            </Button>
          )}
        </div>
      ) : hasAddresses ? (
        <div className="mt-4 space-y-3">
          {addresses.map((addr) => {
            const linePart1 = [addr.building, addr.line1].filter(Boolean).join(", ");
            const linePart2 = ""; // line2 removed
            const tag: string =
              addr.addressType ?? addr.category ?? (addr.isDefault ? "Default" : "Home");

            return (
              <label
                key={addr._id}
                className="flex gap-3 items-start p-3 border border-[#E4E4E7] rounded-[20px] cursor-pointer hover:bg-gray-50"
              >
                <input
                  type="radio"
                  name="delivery-address"
                  className="mt-1 h-4 w-4 accent-[#0F172A] cursor-pointer"
                  checked={selectedAddressId === addr._id}
                  onChange={() => addr._id && onSelectAddress(addr._id)}
                />

                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-[12px] px-2 py-[2px] rounded bg-[#0F172A] text-white">
                      {tag}
                    </span>
                    {addr.isDefault && (
                      <span className="text-xs text-[#0F172A]/70">(Default)</span>
                    )}
                  </div>

                  <div className="mt-2">
                    <div className="text-[16px] font-[650] text-[#000000]">
                      {addr.name}{" "}
                      <span className="text-[14px] text-[#64748B]"> {addr.phone}</span>
                    </div>

                    <div className="text-[14px] text-[#475569] leading-relaxed">
                      {linePart1}
                      {linePart2}
                      {linePart1 || linePart2 ? "," : ""} {addr.city}, {addr.state} - {addr.postalCode}
                      {addr.landmark ? ` (Near ${addr.landmark})` : ""}
                    </div>
                  </div>
                </div>

                {onEditAddress && (
                  <Button
                    type="button"
                    size="sm"
                    variant="default"
                    onClick={(e: React.MouseEvent<HTMLButtonElement>) => {
                      e.stopPropagation();
                      onEditAddress(addr);
                    }}
                    disabled={!profileReady}
                    title={!profileReady ? "Complete Profile Info (Name & Mobile) first" : undefined}
                  >
                    Edit
                  </Button>
                )}
              </label>
            );
          })}
        </div>
      ) : (
        <div className="mt-4">
          <Button
            variant="babas"
            onClick={onAddAddress}
            className="px-6 rounded-[24px]"
            disabled={!profileReady}
            title={!profileReady ? "Complete Profile Info (Name & Mobile) first" : undefined}
          >
            Add a delivery address
          </Button>
        </div>
      )}
    </div>
  );
};

export default DeliveryAddressCard;
