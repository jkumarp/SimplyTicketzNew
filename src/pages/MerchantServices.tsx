"use client";

import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
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
  SelectValue 
} from "@/components/ui/select";
import { showSuccess, showError } from "@/utils/toast";
import { 
  Briefcase, Loader2, Building2, MapPin, Clock, 
  CreditCard, Calendar, Pencil, X, Plus, 
  QrCode, Globe, Palette, Image as ImageIcon
} from 'lucide-react';

const API_URL = 'http://localhost:5000/api';

// Zod schema based on column definitions
const serviceSchema = z.object({
  merchant_id: z.string().min(1, "Merchant is required"),
  name: z.string().min(1, "Name is required").max(200, "Max 200 characters"),
  logo_image_path: z.string().max(100, "Max 100 characters").optional().or(z.literal('')),
  single_qr_sw: z.boolean().default(false),
  background_color: z.string().max(50, "Max 50 characters").default("#ffffff"),
  beneficiary_name: z.string().max(100, "Max 100 characters").optional().or(z.literal('')),
  account_type: z.string().max(10, "Max 10 characters").default("Savings"),
  bank_account_number: z.string().max(50, "Max 50 characters").optional().or(z.literal('')),
  bank_name: z.string().max(100, "Max 100 characters").optional().or(z.literal('')),
  branch_name: z.string().max(100, "Max 100 characters").optional().or(z.literal('')),
  bank_ifsc: z.string().max(50, "Max 50 characters").optional().or(z.literal('')),
  start_time: z.string().optional().or(z.literal('')),
  end_time: z.string().optional().or(z.literal('')),
  mon_working_sw: z.boolean().default(true),
  tue_working_sw: z.boolean().default(true),
  wed_working_sw: z.boolean().default(true),
  thu_working_sw: z.boolean().default(true),
  fri_working_sw: z.boolean().default(true),
  sat_working_sw: z.boolean().default(false),
  sun_working_sw: z.boolean().default(false),
  addressline1: z.string().max(100, "Max 100 characters").optional().or(z.literal('')),
  addressline2: z.string().max(100, "Max 100 characters").optional().or(z.literal('')),
  state: z.string().optional().or(z.literal('')),
  pincode: z.string().regex(/^\d*$/, "Must be a number").optional().or(z.literal('')),
  country: z.string().default("1"),
  location_coordinates: z.string().max(100, "Max 100 characters").optional().or(z.literal('')),
  encrypted_url: z.string().max(500, "Max 500 characters").optional().or(z.literal('')),
  status_sw: z.boolean().default(true),
  update_by: z.string().default("1")
});

type ServiceFormValues = z.infer<typeof serviceSchema>;

