"use client";

import React, { useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter,
  DialogDescription
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { showSuccess, showError } from "@/utils/toast";
import { 
  MessageSquare, Loader2, Mail, User, 
  Clock, CheckCircle2, AlertCircle, Pencil, 
  ArrowLeft, Search, Filter
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { API_URL } from '@/config';
import {getAuthHeader} from "@/utils/common";

const PAGE_SIZE_OPTIONS = [10, 20, 50];

const AdminManageEnquiry = () => {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [editingEnquiry, setEditingEnquiry] = useState<any>(null);
  const [isUpdateOpen, setIsUpdateOpen] = useState(false);
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

  const { data: enquiriesResponse, isLoading, isFetching } = useQuery({
    queryKey: ['merchant-enquiries', page, pageSize, debouncedSearch, statusFilter],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: String(page),
        pageSize: String(pageSize),
      });
      if (debouncedSearch) params.set('search', debouncedSearch);
      if (statusFilter !== 'all') params.set('status', statusFilter);

      const res = await fetch(`${API_URL}/merchant-enquiries?${params.toString()}`, {
        headers: getAuthHeader()
      });
      if (!res.ok) throw new Error('Failed to fetch enquiries');
      return res.json();
    },
    placeholderData: keepPreviousData,
  });

  const enquiries = enquiriesResponse?.data ?? [];
  const pagination = enquiriesResponse?.pagination ?? { page: 1, pageSize, total: 0, totalPages: 1 };

  const handlePageSizeChange = (value: string) => {
    setPageSize(Number(value));
    setPage(1);
  };

  const handleStatusFilterChange = (value: string) => {
    setStatusFilter(value);
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
    const end = Math.min(totalPages, start + windowSize - 1);
    start = Math.max(1, end - windowSize + 1);
    const pages = [];
    for (let i = start; i <= end; i++) pages.push(i);
    return pages;
  };

  const updateMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await fetch(`${API_URL}/merchant-enquiries/${data.id}`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          ...getAuthHeader()
        },
        body: JSON.stringify({
          status: data.status,
          admin_comments: data.admin_comments
        })
      });
      if (!res.ok) throw new Error('Failed to update enquiry');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['merchant-enquiries'] });
      showSuccess('Enquiry updated successfully');
      setIsUpdateOpen(false);
      setEditingEnquiry(null);
    },
    onError: (err: any) => showError(err.message)
  });

  const getStatusBadge = (status: string) => {
    const styles: any = {
      'Created': 'bg-blue-100 text-blue-700',
      'In Progress': 'bg-amber-100 text-amber-700',
      'On Hold': 'bg-slate-100 text-slate-700',
      'Closed': 'bg-green-100 text-green-700'
    };
    return styles[status] || 'bg-slate-100 text-slate-700';
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <Navbar />
      
      <main className="flex-grow container px-4 md:px-8 py-12">
        <div className="max-w-7xl mx-auto space-y-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <Link to="/admin/dashboard">
                <Button variant="ghost" size="icon" className="rounded-full">
                  <ArrowLeft className="h-5 w-5" />
                </Button>
              </Link>
              <div>
                <h1 className="text-3xl font-bold text-slate-900">Merchant Enquiries</h1>
                <p className="text-slate-500">Manage partnership requests and onboarding status</p>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
              <div className="relative w-full sm:w-72">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  placeholder="Search by name or email..."
                  className="pl-10 bg-white"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <Select value={statusFilter} onValueChange={handleStatusFilterChange}>
                <SelectTrigger className="w-full sm:w-44 bg-white">
                  <Filter className="h-4 w-4 text-slate-400 mr-1" />
                  <SelectValue placeholder="All Statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="Created">Created</SelectItem>
                  <SelectItem value="In Progress">In Progress</SelectItem>
                  <SelectItem value="On Hold">On Hold</SelectItem>
                  <SelectItem value="Closed">Closed</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <Card className="shadow-md border-slate-200 overflow-hidden">
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
                        <TableHead className="w-[200px]">Merchant</TableHead>
                        <TableHead>Enquiry Details</TableHead>
                        <TableHead className="w-[150px]">Status</TableHead>
                        <TableHead className="w-[200px]">Admin Comments</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {enquiries?.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center py-12 text-slate-400 italic">
                            No enquiries found
                          </TableCell>
                        </TableRow>
                      ) : (
                        enquiries?.map((enquiry: any) => (
                          <TableRow key={enquiry.id} className="hover:bg-slate-50/50 transition-colors">
                            <TableCell>
                              <div className="flex flex-col">
                                <span className="font-bold text-slate-900">{enquiry.merchant_name}</span>
                                <span className="text-xs text-slate-500 flex items-center gap-1">
                                  <Mail className="h-3 w-3" /> {enquiry.merchant_email}
                                </span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <p className="text-sm text-slate-600 line-clamp-2 max-w-md">
                                {enquiry.enquiry_details}
                              </p>
                            </TableCell>
                            <TableCell>
                              <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase ${getStatusBadge(enquiry.status)}`}>
                                {enquiry.status}
                              </span>
                            </TableCell>
                            <TableCell>
                              <p className="text-xs text-slate-500 italic line-clamp-2">
                                {enquiry.admin_comments || 'No comments yet'}
                              </p>
                            </TableCell>
                            <TableCell className="text-right">
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                className="text-indigo-600 hover:bg-indigo-50"
                                onClick={() => {
                                  setEditingEnquiry(enquiry);
                                  setIsUpdateOpen(true);
                                }}
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>

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

      {/* Update Enquiry Dialog */}
      <Dialog open={isUpdateOpen} onOpenChange={setIsUpdateOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Update Enquiry Status</DialogTitle>
            <DialogDescription>
              Update the status and add internal comments for this enquiry.
            </DialogDescription>
          </DialogHeader>
          
          {editingEnquiry && (
            <div className="space-y-6 py-4">
              <div className="grid grid-cols-2 gap-4 p-4 bg-slate-50 rounded-xl border border-slate-100">
                <div>
                  <Label className="text-[10px] uppercase font-bold text-slate-400">Merchant</Label>
                  <p className="text-sm font-bold text-slate-900">{editingEnquiry.merchant_name}</p>
                </div>
                <div>
                  <Label className="text-[10px] uppercase font-bold text-slate-400">Email</Label>
                  <p className="text-sm text-slate-600">{editingEnquiry.merchant_email}</p>
                </div>
                <div className="col-span-2">
                  <Label className="text-[10px] uppercase font-bold text-slate-400">Details</Label>
                  <p className="text-xs text-slate-600 mt-1">{editingEnquiry.enquiry_details}</p>
                </div>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Status</Label>
                  <Select 
                    defaultValue={editingEnquiry.status}
                    onValueChange={(v) => setEditingEnquiry({...editingEnquiry, status: v})}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Created">Created</SelectItem>
                      <SelectItem value="In Progress">In Progress</SelectItem>
                      <SelectItem value="On Hold">On Hold</SelectItem>
                      <SelectItem value="Closed">Closed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Admin Comments</Label>
                  <Textarea 
                    placeholder="Add internal notes here..."
                    className="min-h-[100px]"
                    value={editingEnquiry.admin_comments || ""}
                    onChange={(e) => setEditingEnquiry({...editingEnquiry, admin_comments: e.target.value})}
                  />
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsUpdateOpen(false)}>Cancel</Button>
            <Button 
              className="bg-indigo-600 hover:bg-indigo-700"
              onClick={() => updateMutation.mutate(editingEnquiry)}
              disabled={updateMutation.isPending}
            >
              {updateMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save Changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Footer />
    </div>
  );
};

export default AdminManageEnquiry;