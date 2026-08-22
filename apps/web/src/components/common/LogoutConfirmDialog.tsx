// src/components/common/LogoutConfirmDialog.tsx
"use client";

import * as React from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onConfirm: () => void;
  loading?: boolean;
}

export default function LogoutConfirmDialog({
  open,
  onOpenChange,
  onConfirm,
  loading,
}: Props) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="sm:max-w-[480px]">
        <AlertDialogHeader>
          <AlertDialogTitle className="text-[#1E293B]">
            Confirm Logout
          </AlertDialogTitle>
          <AlertDialogDescription className="text-[#475569]">
            Are you sure you want to log out? You’ll need to log in again to access your account.
          </AlertDialogDescription>
        </AlertDialogHeader>

        {/* Ensure both buttons are visible, spaced, and on brand */}
        <AlertDialogFooter className="flex flex-row justify-end gap-3 sm:gap-4">
          <AlertDialogCancel
            disabled={loading}
            className="border border-[#E4E4E7] bg-white text-[#1E293B] hover:bg-gray-50"
          >
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            disabled={loading}
            className="bg-[#1E293B] hover:bg-[#1E293B]/90"
          >
            {loading ? "Signing out..." : "Logout"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