const MerchantServices = () => {
  const queryClient = useQueryClient();
  const [editingId, setEditingId] = useState<string | null>(null);

  const form = useForm<ServiceFormValues>({
    resolver: zodResolver(serviceSchema),
    defaultValues: {
      merchant_id: '',
      name: '',
      logo_image_path: '',
      single_qr_sw: false,
      background_color: '#ffffff',
      beneficiary_name: '',
      account_type: 'Savings',
      bank_account_number: '',
      bank_name: '',
      branch_name: '',
      bank_ifsc: '',
      start_time: '09:00',
      end_time: '18:00',
      mon_working_sw: true,
      tue_working_sw: true,
      wed_working_sw: true,
      thu_working_sw: true,
      fri_working_sw: true,
      sat_working_sw: false,
      sun_working_sw: false,
      addressline1: '',
      addressline2: '',
      state: '',
      pincode: '',
      country: '1',
      location_coordinates: '',
      encrypted_url: '',
      status_sw: true,
      update_by: '1'
    }
  });

  const selectedCountry = form.watch("country");

  const getAuthHeader = () => {
    const token = localStorage.getItem('token');
    return token ? { 'Authorization': `Bearer ${token}` } : {};
  };

  // Queries
  const { data: services, isLoading: isLoadingServices } = useQuery({
    queryKey: ['merchant-services'],
    queryFn: async () => {
      const res = await fetch(`${API_URL}/merchant-services`, {
        headers: { ...getAuthHeader() }
      });
      if (!res.ok) throw new Error('Failed to fetch services');
      return (await res.json()).data;
    }
  });

  const { data: merchants } = useQuery({
    queryKey: ['merchants'],
    queryFn: async () => {
      const res = await fetch(`${API_URL}/merchants`, {
        headers: { ...getAuthHeader() }
      });
      return (await res.json()).data;
    }
  });

  const { data: countries } = useQuery({
    queryKey: ['countries'],
    queryFn: async () => {
      const res = await fetch(`${API_URL}/countries`, {
        headers: { ...getAuthHeader() }
      });
      if (!res.ok) throw new Error('Failed to fetch countries');
      return (await res.json()).data;
    }
  });

  const { data: states } = useQuery({
    queryKey: ['states', selectedCountry],
    queryFn: async () => {
      if (!selectedCountry) return [];
      const res = await fetch(`${API_URL}/states?countryId=${selectedCountry}`, {
        headers: { ...getAuthHeader() }
      });
      if (!res.ok) throw new Error('Failed to fetch states');
      return (await res.json()).data;
    },
    enabled: !!selectedCountry
  });

  const mutation = useMutation({
    mutationFn: async (data: ServiceFormValues) => {
      const payload = {
        ...data,
        merchant_id: parseInt(data.merchant_id),
        state: data.state ? parseInt(data.state) : null,
        pincode: data.pincode ? parseInt(data.pincode) : null,
        country: parseInt(data.country),
        update_by: parseInt(data.update_by)
      };

      const url = editingId ? `${API_URL}/merchant-services/${editingId}` : `${API_URL}/merchant-services`;
      const method = editingId ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 
          'Content-Type': 'application/json',
          ...getAuthHeader()
        },
        body: JSON.stringify(payload)
      });
      
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Operation failed');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['merchant-services'] });
      showSuccess(editingId ? 'Service updated!' : 'Service created!');
      setEditingId(null);
      form.reset();
    },
    onError: (error: any) => showError(error.message)
  });

  const onSubmit = (data: ServiceFormValues) => {
    mutation.mutate(data);
  };

  const handleEdit = (service: any) => {
    setEditingId(service.id);
    form.reset({
      ...service,
      merchant_id: service.merchant_id.toString(),
      state: service.state?.toString() || '',
      country: service.country?.toString() || '1',
      pincode: service.pincode?.toString() || '',
      update_by: '1'
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <Navbar />
      
      <main className="flex-grow container px-4 md:px-8 py-12">
        <div className="flex flex-col gap-8">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-slate-900">Merchant Services</h1>
              <p className="text-slate-500">Configure and manage specific services offered by merchants</p>
            </div>
            {editingId && (
              <Button variant="outline" onClick={() => { setEditingId(null); form.reset(); }} className="gap-2">
                <X className="h-4 w-4" /> Cancel Edit
              </Button>
            )}
          </div>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="grid grid-cols-1 xl:grid-cols-3 gap-8">
              <Card className="xl:col-span-2 shadow-lg border-indigo-100">
                <CardHeader className="bg-indigo-50/30 border-b">
                  <CardTitle className="flex items-center gap-2 text-indigo-700">
                    <Briefcase className="h-5 w-5" />
                    Service Configuration
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-8 space-y-8">
                  {/* Basic Info */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <FormField
                      control={form.control}
                      name="merchant_id"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Associated Merchant *</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select Merchant" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {merchants?.map((m: any) => (
                                <SelectItem key={m.id} value={m.id.toString()}>{m.organization_name}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Service Name *</FormLabel>
                          <FormControl>
                            <Input placeholder="e.g. VIP Lounge Access" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  {/* Banking Details */}
                  <div className="space-y-4">
                    <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                      <CreditCard className="h-4 w-4" /> Settlement Banking
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <FormField
                        control={form.control}
                        name="beneficiary_name"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Beneficiary Name</FormLabel>
                            <FormControl>
                              <Input {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="account_type"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Account Type</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                              <FormControl>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="Savings">Savings</SelectItem>
                                <SelectItem value="Current">Current</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="bank_account_number"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Account Number</FormLabel>
                            <FormControl>
                              <Input {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="bank_name"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Bank Name</FormLabel>
                            <FormControl>
                              <Input {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="branch_name"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Branch Name</FormLabel>
                            <FormControl>
                              <Input {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="bank_ifsc"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>IFSC Code</FormLabel>
                            <FormControl>
                              <Input {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>

                  {/* Schedule */}
                  <div className="space-y-4">
                    <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                      <Clock className="h-4 w-4" /> Operating Hours
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="grid grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="start_time"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Start Time</FormLabel>
                              <FormControl>
                                <Input type="time" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="end_time"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>End Time</FormLabel>
                              <FormControl>
                                <Input type="time" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Working Days</Label>
                        <div className="flex flex-wrap gap-3 pt-2">
                          {['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'].map(day => (
                            <FormField
                              key={day}
                              control={form.control}
                              name={`${day}_working_sw` as any}
                              render={({ field }) => (
                                <FormItem className="flex flex-row items-center space-x-1.5 space-y-0">
                                  <FormControl>
                                    <Checkbox
                                      checked={field.value}
                                      onCheckedChange={field.onChange}
                                    />
                                  </FormControl>
                                  <FormLabel className="text-xs uppercase font-normal">
                                    {day}
                                  </FormLabel>
                                </FormItem>
                              )}
                            />
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Location */}
                  <div className="space-y-4">
                    <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                      <MapPin className="h-4 w-4" /> Service Location
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <FormField
                        control={form.control}
                        name="addressline1"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Address Line 1</FormLabel>
                            <FormControl>
                              <Input {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="location_coordinates"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Coordinates (Lat, Long)</FormLabel>
                            <FormControl>
                              <Input placeholder="12.9716, 77.5946" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <div className="grid grid-cols-3 gap-4 md:col-span-2">
                        <FormField
                          control={form.control}
                          name="country"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Country</FormLabel>
                              <Select onValueChange={field.onChange} value={field.value}>
                                <FormControl>
                                  <SelectTrigger><SelectValue /></SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  {countries?.map((c: any) => <SelectItem key={c.id} value={c.id.toString()}>{c.name}</SelectItem>)}
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="state"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>State</FormLabel>
                              <Select onValueChange={field.onChange} value={field.value}>
                                <FormControl>
                                  <SelectTrigger><SelectValue /></SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  {states?.map((s: any) => <SelectItem key={s.id} value={s.id.toString()}>{s.name}</SelectItem>)}
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="pincode"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Pincode</FormLabel>
                              <FormControl>
                                <Input type="text" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <div className="space-y-8">
                <Card className="shadow-lg border-indigo-100">
                  <CardHeader className="bg-slate-900 text-white">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Palette className="h-5 w-5" /> Appearance & Settings
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-6 space-y-6">
                    <FormField
                      control={form.control}
                      name="logo_image_path"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Logo Image Path</FormLabel>
                          <div className="flex gap-2">
                            <FormControl>
                              <Input placeholder="/assets/logos/service.png" {...field} />
                            </FormControl>
                            <Button variant="outline" size="icon" type="button"><ImageIcon className="h-4 w-4" /></Button>
                          </div>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="background_color"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Background Color</FormLabel>
                          <div className="flex gap-2">
                            <FormControl>
                              <Input type="color" className="w-12 p-1 h-10" {...field} />
                            </FormControl>
                            <FormControl>
                              <Input {...field} />
                            </FormControl>
                          </div>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="encrypted_url"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Encrypted URL</FormLabel>
                          <div className="flex gap-2">
                            <FormControl>
                              <Input placeholder="https://..." {...field} />
                            </FormControl>
                            <Button variant="outline" size="icon" type="button"><Globe className="h-4 w-4" /></Button>
                          </div>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <div className="pt-4 space-y-4 border-t">
                      <FormField
                        control={form.control}
                        name="single_qr_sw"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-center space-x-2 space-y-0">
                            <FormControl>
                              <Checkbox
                                checked={field.value}
                                onCheckedChange={field.onChange}
                              />
                            </FormControl>
                            <FormLabel className="flex items-center gap-2 font-normal">
                              <QrCode className="h-4 w-4" /> Single QR Enabled
                            </FormLabel>
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
                            <FormLabel className="font-normal">
                              Service Active
                            </FormLabel>
                          </FormItem>
                        )}
                      />
                    </div>
                  </CardContent>
                </Card>

                <Button 
                  type="submit" 
                  className="w-full bg-indigo-600 hover:bg-indigo-700 h-14 text-lg font-bold rounded-2xl shadow-lg shadow-indigo-100"
                  disabled={mutation.isPending}
                >
                  {mutation.isPending ? <Loader2 className="animate-spin" /> : (editingId ? 'Update Service' : 'Create Service')}
                </Button>
              </div>
            </form>
          </Form>

          <Card className="shadow-md border-slate-200">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Service Directory</CardTitle>
                <CardDescription>List of all configured merchant services</CardDescription>
              </div>
            </CardHeader>
            <CardContent>
              {isLoadingServices ? (
                <div className="flex justify-center py-20"><Loader2 className="animate-spin text-indigo-600" /></div>
              ) : (
                <div className="rounded-xl border overflow-hidden">
                  <Table>
                    <TableHeader className="bg-slate-50">
                      <TableRow>
                        <TableHead>Service Name</TableHead>
                        <TableHead>Merchant</TableHead>
                        <TableHead>Schedule</TableHead>
                        <TableHead>Bank Info</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {services?.map((service: any) => (
                        <TableRow key={service.id}>
                          <TableCell className="font-bold text-indigo-600">{service.name}</TableCell>
                          <TableCell>
                            {merchants?.find((m: any) => m.id === service.merchant_id)?.organization_name || `ID: ${service.merchant_id}`}
                          </TableCell>
                          <TableCell className="text-xs">
                            <div className="flex items-center gap-1 text-slate-500">
                              <Clock className="h-3 w-3" /> {service.start_time} - {service.end_time}
                            </div>
                          </TableCell>
                          <TableCell className="text-xs">
                            <div className="font-medium">{service.bank_name}</div>
                            <div className="text-slate-400">{service.bank_account_number}</div>
                          </TableCell>
                          <TableCell>
                            <span className={`px-2 py-1 rounded-full text-[10px] font-bold ${service.status_sw ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-600'}`}>
                              {service.status_sw ? 'ACTIVE' : 'INACTIVE'}
                            </span>
                          </TableCell>
                          <TableCell className="text-right">
                            <Button variant="ghost" size="icon" onClick={() => handleEdit(service)}><Pencil className="h-4 w-4" /></Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default MerchantServices;