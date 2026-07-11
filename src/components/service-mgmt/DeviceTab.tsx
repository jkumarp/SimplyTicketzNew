"use client";

import React, { useState } from 'react';
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
import { Smartphone, Loader2, Pencil, X, AlertCircle, Hash, Phone, ShieldCheck } from 'lucide-react';
import { API_URL } from "@/config";
const getAuthHeader = () => ({
  "Authorization": `Bearer ${localStorage.getItem("token")}`,
});

const deviceSchema = z.object({
  merchant_id: z.string().min(1),
  merchant_service_id: z.string().min(1),
  merchant_subscription_id: z.string().min(1, "Subscription is required"),
  phone: z.string().min(10, "Phone must be 10 digits").max(10),
  publisher_id: z.string().min(1, "Publisher ID is required").max(50),
  status_sw: z.boolean().default(true),
  update_by: z.string().default("1")
});

type DeviceFormValues = z.infer<typeof deviceSchema>;

interface DeviceTabProps {
  serviceId: string | null;
}

const DeviceTab = ({ serviceId }: DeviceTabProps) => {
  const queryClient = useQueryClient();
  const [editingId, setEditingId] = useState<string | null>(null);

  // Fetch service to get merchant_id
  const { data: service } = useQuery({
    queryKey: ['merchant-service', serviceId],
    queryFn: async () => {
      if (!serviceId) return null;
      const res = await fetch(`${API_URL}/merchant-services`, { headers: getAuthHeader() });
      const data = await res.json();
      return data.data.find((s: any) => s.id.toString() === serviceId);
    },
    enabled: !!serviceId
  });

  // Fetch subscriptions for this merchant
  const { data: subscriptions } = useQuery({
    queryKey: ['merchant-subscriptions', service?.merchant_id],
    queryFn: async () => {
      if (!service?.merchant_id) return [];
      const res = await fetch(`${API_URL}/merchant-subscriptions?merchantId=${service.merchant_id}`, { headers: getAuthHeader() });
      return (await res.json()).data;
    },
    enabled: !!service?.merchant_id
  });

  const form = useForm<DeviceFormValues>({
    resolver: zodResolver(deviceSchema),
    defaultValues: {
      merchant_id: '',
      merchant_service_id: serviceId || '',
      merchant_subscription_id: '',
      phone: '',
      publisher_id: '',
      status_sw: true,
      update_by: '1'
    }
  });

  React.useEffect(() => {
    if (service) {
      form.setValue('merchant_id', service.merchant_id.toString());
      form.setValue('merchant_service_id', service.id.toString());
    }
  }, [service, form]);

  const { data: devices, isLoading } = useQuery({
    queryKey: ['merchant-devices', service?.merchant_id],
    queryFn: async () => {
      if (!service?.merchant_id) return [];
      const res = await fetch(`${API_URL}/merchant-devices?merchantId=${service.merchant_id}`, { headers: getAuthHeader() });
      return (await res.json()).data;
    },
    enabled: !!service?.merchant_id
  });

  const mutation = useMutation({
    mutationFn: async (data: DeviceFormValues) => {
      const payload = { 
        ...data, 
        merchant_id: parseInt(data.merchant_id),
        merchant_service_id: parseInt(data.merchant_service_id),
        merchant_subscription_id: parseInt(data.merchant_subscription_id),
        update_by: 1 
      };
      const url = editingId ? `${API_URL}/merchant-devices/${editingId}` : `${API_URL}/merchant-devices`;
      const res = await fetch(url, {
        method: editingId ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
        body: JSON.stringify(payload)
      });
      if (!res.ok) throw new Error('Operation failed');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['merchant-devices'] });
      showSuccess('Device saved!');
      setEditingId(null);
      form.reset({ 
        merchant_id: service?.merchant_id?.toString() || '',
        merchant_service_id: serviceId || ''
      });
    },
    onError: (error: any) => showError(error.message)
  });

  if (!serviceId) {
    return (
      <div className="flex flex-col items-center justify-center py-20 bg-slate-50 rounded-3xl border-2 border-dashed border-slate-200">
        <AlertCircle className="h-12 w-12 text-slate-300 mb-4" />
        <h3 className="text-lg font-bold text-slate-900">No Service Selected</h3>
        <p className="text-slate-500">Please select a service from the Services tab first.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
      <Card className="xl:col-span-1 shadow-md border-indigo-100 h-fit">
        <CardHeader className="bg-indigo-50/30 border-b">
          <CardTitle className="flex items-center gap-2 text-indigo-700">
            <Smartphone className="h-5 w-5" /> 
            {editingId ? 'Edit Device' : 'Register Device'}
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          <Form {...form}>
            <form onSubmit={form.handleSubmit((data) => mutation.mutate(data))} className="space-y-4">
              <FormField control={form.control} name="merchant_subscription_id" render={({ field }) => (
                <FormItem>
                  <FormLabel>Active Subscription *</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl><SelectTrigger><SelectValue placeholder="Select Subscription" /></SelectTrigger></FormControl>
                    <SelectContent>
                      {subscriptions?.map((sub: any) => (
                        <SelectItem key={sub.id} value={sub.id.toString()}>
                          Sub #{sub.id} (Ends: {sub.end_date})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />

              <FormField control={form.control} name="phone" render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-2"><Phone className="h-4 w-4" /> Device Phone Number *</FormLabel>
                  <FormControl><Input placeholder="10-digit mobile" maxLength={10} {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              <FormField control={form.control} name="publisher_id" render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-2"><ShieldCheck className="h-4 w-4" /> Publisher ID / Device ID *</FormLabel>
                  <FormControl><Input placeholder="Unique device identifier" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              <FormField control={form.control} name="status_sw" render={({ field }) => (
                <FormItem className="flex flex-row items-center space-x-2 space-y-0">
                  <FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                  <FormLabel className="font-normal cursor-pointer">Active Device</FormLabel>
                </FormItem>
              )} />

              <div className="flex gap-3 pt-2">
                <Button type="submit" className="flex-1 bg-indigo-600" disabled={mutation.isPending}>
                  {mutation.isPending ? <Loader2 className="animate-spin" /> : 'Save Device'}
                </Button>
                {editingId && (
                  <Button variant="outline" onClick={() => { setEditingId(null); form.reset({ 
                    merchant_id: service?.merchant_id?.toString() || '',
                    merchant_service_id: serviceId || ''
                  }); }}>
                    Cancel
                  </Button>
                )}
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>

      <Card className="xl:col-span-2 shadow-md border-slate-200">
        <CardHeader>
          <CardTitle>Registered Scanning Devices</CardTitle>
          <CardDescription>Devices authorized to scan tickets for this merchant</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-10"><Loader2 className="animate-spin text-indigo-600" /></div>
          ) : (
            <div className="rounded-xl border overflow-hidden">
              <Table>
                <TableHeader className="bg-slate-50">
                  <TableRow>
                    <TableHead>Device ID</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead>Subscription</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {devices?.map((device: any) => (
                    <TableRow key={device.id} className="hover:bg-slate-50/50 transition-colors">
                      <TableCell className="font-mono text-xs font-bold text-slate-900">{device.publisher_id}</TableCell>
                      <TableCell className="text-sm text-slate-600">{device.phone}</TableCell>
                      <TableCell className="text-xs text-indigo-600 font-medium">Sub #{device.merchant_subscription_id}</TableCell>
                      <TableCell>
                        <span className={`px-2 py-1 rounded-full text-[10px] font-bold ${device.status_sw ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-600'}`}>
                          {device.status_sw ? 'ACTIVE' : 'INACTIVE'}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="icon" className="text-indigo-600" onClick={() => { 
                          setEditingId(device.id); 
                          form.reset({
                            ...device,
                            merchant_id: device.merchant_id.toString(),
                            merchant_service_id: device.merchant_service_id.toString(),
                            merchant_subscription_id: device.merchant_subscription_id.toString(),
                            update_by: '1'
                          }); 
                        }}>
                          <Pencil className="h-4 w-4" />
                        </Button>
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

export default DeviceTab;