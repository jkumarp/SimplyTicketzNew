import { Request, Response } from "express";
import { supabase } from "../config/supabase.ts";
import { logControllerError } from "../services/loggerService";

export const getTickets = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const { merchantId, customerPhone, serviceId, search, page, pageSize } =
      req.query;

    // Applies the same set of filters to any base query, used both for the
    // paginated data fetch and the (unpaginated) stat count fetches below.
    const applyFilters = (q: any) => {
      if (merchantId) q = q.eq("merchant_id", merchantId);
      if (serviceId) q = q.eq("merchant_service_id", serviceId);
      if (customerPhone) q = q.eq("customer_phone", customerPhone);
      if (search) {
        // `search` gets interpolated directly into a raw PostgREST filter
        // string below (.or() takes a filter expression, not a bound
        // parameter), so it must be stripped of characters that have
        // special meaning in that syntax (`,` separates conditions, `()`
        // group them, `.` separates column/operator/value) before use -
        // otherwise a crafted search term could inject extra filter
        // clauses. Only safe "name/phone-ish" characters are kept.
        const term = String(search).trim().replace(/[^a-zA-Z0-9 +\-]/g, "").slice(0, 100);
        if (term) {
          const orParts = [
            `customer_name.ilike.%${term}%`,
            `customer_phone.ilike.%${term}%`,
          ];
          if (/^\d+$/.test(term)) {
            orParts.push(`id.eq.${term}`);
          }
          q = q.or(orParts.join(","));
        }
      }
      return q;
    };

    const pageNum = Math.max(parseInt(String(page ?? "1"), 10) || 1, 1);
    const pageSizeNum = Math.min(
      Math.max(parseInt(String(pageSize ?? "10"), 10) || 10, 1),
      100,
    );
    const from = (pageNum - 1) * pageSizeNum;
    const to = from + pageSizeNum - 1;

    const dataQuery = applyFilters(
      supabase.schema("transaction").from("ticket").select("*", {
        count: "exact",
      }),
    )
      .order("id", { ascending: false })
      .range(from, to);

    const { data, error, count } = await dataQuery;

    if (error) {
      res.status(400).json({ error: error.message });
      return;
    }

    const total = count ?? 0;

    const { count: confirmedCount, error: confirmedError } = await applyFilters(
      supabase
        .schema("transaction")
        .from("ticket")
        .select("*", { count: "exact", head: true }),
    ).eq("status", "CONFIRMED");

    if (confirmedError) {
      res.status(400).json({ error: confirmedError.message });
      return;
    }

    const confirmed = confirmedCount ?? 0;

    res.status(200).json({
      success: true,
      data,
      pagination: {
        page: pageNum,
        pageSize: pageSizeNum,
        total,
        totalPages: Math.max(Math.ceil(total / pageSizeNum), 1),
      },
      stats: {
        total,
        confirmed,
        pending: total - confirmed,
      },
    });
  } catch (err) {
    await logControllerError(req, err, "TicketController", "getTickets");
    res.status(500).json({ error: "Internal Server Error" });
  }
};

export const getTicketsByInvoiceId = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const { invoiceId } = req.query;
    let query = supabase
      .schema("transaction")
      .from("ticket")
      .select("*");

    if (invoiceId) {
      query = query.eq("invoice_id", invoiceId);
    }

    const { data, error } = await query;

    if (error) {
      res.status(400).json({ error: error.message });
      return;
    }

    res.status(200).json({
      success: true,
      data,
    });
  } catch (err) {
    await logControllerError(req, err, "TicketController", "getTicketsByInvoiceId");
    res.status(500).json({ error: "Internal Server Error" });
  }
};

