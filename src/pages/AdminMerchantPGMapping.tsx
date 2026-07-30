"use client";

import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { showError, showSuccess } from "@/utils/toast";
import { getAuthHeader } from "@/utils/common";
import { API_URL } from "@/config";
import {
  ArrowLeft,
  Building2,
  CreditCard,
  Eye,
  Filter,
  Loader2,
  Pencil,
  Plus,
  Search,
  Star,
  Trash2,
} from "lucide-react";

const PAGE_SIZE_OPTIONS = [10, 20, 50];
const ENVIRONMENT_OPTIONS = ["PROD", "TEST", "UAT", "SANDBOX"];

// Accepts empty string (field left blank) or a value that looks like a URL.
const optionalUrlField = z
  .string()
  .trim()
  .max(500, "Max 500 characters")
  .optional()
  .refine((v) => !v || /^https?:\/\/.+/i.test(v), {
    message: "Must be a valid URL starting with http:// or https://",
  });

const mappingFormSchema = z
  .object({
    merchant_id: z.string().min(1, "Merchant is required"),
    gateway_id: z.string().min(1, "Gateway is required"),
    payment_method: z.string().trim().max(30, "Max 30 characters").optional(),
    currency: z.string().trim().regex(/^[A-Za-z]{3}$/, "3-letter ISO code, e.g. INR"),
    priority: z.string().trim().regex(/^\d*$/, "Whole numbers only").optional(),
    environment: z.string().min(1).max(10).default("PROD"),
    is_default: z.boolean().default(false),
    is_active: z.boolean().default(true),
    success_url: optionalUrlField,
    failure_url: optionalUrlField,
    cancel_url: optionalUrlField,
    webhook_url: optionalUrlField,
    effective_from: z.string().optional(),
    effective_to: z.string().optional(),
    remarks: z.string().trim().max(2000, "Max 2000 characters").optional(),
    api_id: z.string().trim().max(255, "Max 255 characters").optional(),
    encryption_key: z.string().trim().max(255, "Max 255 characters").optional(),
  })
  .refine(
    (data) =>
      !data.effective_from || !data.effective_to ||
      new Date(data.effective_from) <= new Date(data.effective_to),
    { message: "Effective from cannot be after effective to", path: ["effective_from"] },
  );

type MappingFormValues = z.infer<typeof mappingFormSchema>;

const emptyFormValues: MappingFormValues = {
  merchant_id: "",
  gateway_id: "",
  payment_method: "",
  currency: "INR",
  priority: "1",
  environment: "PROD",
  is_default: false,
  is_active: true,
  success_url: "",
  failure_url: "",
  cancel_url: "",
  webhook_url: "",
  effective_from: "",
  effective_to: "",
  remarks: "",
  api_id: "",
  encryption_key: "",
};

