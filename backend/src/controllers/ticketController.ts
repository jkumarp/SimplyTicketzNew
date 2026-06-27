import { Request, Response } from "express";
import { supabase } from "../config/supabase.ts";

export const getTickets = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const { merchantId, customerPhone } = req.query;
    let query = supabase
      .schema("transaction")
      .from("ticket")
      .select("*");

    if (merchantId) {
      query = query.eq("merchant_id", merchantId);
    }
    if (customerPhone) {
      query = query.eq("customer_phone", customerPhone);
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
    res.status(500).json({ error: "Internal Server Error" });
  }
};

export const createTicket = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const {
      customer_phone,
      customer_phone_code,
      merchant_id,
      merchant_service_id,
      ticket_category_id,
      ticket_timeslot_id,
      booking_date,
      email,
      dob,
      gstin,
      address,
      customer_name,
      payment_mode,
      transaction_date,
      transaction_reference,
      bank_reference,
      update_by,
      status,
    } = req.body;

    const { data, error } = await supabase
      .schema("transaction")
      .from("ticket")
      .insert([{
        customer_phone,
        customer_phone_code,
        merchant_id,
        merchant_service_id,
        ticket_category_id,
        ticket_timeslot_id,
        booking_date: booking_date || new Date().toISOString(),
        email,
        dob,
        gstin,
        address,
        customer_name,
        payment_mode,
        transaction_date,
        transaction_reference,
        bank_reference,
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
    update_by,
  } = req.body;

  try {
    const dtValue = new Date().toISOString().split("T")[0];

    // 0. Check if the service uses a single QR or individual QRs
    const { data: serviceData, error: serviceError } = await supabase
      .schema("master")
      .from("merchant_service")
      .select("single_qr_sw,sgst,cgst,igst")
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
      .eq("merchant_id",merchant_id)
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

    //Insert Invoice data
    const { data: dataInv, error: invoiceError } = await supabase
      .schema("transaction")
      .from("invoice")
      .insert([{
        invoice_number: `INV-${merchant_id}-${merchant_service_id}-${dtValue}`,
        merchant_id,
        merchant_service_id,
        total_amount: 0,
        convinience_fee: convinienceFee,
        sgst: serviceData?.sgst ?? null,
        cgst: serviceData?.cgst ?? null,
        igst: serviceData?.igst ?? null,
        discount_value: 0,
        grand_total: 0,
        update_by,
        update_date: new Date().toISOString(),
        discount_percentage: 0,
      }])
      .select();

    if (invoiceError) {
      res.status(400).json({ error: invoiceError.message });
      return;
    }
    const isSingleQr = serviceData?.single_qr_sw ?? true;
    const createdTickets = [];

    // Process each category as a separate ticket header
    for (const cat of categories) {
      //Get Category Data
      const { data: categoryData, error: categoryError } = await supabase
        .schema("master").from("ticket_category")
        .select("adult_price,child_price")
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
      // 1. Create the Ticket Header for this category
      const { data: ticketData, error: ticketError } = await supabase
        .schema("transaction")
        .from("ticket")
        .insert([{
          customer_phone,
          customer_phone_code,
          merchant_id,
          merchant_service_id,
          ticket_category_id: cat.ticket_category_id,
          ticket_timeslot_id: cat.ticket_timeslot_id,
          booking_date: cat.booking_date || new Date().toISOString(),
          email,
          customer_name,
          payment_mode,
          update_by,
          update_date: new Date().toISOString(),
          status: "CONFIRMED",
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

        if (detailsError) throw detailsError;
        createdTickets.push({ ticket: ticketData[0], details: detailsData });

        //Insert Invoice Details
        const { data: dataInvDtl, error: errorInvoiceDtl } = await supabase
          .schema("transaction")
          .from("invoice_detail")
          .insert([{
            invoice_id: dataInv[0]?.id,
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
      }
    }

    res.status(201).json({
      success: true,
      message: "Tickets booked successfully",
      data: createdTickets,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Internal Server Error" });
  }
};
