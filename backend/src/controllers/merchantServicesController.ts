import { Request, Response } from "express";
import { supabase } from "../config/supabase.ts";
import {
    generateKeyPairSync
} from "../services/eciesService";
import { logControllerError } from "../services/loggerService";


export const createMerchantService = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const {
      merchant_id,
      name,
      logo_image_path,
      single_qr_sw,
      background_color,
      beneficiary_name,
      account_type,
      bank_account_number,
      bank_name,
      branch_name,
      bank_ifsc,
      start_time,
      end_time,
      mon_working_sw,
      tue_working_sw,
      wed_working_sw,
      thu_working_sw,
      fri_working_sw,
      sat_working_sw,
      sun_working_sw,
      addressline1,
      addressline2,
      state,
      pincode,
      country,
      location_coordinates,
      encrypted_url,
      status_sw,
      sgst,
      cgst,
      igst,
      start_date,
      end_date,
      recurring_sw,
      city,
      advance_booking_days,
    } = req.body;
    const update_by = (req as any).user?.user_id;

    const { data, error } = await supabase
      .schema("master")
      .from("merchant_service")
      .insert([{
        merchant_id,
        name,
        logo_image_path,
        single_qr_sw,
        background_color,
        beneficiary_name,
        account_type,
        bank_account_number,
        bank_name,
        branch_name,
        bank_ifsc,
        start_time,
        end_time,
        mon_working_sw,
        tue_working_sw,
        wed_working_sw,
        thu_working_sw,
        fri_working_sw,
        sat_working_sw,
        sun_working_sw,
        addressline1,
        addressline2,
        state,
        pincode,
        country,
        location_coordinates,
        encrypted_url,
        update_by,
        update_date: new Date().toISOString(),
        status_sw,
        sgst,
        cgst,
        igst,
        start_date,
        end_date,
        recurring_sw,
        city,
        advance_booking_days,
      }])
      .select();

    if (error) {
      res.status(400).json({ error: error.message });
      return;
    }

    res.status(201).json({
      success: true,
      data: data[0],
    });
  } catch (err) {
    await logControllerError(req, err, "MerchantServicesController", "createMerchantService");
    res.status(500).json({ error: "Internal Server Error" });
  }
};

const keyCache = new Map<number, {
  publicKey: string;
  privateKey: string;
}>();

export const updateEncryptionKey = async (
  req: Request,
  res: Response,
): Promise<void> => {
  const { id } = req.params;
  const { publicKey, privateKey } =  generateKeyPairSync();

  const { data, error } = await supabase
    .schema("master")
    .from("merchant_service")
    .update({
      public_key: publicKey,
      private_key: privateKey,
    })
    .eq("id", id)
    .select()
    .single();

  if (error) {
    res.status(500).json({ error: "Internal Server Error" });
  }

  res.status(200).json({
    success: true,
  });
}
export async function getEncryptionKeys(serviceId: number) {
  if (keyCache.has(serviceId)) {
    return keyCache.get(serviceId)!;
  }

  const { data, error } = await supabase
    .schema("master")
    .from("merchant_service")
    .select("public_key, private_key")
    .eq("id", serviceId)
    .single();

  if (error) throw error;

  keyCache.set(serviceId, {
    publicKey: data.public_key,
    privateKey: data.private_key,
  });

  return keyCache.get(serviceId)!;
}

export const updateMerchantService = async (
  req: Request,
  res: Response,
): Promise<void> => {
  const { id } = req.params;
  const updateData = { ...req.body };

  try {
    const { data, error } = await supabase
      .schema("master")
      .from("merchant_service")
      .update({
        ...updateData,
        update_by: (req as any).user?.user_id,
        update_date: new Date().toISOString(),
      })
      .eq("id", id)
      .select();

    if (error) {
      res.status(400).json({ error: error.message });
      return;
    }

    res.status(200).json({
      success: true,
      data: data[0],
    });
  } catch (err) {
    await logControllerError(req, err, "MerchantServicesController", "updateMerchantService");
    res.status(500).json({ error: "Internal Server Error" });
  }
};

