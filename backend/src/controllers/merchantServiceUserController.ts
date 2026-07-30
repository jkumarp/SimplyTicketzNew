import { Request, Response } from "express";
import { supabase } from "../config/supabase.ts";
import { logControllerError } from "../services/loggerService";

/**
 * Retrieve merchant service users with optional filtering by merchant, service, or user ID
 */
export const getMerchantServiceUsers = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const { merchantId, serviceId, userId, page, pageSize } = req.query;

    const pageNum = Math.max(parseInt(String(page ?? "1"), 10) || 1, 1);
    const pageSizeNum = Math.min(
      Math.max(parseInt(String(pageSize ?? "10"), 10) || 10, 1),
      100,
    );
    const from = (pageNum - 1) * pageSizeNum;
    const to = from + pageSizeNum - 1;

    let query = supabase
      .schema("master")
      .from("merchant_service_users")
      .select("*", { count: "exact" });

    if (merchantId) {
      query = query.eq("merchant_id", merchantId);
    }
    if (serviceId) {
      query = query.eq("service_id", serviceId);
    }
    if (userId) {
      query = query.eq("user_id", userId);
    }

    const { data, error, count } = await query
      .order("id", { ascending: false })
      .range(from, to);

    if (error) {
      res.status(400).json({ error: error.message });
      return;
    }

    const total = count ?? 0;

    res.status(200).json({
      success: true,
      data,
      pagination: {
        page: pageNum,
        pageSize: pageSizeNum,
        total,
        totalPages: Math.max(Math.ceil(total / pageSizeNum), 1),
      },
    });
  } catch (err) {
    await logControllerError(req, err, "MerchantServiceUserController", "getMerchantServiceUsers");
    res.status(500).json({ error: "Internal Server Error" });
  }
};

/**
 * Associate a user with a merchant service
 */
export const createMerchantServiceUser = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const { merchant_id, service_id, user_id, status_sw } = req.body;
    const updated_by = (req as any).user?.user_id;

    let query = supabase
      .schema("master")
      .from("merchant_service_users")
      .select("*");

    if (merchant_id) {
      query = query.eq("merchant_id", merchant_id);
    }
    if (service_id) {
      query = query.eq("service_id", service_id);
    }
    if (user_id) {
      query = query.eq("user_id", user_id);
    }

    const { data: dataMerchantUser, error: errorMerchantUser } = await query;

    if (errorMerchantUser) {
      res.status(400).json({ error: errorMerchantUser.message });
      return;
    }
    if(dataMerchantUser.length >0)
    {
      res.status(400).json({ error: "User already mapped with the Service" });
      return;
    }
    const { data, error } = await supabase
      .schema("master")
      .from("merchant_service_users")
      .insert([{
        merchant_id,
        service_id,
        user_id,
        status_sw: status_sw ?? true,
        updated_by,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
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
    await logControllerError(req, err, "MerchantServiceUserController", "createMerchantServiceUser");
    res.status(500).json({ error: "Internal Server Error" });
  }
};

/**
 * Update an existing merchant service user association
 */
export const updateMerchantServiceUser = async (
  req: Request,
  res: Response,
): Promise<void> => {
  const { id } = req.params;
  const updateData = { ...req.body };

  try {
    const { data, error } = await supabase
      .schema("master")
      .from("merchant_service_users")
      .update({
        ...updateData,
        updated_by: (req as any).user?.user_id,
        updated_at: new Date().toISOString(),
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
    await logControllerError(req, err, "MerchantServiceUserController", "updateMerchantServiceUser");
    res.status(500).json({ error: "Internal Server Error" });
  }
};

/**
 * Delete a merchant service user association
 */
export const deleteMerchantServiceUser = async (
  req: Request,
  res: Response,
): Promise<void> => {
  const { id } = req.params;

  try {
    const { error } = await supabase
      .schema("master")
      .from("merchant_service_users")
      .delete()
      .eq("id", id);

    if (error) {
      res.status(400).json({ error: error.message });
      return;
    }

    res.status(200).json({
      success: true,
      message: "Merchant service user mapping deleted successfully",
    });
  } catch (err) {
    await logControllerError(req, err, "MerchantServiceUserController", "deleteMerchantServiceUser");
    res.status(500).json({ error: "Internal Server Error" });
  }
};
