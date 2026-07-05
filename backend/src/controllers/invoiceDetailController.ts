import { Request, Response } from "express";
import { supabase } from "../config/supabase.ts";

export const getInvoiceDetails = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const { invoiceId, ticketId } = req.query;
    let query = supabase
      .schema("transaction")
      .from("invoice_detail")
      .select("*");

    if (invoiceId) {
      query = query.eq("invoice_id", invoiceId);
    }
    if (ticketId) {
      query = query.eq("ticket_id", ticketId);
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

export const getInvoiceDetailByMerchantId = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const { merchantId, startDate, endDate, userId } = req.query;

    let queryInvDetail = supabase
      .schema("transaction")
      .from("invoice_detail")
      .select(`
        *,
        invoice!inner (
          id,
          merchant_id,
          merchant_service_id,
          total_amount
        )
      `);

    if (merchantId) {
      queryInvDetail = queryInvDetail.eq("invoice.merchant_id", merchantId);
    }

    //----------------
    // Fetch user role from database
    const { data: dbUser } = await supabase
      .schema("master")
      .from("user")
      .select("user_type_id,merchant_id,id")
      .eq("id", userId)
      .single();

    let query = supabase.schema("master").from("merchant_service").select("*");
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

      queryInvDetail = queryInvDetail.in(
        "ticket.merchant_service_id",
        serviceIds,
      );
    }
    //---------------
    if (startDate) {
      queryInvDetail = queryInvDetail.gte(
        "invoice.transaction_date",
        startDate,
      );
    }
    if (endDate) {
      queryInvDetail = queryInvDetail.lte("invoice.transaction_date", endDate);
    }

    const { data, error } = await queryInvDetail;

    if (error) {
      res.status(400).json({ error: error.message });
      return;
    }

    res.status(200).json({
      success: true,
      count: data.length,
      data,
    });
  } catch (err) {
    res.status(500).json({ error: "Internal Server Error" });
  }
};

export const createInvoiceDetail = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const {
      invoice_id,
      ticket_id,
      ticket_category_id,
      adult_price,
      child_price,
      adult_count,
      child_count,
      total_amount,
      update_by,
    } = req.body;

    const { data, error } = await supabase
      .schema("transaction")
      .from("invoice_detail")
      .insert([{
        invoice_id,
        ticket_id,
        ticket_category_id,
        adult_price,
        child_price,
        adult_count,
        child_count,
        total_amount,
        update_by,
        update_date: new Date().toISOString(),
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
