import { z } from "zod";

/**
 * Shared client-side validation schemas, mirroring the zod schemas enforced
 * on the corresponding backend routes. These run before a request is sent
 * so users get instant, inline feedback - the backend schemas remain the
 * actual security boundary and re-validate everything regardless.
 */

export const loginSchema = z.object({
  email: z.string().trim().min(1, "Email is required").email("Enter a valid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});
export type LoginFormValues = z.infer<typeof loginSchema>;

export const merchantEnquirySchema = z.object({
  merchant_name: z.string().trim().min(1, "Organization / name is required").max(200),
  merchant_email: z.string().trim().min(1, "Email is required").email("Enter a valid email address"),
  enquiry_details: z.string().trim().min(1, "Please tell us about your events").max(500, "Max 500 characters"),
});
export type MerchantEnquiryFormValues = z.infer<typeof merchantEnquirySchema>;

export const ticketBookingCategorySchema = z.object({
  ticket_category_id: z.number().int().positive(),
  adult_count: z.number().int().min(0),
  child_count: z.number().int().min(0),
  booking_date: z.string().min(1, "Booking date is required"),
  ticket_timeslot_id: z.number().int().positive().optional().nullable(),
}).refine((c) => c.adult_count + c.child_count > 0, {
  message: "Select at least one ticket",
});

export const bookTicketSchema = z.object({
  customer_phone: z.string().trim().min(6, "A valid phone number is required").max(15),
  customer_phone_code: z.string().max(5).optional(),
  merchant_id: z.number().int().positive(),
  merchant_service_id: z.number().int().positive(),
  email: z.string().trim().email("Enter a valid email address").optional().or(z.literal("")),
  customer_name: z.string().trim().min(1, "Customer name is required").max(200),
  payment_mode: z.string().min(1, "Select a payment mode"),
  categories: z.array(ticketBookingCategorySchema).min(1, "Add at least one ticket category"),
});
export type BookTicketFormValues = z.infer<typeof bookTicketSchema>;

export const ticketCategorySchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(200),
  total_ticket_count: z.number().int().min(0, "Must be 0 or more"),
  adult_price: z.number().min(0, "Must be 0 or more"),
  child_price: z.number().min(0).optional(),
  child_age_limit: z.number().int().min(0).max(120).optional().nullable(),
  free_age_limit: z.number().int().min(0).max(120).optional().nullable(),
  special_instruction: z.string().max(1000).optional().nullable(),
});

export const merchantDeviceSchema = z.object({
  phone: z.string().trim().min(6, "A valid phone number is required").max(15),
  publisher_id: z.string().max(255).optional(),
});

export const ticketTimeslotSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(200),
  start: z.string().min(1, "Start time is required"),
  end: z.string().min(1, "End time is required"),
  total_ticket_count: z.number().int().min(0, "Must be 0 or more"),
});

/**
 * Runs a zod schema and returns a flat { fieldName: message } map instead of
 * a ZodError, which is what most of these forms' hand-rolled error state
 * expects.
 */
export function collectZodErrors(error: z.ZodError): Record<string, string> {
  const errors: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.join(".") || "_form";
    if (!errors[key]) errors[key] = issue.message;
  }
  return errors;
}
