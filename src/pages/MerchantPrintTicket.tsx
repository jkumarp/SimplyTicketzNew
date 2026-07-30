"use client";

import React, { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { QRCodeSVG } from "qrcode.react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import {getMerchantId, getUserId, getUserEmail, getAuthHeader} from "@/utils/common";
import {
  ArrowLeft,
  Calendar,
  Clock,
  Download,
  Loader2,
  MapPin,
  Printer,
  Ticket,
  User,
} from "lucide-react";

import { API_URL } from "@/config";

const MerchantPrintTicket = () => {
  const { ticketId } = useParams(); // Note: ticketId parameter is actually the Invoice ID passed here
  const navigate = useNavigate();
  const printRef = useRef<HTMLDivElement>(null);
  // Controls which printable section is visible when window.print() fires -
  // the tickets grid or the invoice. Only the matching section renders
  // on-screen/print; everything else is print:hidden. Buttons themselves are
  // hidden in @media print below, so the browser's print/Save-as-PDF dialog
  // only ever shows the section the user asked for.
  const [printTarget, setPrintTarget] = useState<"tickets" | "invoice">("tickets");

  const { data: ticketData, isLoading } = useQuery({
    queryKey: ["ticket-full", ticketId],
    queryFn: async () => {
      // 1. Fetch tickets by Invoice ID
      const tRes = await fetch(`${API_URL}/tickets-by-invoiceId?invoiceId=${ticketId}`, {
        headers: getAuthHeader(),
      });
      const tickets = (await tRes.json()).data;
      if (!tickets || tickets.length === 0) {
        throw new Error("No tickets found for this invoice.");
      }

      // Use the first ticket for general service context
      const sampleTicket = tickets[0];

      // 2. Fetch service details
      const sRes = await fetch(`${API_URL}/merchant-services`, {
        headers: getAuthHeader(),
      });
      const service = (await sRes.json()).data.find((s: any) =>
        s.id === sampleTicket.merchant_service_id
      );

      // 3. Fetch categories for service
      const cRes = await fetch(
        `${API_URL}/ticket-categories?merchantServiceId=${service.id}`,
        { headers: getAuthHeader() },
      );
      const categories = (await cRes.json()).data;

      // 4. Fetch timeslots for merchant
      const tsRes = await fetch(
        `${API_URL}/ticket-timeslots?merchantId=${service.merchant_id}`,
        { headers: getAuthHeader() },
      );
      const timeslots = (await tsRes.json()).data;

      // 5. Fetch details for each individual ticket header
      const allDetails: any[] = [];
      for (const ticket of tickets) {
        const dRes = await fetch(
          `${API_URL}/ticket-details?ticketId=${ticket.id}`,
          { headers: getAuthHeader() },
        );
        const details = (await dRes.json()).data || [];
        details.forEach((d: any) => {
          allDetails.push({
            ...d,
            ticketBookingDate: ticket.booking_date,
            ticketStatus: ticket.status,
            ticketHeaderId: ticket.id,
            ticketTimeslotId: ticket.ticket_timeslot_id,
          });
        });
      }

      // 6. Fetch invoice context for customer details.
      // `ticketId` (the route param) is actually the invoice id - see the
      // note at the top of this component - and the invoice table has no
      // ticket_id column to filter by (tickets reference their invoice via
      // ticket.invoice_id, not the reverse), so look it up by its own id.
      const invRes = await fetch(`${API_URL}/invoices?invoiceId=${ticketId}`, {
        headers: getAuthHeader(),
      });
      const invoices = (await invRes.json()).data || [];
      const invoice = invoices[0] || null;

      return { tickets, details: allDetails, service, categories, timeslots, invoice };
    },
    enabled: !!ticketId,
  });

  const handlePrintTickets = () => {
    setPrintTarget("tickets");
    // Give React a tick to re-render with the "tickets" section visible
    // before the browser snapshots the page for printing.
    setTimeout(() => window.print(), 50);
  };

  const handleDownloadInvoice = () => {
    setPrintTarget("invoice");
    setTimeout(() => window.print(), 50);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col">
        <Navbar />
        <div className="flex-grow flex items-center justify-center">
          <Loader2 className="h-12 w-12 animate-spin text-indigo-600" />
        </div>
        <Footer />
      </div>
    );
  }

  const { tickets, details, service, categories, timeslots, invoice } = ticketData;

  // Online self-service bookings are created PENDING and only flipped to
  // CONFIRMED once paymentController confirms the gateway payment succeeded
  // (see backend bookTicket + CustomerTicketBooking.tsx). Staff-assisted
  // bookings are CONFIRMED immediately, so this only ever blocks an unpaid
  // online booking someone tries to reach directly - tickets must never be
  // downloadable/printable before payment is confirmed.
  const allConfirmed = tickets.length > 0 && tickets.every((t: any) => t.status === "CONFIRMED");

  if (!allConfirmed) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col">
        <Navbar />
        <main className="flex-grow flex items-center justify-center px-4">
          <Card className="max-w-md w-full border-2 border-amber-200">
            <CardContent className="p-8 text-center space-y-3">
              <h1 className="text-xl font-bold text-slate-900">
                Tickets Not Available Yet
              </h1>
              <p className="text-sm text-slate-500">
                This booking's payment hasn't been confirmed yet, so its
                tickets can't be downloaded or printed. If you just paid,
                please wait a moment and try again.
              </p>
              <Button
                variant="outline"
                className="rounded-xl"
                onClick={() => navigate(`/payment-result/${ticketId}`)}
              >
                Check Payment Status
              </Button>
            </CardContent>
          </Card>
        </main>
        <Footer />
      </div>
    );
  }

  // Generate individual tickets for each person
  const individualTickets: any[] = [];
  details.forEach((detail: any) => {
    const category = categories.find((c: any) =>
      c.id === detail.ticket_category_id
    );

    if (!category) return;

    // Add Adult tickets
    for (let i = 0; i < detail.adult_count; i++) {
      const uniqueKey = `${detail.id}-A-${i}`;
      const currentTsId = detail.ticketTimeslotId?.toString() || category.timeslot_id?.toString() || "";

      individualTickets.push({
        key: uniqueKey,
        type: "ADULT",
        categoryName: category.name,
        price: category.adult_price,
        detailId: detail.id,
        timeslotId: currentTsId,
        ticketHeaderId: detail.ticketHeaderId,
        bookingDate: detail.ticketBookingDate,
        qrValue: JSON.stringify({
          msid: service.id,
          tid: detail.ticketHeaderId,
          tdid: detail.id,
          ac: 1,
          cc: 0,
          pr: category.adult_price,
          dov: detail.ticketBookingDate.split("T")[0],
          tsid: currentTsId,
        }),
      });
    }

    // Add Child tickets
    for (let i = 0; i < detail.child_count; i++) {
      const uniqueKey = `${detail.id}-C-${i}`;
      const currentTsId = detail.ticketTimeslotId?.toString() || category.timeslot_id?.toString() || "";

      individualTickets.push({
        key: uniqueKey,
        type: "CHILD",
        categoryName: category.name,
        price: category.child_price || "0.00",
        detailId: detail.id,
        timeslotId: currentTsId,
        ticketHeaderId: detail.ticketHeaderId,
        bookingDate: detail.ticketBookingDate,
        qrValue: JSON.stringify({
          msid: service.id,
          tid: detail.ticketHeaderId,
          tdid: detail.id,
          ac: 0,
          cc: 1,
          pr: category.child_price || "0.00",
          dov: detail.ticketBookingDate.split("T")[0],
          tsid: currentTsId,
        }),
      });
    }
  });

  // Group ticket details by category for the invoice line items (one row
  // per category rather than one row per individual ticket).
  const invoiceItems: { category: any; adult: number; child: number }[] = [];
  {
    const grouped: Record<string, { category: any; adult: number; child: number }> = {};
    details.forEach((detail: any) => {
      const category = categories.find((c: any) => c.id === detail.ticket_category_id);
      if (!category) return;
      const key = category.id.toString();
      if (!grouped[key]) grouped[key] = { category, adult: 0, child: 0 };
      grouped[key].adult += detail.adult_count || 0;
      grouped[key].child += detail.child_count || 0;
    });
    invoiceItems.push(...Object.values(grouped));
  }

  // invoice.sgst/cgst/igst store the tax rate (%) copied from the service at
  // booking time (see backend bookTicket), not a pre-computed amount, so the
  // amounts are derived here the same way the booking page derives them.
  const isHomeState = service?.state === 1 || service?.state === "1";
  const invSubtotal = invoice?.total_amount ? parseFloat(invoice.total_amount) : 0;
  const invDiscountValue = invoice?.discount_value ? parseFloat(invoice.discount_value) : 0;
  const invDiscountedSubtotal = Math.max(0, invSubtotal - invDiscountValue);
  const sgstPct = invoice?.sgst ? parseFloat(invoice.sgst) : 0;
  const cgstPct = invoice?.cgst ? parseFloat(invoice.cgst) : 0;
  const igstPct = invoice?.igst ? parseFloat(invoice.igst) : 0;
  const sgstAmount = isHomeState ? (invDiscountedSubtotal * sgstPct) / 100 : 0;
  const cgstAmount = isHomeState ? (invDiscountedSubtotal * cgstPct) / 100 : 0;
  const igstAmount = !isHomeState ? (invDiscountedSubtotal * igstPct) / 100 : 0;
  const invGrandTotal = invoice?.grand_total
    ? parseFloat(invoice.grand_total)
    : invDiscountedSubtotal + sgstAmount + cgstAmount + igstAmount;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <Navbar />

      <main className="flex-grow container px-4 md:px-8 py-12">
        <div className="max-w-4xl mx-auto space-y-8">
          <div className="flex items-center justify-between print:hidden">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => navigate(-1)}
                className="rounded-full"
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <h1 className="text-3xl font-bold text-slate-900">
                Print Tickets
              </h1>
            </div>
            <div className="flex items-center gap-3">
              <Button
                onClick={handleDownloadInvoice}
                variant="outline"
                className="border-indigo-200 text-indigo-600 hover:bg-indigo-50 gap-2 h-12 px-6 rounded-xl shadow-sm"
              >
                <Download className="h-5 w-5" /> Download Invoice
              </Button>
              <Button
                onClick={handlePrintTickets}
                className="bg-indigo-600 hover:bg-indigo-700 gap-2 h-12 px-6 rounded-xl shadow-lg"
              >
                <Printer className="h-5 w-5" /> Print All Tickets
              </Button>
            </div>
          </div>

          <div
            ref={printRef}
            className={cn("space-y-8 print:space-y-0", printTarget === "invoice" && "print:hidden")}
          >
            {individualTickets.map((t, idx) => {
              const selectedTs = timeslots.find((ts: any) =>
                ts.id.toString() === t.timeslotId
              );

              return (
                <Card
                  key={t.key}
                  className="overflow-hidden border-2 border-slate-200 shadow-none print:shadow-none print:border-slate-300 print:mb-8 print:break-inside-avoid animate-in fade-in duration-200"
                >
                  <div className="flex flex-col md:flex-row">
                    {/* Left Side: Info */}
                    <div className="flex-grow p-8 space-y-6">
                      <div className="flex justify-between items-start">
                        <div className="flex items-center gap-3">
                          <div className="bg-indigo-600 p-2 rounded-lg">
                            <Ticket className="h-6 w-6 text-white" />
                          </div>
                          <div className="space-y-1">
                            <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tight leading-none">
                              {service.name}
                            </h2>
                            <div className="flex items-center gap-2">
                              <p className="text-indigo-600 font-bold whitespace-nowrap">
                                {t.categoryName} - {t.type}
                              </p>

                              {/* Print-only Timeslot Text */}
                              <span className="hidden print:inline-block text-[10px] font-bold bg-slate-100 px-2 py-0.5 rounded-full text-slate-600">
                                {selectedTs
                                  ? `${selectedTs.name} (${selectedTs.start}-${selectedTs.end})`
                                  : "No Slot"}
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-[10px] font-bold text-slate-400 uppercase">
                            Ticket ID
                          </p>
                          <p className="font-mono font-bold text-slate-900">
                            #{t.ticketHeaderId}-{idx + 1}
                          </p>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-8">
                        <div className="space-y-1">
                          <p className="text-[10px] font-bold text-slate-400 uppercase flex items-center gap-1">
                            <User className="h-3 w-3" /> Guest Name
                          </p>
                          <p className="font-bold text-slate-900">
                            {invoice?.customer_name || "Guest"}
                          </p>
                        </div>
                        <div className="space-y-1">
                          <p className="text-[10px] font-bold text-slate-400 uppercase flex items-center gap-1">
                            <Calendar className="h-3 w-3" /> Date of Visit
                          </p>
                          <p className="font-bold text-slate-900">
                            {t.bookingDate.split("T")[0]}
                          </p>
                        </div>
                        <div className="space-y-1">
                          <p className="text-[10px] font-bold text-slate-400 uppercase flex items-center gap-1">
                            <MapPin className="h-3 w-3" /> Location
                          </p>
                          <p className="text-sm font-medium text-slate-700">
                            {service.addressline1}
                          </p>
                        </div>
                        <div className="space-y-1">
                          <p className="text-[10px] font-bold text-slate-400 uppercase flex items-center gap-1">
                            <Clock className="h-3 w-3" /> Entry Time
                          </p>
                          <p className="font-bold text-slate-900">
                            {selectedTs
                              ? `${selectedTs.start} - ${selectedTs.end}`
                              : `${service.start_time} - ${service.end_time}`}
                          </p>
                        </div>
                      </div>

                      <div className="pt-4 border-t border-dashed flex justify-between items-center">
                        <p className="text-xs text-slate-400 italic">
                          Please present this QR code at the entrance.
                        </p>
                        <div className="text-right">
                          <p className="text-[10px] font-bold text-slate-400 uppercase">
                            Price Paid
                          </p>
                          <p className="text-xl font-black text-slate-900">
                            ₹{parseFloat(t.price).toFixed(2)}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Right Side: QR Code */}
                    <div className="w-full md:w-64 bg-slate-50 border-l-2 border-dashed border-slate-200 flex flex-col items-center justify-center p-8 gap-4 print:bg-white">
                      <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100">
                        <QRCodeSVG value={t.qrValue} size={160} level="H" />
                      </div>
                      <p className="text-[10px] font-mono text-slate-400 break-all text-center max-w-[160px]">
                        {t.detailId}
                      </p>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>

          {/* Invoice-only printable view - hidden on screen, only shown
              (via print:block) when "Download Invoice" triggers window.print() */}
          <div className={cn("hidden", printTarget === "invoice" && "print:block")}>
            <Card className="border-2 border-slate-200 shadow-none print:border-slate-300 print:shadow-none">
              <CardContent className="p-8 space-y-8">
                <div className="flex justify-between items-start pb-6 border-b border-dashed">
                  <div>
                    <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tight">
                      Tax Invoice
                    </h2>
                    <p className="text-sm text-slate-500 mt-1">{service.name}</p>
                    <p className="text-xs text-slate-500">
                      {[service.addressline1, service.addressline2, service.state].filter(Boolean).join(", ")}
                      {service.pincode ? ` - ${service.pincode}` : ""}
                    </p>
                    {invoice?.gstin && (
                      <p className="text-xs text-slate-500 mt-1">GSTIN: {invoice.gstin}</p>
                    )}
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] font-bold text-slate-400 uppercase">Invoice Number</p>
                    <p className="font-mono font-bold text-slate-900">{invoice?.invoice_number || "-"}</p>
                    <p className="text-[10px] font-bold text-slate-400 uppercase mt-2">Date</p>
                    <p className="font-bold text-slate-900">
                      {invoice?.transaction_date ? invoice.transaction_date.split("T")[0] : "-"}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-8">
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Billed To</p>
                    <p className="font-bold text-slate-900">{invoice?.customer_name || "Walk-in Guest"}</p>
                    {invoice?.customer_phone && (
                      <p className="text-sm text-slate-600">
                        {invoice?.customer_phone_code ? `+${invoice.customer_phone_code} ` : ""}
                        {invoice.customer_phone}
                      </p>
                    )}
                    {invoice?.email && <p className="text-sm text-slate-600">{invoice.email}</p>}
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Payment Mode</p>
                    <p className="font-bold text-slate-900">{invoice?.payment_mode || "-"}</p>
                  </div>
                </div>

                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b-2 border-slate-200 text-left">
                      <th className="py-2 font-bold text-slate-700">Category</th>
                      <th className="py-2 font-bold text-slate-700 text-right">Adult</th>
                      <th className="py-2 font-bold text-slate-700 text-right">Child</th>
                      <th className="py-2 font-bold text-slate-700 text-right">Line Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {invoiceItems.map(({ category, adult, child }) => {
                      const lineTotal =
                        adult * parseFloat(category.adult_price) +
                        child * parseFloat(category.child_price || "0");
                      return (
                        <tr key={category.id} className="border-b border-slate-100">
                          <td className="py-2 font-semibold text-slate-800">{category.name}</td>
                          <td className="py-2 text-right text-slate-600">
                            {adult > 0 ? `${adult} x ₹${parseFloat(category.adult_price).toFixed(2)}` : "-"}
                          </td>
                          <td className="py-2 text-right text-slate-600">
                            {child > 0 ? `${child} x ₹${parseFloat(category.child_price || "0").toFixed(2)}` : "-"}
                          </td>
                          <td className="py-2 text-right font-bold text-slate-900">₹{lineTotal.toFixed(2)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>

                <div className="flex justify-end">
                  <div className="w-full max-w-xs space-y-2 text-sm">
                    <div className="flex justify-between text-slate-600">
                      <span>Subtotal</span>
                      <span className="font-semibold text-slate-900">₹{invSubtotal.toFixed(2)}</span>
                    </div>
                    {invDiscountValue > 0 && (
                      <div className="flex justify-between text-emerald-600">
                        <span>Discount {invoice?.discount_percentage ? `(${invoice.discount_percentage}%)` : ""}</span>
                        <span className="font-semibold">-₹{invDiscountValue.toFixed(2)}</span>
                      </div>
                    )}
                    {sgstAmount > 0 && (
                      <div className="flex justify-between text-slate-600">
                        <span>SGST ({sgstPct}%)</span>
                        <span className="font-semibold text-slate-900">₹{sgstAmount.toFixed(2)}</span>
                      </div>
                    )}
                    {cgstAmount > 0 && (
                      <div className="flex justify-between text-slate-600">
                        <span>CGST ({cgstPct}%)</span>
                        <span className="font-semibold text-slate-900">₹{cgstAmount.toFixed(2)}</span>
                      </div>
                    )}
                    {igstAmount > 0 && (
                      <div className="flex justify-between text-slate-600">
                        <span>IGST ({igstPct}%)</span>
                        <span className="font-semibold text-slate-900">₹{igstAmount.toFixed(2)}</span>
                      </div>
                    )}
                    <div className="flex justify-between pt-2 border-t-2 border-slate-200 text-base font-black text-slate-900">
                      <span>Grand Total</span>
                      <span>₹{invGrandTotal.toFixed(2)}</span>
                    </div>
                  </div>
                </div>

                <p className="text-[11px] text-slate-400 italic pt-4 border-t border-dashed">
                  This is a system-generated invoice and does not require a signature.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>

      <Footer />

      <style>
        {`
        @media print {
          body { background: white; }
          nav, footer, button, .print\\:hidden { display: none !important; }
          .container { width: 100%; max-width: none; padding: 0; margin: 0; }
          main { padding: 0; }
        }
      `}
      </style>
    </div>
  );
};

export default MerchantPrintTicket;