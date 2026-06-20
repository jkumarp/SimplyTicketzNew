"use client";

import React, { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  Image as ImageIcon,
  Loader2,
  Plus,
  Trash2,
  Upload,
  X,
  Pencil,
  Eye,
} from "lucide-react";
import { API_URL } from "@/config";

const pictureSchema = z.object({
  category_id: z.string().min(1, "Category is required"),
  status_sw: z.boolean().default(true),
});

type PictureFormValues = z.infer<typeof pictureSchema>;

const MerchantServicePicture = () => {
  const { serviceId } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

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

  // Fetch categories for this service
  const { data: categories } = useQuery({
    queryKey: ["ticket-categories", serviceId],
    queryFn: async () => {
      const res = await fetch(
        `${API_URL}/ticket-categories?merchantServiceId=${serviceId}`,
        { headers: getAuthHeader() },
      );
      return (await res.json()).data;
    },
    enabled: !!serviceId,
  });

  // Fetch existing pictures
  const { data: pictures, isLoading: isLoadingPictures } = useQuery({
    queryKey: ["merchant-service-pictures", serviceId],
    queryFn: async () => {
      const res = await fetch(
        `${API_URL}/merchant-service-pictures?serviceId=${serviceId}`,
        { headers: getAuthHeader() },
      );
      if (!res.ok) throw new Error("Failed to fetch pictures");
      return (await res.json()).data;
    },
    enabled: !!serviceId,
  });

  const form = useForm<PictureFormValues>({
    resolver: zodResolver(pictureSchema),
    defaultValues: {
      category_id: "",
      status_sw: true,
    },
  });

  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch(`${API_URL}/merchant-service-pictures/upload`, {
        method: "POST",
        headers: getAuthHeader(),
        body: formData,
      });
      if (!res.ok) throw new Error("Upload failed");
      return res.json();
    },
  });

  const mutation = useMutation({
    mutationFn: async (data: PictureFormValues) => {
      let picture_id = "";

      if (selectedFile) {
        const uploadRes = await uploadMutation.mutateAsync(selectedFile);
        picture_id = uploadRes.data.path;
      } else if (editingId) {
        // Keep existing picture_id if editing and no new file selected
        const existing = pictures.find((p: any) => p.id.toString() === editingId);
        picture_id = existing.picture_id;
      } else {
        throw new Error("Please select a picture to upload");
      }

      const payload = {
        ...data,
        merchant_id: service.merchant_id,
        service_id: parseInt(serviceId!),
        category_id: parseInt(data.category_id),
        picture_id,
      };

      const url = editingId
        ? `${API_URL}/merchant-service-pictures/${editingId}`
        : `${API_URL}/merchant-service-pictures`;

      const method = editingId ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          ...getAuthHeader(),
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error("Operation failed");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["merchant-service-pictures", serviceId],
      });
      showSuccess(editingId ? "Picture updated!" : "Picture added!");
      setEditingId(null);
      setSelectedFile(null);
      form.reset();
    },
    onError: (error: any) => showError(error.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`${API_URL}/merchant-service-pictures/${id}`, {
        method: "DELETE",
        headers: getAuthHeader(),
      });
      if (!res.ok) throw new Error("Failed to delete picture");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["merchant-service-pictures", serviceId],
      });
      showSuccess("Picture deleted successfully");
    },
    onError: (error: any) => showError(error.message),
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
    }
  };

  const handleEdit = (pic: any) => {
    setEditingId(pic.id.toString());
    form.reset({
      category_id: pic.category_id.toString(),
      status_sw: !!pic.status_sw,
    });
    setSelectedFile(null);
  };

  const viewImage = async (path: string) => {
    try {
      const res = await fetch(`${API_URL}/merchant-service-pictures/url?path=${path}`, {
        headers: getAuthHeader()
      });
      const json = await res.json();
      window.open(json.data, '_blank');
    } catch (err) {
      showError("Failed to load image");
    }
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
                  Service Pictures
                </h1>
                <p className="text-slate-500">
                  Manage gallery for {service?.name}
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <Card className="lg:col-span-1 shadow-md border-indigo-100 h-fit">
              <CardHeader className="bg-indigo-50/30 border-b">
                <CardTitle className="flex items-center gap-2 text-indigo-700">
                  {editingId ? <Pencil className="h-5 w-5" /> : <Plus className="h-5 w-5" />}
                  {editingId ? "Edit Picture Info" : "Upload New Picture"}
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-6">
                <Form {...form}>
                  <form
                    onSubmit={form.handleSubmit((data) => mutation.mutate(data))}
                    className="space-y-6"
                  >
                    <FormField
                      control={form.control}
                      name="category_id"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Category *</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select Category" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {categories?.map((cat: any) => (
                                <SelectItem key={cat.id} value={cat.id.toString()}>
                                  {cat.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="space-y-2">
                      <Label>Image File {editingId ? "(Optional)" : "*"}</Label>
                      <div className="flex items-center gap-4">
                        <Input
                          type="file"
                          accept="image/jpeg,image/png"
                          onChange={handleFileChange}
                          className="cursor-pointer"
                        />
                      </div>
                      <p className="text-[10px] text-slate-400">
                        Supported formats: JPEG, PNG. Max size: 5MB.
                      </p>
                    </div>

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
                            Active in Gallery
                          </FormLabel>
                        </FormItem>
                      )}
                    />

                    <div className="flex gap-3 pt-2">
                      <Button
                        type="submit"
                        className="flex-1 bg-indigo-600 hover:bg-indigo-700"
                        disabled={mutation.isPending || uploadMutation.isPending}
                      >
                        {mutation.isPending || uploadMutation.isPending ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          editingId ? "Update" : "Upload & Save"
                        )}
                      </Button>
                      {editingId && (
                        <Button
                          variant="outline"
                          onClick={() => {
                            setEditingId(null);
                            setSelectedFile(null);
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
                <CardTitle>Gallery</CardTitle>
                <CardDescription>
                  Pictures associated with this service and its categories
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isLoadingPictures ? (
                  <div className="flex justify-center py-10">
                    <Loader2 className="h-10 w-10 animate-spin text-indigo-600" />
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    {pictures?.length === 0 ? (
                      <div className="col-span-full text-center py-12 text-slate-400 italic">
                        No pictures uploaded yet
                      </div>
                    ) : (
                      pictures?.map((pic: any) => {
                        const category = categories?.find(
                          (c: any) => c.id === pic.category_id
                        );
                        return (
                          <div
                            key={pic.id}
                            className="group relative rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-sm hover:shadow-md transition-all"
                          >
                            <div className="aspect-video bg-slate-100 flex items-center justify-center relative">
                              <ImageIcon className="h-10 w-10 text-slate-300" />
                              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
                                <Button 
                                  size="icon" 
                                  variant="secondary" 
                                  className="rounded-full"
                                  onClick={() => viewImage(pic.picture_id)}
                                >
                                  <Eye className="h-4 w-4" />
                                </Button>
                                <Button 
                                  size="icon" 
                                  variant="secondary" 
                                  className="rounded-full"
                                  onClick={() => handleEdit(pic)}
                                >
                                  <Pencil className="h-4 w-4" />
                                </Button>
                                <Button 
                                  size="icon" 
                                  variant="destructive" 
                                  className="rounded-full"
                                  onClick={() => {
                                    if (confirm("Delete this picture?")) {
                                      deleteMutation.mutate(pic.id);
                                    }
                                  }}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                            <div className="p-4">
                              <div className="flex justify-between items-start">
                                <div>
                                  <p className="font-bold text-slate-900">
                                    {category?.name || "Unknown Category"}
                                  </p>
                                  <p className="text-[10px] text-slate-400 font-mono truncate max-w-[150px]">
                                    {pic.picture_id}
                                  </p>
                                </div>
                                <span
                                  className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                    pic.status_sw
                                      ? "bg-green-100 text-green-700"
                                      : "bg-slate-100 text-slate-600"
                                  }`}
                                >
                                  {pic.status_sw ? "ACTIVE" : "INACTIVE"}
                                </span>
                              </div>
                            </div>
                          </div>
                        );
                      })
                    )}
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

export default MerchantServicePicture;