"use client";

import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
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
  CreditCard, Pencil, X, QrCode, Palette, Image as ImageIcon,
  CalendarDays, Globe, Link as LinkIcon, ShieldAlert, Percent, Calendar, RefreshCcw,
  MapPinned
} from 'lucide-react';

const API_URL = 'http://localhost:5000/api';

const serviceSchema = z.object({
  merchant_id: z.string().min(1, "Merchant is required"),
  name: z.string().min(1, "Name is required").max(200, "Max 200 characters"),
  logo_image_path: z.string().max(100).optional().or(z.literal('')),
  single_qr_sw: z.boolean().default(false),
  background_color: z.string().max(50).default("#ffffff"),
  beneficiary_name: z.string().max(100).optional().or(z.literal('')),
  account_type: z.string().max(10).default("Savings"),
  bank_account_number: z.string().max(50).optional().or(z.literal('')),
  bank_name: z.string().max(100).optional().or(z.literal('')),
  branch_name: z.string().max(100).optional().or(z.literal('')),
  bank_ifsc: z.string().max(50).optional().or(z.literal('')),
  start_time: z.string().optional().or(z.literal('')),
  end_time: z.string().optional().or(z.literal('')),
  mon_working_sw: z.boolean().default(true),
  tue_working_sw: z.boolean().default(true),
  wed_working_sw: z.boolean().default(true),
  thu_working_sw: z.boolean().default(true),
  fri_working_sw: z.boolean().default(true),
  sat_working_sw: z.boolean().default(false),
  sun_working_sw: z.boolean().default(false),
  addressline1: z.string().max(100).optional().or(z.literal('')),
  addressline2: z.string().max(100).optional().or(z.literal('')),
  city: z.string().max(100).optional().or(z.literal('')),
  state: z.string().optional().or(z.literal('')),
  pincode: z.string().regex(/^\d*$/).optional().or(z.literal('')),
  country: z.string().default("1"),
  location_coordinates: z.string().max(100).optional().or(z.literal('')),
  encrypted_url: z.string().max(500).optional().or(z.literal('')),
  status_sw: z.boolean().default(true),
  update_by: z.string().default("1"),
  sgst: z.string().regex(/^\d*\.?\d*$/).optional().or(z.literal('')),
  cgst: z.string().regex(/^\d*\.?\d*$/).optional().or(z.literal('')),
  igst: z.string().regex(/^\d*\.?\d*$/).optional().or(z.literal('')),
  start_date: z.string().optional().or(z.literal('')),
  end_date: z.string().optional().or(z.literal('')),
  recurring_sw: z.boolean().default(true),
});

type ServiceFormValues = z.infer<typeof serviceSchema>;

const initialDefaultValues: ServiceFormValues = {
  merchant_id: '', name: '', logo_image_path: '', single_qr_sw: false,
  background_color: '#ffffff', beneficiary_name: '', account_type: 'Savings',
  bank_account_number: '', bank_name: '', branch_name: '', bank_ifsc: '',
  start_time: '09:00', end_time: '18:00', mon_working_sw: true,
  tue_working_sw: true, wed_working_sw: true, thu_working_sw: true,
  fri_working_sw: true, sat_working_sw: false, sun_working_sw: false,
  addressline1: '', addressline2: '', city: '', state: '', pincode: '',
  country: '1', location_coordinates: '', encrypted_url: '',
  status_sw: true, update_by: '1',
  sgst: '0', cgst: '0', igst: '0',
  start_date: '', end_date: '',
  recurring_sw: true
};

interface ServiceTabProps {
  onServiceSelect: (id: string) => void;
  selectedServiceId: string | null;
}