export const createTicket = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const {
      merchant_id,
      merchant_service_id,
      ticket_category_id,
      ticket_timeslot_id,
      booking_date,
      status,
    } = req.body;
    const update_by = (req as any).user?.user_id;

    const { data, error } = await supabase
      .schema("transaction")
      .from("ticket")
      .insert([{
        merchant_id,
        merchant_service_id,
        ticket_category_id,
        ticket_timeslot_id,
        booking_date: booking_date || new Date().toISOString(),
        update_by,
        update_date: new Date().toISOString(),
        status: status || "PENDING",
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
    await logControllerError(req, err, "TicketController", "createTicket");
    res.status(500).json({ error: "Internal Server Error" });
  }
};

export const updateTicket = async (
  req: Request,
  res: Response,
): Promise<void> => {
  const { id } = req.params;
  const updateData = { ...req.body };

  try {
    const { data, error } = await supabase
      .schema("transaction")
      .from("ticket")
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
    await logControllerError(req, err, "TicketController", "updateTicket");
    res.status(500).json({ error: "Internal Server Error" });
  }
};

/**
 * bookTicket: Creates tickets and their associated details.
 * Now supports separate booking_date and ticket_timeslot_id for each category.
 */
export const bookTicket = async (
  req: Request,
  res: Response,
): Promise<void> => {
  const {
    customer_phone,
    customer_phone_code,
    merchant_id,
    merchant_service_id,
    email,
    customer_name,
    payment_mode,
    categories, // Array of { ticket_category_id, adult_count, child_count, booking_date, ticket_timeslot_id }
    voucher_code,
    grand_total,
    discount_value,
    total_amount,
    // When true (the self-service customer flow - see
    // CustomerTicketBooking.tsx), tickets are created PENDING and only
    // flipped to CONFIRMED once paymentController confirms the gateway
    // payment succeeded. Staff-assisted bookings (MerchantTicketBooking.tsx)
    // omit this - payment is already collected in person, so tickets stay
    // CONFIRMED immediately, exactly as before.
    require_payment_confirmation,
  } = req.body;
  const update_by = (req as any).user?.user_id;
  const initialTicketStatus = require_payment_confirmation ? "PENDING" : "CONFIRMED";

  try {
    const dtValue = new Date().toISOString().split("T")[0];

    // 0. Check if the service uses a single QR or individual QRs
    const { data: serviceData, error: serviceError } = await supabase
      .schema("master")
      .from("merchant_service")
      .select("single_qr_sw,sgst,cgst,igst,name,addressline1,addressline2")
      .eq("id", merchant_service_id)
      .single();

    if (serviceError) {
      res.status(400).json({
        error: `Service check failed: ${serviceError.message}`,
      });
      return;
    }

    //Get Subscription Data
    const { data: subscriptionData, error: subscriptionError } = await supabase
      .schema("master")
      .from("merchant_subscription")
      .select("convinience_fee")
      .eq("merchant_service_id", merchant_service_id)
      .eq("merchant_id", merchant_id)
      .eq("status_sw", true)
      .gte("end_date", dtValue)
      .lte("start_date", dtValue)
      .maybeSingle();

    if (subscriptionError) {
      res.status(400).json({
        error: `Subscription check failed: ${subscriptionError.message}`,
      });
      return;
    }
    if (!subscriptionData) {
      res.status(400).json({
        error: `Subscription validation failed: No Active Subscription Found!!`,
      });
      return;
    }
    const convinienceFee = subscriptionData?.convinience_fee ?? 0;
    let discountPercentage = 0;
    let voucherId = null;
    //Validate Voucher code
    if (voucher_code) {
      let query = supabase.schema("master").from("merchant_service_voucher")
        .select("id,percentage");

      if (merchant_id) {
        query = query.eq("merchant_id", merchant_id);
      }
      if (merchant_service_id) {
        query = query.eq("service_id", merchant_service_id);
      }
      if (voucher_code) {
        query = query.eq("voucher_code", voucher_code);
      }
      query = query.gte("end_date", dtValue);
      query = query.lte("start_date", dtValue);

      const { data: voucherData, error: voucherError } = await query
        .maybeSingle();

      if (voucherError) {
        res.status(400).json({ error: voucherError.message });
        return;
      }

      if (!voucherData) {
        res.status(400).json({ error: "Voucher code not valid" });
        return;
      }
      discountPercentage = voucherData?.percentage ?? 0;
      voucherId = voucherData?.id ?? null
    }
    //Insert Invoice data
    const { data: invoiceData, error: invoiceError } = await supabase
      .schema("transaction")
      .from("invoice")
      .insert([{
        invoice_number: `INV-${merchant_id}-${merchant_service_id}-${dtValue}`,
        merchant_id,
        merchant_service_id,
        customer_phone,
        customer_phone_code,
        email,
        customer_name,
        payment_mode,
        transaction_date: new Date().toISOString(),
        total_amount: total_amount ?? 0,
        convinience_fee: convinienceFee,
        sgst: serviceData?.sgst ?? null,
        cgst: serviceData?.cgst ?? null,
        igst: serviceData?.igst ?? null,
        discount_value: discount_value ?? 0,
        grand_total: grand_total ?? 0,
        update_by,
        update_date: new Date().toISOString(),
        discount_percentage: discountPercentage ?? null,
        voucher_id: voucherId ?? null
      }])
      .select();

    if (invoiceError) {
      res.status(400).json({ error: invoiceError.message });
      return;
    }
    const invoiceId = invoiceData[0].id;
    const isSingleQr = serviceData?.single_qr_sw ?? true;

    // Snapshot of the confirmed invoice/tickets, keyed by category, saved
    // once booking succeeds to transaction.ticket_invoice_json - lets
    // paymentController.ts hand the same data straight to the booking
    // confirmation email/WhatsApp senders without re-querying every table
    // this loop already touched.
    const ticketJsonEntries: any[] = [];

    // Process each category as a separate ticket header
    for (const cat of categories) {
      //Get Category Data
      const { data: categoryData, error: categoryError } = await supabase
        .schema("master").from("ticket_category")
        .select("name,adult_price,child_price")
        .eq("merchant_service_id", merchant_service_id)
        .eq("id", cat.ticket_category_id)
        .maybeSingle();

      if (categoryError) {
        res.status(400).json({
          error: `Category check failed: ${categoryError.message}`,
        });
      }
      if (!categoryData) {
        res.status(400).json({
          error: `Category check failed: Category-${cat.id} Data Found!!`,
        });
        return;
      }

      let timeslotInfo: { name: string; start: string; end: string } | null = null;
      if (cat.ticket_timeslot_id) {
        const { data: timeslotData } = await supabase
          .schema("master")
          .from("ticket_timeslot")
          .select("name,start,end")
          .eq("id", cat.ticket_timeslot_id)
          .maybeSingle();
        timeslotInfo = timeslotData ?? null;
      }
      // 1. Create the Ticket Header for this category
      const { data: ticketData, error: ticketError } = await supabase
        .schema("transaction")
        .from("ticket")
        .insert([{
          merchant_id,
          merchant_service_id,
          ticket_category_id: cat.ticket_category_id,
          ticket_timeslot_id: cat.ticket_timeslot_id,
          invoice_id: invoiceId,
          booking_date: cat.booking_date || new Date().toISOString(),
          update_by,
          update_date: new Date().toISOString(),
          status: initialTicketStatus,
        }])
        .select();

      if (ticketError) throw ticketError;

      const ticketId = ticketData[0].id;

      let detailsToInsert: any[] = [];

      if (isSingleQr) {
        // One record for this category
        detailsToInsert.push({
          ticket_id: ticketId,
          ticket_category_id: cat.ticket_category_id,
          ticket_number: `TKT-${ticketId}-${cat.ticket_category_id}-${dtValue}`,
          qr_code_string: JSON.stringify({
            msid: merchant_service_id,
            tid: ticketId,
            tnbr: `TKT-${ticketId}-${cat.ticket_category_id}-${dtValue}`,
            ac: cat.adult_count || 0,
            cc: cat.child_count || 0,
            dov: cat.booking_date.split("T")[0],
            tsid: cat.ticket_timeslot_id,
          }),
          scanned_sw: false,
          adult_count: cat.adult_count || 0,
          child_count: cat.child_count || 0,
          update_by,
          update_date: new Date().toISOString(),
        });
      } else {
        // Individual records for each person
        for (let i = 0; i < (cat.adult_count || 0); i++) {
          detailsToInsert.push({
            ticket_id: ticketId,
            ticket_category_id: cat.ticket_category_id,
            ticket_number:
              `TKT-${ticketId}-A-${i}-${cat.ticket_category_id}-${dtValue}`,
            qr_code_string: JSON.stringify({
              msid: merchant_service_id,
              tid: ticketId,
              tnbr:
                `TKT-${ticketId}-A-${i}-${cat.ticket_category_id}-${dtValue}`,
              ac: 1,
              cc: 0,
              dov: cat.booking_date.split("T")[0],
              tsid: cat.ticket_timeslot_id,
            }),
            scanned_sw: false,
            adult_count: 1,
            child_count: 0,
            update_by,
            update_date: new Date().toISOString(),
          });
        }
        for (let i = 0; i < (cat.child_count || 0); i++) {
          detailsToInsert.push({
            ticket_id: ticketId,
            ticket_category_id: cat.ticket_category_id,
            ticket_number:
              `TKT-${ticketId}-C-${i}-${cat.ticket_category_id}-${dtValue}`,
            qr_code_string: JSON.stringify({
              msid: merchant_service_id,
              tid: ticketId,
              tnbr:
                `TKT-${ticketId}-C-${i}-${cat.ticket_category_id}-${dtValue}`,
              ac: 0,
              cc: 1,
              dov: cat.booking_date.split("T")[0],
              tsid: cat.ticket_timeslot_id,
            }),
            scanned_sw: false,
            adult_count: 0,
            child_count: 1,
            update_by,
            update_date: new Date().toISOString(),
          });
        }
      }

      // 3. Insert Ticket Details
      if (detailsToInsert.length > 0) {
        const { data: detailsData, error: detailsError } = await supabase
          .schema("transaction")
          .from("ticket_detail")
          .insert(detailsToInsert)
          .select();

        //Insert Invoice Details
        const { data: dataInvDtl, error: errorInvoiceDtl } = await supabase
          .schema("transaction")
          .from("invoice_detail")
          .insert([{
            invoice_id: invoiceId,
            ticket_id: ticketId,
            ticket_category_id: cat.ticket_category_id,
            adult_price: categoryData?.adult_price ?? 0,
            child_price: categoryData?.child_price ?? 0,
            adult_count: cat.adult_count,
            child_count: cat.child_count,
            total_amount: (categoryData?.adult_price ?? 0) * cat.adult_count +
              (categoryData?.child_price ?? 0) * cat.child_count,
            update_by,
            update_date: new Date().toISOString(),
          }])
          .select();

        if (errorInvoiceDtl) {
          res.status(400).json({ error: errorInvoiceDtl.message });
          return;
        }

        ticketJsonEntries.push({
          ticket_id: ticketId,
          ticket_category_id: cat.ticket_category_id,
          category_name: categoryData?.name ?? null,
          ticket_timeslot_id: cat.ticket_timeslot_id ?? null,
          timeslot: timeslotInfo,
          booking_date: cat.booking_date,
          details: (detailsData || []).map((d: any) => ({
            id: d.id,
            ticket_number: d.ticket_number,
            qr_code_string: d.qr_code_string,
            adult_count: d.adult_count,
            child_count: d.child_count,
          })),
        });
      }
    }

    // Save the invoice/ticket snapshot for the confirmation email/WhatsApp
    // senders (see paymentController.ts). Non-fatal - the booking itself
    // already succeeded, so a snapshot failure is only logged.
    const { error: snapshotError } = await supabase
      .schema("transaction")
      .from("ticket_invoice_json")
      .insert([{
        invoice_id: invoiceId,
        invoice_json: {
          ...invoiceData[0],
          service: {
            name: serviceData?.name ?? null,
            addressline1: serviceData?.addressline1 ?? null,
            addressline2: serviceData?.addressline2 ?? null,
          },
        },
        ticket_json: ticketJsonEntries,
        updated_by: update_by,
      }]);

    if (snapshotError) {
      await logControllerError(
        req,
        new Error(snapshotError.message),
        "TicketController",
        "bookTicket:ticket_invoice_json",
      );
    }

    res.status(201).json({
      success: true,
      message: "Tickets booked successfully",
      invoiceId: invoiceId,
    });
  } catch (err: any) {
    await logControllerError(req, err, "TicketController", "bookTicket");
    res.status(500).json({ error: err.message || "Internal Server Error" });
  }
};
