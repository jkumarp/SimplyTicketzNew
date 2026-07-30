"use client";

import React from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { API_URL } from "@/config";
import { getAuthHeader } from "@/utils/common";
import {
  CheckCircle2,
  Loader2,
  Printer,
  RefreshCw,
  XCircle,
} from "lucide-react";

/**
 * Landing page the customer's browser is redirected to once they finish
 * (or abandon) checkout at the payment gateway - see
 * backend/src/services/paymentServices.ts (Cashfree return_url) and
 * paymentController.easebuzzReturn (Easebuzz surl/furl relay).
 *
 * This page never trusts the gateway/status/order_id query params on their
 * own - it always re-checks GET /payments/status, which is either already
 * backed by a confirmed ticket status (Easebuzz, updated server-side before
 * the redirect) or independently re-verifies against the gateway (Cashfree).
 * Ticket download/print is only ever offered once that check reports paid.
 */
const BookingPaymentResult = () => {
  const { invoiceId } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const gateway = searchParams.get("gateway") || undefined;
  const orderId = searchParams.get("order_id") || undefined;

  const { data, isLoading, isFetching, isError, error, refetch } = useQuery({
    queryKey: ["payment-status", invoiceId, gateway, orderId],
    queryFn: async () => {
      const params = new URLSearchParams({ invoiceId: invoiceId! });
      // Only Cashfree needs an authoritative gateway re-check here - the
      // Easebuzz relay already updated the ticket status server-side before
      // redirecting, so the fast "already confirmed" path in getPaymentStatus
      // covers it without an orderId/txnid.
      if (gateway === "CASHFREE" && orderId) {
        params.set("gateway", gateway);
        params.set("orderId", orderId);
      }
      const res = await fetch(`${API_URL}/payments/status?${params.toString()}`, {
        headers: getAuthHeader(),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Could not verify payment status");
      return json;
    },
    enabled: !!invoiceId && invoiceId !== "0",
    retry: false,
  });

  const isPaid = data?.paid === true;

  return (
    <div className="min-h-screen bg-slate-50/50 flex flex-col">
      <Navbar />
      <main className="flex-grow flex items-center justify-center px-4 py-16">
        <Card className="w-full max-w-md shadow-md border-slate-200">
          <CardContent className="p-8 text-center space-y-5">
            {(isLoading || isFetching) && (
              <>
                <Loader2 className="h-12 w-12 animate-spin text-indigo-600 mx-auto" />
                <h1 className="text-xl font-bold text-slate-900">
                  Verifying your payment...
                </h1>
                <p className="text-sm text-slate-500">
                  Please don't close this page.
                </p>
              </>
            )}

            {!isLoading && !isFetching && (isError || !invoiceId || invoiceId === "0") && (
              <>
                <XCircle className="h-14 w-14 text-red-500 mx-auto" />
                <h1 className="text-xl font-bold text-slate-900">
                  Couldn't verify your payment
                </h1>
                <p className="text-sm text-slate-500">
                  {(error as any)?.message ||
                    "Something went wrong while checking your payment status."}
                </p>
                <Button
                  onClick={() => refetch()}
                  variant="outline"
                  className="gap-2 rounded-xl"
                >
                  <RefreshCw className="h-4 w-4" /> Check Again
                </Button>
              </>
            )}

            {!isLoading && !isFetching && !isError && data && (
              isPaid
                ? (
                  <>
                    <CheckCircle2 className="h-14 w-14 text-emerald-500 mx-auto" />
                    <h1 className="text-xl font-bold text-slate-900">
                      Payment Successful!
                    </h1>
                    <p className="text-sm text-slate-500">
                      Your tickets are confirmed and ready. A copy of your
                      tickets and invoice has also been emailed to you, if you
                      provided an address.
                    </p>
                    <Button
                      onClick={() => navigate(`/merchant/print/${invoiceId}`)}
                      className="w-full bg-indigo-600 hover:bg-indigo-700 gap-2 h-12 rounded-xl"
                    >
                      <Printer className="h-4 w-4" /> Download / Print Tickets
                    </Button>
                  </>
                )
                : (
                  <>
                    <XCircle className="h-14 w-14 text-red-500 mx-auto" />
                    <h1 className="text-xl font-bold text-slate-900">
                      Payment Not Completed
                    </h1>
                    <p className="text-sm text-slate-500">
                      Your tickets will only be issued once payment succeeds.
                      No amount has been booked if the payment failed or was
                      cancelled.
                    </p>
                    <div className="flex flex-col gap-2">
                      <Button
                        onClick={() => refetch()}
                        variant="outline"
                        className="gap-2 rounded-xl"
                      >
                        <RefreshCw className="h-4 w-4" /> Check Again
                      </Button>
                      <Button
                        onClick={() => navigate(-1)}
                        variant="ghost"
                        className="rounded-xl text-slate-500"
                      >
                        Back to Booking
                      </Button>
                    </div>
                  </>
                )
            )}
          </CardContent>
        </Card>
      </main>
      <Footer />
    </div>
  );
};

export default BookingPaymentResult;
