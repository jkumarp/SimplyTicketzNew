"use client";

import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, keepPreviousData } from '@tanstack/react-query';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import {getAuthHeader} from "@/utils/common";
import {
  Search, Ticket, Printer, User, Phone,
  Calendar, Loader2, ArrowLeft, Filter,
  ChevronRight, Download
} from 'lucide-react';

import { API_URL } from "@/config";

const PAGE_SIZE_OPTIONS = [10, 20, 50];

const MerchantManageTickets = () => {
  const { serviceId } = useParams();
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [jumpToPage, setJumpToPage] = useState("");

  // Debounce search input before it hits the server
  useEffect(() => {
    const handle = setTimeout(() => {
      setDebouncedSearch(searchTerm);
      setPage(1); // reset to first page whenever the search changes
    }, 400);
    return () => clearTimeout(handle);
  }, [searchTerm]);

  // Fetch service details
  const { data: service } = useQuery({
    queryKey: ['merchant-service', serviceId],
    queryFn: async () => {
      const res = await fetch(`${API_URL}/merchant-services`, { headers: getAuthHeader() });
      const data = await res.json();
      return data.data.find((s: any) => s.id.toString() === serviceId);
    },
    enabled: !!serviceId
  });

  // Fetch tickets for this service (server-side paginated + filtered)
  const { data: ticketsResponse, isLoading, isFetching } = useQuery({
    queryKey: ['service-tickets', serviceId, page, pageSize, debouncedSearch],
    queryFn: async () => {
      const params = new URLSearchParams({
        serviceId: serviceId as string,
        page: String(page),
        pageSize: String(pageSize),
      });
      if (debouncedSearch) params.set('search', debouncedSearch);

      const res = await fetch(`${API_URL}/tickets?${params.toString()}`, { headers: getAuthHeader() });
      const json = await res.json();
      return json;
    },
    enabled: !!serviceId,
    placeholderData: keepPreviousData,
  });

  const tickets = ticketsResponse?.data ?? [];
  const stats = ticketsResponse?.stats ?? { total: 0, confirmed: 0, pending: 0 };
  const pagination = ticketsResponse?.pagination ?? { page: 1, pageSize, total: 0, totalPages: 1 };

  const handlePageSizeChange = (value: string) => {
    setPageSize(Number(value));
    setPage(1);
  };

  const handleJumpToPage = () => {
    const target = parseInt(jumpToPage, 10);
    if (!Number.isNaN(target) && target >= 1 && target <= pagination.totalPages) {
      setPage(target);
    }
    setJumpToPage("");
  };

  // Compute a small window of page numbers to display (max 4 visible)
  const getPageNumbers = () => {
    const totalPages = pagination.totalPages;
    const windowSize = 4;
    let start = Math.max(1, page - Math.floor(windowSize / 2));
    let end = Math.min(totalPages, start + windowSize - 1);
    start = Math.max(1, end - windowSize + 1);
    const pages = [];
    for (let i = start; i <= end; i++) pages.push(i);
    return pages;
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <Navbar />

      <main className="flex-grow container px-4 md:px-8 py-12">
        <div className="max-w-7xl mx-auto space-y-8">
          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <Link to="/merchant/dashboard">
                <Button variant="ghost" size="icon" className="rounded-full">
                  <ArrowLeft className="h-5 w-5" />
                </Button>
              </Link>
              <div>
                <h1 className="text-3xl font-bold text-slate-900">Manage Bookings</h1>
                <p className="text-slate-500">{service?.name || 'Loading service...'}</p>
              </div>
            </div>
            <div className="flex gap-3">
              <Button variant="outline" className="gap-2">
                <Download className="h-4 w-4" /> Export CSV
              </Button>
              <Link to={`/merchant/book/${serviceId}`}>
                <Button className="bg-indigo-600 hover:bg-indigo-700 gap-2">
                  <Ticket className="h-4 w-4" /> New Booking
                </Button>
              </Link>
            </div>
          </div>

          {/* Stats Summary */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            <Card className="border-none shadow-sm">
              <CardContent className="p-6">
                <p className="text-sm font-medium text-slate-500">Total Bookings</p>
                <h3 className="text-2xl font-bold text-slate-900 mt-1">{stats.total}</h3>
              </CardContent>
            </Card>
            <Card className="border-none shadow-sm">
              <CardContent className="p-6">
                <p className="text-sm font-medium text-slate-500">Confirmed</p>
                <h3 className="text-2xl font-bold text-green-600 mt-1">
                  {stats.confirmed}
                </h3>
              </CardContent>
            </Card>
            <Card className="border-none shadow-sm">
              <CardContent className="p-6">
                <p className="text-sm font-medium text-slate-500">Pending/Other</p>
                <h3 className="text-2xl font-bold text-amber-600 mt-1">
                  {stats.pending}
                </h3>
              </CardContent>
            </Card>
          </div>

          {/* Search and Table */}
          <Card className="shadow-md border-slate-200 overflow-hidden">
            <CardHeader className="border-b bg-white">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <CardTitle>Ticket Directory</CardTitle>
                  <CardDescription>Search and manage individual customer bookings</CardDescription>
                </div>
                <div className="relative w-full md:w-72">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <Input
                    placeholder="Name, phone or ID..."
                    className="pl-10"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {isLoading ? (
                <div className="flex justify-center py-20">
                  <Loader2 className="h-10 w-10 animate-spin text-indigo-600" />
                </div>
              ) : (
                <div className="overflow-x-auto relative">
                  {isFetching && (
                    <div className="absolute inset-0 bg-white/50 flex items-center justify-center z-10">
                      <Loader2 className="h-6 w-6 animate-spin text-indigo-600" />
                    </div>
                  )}
                  <Table>
                    <TableHeader className="bg-slate-50">
                      <TableRow>
                        <TableHead className="w-[100px]">ID</TableHead>
                        <TableHead>Customer</TableHead>
                        <TableHead>Booking Date</TableHead>
                        <TableHead>Payment</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {tickets.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center py-12 text-slate-400 italic">
                            No bookings found matching your criteria
                          </TableCell>
                        </TableRow>
                      ) : (
                        tickets.map((ticket: any) => (
                          <TableRow key={ticket.id} className="hover:bg-slate-50/50 transition-colors">
                            <TableCell className="font-mono text-xs font-bold">#{ticket.id}</TableCell>
                            <TableCell>
                              <div className="flex flex-col">
                                <span className="font-bold text-slate-900">{ticket.customer_name}</span>
                                <span className="text-xs text-slate-500 flex items-center gap-1">
                                  <Phone className="h-3 w-3" /> {ticket.customer_phone}
                                </span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2 text-sm text-slate-600">
                                <Calendar className="h-4 w-4 text-slate-400" />
                                {new Date(ticket.booking_date).toLocaleDateString()}
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline" className="font-medium">
                                {ticket.payment_mode}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <Badge className={
                                ticket.status === 'CONFIRMED'
                                  ? 'bg-green-100 text-green-700 hover:bg-green-100'
                                  : 'bg-amber-100 text-amber-700 hover:bg-amber-100'
                              }>
                                {ticket.status}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex justify-end gap-2">
                                <Link to={`/merchant/print/${ticket.id}`}>
                                  <Button variant="ghost" size="icon" className="text-indigo-600 hover:bg-indigo-50" title="Print Ticket">
                                    <Printer className="h-4 w-4" />
                                  </Button>
                                </Link>
                                <Button variant="ghost" size="icon" className="text-slate-400 hover:text-slate-600">
                                  <ChevronRight className="h-4 w-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>

            {/* Pagination Controls */}
            {!isLoading && (
              <div className="flex flex-col md:flex-row items-center justify-between gap-4 border-t bg-white px-6 py-4">
                <div className="flex items-center gap-2 text-sm text-slate-500">
                  <span>Rows per page</span>
                  <Select value={String(pageSize)} onValueChange={handlePageSizeChange}>
                    <SelectTrigger className="w-[80px] h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {PAGE_SIZE_OPTIONS.map((size) => (
                        <SelectItem key={size} value={String(size)}>{size}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <span className="ml-2">
                    {pagination.total === 0
                      ? '0 results'
                      : `${(pagination.page - 1) * pagination.pageSize + 1}-${Math.min(pagination.page * pagination.pageSize, pagination.total)} of ${pagination.total}`}
                  </span>
                </div>

                <div className="flex items-center gap-4">
                  <Pagination className="mx-0 w-auto">
                    <PaginationContent>
                      <PaginationItem>
                        <PaginationPrevious
                          href="#"
                          onClick={(e) => {
                            e.preventDefault();
                            if (page > 1) setPage(page - 1);
                          }}
                          className={page <= 1 ? 'pointer-events-none opacity-50' : ''}
                        />
                      </PaginationItem>
                      {getPageNumbers().map((p) => (
                        <PaginationItem key={p}>
                          <PaginationLink
                            href="#"
                            isActive={p === page}
                            onClick={(e) => {
                              e.preventDefault();
                              setPage(p);
                            }}
                          >
                            {p}
                          </PaginationLink>
                        </PaginationItem>
                      ))}
                      <PaginationItem>
                        <PaginationNext
                          href="#"
                          onClick={(e) => {
                            e.preventDefault();
                            if (page < pagination.totalPages) setPage(page + 1);
                          }}
                          className={page >= pagination.totalPages ? 'pointer-events-none opacity-50' : ''}
                        />
                      </PaginationItem>
                    </PaginationContent>
                  </Pagination>

                  <div className="flex items-center gap-2">
                    <span className="text-sm text-slate-500 whitespace-nowrap">Go to</span>
                    <Input
                      type="number"
                      min={1}
                      max={pagination.totalPages}
                      value={jumpToPage}
                      onChange={(e) => setJumpToPage(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleJumpToPage();
                      }}
                      className="w-16 h-9"
                      placeholder={String(page)}
                    />
                    <Button variant="outline" size="sm" className="h-9" onClick={handleJumpToPage}>
                      Go
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </Card>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default MerchantManageTickets;
