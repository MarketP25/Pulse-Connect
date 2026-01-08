import React, { useState, useEffect } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CreditCard, Info, DollarSign, Calendar, Users } from "lucide-react";

interface BookingCalculation {
  base_price_usd: number;
  booking_fee_usd: number;
  taxes_usd: number;
  deposit_usd: number;
  total_usd: number;
  breakdown: {
    slot_price: number;
    platform_service_fee: number;
    taxes: number;
    deposit: number;
    total: number;
  };
  policy_version: string;
  trace_id: string;
}

interface BookingRequest {
  place_id: string;
  slot_start: Date;
  slot_end: Date;
  guest_count: number;
  special_requests?: string;
}

interface BuyerCheckoutProps {
  bookingRequest: BookingRequest;
  onConfirm: (calculation: BookingCalculation) => void;
  onCancel: () => void;
}

export const BuyerCheckout: React.FC<BuyerCheckoutProps> = ({
  bookingRequest,
  onConfirm,
  onCancel
}) => {
  const [calculation, setCalculation] = useState<BookingCalculation | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    calculateBooking();
  }, [bookingRequest]);

  const calculateBooking = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch("/api/places/bookings/calculate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("auth_token")}`,
          "x-trace-id": crypto.randomUUID()
        },
        body: JSON.stringify(bookingRequest)
      });

      if (!response.ok) {
        throw new Error("Failed to calculate booking costs");
      }

      const data = await response.json();
      setCalculation(data.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to calculate booking");
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmBooking = async () => {
    if (!calculation) return;

    try {
      setProcessing(true);

      const response = await fetch("/api/places/bookings", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("auth_token")}`,
          "x-trace-id": calculation.trace_id
        },
        body: JSON.stringify(bookingRequest)
      });

      if (!response.ok) {
        throw new Error("Failed to create booking");
      }

      const data = await response.json();
      onConfirm(calculation);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create booking");
    } finally {
      setProcessing(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD"
    }).format(amount);
  };

  const formatDateTime = (date: Date) => {
    return new Date(date).toLocaleString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit"
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <Alert className="m-4">
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  if (!calculation) {
    return (
      <Alert className="m-4">
        <AlertDescription>Unable to calculate booking costs. Please try again.</AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Booking Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Booking Summary
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-600">Check-in</p>
              <p className="font-medium">{formatDateTime(bookingRequest.slot_start)}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Check-out</p>
              <p className="font-medium">{formatDateTime(bookingRequest.slot_end)}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            <span>
              {bookingRequest.guest_count} guest{bookingRequest.guest_count !== 1 ? "s" : ""}
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Price Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Price Breakdown
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            <div className="flex justify-between">
              <span>Slot Price</span>
              <span>{formatCurrency(calculation.breakdown.slot_price)}</span>
            </div>

            <div className="flex justify-between text-blue-600">
              <span className="flex items-center gap-1">
                Platform Service Fee
                <Badge variant="secondary" className="text-xs">
                  3% non-refundable
                </Badge>
              </span>
              <span>{formatCurrency(calculation.breakdown.platform_service_fee)}</span>
            </div>

            <div className="flex justify-between">
              <span>Taxes</span>
              <span>{formatCurrency(calculation.breakdown.taxes)}</span>
            </div>

            <Separator />

            <div className="flex justify-between font-semibold text-lg">
              <span>Total</span>
              <span>{formatCurrency(calculation.breakdown.total)}</span>
            </div>

            <div className="flex justify-between text-sm text-gray-600">
              <span>Deposit Required</span>
              <span>{formatCurrency(calculation.breakdown.deposit)}</span>
            </div>
          </div>

          {/* Policy Information */}
          <div className="bg-gray-50 p-3 rounded-lg">
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Info className="h-4 w-4" />
              <span>
                Fee Policy Version:{" "}
                <code className="bg-white px-1 rounded">{calculation.policy_version}</code>
              </span>
            </div>
            <div className="text-xs text-gray-500 mt-1">Trace ID: {calculation.trace_id}</div>
          </div>
        </CardContent>
      </Card>

      {/* Important Notices */}
      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          <strong>Important:</strong> The Platform Service Fee (3%) is non-refundable and charged
          immediately upon booking confirmation. Cancellations may be subject to additional fees
          based on timing.
        </AlertDescription>
      </Alert>

      {/* Action Buttons */}
      <div className="flex gap-4">
        <Button variant="outline" onClick={onCancel} disabled={processing} className="flex-1">
          Cancel
        </Button>
        <Button onClick={handleConfirmBooking} disabled={processing} className="flex-1">
          {processing ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              Processing...
            </>
          ) : (
            <>
              <CreditCard className="h-4 w-4 mr-2" />
              Confirm Booking
            </>
          )}
        </Button>
      </div>
    </div>
  );
};