export const getMerchantServices = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const { merchantId, page, pageSize } = req.query;
    const userId = (req as any).user?.user_id;
    const requesterRole = (req as any).user?.role;
    // Pagination is opt-in: callers that don't pass page/pageSize (e.g. the
    // dozens of pages that look up a service by id, or populate a service
    // dropdown) keep getting the full unpaginated list exactly as before.
    const paginate = page !== undefined || pageSize !== undefined;

    // Fetch user role from database
    const { data: dbUser } = await supabase
      .schema("master")
      .from("user")
      .select("user_type_id,merchant_id,id")
      .eq("id", userId)
      .single();

    // Role 7 (guest/customer) can reach this endpoint from the public
    // booking page, but `select('*')` includes bank_account_number,
    // bank_ifsc, beneficiary_name, bank_name, branch_name and encrypted_url -
    // none of which a customer booking a ticket should ever receive. Guests
    // get a column allowlist covering only what the booking UI displays.
    const isGuest = requesterRole === 7;
    const guestSafeColumns = [
      "id", "merchant_id", "name", "logo_image_path", "single_qr_sw",
      "background_color", "start_time", "end_time",
      "mon_working_sw", "tue_working_sw", "wed_working_sw", "thu_working_sw",
      "fri_working_sw", "sat_working_sw", "sun_working_sw",
      "addressline1", "addressline2", "state", "pincode", "country",
      "location_coordinates", "sgst", "cgst", "igst",
      "start_date", "end_date", "recurring_sw", "city",
      "advance_booking_days", "status_sw",
    ].join(",");

    let query = supabase
      .schema("master")
      .from("merchant_service")
      .select(isGuest ? guestSafeColumns : "*", paginate ? { count: "exact" } : undefined);
    if (merchantId) {
      query = query.eq("merchant_id", merchantId);
    }
    if ([5, 6].includes(dbUser?.user_type_id)) {
      let queryMerSerUser = supabase
        .schema("master")
        .from("merchant_service_users")
        .select("service_id");

      if (merchantId) {
        queryMerSerUser = queryMerSerUser.eq("merchant_id", merchantId);
      }

      if (userId) {
        queryMerSerUser = queryMerSerUser.eq("user_id", userId);
      }

      const { data: dataMerchantUser, error: errorMerchantUser } =
        await queryMerSerUser.maybeSingle();

      const serviceIds = Array.isArray(dataMerchantUser?.service_id)
        ? dataMerchantUser.service_id
        : [dataMerchantUser?.service_id];

      query = query.in("id", serviceIds);
    }

    let pageNum = 1;
    let pageSizeNum = 10;
    if (paginate) {
      pageNum = Math.max(parseInt(String(page ?? "1"), 10) || 1, 1);
      pageSizeNum = Math.min(
        Math.max(parseInt(String(pageSize ?? "10"), 10) || 10, 1),
        100,
      );
      const from = (pageNum - 1) * pageSizeNum;
      const to = from + pageSizeNum - 1;
      query = query.order("id", { ascending: false }).range(from, to);
    }

    const { data, error, count } = await query;

    if (error) {
      res.status(400).json({ error: error.message });
      return;
    }

    const responseBody: any = {
      success: true,
      data,
    };

    if (paginate) {
      const total = count ?? 0;
      responseBody.pagination = {
        page: pageNum,
        pageSize: pageSizeNum,
        total,
        totalPages: Math.max(Math.ceil(total / pageSizeNum), 1),
      };
    }

    res.status(200).json(responseBody);
  } catch (err) {
    await logControllerError(req, err, "MerchantServicesController", "getMerchantServices");
    res.status(500).json({ error: "Internal Server Error" });
  }
};

export const getMerchantServicesTaxes = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const { merchantId } = req.query;
    const { serviceId } = req.query;
    let query = supabase.schema("master").from("merchant_service").select(
      "sgst,cgst,igst,state",
    );

    if (merchantId) {
      query = query.eq("merchant_id", merchantId);
    }
    if (merchantId) {
      query = query.eq("id", serviceId);
    }

    const { data: serviceData, error: serviceError } = await query.single();

    const serviceState = serviceData?.state ?? 0;
    const serviceCgst = serviceData?.cgst ?? 0;
    const serviceSgst = serviceData?.sgst ?? 0;
    const serviceIgst = serviceData?.igst ?? 0;

    let taxesApplicable: any[] = [];

    if (serviceState == 1) { //Home State
      taxesApplicable.push({ cgst: serviceCgst, sgst: serviceSgst, igst: 0 });
    } else {
      taxesApplicable.push({ cgst: 0, sgst: 0, igst: serviceIgst });
    }

    if (serviceError) {
      res.status(400).json({ error: serviceError.message });
      return;
    }

    res.status(200).json({
      success: true,
      data: taxesApplicable,
    });
  } catch (err) {
    await logControllerError(req, err, "MerchantServicesController", "getMerchantServicesTaxes");
    res.status(500).json({ error: "Internal Server Error" });
  }
};
/**
 * getMerchantServiceBookingCal: Returns a list of valid booking dates for a service.
 * Considers working days, holidays, advance booking window, and service validity dates.
 */
export const getMerchantServiceBookingCal = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const { serviceId } = req.query;
    if (!serviceId) {
      res.status(400).json({ error: "Service ID is required" });
      return;
    }

    // 1. Fetch Service Details
    const { data: service, error: serviceError } = await supabase
      .schema("master")
      .from("merchant_service")
      .select("*")
      .eq("id", serviceId)
      .single();

    if (serviceError || !service) {
      res.status(404).json({ error: "Service not found" });
      return;
    }

    // 2. Fetch Holidays
    const { data: holidays } = await supabase
      .schema("master")
      .from("merchant_service_holiday")
      .select("holiday_date")
      .eq("merchant_service_id", serviceId)
      .eq("status_sw", true);

    const holidayDates = new Set(holidays?.map((h) => h.holiday_date));

    // 3. Calculate Date Range
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const advanceDays = service.advance_booking_days || 30; // Default to 30 if not set
    const maxDate = new Date(today);
    maxDate.setDate(today.getDate() + advanceDays);

    const validDates: string[] = [];
    const workingDays = [
      service.sun_working_sw,
      service.mon_working_sw,
      service.tue_working_sw,
      service.wed_working_sw,
      service.thu_working_sw,
      service.fri_working_sw,
      service.sat_working_sw,
    ];

    // 4. Iterate through dates and filter
    for (let d = new Date(today); d <= maxDate; d.setDate(d.getDate() + 1)) {
      const dateStr = d.toISOString().split("T")[0];

      // Check Service Validity (if not recurring)
      if (!service.recurring_sw) {
        if (service.start_date && dateStr < service.start_date) continue;
        if (service.end_date && dateStr > service.end_date) continue;
      }

      // Check Working Day
      if (!workingDays[d.getDay()]) continue;

      // Check Holiday
      if (holidayDates.has(dateStr)) continue;

      validDates.push(dateStr);
    }

    res.status(200).json({
      success: true,
      data: validDates,
    });
  } catch (err) {
    await logControllerError(req, err, "MerchantServicesController", "getMerchantServiceBookingCal");
    res.status(500).json({ error: "Internal Server Error" });
  }
};
