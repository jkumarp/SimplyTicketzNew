import { Request, Response } from "express";
import { supabase } from "../config/supabase.ts";

export const getTicketDetails = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const { ticketId } = req.query;
    let query = supabase
      .schema("transaction")
      .from("ticket_detail")
      .select("*");

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

export const getTicketDetailByMerchantId = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const { merchantId, startDate, endDate, userId } = req.query;

    let queryTktDetail = supabase
      .schema("transaction")
      .from("ticket_detail")
      .select(`
        *,
        ticket!inner (
          id,
          merchant_id,
          merchant_service_id,
          ticket_category_id
        )
      `);

    if (merchantId) {
      queryTktDetail = queryTktDetail.eq("ticket.merchant_id", merchantId);
    }

    //---------------------------
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

      queryTktDetail = queryTktDetail.in(
        "ticket.merchant_service_id",
        serviceIds,
      );
    }
    //----------------------
    if (startDate) {
      queryTktDetail = queryTktDetail.gte("ticket.booking_date", startDate);
    }
    if (endDate) {
      queryTktDetail = queryTktDetail.lte("ticket.booking_date", endDate);
    }

    const { data, error } = await queryTktDetail;

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

export const createTicketDetail = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const {
      ticket_id,
      ticket_category_id,
      ticket_number,
      qr_code_string,
      scanned_sw,
      scanned_time,
      adult_count,
      child_count,
      update_by,
    } = req.body;

    const { data, error } = await supabase
      .schema("transaction")
      .from("ticket_detail")
      .insert([{
        ticket_id,
        ticket_category_id,
        ticket_number,
        qr_code_string,
        scanned_sw: scanned_sw || false,
        scanned_time,
        adult_count,
        child_count,
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

export const updateTicketDetail = async (
  req: Request,
  res: Response,
): Promise<void> => {
  const { id } = req.params;
  const updateData = { ...req.body };

  try {
    const { data, error } = await supabase
      .schema("transaction")
      .from("ticket_detail")
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
