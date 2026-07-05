"use client";

import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {getMerchantId, getUserId, getUserEmail, getAuthHeader} from "@/utils/common";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { showError, showSuccess } from "@/utils/toast";
import {
  ArrowLeft,
  Briefcase,
  CheckCircle2,
  Loader2,
  Pencil,
  Plus,
  ShieldCheck,
  Trash2,
  Users,
} from "lucide-react";
import { API_URL } from "@/config";

const mappingSchema = z.object({
  service_id: z.string().min(1, "Service is required"),
  user_id: z.string().min(1, "User is required"),
  status_sw: z.boolean().default(true),
});

type MappingFormValues = z.infer<typeof mappingSchema>;

const MerchantServiceUser = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [editingId, setEditingId] = useState<string | null>(null);

  const loggedInUser = getUserId();
  const merchantId = getMerchantId();

  // Fetch services for this merchant
  const { data: services, isLoading: isLoadingServices } = useQuery({
    queryKey: ["merchant-services", merchantId],
    queryFn: async () => {
      if (!merchantId) return [];
      const res = await fetch(
        `${API_URL}/merchant-services?merchantId=${merchantId}`,
        {
          headers: getAuthHeader(),
        },
      );
      if (!res.ok) throw new Error("Failed to fetch services");
      return (await res.json()).data;
    },
    enabled: !!merchantId,
  });

  // Fetch system users to filter by this merchant
  const { data: users, isLoading: isLoadingUsers } = useQuery({
    queryKey: ["users"],
    queryFn: async () => {
      const res = await fetch(
        `${API_URL}/merchant-users?merchantId=${merchantId}`,
        {
          headers: getAuthHeader(),
        },
      );
      if (!res.ok) throw new Error("Failed to fetch users");
      return (await res.json()).data;
    },
  });

  // Filter users that belong to this merchant
  const merchantUsers = React.useMemo(() => {
    if (!users || !merchantId) return [];
    return users.filter((u: any) =>
      u.merchant_id?.toString() === merchantId.toString()
    );
  }, [users, merchantId]);

  // Fetch service user mappings for this merchant
  const { data: mappings, isLoading: isLoadingMappings } = useQuery({
    queryKey: ["merchant-service-users", merchantId],
    queryFn: async () => {
      if (!merchantId) return [];
      const res = await fetch(
        `${API_URL}/merchant-service-users?merchantId=${merchantId}`,
        {
          headers: getAuthHeader(),
        },
      );
      if (!res.ok) throw new Error("Failed to fetch service mappings");
      return (await res.json()).data;
    },
    enabled: !!merchantId,
  });

  const form = useForm<MappingFormValues>({
    resolver: zodResolver(mappingSchema),
    defaultValues: {
      service_id: "",
      user_id: "",
      status_sw: true,
    },
  });

  const mutation = useMutation({
    mutationFn: async (data: MappingFormValues) => {
      const payload = {
        merchant_id: parseInt(merchantId),
        service_id: parseInt(data.service_id),
        user_id: parseInt(data.user_id),
        status_sw: data.status_sw,
        updated_by: 1, // Default tracking admin/manager ID for demo context
      };

      const url = editingId
        ? `${API_URL}/merchant-service-users/${editingId}`
        : `${API_URL}/merchant-service-users`;

      const method = editingId ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          ...getAuthHeader(),
        },
        body: JSON.stringify(payload),
      });

      const result = await res.json();

      if (!res.ok) {
        throw new Error(
          result.message ||
            result.error ||
            result.errors?.[0]?.message ||
            "Operation failed",
        );
      }
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["merchant-service-users", merchantId],
      });
      showSuccess(editingId ? "Mapping updated!" : "User mapping added!");
      setEditingId(null);
      form.reset({
        service_id: "",
        user_id: "",
        status_sw: true,
      });
    },
    onError: (error: any) => showError(error.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`${API_URL}/merchant-service-users/${id}`, {
        method: "DELETE",
        headers: getAuthHeader(),
      });
      if (!res.ok) throw new Error("Failed to delete mapping");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["merchant-service-users", merchantId],
      });
      showSuccess("Mapping deleted successfully");
    },
    onError: (error: any) => showError(error.message),
  });

  const onSubmit = (data: MappingFormValues) => {
    mutation.mutate(data);
  };

  const handleEdit = (mapping: any) => {
    setEditingId(mapping.id.toString());
    form.reset({
      service_id: mapping.service_id.toString(),
      user_id: mapping.user_id.toString(),
      status_sw: !!mapping.status_sw,
    });
  };

  if (isLoadingServices || isLoadingUsers || isLoadingMappings) {
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
                  Staff Service Assignment
                </h1>
                <p className="text-slate-500">
                  Map staff users to specific merchant services
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Left Hand: Setup mapping form */}
            <Card className="lg:col-span-1 shadow-md border-indigo-100 h-fit">
              <CardHeader className="bg-indigo-50/30 border-b">
                <CardTitle className="flex items-center gap-2 text-indigo-700">
                  {editingId
                    ? <Pencil className="h-5 w-5" />
                    : <Plus className="h-5 w-5" />}
                  {editingId ? "Edit Mapping" : "Assign Service User"}
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
                      name="service_id"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="flex items-center gap-1.5">
                            <Briefcase className="h-3.5 w-3.5" /> Service *
                          </FormLabel>
                          <Select
                            onValueChange={field.onChange}
                            value={field.value}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select Service" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {services?.map((srv: any) => (
                                <SelectItem
                                  key={srv.id}
                                  value={srv.id.toString()}
                                >
                                  {srv.name}
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
                      name="user_id"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="flex items-center gap-1.5">
                            <Users className="h-3.5 w-3.5" /> Staff User *
                          </FormLabel>
                          <Select
                            onValueChange={field.onChange}
                            value={field.value}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select User" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {merchantUsers?.map((usr: any) => (
                                <SelectItem
                                  key={usr.id}
                                  value={usr.id.toString()}
                                >
                                  {usr.user_fname} {usr.user_lname}{" "}
                                  ({usr.email})
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
                            Active Mapping
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
                        {mutation.isPending
                          ? <Loader2 className="h-4 w-4 animate-spin" />
                          : (editingId ? "Update" : "Save Assignment")}
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

            {/* Right Hand: Mapping List directory */}
            <Card className="lg:col-span-2 shadow-md border-slate-200">
              <CardHeader>
                <CardTitle>Staff Assignments</CardTitle>
                <CardDescription>
                  List of authorized staff users mapped to specific services
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="rounded-xl border overflow-hidden">
                  <Table>
                    <TableHeader className="bg-slate-50">
                      <TableRow>
                        <TableHead>Staff User</TableHead>
                        <TableHead>Service</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {mappings?.length === 0
                        ? (
                          <TableRow>
                            <TableCell
                              colSpan={4}
                              className="text-center py-12 text-slate-400 italic"
                            >
                              No staff user associations configured yet
                            </TableCell>
                          </TableRow>
                        )
                        : (
                          mappings?.map((map: any) => {
                            const associatedUser = merchantUsers.find(
                              (u: any) => u.id === map.user_id,
                            );
                            const associatedService = services?.find(
                              (s: any) => s.id === map.service_id,
                            );

                            return (
                              <TableRow
                                key={map.id}
                                className="hover:bg-slate-50/50 transition-colors"
                              >
                                <TableCell className="font-bold text-slate-900">
                                  {associatedUser
                                    ? `${associatedUser.user_fname} ${associatedUser.user_lname}`
                                    : `User #${map.user_id}`}
                                  <p className="text-xs text-slate-400 font-normal truncate max-w-[180px]">
                                    {associatedUser?.email || "No email"}
                                  </p>
                                </TableCell>
                                <TableCell className="font-semibold text-slate-700">
                                  {associatedService?.name ||
                                    `Service #${map.service_id}`}
                                </TableCell>
                                <TableCell>
                                  <span
                                    className={`px-2 py-1 rounded-full text-[10px] font-bold ${
                                      map.status_sw
                                        ? "bg-green-100 text-green-700"
                                        : "bg-slate-100 text-slate-600"
                                    }`}
                                  >
                                    {map.status_sw ? "ACTIVE" : "INACTIVE"}
                                  </span>
                                </TableCell>
                                <TableCell className="text-right">
                                  <div className="flex justify-end gap-2">
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="text-indigo-600 hover:bg-indigo-50"
                                      onClick={() => handleEdit(map)}
                                    >
                                      <Pencil className="h-4 w-4" />
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="text-red-500 hover:bg-red-50"
                                      onClick={() => {
                                        if (
                                          confirm(
                                            "Are you sure you want to delete this staff mapping?",
                                          )
                                        ) {
                                          deleteMutation.mutate(map.id);
                                        }
                                      }}
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
              </CardContent>
            </Card>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default MerchantServiceUser;