// Formats an ISO/timestamp string for a `datetime-local` input's value prop.
const toDatetimeLocal = (value: string | null | undefined) => {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

const formatDateTime = (value: string | null | undefined) => {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString();
};

const AdminMerchantPGMapping = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [activeFilter, setActiveFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [jumpToPage, setJumpToPage] = useState("");

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingMapping, setEditingMapping] = useState<any>(null);
  const [viewingMapping, setViewingMapping] = useState<any>(null);

  // Debounce search input before it hits the server
  useEffect(() => {
    const handle = setTimeout(() => {
      setDebouncedSearch(searchTerm);
      setPage(1);
    }, 400);
    return () => clearTimeout(handle);
  }, [searchTerm]);

  // Merchants, for the dropdown and for resolving names in the table
  const { data: merchantsData } = useQuery({
    queryKey: ["merchants-all"],
    queryFn: async () => {
      const res = await fetch(`${API_URL}/merchants`, { headers: getAuthHeader() });
      if (!res.ok) throw new Error("Failed to fetch merchants");
      return (await res.json()).data;
    },
  });
  const merchants = merchantsData ?? [];
  const merchantMap = React.useMemo(() => {
    const map = new Map<number, any>();
    merchants.forEach((m: any) => map.set(m.id, m));
    return map;
  }, [merchants]);

  // Payment gateways, for the dropdown and for resolving names in the table
  const { data: gatewaysData } = useQuery({
    queryKey: ["payment-gateways-all"],
    queryFn: async () => {
      const res = await fetch(`${API_URL}/payment-gateways`, { headers: getAuthHeader() });
      if (!res.ok) throw new Error("Failed to fetch payment gateways");
      return (await res.json()).data;
    },
  });
  const gateways = gatewaysData ?? [];
  const gatewayMap = React.useMemo(() => {
    const map = new Map<number, any>();
    gateways.forEach((g: any) => map.set(g.id, g));
    return map;
  }, [gateways]);

  // Mappings list - server-side paginated/filtered/searched
  const {
    data: mappingsResponse,
    isLoading,
    isFetching,
  } = useQuery({
    queryKey: ["merchant-pg-mappings", page, pageSize, debouncedSearch, activeFilter],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: String(page),
        pageSize: String(pageSize),
      });
      if (debouncedSearch) params.set("search", debouncedSearch);
      if (activeFilter !== "all") params.set("isActive", activeFilter);

      const res = await fetch(`${API_URL}/merchant-pg-mappings?${params.toString()}`, {
        headers: getAuthHeader(),
      });
      if (!res.ok) throw new Error("Failed to fetch mappings");
      return res.json();
    },
    placeholderData: keepPreviousData,
  });

  const mappings = mappingsResponse?.data ?? [];
  const pagination = mappingsResponse?.pagination ?? { page: 1, pageSize, total: 0, totalPages: 1 };

  const handlePageSizeChange = (value: string) => {
    setPageSize(Number(value));
    setPage(1);
  };

  const handleActiveFilterChange = (value: string) => {
    setActiveFilter(value);
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

  const form = useForm<MappingFormValues>({
    resolver: zodResolver(mappingFormSchema),
    defaultValues: emptyFormValues,
  });

  const buildPayload = (values: MappingFormValues) => ({
    merchant_id: parseInt(values.merchant_id, 10),
    gateway_id: parseInt(values.gateway_id, 10),
    payment_method: values.payment_method?.trim() || undefined,
    currency: values.currency.trim().toUpperCase(),
    priority: values.priority ? parseInt(values.priority, 10) : undefined,
    environment: values.environment,
    is_default: values.is_default,
    is_active: values.is_active,
    success_url: values.success_url?.trim() || undefined,
    failure_url: values.failure_url?.trim() || undefined,
    cancel_url: values.cancel_url?.trim() || undefined,
    webhook_url: values.webhook_url?.trim() || undefined,
    effective_from: values.effective_from ? new Date(values.effective_from).toISOString() : undefined,
    effective_to: values.effective_to ? new Date(values.effective_to).toISOString() : undefined,
    remarks: values.remarks?.trim() || undefined,
    api_id: values.api_id?.trim() || undefined,
    encryption_key: values.encryption_key?.trim() || undefined,
  });

  const saveMutation = useMutation({
    mutationFn: async (values: MappingFormValues) => {
      const payload = buildPayload(values);
      const url = editingMapping
        ? `${API_URL}/merchant-pg-mappings/${editingMapping.id}`
        : `${API_URL}/merchant-pg-mappings`;
      const method = editingMapping ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json", ...getAuthHeader() },
        body: JSON.stringify(payload),
      });
      const result = await res.json();
      if (!res.ok) {
        throw new Error(
          result.details?.[0]?.message || result.error || "Operation failed",
        );
      }
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["merchant-pg-mappings"] });
      showSuccess(editingMapping ? "Mapping updated successfully" : "Mapping created successfully");
      closeForm();
    },
    onError: (err: any) => showError(err.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`${API_URL}/merchant-pg-mappings/${id}`, {
        method: "DELETE",
        headers: getAuthHeader(),
      });
      if (!res.ok) throw new Error("Failed to delete mapping");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["merchant-pg-mappings"] });
      showSuccess("Mapping deleted successfully");
    },
    onError: (err: any) => showError(err.message),
  });

  const openAddForm = () => {
    setEditingMapping(null);
    form.reset(emptyFormValues);
    setIsFormOpen(true);
  };

  const openEditForm = (mapping: any) => {
    setEditingMapping(mapping);
    form.reset({
      merchant_id: mapping.merchant_id?.toString() ?? "",
      gateway_id: mapping.gateway_id?.toString() ?? "",
      payment_method: mapping.payment_method ?? "",
      currency: mapping.currency ?? "INR",
      priority: mapping.priority != null ? String(mapping.priority) : "1",
      environment: mapping.environment ?? "PROD",
      is_default: !!mapping.is_default,
      is_active: mapping.is_active !== false,
      success_url: mapping.success_url ?? "",
      failure_url: mapping.failure_url ?? "",
      cancel_url: mapping.cancel_url ?? "",
      webhook_url: mapping.webhook_url ?? "",
      effective_from: toDatetimeLocal(mapping.effective_from),
      effective_to: toDatetimeLocal(mapping.effective_to),
      remarks: mapping.remarks ?? "",
      api_id: mapping.api_id ?? "",
      encryption_key: mapping.encryption_key ?? "",
    });
    setIsFormOpen(true);
  };

  const closeForm = () => {
    setIsFormOpen(false);
    setEditingMapping(null);
    form.reset(emptyFormValues);
  };

  const onSubmit = (values: MappingFormValues) => {
    saveMutation.mutate(values);
  };

  const handleDelete = (mapping: any) => {
    const merchantName = merchantMap.get(mapping.merchant_id)?.organization_name || `Merchant #${mapping.merchant_id}`;
    if (confirm(`Delete the payment gateway mapping for ${merchantName}? This cannot be undone.`)) {
      deleteMutation.mutate(mapping.id);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <Navbar />

      <main className="flex-grow container px-4 md:px-8 py-12">
        <div className="max-w-7xl mx-auto space-y-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => navigate(-1)}
                className="rounded-full"
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div>
                <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-2">
                  <CreditCard className="h-7 w-7 text-indigo-600" />
                  Payment Gateway Mappings
                </h1>
                <p className="text-slate-500">
                  Configure which gateways handle payments for each merchant
                </p>
              </div>
            </div>
            <Button
              onClick={openAddForm}
              className="bg-indigo-600 hover:bg-indigo-700 gap-2"
            >
              <Plus className="h-4 w-4" /> Add Mapping
            </Button>
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative w-full sm:w-80">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Search by merchant name..."
                className="pl-10 bg-white"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <Select value={activeFilter} onValueChange={handleActiveFilterChange}>
              <SelectTrigger className="w-full sm:w-44 bg-white">
                <Filter className="h-4 w-4 text-slate-400 mr-1" />
                <SelectValue placeholder="All Statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="true">Active</SelectItem>
                <SelectItem value="false">Inactive</SelectItem>
              </SelectContent>
            </Select>
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
                        <TableHead>Merchant</TableHead>
                        <TableHead>Gateway</TableHead>
                        <TableHead>Method</TableHead>
                        <TableHead>Currency</TableHead>
                        <TableHead>Priority</TableHead>
                        <TableHead>Environment</TableHead>
                        <TableHead>Default</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {mappings.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={9} className="text-center py-12 text-slate-400 italic">
                            No payment gateway mappings found
                          </TableCell>
                        </TableRow>
                      ) : (
                        mappings.map((mapping: any) => {
                          const merchant = merchantMap.get(mapping.merchant_id);
                          const gateway = gatewayMap.get(mapping.gateway_id);

                          return (
                            <TableRow key={mapping.id} className="hover:bg-slate-50/50 transition-colors">
                              <TableCell>
                                <div className="flex items-center gap-2">
                                  <Building2 className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                                  <span className="font-bold text-slate-900">
                                    {merchant?.organization_name || `Merchant #${mapping.merchant_id}`}
                                  </span>
                                </div>
                              </TableCell>
                              <TableCell className="font-semibold text-slate-700">
                                {gateway?.gateway_name || `Gateway #${mapping.gateway_id}`}
                              </TableCell>
                              <TableCell className="text-sm text-slate-600">
                                {mapping.payment_method || "Any"}
                              </TableCell>
                              <TableCell className="text-sm text-slate-600">
                                {mapping.currency}
                              </TableCell>
                              <TableCell className="text-sm text-slate-600">
                                {mapping.priority}
                              </TableCell>
                              <TableCell className="text-sm text-slate-600">
                                <Badge variant="outline" className="font-mono text-[10px]">
                                  {mapping.environment}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                {mapping.is_default && (
                                  <Badge className="bg-amber-100 text-amber-700 border border-amber-200 hover:bg-amber-100 gap-1">
                                    <Star className="h-3 w-3 fill-amber-500 text-amber-500" /> Default
                                  </Badge>
                                )}
                              </TableCell>
                              <TableCell>
                                <span
                                  className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase ${
                                    mapping.is_active
                                      ? "bg-green-100 text-green-700"
                                      : "bg-slate-100 text-slate-600"
                                  }`}
                                >
                                  {mapping.is_active ? "Active" : "Inactive"}
                                </span>
                              </TableCell>
                              <TableCell className="text-right">
                                <div className="flex justify-end gap-1">
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="text-slate-500 hover:bg-slate-100"
                                    onClick={() => setViewingMapping(mapping)}
                                    title="View"
                                  >
                                    <Eye className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="text-indigo-600 hover:bg-indigo-50"
                                    onClick={() => openEditForm(mapping)}
                                    title="Edit"
                                  >
                                    <Pencil className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="text-red-500 hover:bg-red-50"
                                    onClick={() => handleDelete(mapping)}
                                    title="Delete"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          );
                        })
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
                      ? "0 results"
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
                          className={page <= 1 ? "pointer-events-none opacity-50" : ""}
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
                          className={page >= pagination.totalPages ? "pointer-events-none opacity-50" : ""}
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
                        if (e.key === "Enter") handleJumpToPage();
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

      {/* Add / Edit Dialog */}
      <Dialog open={isFormOpen} onOpenChange={(open) => (open ? setIsFormOpen(true) : closeForm())}>
        <DialogContent className="sm:max-w-[640px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {editingMapping ? <Pencil className="h-5 w-5 text-indigo-600" /> : <Plus className="h-5 w-5 text-indigo-600" />}
              {editingMapping ? "Edit Mapping" : "Add Payment Gateway Mapping"}
            </DialogTitle>
            <DialogDescription>
              Control which gateway is used for a merchant's transactions, and under what conditions.
            </DialogDescription>
          </DialogHeader>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="merchant_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Merchant *</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select merchant" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {merchants.map((m: any) => (
                            <SelectItem key={m.id} value={m.id.toString()}>
                              {m.organization_name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="gateway_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Gateway *</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select gateway" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {gateways.map((g: any) => (
                            <SelectItem key={g.id} value={g.id.toString()}>
                              {g.gateway_name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="payment_method"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Payment Method</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g. UPI, CARD, NETBANKING" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="currency"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Currency *</FormLabel>
                      <FormControl>
                        <Input
                          maxLength={3}
                          className="uppercase"
                          {...field}
                          onChange={(e) => field.onChange(e.target.value.toUpperCase())}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="priority"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Priority</FormLabel>
                      <FormControl>
                        <Input type="number" min="0" {...field} />
                      </FormControl>
                      <p className="text-xs text-slate-400">Lower runs first</p>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="environment"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Environment</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {ENVIRONMENT_OPTIONS.map((env) => (
                            <SelectItem key={env} value={env}>{env}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="is_active"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center gap-2 space-y-0">
                      <FormControl>
                        <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                      </FormControl>
                      <FormLabel className="font-normal cursor-pointer">
                        Active
                      </FormLabel>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="is_default"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center gap-2 space-y-0">
                      <FormControl>
                        <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                      </FormControl>
                      <FormLabel className="font-normal cursor-pointer">
                        Set as merchant's default gateway
                      </FormLabel>
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="api_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>API ID</FormLabel>
                      <FormControl>
                        <Input placeholder="Gateway API ID" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="encryption_key"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Encryption Key</FormLabel>
                      <FormControl>
                        <Input placeholder="Gateway encryption key" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="success_url"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Success URL</FormLabel>
                      <FormControl>
                        <Input placeholder="https://..." {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="failure_url"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Failure URL</FormLabel>
                      <FormControl>
                        <Input placeholder="https://..." {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="cancel_url"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Cancel URL</FormLabel>
                      <FormControl>
                        <Input placeholder="https://..." {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="webhook_url"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Webhook URL</FormLabel>
                      <FormControl>
                        <Input placeholder="https://..." {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="effective_from"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Effective From</FormLabel>
                      <FormControl>
                        <Input type="datetime-local" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="effective_to"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Effective To</FormLabel>
                      <FormControl>
                        <Input type="datetime-local" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="remarks"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Remarks</FormLabel>
                    <FormControl>
                      <Textarea rows={3} placeholder="Optional notes..." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <DialogFooter className="pt-2">
                <Button type="button" variant="outline" onClick={closeForm}>
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="bg-indigo-600 hover:bg-indigo-700"
                  disabled={saveMutation.isPending}
                >
                  {saveMutation.isPending
                    ? <Loader2 className="h-4 w-4 animate-spin" />
                    : editingMapping ? "Save Changes" : "Create Mapping"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* View Dialog */}
      <Dialog open={!!viewingMapping} onOpenChange={(open) => !open && setViewingMapping(null)}>
        <DialogContent className="sm:max-w-[560px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Mapping Details</DialogTitle>
          </DialogHeader>
          {viewingMapping && (
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="col-span-2">
                <Label className="text-[10px] uppercase font-bold text-slate-400">Merchant</Label>
                <p className="font-bold text-slate-900">
                  {merchantMap.get(viewingMapping.merchant_id)?.organization_name || `Merchant #${viewingMapping.merchant_id}`}
                </p>
              </div>
              <div>
                <Label className="text-[10px] uppercase font-bold text-slate-400">Gateway</Label>
                <p className="font-semibold text-slate-700">
                  {gatewayMap.get(viewingMapping.gateway_id)?.gateway_name || `Gateway #${viewingMapping.gateway_id}`}
                </p>
              </div>
              <div>
                <Label className="text-[10px] uppercase font-bold text-slate-400">Method</Label>
                <p className="text-slate-700">{viewingMapping.payment_method || "Any"}</p>
              </div>
              <div>
                <Label className="text-[10px] uppercase font-bold text-slate-400">Currency</Label>
                <p className="text-slate-700">{viewingMapping.currency}</p>
              </div>
              <div>
                <Label className="text-[10px] uppercase font-bold text-slate-400">Priority</Label>
                <p className="text-slate-700">{viewingMapping.priority}</p>
              </div>
              <div>
                <Label className="text-[10px] uppercase font-bold text-slate-400">Environment</Label>
                <p className="text-slate-700">{viewingMapping.environment}</p>
              </div>
              <div>
                <Label className="text-[10px] uppercase font-bold text-slate-400">Status</Label>
                <p className="text-slate-700">{viewingMapping.is_active ? "Active" : "Inactive"}</p>
              </div>
              <div>
                <Label className="text-[10px] uppercase font-bold text-slate-400">Default Gateway</Label>
                <p className="text-slate-700">{viewingMapping.is_default ? "Yes" : "No"}</p>
              </div>
              <div>
                <Label className="text-[10px] uppercase font-bold text-slate-400">Effective From</Label>
                <p className="text-slate-700">{formatDateTime(viewingMapping.effective_from)}</p>
              </div>
              <div>
                <Label className="text-[10px] uppercase font-bold text-slate-400">Effective To</Label>
                <p className="text-slate-700">{formatDateTime(viewingMapping.effective_to)}</p>
              </div>
              <div>
                <Label className="text-[10px] uppercase font-bold text-slate-400">API ID</Label>
                <p className="text-slate-700 break-all">{viewingMapping.api_id || "—"}</p>
              </div>
              <div>
                <Label className="text-[10px] uppercase font-bold text-slate-400">Encryption Key</Label>
                <p className="text-slate-700 break-all">{viewingMapping.encryption_key || "—"}</p>
              </div>
              <div className="col-span-2">
                <Label className="text-[10px] uppercase font-bold text-slate-400">Success URL</Label>
                <p className="text-slate-700 break-all">{viewingMapping.success_url || "—"}</p>
              </div>
              <div className="col-span-2">
                <Label className="text-[10px] uppercase font-bold text-slate-400">Failure URL</Label>
                <p className="text-slate-700 break-all">{viewingMapping.failure_url || "—"}</p>
              </div>
              <div className="col-span-2">
                <Label className="text-[10px] uppercase font-bold text-slate-400">Cancel URL</Label>
                <p className="text-slate-700 break-all">{viewingMapping.cancel_url || "—"}</p>
              </div>
              <div className="col-span-2">
                <Label className="text-[10px] uppercase font-bold text-slate-400">Webhook URL</Label>
                <p className="text-slate-700 break-all">{viewingMapping.webhook_url || "—"}</p>
              </div>
              {viewingMapping.remarks && (
                <div className="col-span-2">
                  <Label className="text-[10px] uppercase font-bold text-slate-400">Remarks</Label>
                  <p className="text-slate-700 whitespace-pre-wrap">{viewingMapping.remarks}</p>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setViewingMapping(null)}>Close</Button>
            {viewingMapping && (
              <Button
                className="bg-indigo-600 hover:bg-indigo-700"
                onClick={() => {
                  const mapping = viewingMapping;
                  setViewingMapping(null);
                  openEditForm(mapping);
                }}
              >
                Edit
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Footer />
    </div>
  );
};

export default AdminMerchantPGMapping;
