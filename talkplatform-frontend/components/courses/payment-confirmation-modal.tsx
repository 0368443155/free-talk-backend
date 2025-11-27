"use client";

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
import { DollarSign, Loader2 } from "lucide-react";

interface PaymentConfirmationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  title: string;
  description: string;
  amount: number;
  currentBalance: number;
  isProcessing?: boolean;
}

export function PaymentConfirmationModal({
  open,
  onOpenChange,
  onConfirm,
  title,
  description,
  amount,
  currentBalance,
  isProcessing = false,
}: PaymentConfirmationModalProps) {
  const hasEnoughCredits = currentBalance >= amount;
  const remainingBalance = currentBalance - amount;

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="sm:max-w-[425px]">
        <AlertDialogHeader>
          <AlertDialogTitle className="text-2xl font-bold">
            {title}
          </AlertDialogTitle>
          <AlertDialogDescription className="text-base space-y-3">
            <p>{description}</p>
            
            <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600 dark:text-gray-400">Amount:</span>
                <span className="text-lg font-semibold text-gray-900 dark:text-white">
                  ${amount}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600 dark:text-gray-400">Current Balance:</span>
                <span className="text-sm font-medium text-gray-900 dark:text-white">
                  ${currentBalance}
                </span>
              </div>
              <div className="border-t pt-2 mt-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Remaining Balance:</span>
                  <span className={`text-sm font-semibold ${hasEnoughCredits ? 'text-green-600' : 'text-red-600'}`}>
                    ${remainingBalance.toFixed(2)}
                  </span>
                </div>
              </div>
            </div>

            {!hasEnoughCredits && (
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3">
                <p className="text-sm text-red-800 dark:text-red-200">
                  Insufficient credits. You need ${(amount - currentBalance).toFixed(2)} more credits to complete this purchase.
                </p>
              </div>
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isProcessing}>
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            disabled={!hasEnoughCredits || isProcessing}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {isProcessing ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                <DollarSign className="w-4 h-4 mr-2" />
                Confirm Purchase
              </>
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