const ServiceTab = ({ onServiceSelect, selectedServiceId }: ServiceTabProps) => {
  const queryClient = useQueryClient();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [pendingStateId, setPendingStateId] = useState<string | null>(null);
  
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const isRestricted = [4, 5, 6].includes(user.role);

  const form = useForm<ServiceFormValues>({
    resolver: zodResolver(serviceSchema),
    defaultValues: initialDefaultValues
  });

  const getAuthHeader = () => ({ 'Authorization': `Bearer ${localStorage.getItem('token')}` });

  const { data: services, isLoading: isLoadingServices } = useQuery({
    queryKey: ['merchant-services'],
    queryFn: async () => {
      const res = await fetch(`${API_URL}/merchant-services`, { headers: getAuthHeader() });
      return (await res.json()).data;
    }
  });

  const { data: merchants } = useQuery({
    queryKey: ['merchants'],
    queryFn: async () => {
      const res = await fetch(`${API_URL}/merchants`, { headers: getAuthHeader() });
      return (await res.json()).data;
    }
  });

  const { data: countries } = useQuery({
    queryKey: ['countries'],
    queryFn: async () => {
      const res = await fetch(`${API_URL}/countries`, { headers: getAuthHeader() });
      return (await res.json()).data;
    }
  });

  const selectedCountry = form.watch('country');
  const isRecurring = form.watch('recurring_sw');

  const { data: states, isSuccess: isStatesLoaded } = useQuery({
    queryKey: ['states', selectedCountry],
    queryFn: async () => {
      if (!selectedCountry) return [];
      const res = await fetch(`${API_URL}/states?countryId=${selectedCountry}`, { headers: getAuthHeader() });
      return (await res.json()).data;
    },
    enabled: !!selectedCountry
  });

  useEffect(() => {
    if (isStatesLoaded && pendingStateId && states) {
      const stateExists = states.some((s: any) => s.id.toString() === pendingStateId);
      if (stateExists) {
        form.setValue('state', pendingStateId);
        setPendingStateId(null);
      }
    }
  }, [isStatesLoaded, states, pendingStateId, form]);

  const mutation = useMutation({
    mutationFn: async (data: ServiceFormValues) => {
      const payload = {
        ...data,
        merchant_id: parseInt(data.merchant_id),
        state: data.state ? parseInt(data.state) : null,
        pincode: data.pincode ? parseInt(data.pincode) : null,
        country: parseInt(data.country),
        update_by: parseInt(data.update_by),
        sgst: data.sgst ? parseFloat(data.sgst) : 0,
        cgst: data.cgst ? parseFloat(data.cgst) : 0,
        igst: data.igst ? parseFloat(data.igst) : 0,
        start_date: data.start_date || null,
        end_date: data.end_date || null,
      };
      const url = editingId ? `${API_URL}/merchant-services/${editingId}` : `${API_URL}/merchant-services`;
      const res = await fetch(url, {
        method: editingId ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
        body: JSON.stringify(payload)
      });
      if (!res.ok) throw new Error('Operation failed');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['merchant-services'] });
      showSuccess(editingId ? 'Service updated!' : 'Service created!');
      setEditingId(null);
      setPendingStateId(null);
      form.reset(initialDefaultValues);
    },
    onError: (error: any) => showError(error.message)
  });

  const formatTimeForInput = (time: string | null) => {
    if (!time) return "";
    return time.split(':').slice(0, 2).join(':');
  };

  const handleEdit = (service: any) => {
    setEditingId(service.id);
    setPendingStateId(service.state?.toString() || null);
    
    form.reset({
      ...service,
      merchant_id: service.merchant_id.toString(),
      state: '', 
      country: service.country?.toString() || '1',
      city: service.city || '',
      pincode: service.pincode?.toString() || '',
      update_by: '1',
      sgst: service.sgst?.toString() || '0',
      cgst: service.cgst?.toString() || '0',
      igst: service.igst?.toString() || '0',
      start_date: service.start_date || '',
      end_date: service.end_date || '',
      start_time: formatTimeForInput(service.start_time) || '09:00',
      end_time: formatTimeForInput(service.end_time) || '18:00',
      recurring_sw: !!service.recurring_sw,
      single_qr_sw: !!service.single_qr_sw,
      status_sw: !!service.status_sw
    });
  };

  return (
    <div className="space-y-8">
      <Form {...form}>
        <form onSubmit={form.handleSubmit((data) => mutation.mutate(data))} className="grid grid-cols-1 xl:grid-cols-3 gap-8">
          <div className="xl:col-span-2 space-y-8">
            {/* Basic & Banking Info */}
            <Card className="shadow-md border-indigo-100">
              <CardHeader className="bg-indigo-50/30 border-b">
                <CardTitle className="flex items-center gap-2 text-indigo-700">
                  <Briefcase className="h-5 w-5" />
                  {editingId ? 'Edit Service' : 'New Service Configuration'}
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-6 space-y-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <FormField
                    control={form.control}
                    name="merchant_id"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Merchant *</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl><SelectTrigger><SelectValue placeholder="Select Merchant" /></SelectTrigger></FormControl>
                          <SelectContent>
                            {merchants?.map((m: any) => <SelectItem key={m.id} value={m.id.toString()}>{m.organization_name}</SelectItem>)}
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
                        <FormControl><Input placeholder="e.g. VIP Lounge Access" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="space-y-4">
                  <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                    <CreditCard className="h-4 w-4" /> Banking Information
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <FormField control={form.control} name="beneficiary_name" render={({ field }) => (
                      <FormItem><FormLabel>Beneficiary Name</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>
                    )} />
                    <FormField control={form.control} name="account_type" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Account Type</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                          <SelectContent>
                            <SelectItem value="Savings">Savings</SelectItem>
                            <SelectItem value="Current">Current</SelectItem>
                          </SelectContent>
                        </Select>
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="bank_name" render={({ field }) => (
                      <FormItem><FormLabel>Bank Name</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>
                    )} />
                    <FormField control={form.control} name="bank_account_number" render={({ field }) => (
                      <FormItem><FormLabel>Account Number</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>
                    )} />
                    <FormField control={form.control} name="branch_name" render={({ field }) => (
                      <FormItem><FormLabel>Branch Name</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>
                    )} />
                    <FormField control={form.control} name="bank_ifsc" render={({ field }) => (
                      <FormItem><FormLabel>IFSC Code</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>
                    )} />
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                    <Percent className="h-4 w-4" /> Tax Configuration (%)
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <FormField control={form.control} name="sgst" render={({ field }) => (
                      <FormItem><FormLabel>SGST (%)</FormLabel><FormControl><Input type="number" step="0.01" {...field} /></FormControl></FormItem>
                    )} />
                    <FormField control={form.control} name="cgst" render={({ field }) => (
                      <FormItem><FormLabel>CGST (%)</FormLabel><FormControl><Input type="number" step="0.01" {...field} /></FormControl></FormItem>
                    )} />
                    <FormField control={form.control} name="igst" render={({ field }) => (
                      <FormItem><FormLabel>IGST (%)</FormLabel><FormControl><Input type="number" step="0.01" {...field} /></FormControl></FormItem>
                    )} />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Working Hours & Location */}
            <Card className="shadow-md border-indigo-100">
              <CardHeader className="bg-indigo-50/30 border-b">
                <CardTitle className="flex items-center gap-2 text-indigo-700">
                  <Clock className="h-5 w-5" />
                  Operations & Location
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-6 space-y-8">
                <div className="space-y-4">
                  <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                    <Calendar className="h-4 w-4" /> Service Validity
                  </h3>
                  
                  <FormField
                    control={form.control}
                    name="recurring_sw"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center space-x-2 space-y-0 mb-4">
                        <FormControl>
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                        <FormLabel className="flex items-center gap-2 font-normal cursor-pointer">
                          <RefreshCcw className="h-4 w-4 text-indigo-600" />
                          Recurring Service (No fixed dates)
                        </FormLabel>
                      </FormItem>
                    )}
                  />

                  {!isRecurring && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in fade-in slide-in-from-top-2 duration-300">
                      <FormField control={form.control} name="start_date" render={({ field }) => (
                        <FormItem><FormLabel>Start Date</FormLabel><FormControl><Input type="date" {...field} /></FormControl></FormItem>
                      )} />
                      <FormField control={form.control} name="end_date" render={({ field }) => (
                        <FormItem><FormLabel>End Date</FormLabel><FormControl><Input type="date" {...field} /></FormControl></FormItem>
                      )} />
                    </div>
                  )}
                </div>

                <div className="space-y-4">
                  <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                    <CalendarDays className="h-4 w-4" /> Working Hours & Days
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <FormField control={form.control} name="start_time" render={({ field }) => (
                      <FormItem><FormLabel>Start Time</FormLabel><FormControl><Input type="time" {...field} /></FormControl></FormItem>
                    )} />
                    <FormField control={form.control} name="end_time" render={({ field }) => (
                      <FormItem><FormLabel>End Time</FormLabel><FormControl><Input type="time" {...field} /></FormControl></FormItem>
                    )} />
                  </div>
                  <div className="flex flex-wrap gap-4 p-4 bg-slate-50 rounded-xl border">
                    {['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'].map((day) => (
                      <FormField
                        key={day}
                        control={form.control}
                        name={`${day}_working_sw` as any}
                        render={({ field }) => (
                          <FormItem className="flex items-center space-x-2 space-y-0">
                            <FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                            <FormLabel className="capitalize cursor-pointer">{day}</FormLabel>
                          </FormItem>
                        )}
                      />
                    ))}
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                    <MapPin className="h-4 w-4" /> Service Address
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <FormField control={form.control} name="addressline1" render={({ field }) => (
                      <FormItem><FormLabel>Address Line 1</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>
                    )} />
                    <FormField control={form.control} name="addressline2" render={({ field }) => (
                      <FormItem><FormLabel>Address Line 2</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>
                    )} />
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 md:col-span-2">
                      <FormField control={form.control} name="city" render={({ field }) => (
                        <FormItem>
                          <FormLabel className="flex items-center gap-2"><MapPinned className="h-3.5 w-3.5" /> City</FormLabel>
                          <FormControl><Input placeholder="City" {...field} /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />
                      <FormField control={form.control} name="country" render={({ field }) => (
                        <FormItem>
                          <FormLabel>Country</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                            <SelectContent>
                              {countries?.map((c: any) => <SelectItem key={c.id} value={c.id.toString()}>{c.name}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        </FormItem>
                      )} />
                      <FormField control={form.control} name="state" render={({ field }) => (
                        <FormItem>
                          <FormLabel>State</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl><SelectTrigger><SelectValue placeholder="Select State" /></SelectTrigger></FormControl>
                            <SelectContent>
                              {states?.map((s: any) => <SelectItem key={s.id} value={s.id.toString()}>{s.name}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        </FormItem>
                      )} />
                      <FormField control={form.control} name="pincode" render={({ field }) => (
                        <FormItem><FormLabel>Pincode</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>
                      )} />
                    </div>
                    <FormField control={form.control} name="location_coordinates" render={({ field }) => (
                      <FormItem className="md:col-span-2"><FormLabel>GPS Coordinates</FormLabel><FormControl><Input placeholder="Lat, Long" {...field} /></FormControl></FormItem>
                    )} />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-8">
            <Card className="shadow-md border-indigo-100">
              <CardHeader className="bg-slate-900 text-white">
                <CardTitle className="text-lg flex items-center gap-2"><Palette className="h-5 w-5" /> Appearance & Advanced</CardTitle>
              </CardHeader>
              <CardContent className="pt-6 space-y-6">
                <FormField control={form.control} name="logo_image_path" render={({ field }) => (
                  <FormItem><FormLabel className="flex items-center gap-2"><ImageIcon className="h-4 w-4" /> Logo Path</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>
                )} />
                <FormField control={form.control} name="background_color" render={({ field }) => (
                  <FormItem><FormLabel>Theme Color</FormLabel><div className="flex gap-2"><Input type="color" className="w-12 p-1 h-10" {...field} /><Input {...field} /></div></FormItem>
                )} />
                <FormField control={form.control} name="encrypted_url" render={({ field }) => (
                  <FormItem><FormLabel className="flex items-center gap-2"><LinkIcon className="h-4 w-4" /> Encrypted URL</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>
                )} />
                
                <div className="pt-4 space-y-4 border-t">
                  <FormField control={form.control} name="single_qr_sw" render={({ field }) => (
                    <FormItem className="flex flex-row items-center space-x-2 space-y-0">
                      <FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                      <FormLabel className="flex items-center gap-2 font-normal cursor-pointer"><QrCode className="h-4 w-4" /> Single QR Mode</FormLabel>
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="status_sw" render={({ field }) => (
                    <FormItem className="flex flex-row items-center space-x-2 space-y-0">
                      <FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                      <FormLabel className="font-normal cursor-pointer">Active Status</FormLabel>
                    </FormItem>
                  )} />
                </div>
              </CardContent>
            </Card>

            <div className="space-y-4">
              <Button 
                type="submit" 
                disabled={mutation.isPending || (isRestricted && !editingId)} 
                className="w-full bg-indigo-600 hover:bg-indigo-700 h-14 text-lg font-bold rounded-2xl shadow-lg shadow-indigo-100"
              >
                {mutation.isPending ? <Loader2 className="animate-spin" /> : (editingId ? 'Update Service' : 'Create Service')}
              </Button>
              
              {isRestricted && !editingId && (
                <div className="flex items-center gap-2 p-3 bg-amber-50 border border-amber-100 rounded-xl text-amber-700 text-xs font-medium">
                  <ShieldAlert className="h-4 w-4 shrink-0" />
                  Your account role does not have permission to create new services.
                </div>
              )}

              {editingId && (
                <Button variant="outline" className="w-full h-12 rounded-xl" onClick={() => { setEditingId(null); setPendingStateId(null); form.reset(initialDefaultValues); }}>
                  Cancel Editing
                </Button>
              )}
            </div>
          </div>
        </form>
      </Form>

      <Card className="shadow-md border-slate-200">
        <CardHeader>
          <CardTitle>Service Directory</CardTitle>
          <CardDescription>Manage and select services to configure categories and timeslots</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoadingServices ? <div className="flex justify-center py-10"><Loader2 className="animate-spin text-indigo-600" /></div> : (
            <div className="rounded-xl border overflow-hidden">
              <Table>
                <TableHeader className="bg-slate-50">
                  <TableRow>
                    <TableHead>Service Name</TableHead>
                    <TableHead>Merchant</TableHead>
                    <TableHead>Validity</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {services?.map((service: any) => (
                    <TableRow key={service.id} className={selectedServiceId === service.id.toString() ? "bg-indigo-50/50" : "hover:bg-slate-50/50 transition-colors"}>
                      <TableCell className="font-bold text-indigo-600 cursor-pointer" onClick={() => onServiceSelect(service.id.toString())}>
                        {service.name}
                      </TableCell>
                      <TableCell className="text-sm text-slate-600">
                        {merchants?.find((m: any) => m.id === service.merchant_id)?.organization_name || `ID: ${service.merchant_id}`}
                      </TableCell>
                      <TableCell className="text-xs text-slate-500">
                        <div className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {service.recurring_sw ? 'Recurring' : `${service.start_date || 'N/A'} to ${service.end_date || 'N/A'}`}
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className={`px-2 py-1 rounded-full text-[10px] font-bold ${service.status_sw ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-600'}`}>
                          {service.status_sw ? 'ACTIVE' : 'INACTIVE'}
                        </span>
                      </TableCell>
                      <TableCell className="text-right flex justify-end gap-2">
                        <Button variant="outline" size="sm" className="h-8" onClick={() => onServiceSelect(service.id.toString())}>Select</Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-indigo-600" onClick={() => handleEdit(service)}><Pencil className="h-4 w-4" /></Button>
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
  );
};

export default ServiceTab;