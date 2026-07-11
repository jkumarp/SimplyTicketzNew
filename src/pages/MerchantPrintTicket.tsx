"use client";

import React, { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { QRCodeSVG } from "qrcode.react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ArrowLeft,
  Calendar,
  Clock,
  Loader2,
  MapPin,
  Printer,
  Ticket,
  User,
} from "lucide-react";

import { API_URL } from "@/config";

const MerchantPrintTicket = () => {
  const { ticketId } = useParams();
  const navigate = useNavigate();
  const printRef = useRef<HTMLDivElement>(null);

  // State to track selected timeslots for each individual ticket
  const [selectedTimeslots, setSelectedTimeslots] = useState<
    Record<string, string>
  >({});

  const getAuthHeader = () => ({
    "Authorization": `Bearer ${localStorage.getItem("token")}`,
  });

  const { data: ticketData, isLoading } = useQuery({
    queryKey: ["ticket-full", ticketId],
    queryFn: async () => {
      // Fetch ticket header
      const tRes = await fetch(`${API_URL}/tickets`, {
        headers: getAuthHeader(),
      });
      const tickets = (await tRes.json()).data;
      const ticket = tickets.find((t: any) => t.id.toString() === ticketId);

      // Fetch ticket details
      const dRes = await fetch(
        `${API_URL}/ticket-details?ticketId=${ticketId}`,
        { headers: getAuthHeader() },
      );
      const details = (await dRes.json()).data;

      // Fetch service & categories for metadata
      const sRes = await fetch(`${API_URL}/merchant-services`, {
        headers: getAuthHeader(),
      });
      const service = (await sRes.json()).data.find((s: any) =>
        s.id === ticket.merchant_service_id
      );

      const cRes = await fetch(
        `${API_URL}/ticket-categories?merchantServiceId=${service.id}`,
        { headers: getAuthHeader() },
      );
      const categories = (await cRes.json()).data;

      // Fetch timeslots for this merchant
      const tsRes = await fetch(
        `${API_URL}/ticket-timeslots?merchantId=${service.merchant_id}`,
        { headers: getAuthHeader() },
      );
      const timeslots = (await tsRes.json()).data;

      return { ticket, details, service, categories, timeslots };
    },
    enabled: !!ticketId,
  });

  const handlePrint = () => {
    window.print();
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

  const { ticket, details, service, categories, timeslots } = ticketData;

  // Generate individual tickets for each person
  const individualTickets: any[] = [];
  details.forEach((detail: any) => {
    const category = categories.find((c: any) =>
      c.id === detail.ticket_category_id
    );

    // Add Adult tickets
    for (let i = 0; i < detail.adult_count; i++) {
      const uniqueKey = `${detail.id}-A-${i}`;
      const currentTsId = selectedTimeslots[uniqueKey] ||
        category.timeslot_id?.toString() || "";

      individualTickets.push({
        key: uniqueKey,
        type: "ADULT",
        categoryName: category.name,
        price: category.adult_price,
        detailId: detail.id,
        timeslotId: currentTsId,
        qrValue: JSON.stringify({
          msid: service.id,
          tid: ticket.id,
          tdid: detail.id,
          ac: 1,
          cc: 0,
          pr: category.adult_price,
          dov: ticket.booking_date.split("T")[0],
          tsid: currentTsId,
        }),
      });
    }

    // Add Child tickets
    for (let i = 0; i < detail.child_count; i++) {
      const uniqueKey = `${detail.id}-C-${i}`;
      const currentTsId = selectedTimeslots[uniqueKey] ||
        category.timeslot_id?.toString() || "";

      individualTickets.push({
        key: uniqueKey,
        type: "CHILD",
        categoryName: category.name,
        price: category.child_price || "0.00",
        detailId: detail.id,
        timeslotId: currentTsId,
        qrValue: JSON.stringify({
          msid: service.id,
          tid: ticket.id,
          tdid: detail.id,
          ac: 0,
          cc: 1,
          pr: category.child_price || "0.00",
          dov: ticket.booking_date.split("T")[0],
          tsid: currentTsId,
        }),
      });
    }
  });

  const handleTimeslotChange = (ticketKey: string, tsId: string) => {
    setSelectedTimeslots((prev) => ({ ...prev, [ticketKey]: tsId }));
  };

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
            <Button
              onClick={handlePrint}
              className="bg-indigo-600 hover:bg-indigo-700 gap-2 h-12 px-6 rounded-xl shadow-lg"
            >
              <Printer className="h-5 w-5" /> Print All Tickets
            </Button>
          </div>

          <div ref={printRef} className="space-y-8 print:space-y-0">
            {individualTickets.map((t, idx) => {
              const selectedTs = timeslots.find((ts: any) =>
                ts.id.toString() === t.timeslotId
              );

              return (
                <Card
                  key={t.key}
                  className="overflow-hidden border-2 border-slate-200 shadow-none print:shadow-none print:border-slate-300 print:mb-8 print:break-inside-avoid"
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
                            #{ticket.id}-{idx + 1}
                          </p>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-8">
                        <div className="space-y-1">
                          <p className="text-[10px] font-bold text-slate-400 uppercase flex items-center gap-1">
                            <User className="h-3 w-3" /> Guest Name
                          </p>
                          <p className="font-bold text-slate-900">
                            {ticket.customer_name}
                          </p>
                        </div>
                        <div className="space-y-1">
                          <p className="text-[10px] font-bold text-slate-400 uppercase flex items-center gap-1">
                            <Calendar className="h-3 w-3" /> Date of Visit
                          </p>
                          <p className="font-bold text-slate-900">
                            {ticket.booking_date.split("T")[0]}
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
                            &#8377;{t.price}
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