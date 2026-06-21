"use client";

import React, { useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { showError, showSuccess } from "@/utils/toast";
import {
  ArrowLeft,
  Calendar,
  Loader2,
  Pencil,
  Plus,
  Percent,
  Tag,
  X,
} from "lucide-react";
import { API_URL } from "@/config";

const voucherSchema = z.object({
  voucher_code: z
    .string()
    .min(1, "Voucher code is required")
    .max(10, "Voucher code must be at most 10 characters")
    .toUpperCase(),
  percentage: z
    .string()
    .min(1, "Discount percentage is required")
    .regex(/^\d*\.?\d*$/, "Must be a valid decimal number"),
  start_date: z.string().min(1, "Start date is required"),
  end_date: z.string().optional().or(z.literal("")),
  status_sw: z.boolean().default(true),
});

type VoucherFormValues = z.infer<typeof voucherSchema>;

const MerchantServiceVoucher = () => {
  const { serviceId } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [editingId, setEditingId] = useState<string | null>(null);

  const getAuthHeader = () => ({
    "Authorization": `Bearer ${localStorage.getItem("token")}`,
  });

  // Fetch service details
  const { data: service, isLoading: isLoadingService } = useQuery({
    queryKey: ["merchant-service", serviceId],
    queryFn: async () => {
      const res = await fetch(`${API_URL}/merchant-services`, {
        headers: getAuthHeader(),
      });
      const data = await res.json();
      return data.data.find((s: any) => s.id.toString() === serviceId);
    },
    enabled: !!serviceId,
  });

  // Fetch vouchers for this service
  const { data: vouchers, isLoading: isLoadingVouchers } = useQuery({
    queryKey: ["merchant-service-vouchers", serviceId],
    queryFn: async () => {
      const res = await fetch(
        `${API_URL}/merchant-service-vouchers?serviceId=${serviceId}`,
        {
          headers: getAuthHeader(),
        },
      );
      if (!res.ok) throw new Error("Failed to fetch vouchers");
      return (await res.json()).data;
    },
    enabled: !!serviceId,
  });

  const form = useForm<VoucherFormValues>({
    resolver: zodResolver(voucherSchema),
    defaultValues: {
      voucher_code: "",
      percentage: "",
      start_date: "",
      end_date: "",
      status_sw: true,
    },
  });

  const mutation = useMutation({
    mutationFn: async (data: VoucherFormValues) => {
      const payload = {
        ...data,
        merchant_id: service.merchant_id,
        service_id: parseInt(serviceId!),
        percentage: parseFloat(data.percentage),
        end_date: data.end_date || null,
        updated_by: 1, // Default updated_by for demo authorization context
      };

      const url = editingId
        ? `${API_URL}/merchant-service-vouchers/${editingId}`
        : `${API_URL}/merchant-service-vouchers`;

      const method = editingId ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          ...getAuthHeader(),
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error("Voucher action failed");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["merchant-service-vouchers", serviceId],
      });
      showSuccess(editingId ? "Voucher updated!" : "Voucher created!");
      setEditingId(null);
      form.reset();
    },
    onError: (error: any) => showError(error.message),
  });

  const onSubmit = (data: VoucherFormValues) => {
    mutation.mutate(data);
  };

  const handleEdit = (voucher: any) => {
    setEditingId(voucher.id.toString());
    form.reset({
      voucher_code: voucher.voucher_code,
      percentage: voucher.percentage.toString(),
      start_date: voucher.start_date,
      end_date: voucher.end_date || "",
      status_sw: !!voucher.status_sw,
    });
  };

  if (isLoadingService) {
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

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <Navbar />

      <main className="flex-grow container px-4 md:px-8 py-12">
        <div className="max-w-6xl mx-auto space-y-8">
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
                <h1 className="text-3xl font-bold text-slate-900">
                  Manage Vouchers
                </h1>
                <p className="text-slate-500">
                  Configure discount promo codes for {service?.name}
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <Card className="lg:col-span-1 shadow-md border-indigo-100 h-fit">
              <CardHeader className="bg-indigo-50/30 border-b">
                <CardTitle className="flex items-center gap-2 text-indigo-700">
                  {editingId
                    ? <Pencil className="h-5 w-5" />
                    : <Plus className="h-5 w-5" />}
                  {editingId ? "Edit Voucher" : "Create Promo Code"}
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-6">
                <Form {...form}>
                  <form
                    onSubmit={form.handleSubmit(onSubmit)}
                    className="space-y-4"
                  >
                    <FormField
                      control={form.control}
                      name="voucher_code"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="flex items-center gap-1.5"><Tag className="h-3.5 w-3.5" /> Code *</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="e.g. FESTIVE10"
                              {...field}
                              onChange={(e) => field.onChange(e.target.value.toUpperCase())}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="percentage"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="flex items-center gap-1.5"><Percent className="h-3.5 w-3.5" /> Discount (%) *</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              step="0.01"
                              placeholder="e.g. 10.00"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="start_date"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Start Date *</FormLabel>
                          <FormControl>
                            <Input type="date" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="end_date"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>End Date (Optional)</FormLabel>
                          <FormControl>
                            <Input type="date" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="status_sw"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center space-x-2 space-y-0">
                          <FormControl>
                            <Checkbox
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                          <FormLabel className="font-normal cursor-pointer">
                            Active
                          </FormLabel>
                        </FormItem>
                      )}
                    />

                    <div className="flex gap-3 pt-2">
                      <Button
                        type="submit"
                        className="flex-1 bg-indigo-600 hover:bg-indigo-700"
                        disabled={mutation.isPending}
                      >
                        {mutation.isPending ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          editingId ? "Update" : "Save Voucher"
                        )}
                      </Button>
                      {editingId && (
                        <Button
                          variant="outline"
                          onClick={() => {
                            setEditingId(null);
                            form.reset();
                          }}
                        >
                          Cancel
                        </Button>
                      )}
                    </div>
                  </form>
                </Form>
              </CardContent>
            </Card>

            <Card className="lg:col-span-2 shadow-md border-slate-200">
              <CardHeader>
                <CardTitle>Voucher Directory</CardTitle>
                <CardDescription>
                  List of configured discount vouchers for this service
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isLoadingVouchers ? (
                  <div className="flex justify-center py-10">
                    <Loader2 className="h-10 w-10 animate-spin text-indigo-600" />
                  </div>
                ) : (
                  <div className="rounded-xl border overflow-hidden">
                    <Table>
                      <TableHeader className="bg-slate-50">
                        <TableRow>
                          <TableHead>Promo Code</TableHead>
                          <TableHead>Discount</TableHead>
                          <TableHead>Validity Range</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {vouchers?.length === 0 ? (
                          <TableRow>
                            <TableCell
                              colSpan={5}
                              className="text-center py-12 text-slate-400 italic"
                            >
                              No vouchers configured yet
                            </TableCell>
                          </TableRow>
                        ) : (
                          vouchers?.map((voucher: any) => (
                            <TableRow
                              key={voucher.id}
                              className="hover:bg-slate-50/50 transition-colors"
                            >
                              <TableCell className="font-bold text-slate-900 font-mono tracking-wide">
                                {voucher.voucher_code}
                              </TableCell>
                              <TableCell className="font-medium text-slate-700">
                                {voucher.percentage}% OFF
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center gap-1.5 text-xs text-slate-500">
                                  <Calendar className="h-3.5 w-3.5 text-slate-400" />
                                  <span>
                                    {voucher.start_date} to{" "}
                                    {voucher.end_date || "∞"}
                                  </span>
                                </div>
                              </TableCell>
                              <TableCell>
                                <span
                                  className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                    voucher.status_sw
                                      ? "bg-green-100 text-green-700"
                                      : "bg-slate-100 text-slate-600"
                                  }`}
                                >
                                  {voucher.status_sw ? "ACTIVE" : "INACTIVE"}
                                </span>
                              </TableCell>
                              <TableCell className="text-right">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="text-indigo-600 hover:bg-indigo-50"
                                  onClick={() => handleEdit(voucher)}
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
            </Card>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default MerchantServiceVoucher;