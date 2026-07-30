import { Request, Response } from "express";
import { supabase } from "../config/supabase.ts";
import { logControllerError } from "../services/loggerService";

export const getMerchants = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const { page, pageSize } = req.query;
    // Pagination is opt-in: callers that don't pass page/pageSize (e.g. the
    // merchant dropdown used when creating users/services) keep getting the
    // full unpaginated list exactly as before, since they rely on that.
    const paginate = page !== undefined || pageSize !== undefined;

    let query = supabase
      .schema("master")
      .from("merchant")
      .select(
        `
        id,
        contact_person_name,
        organization_name,
        email,
        phone_country_code,
        phone,
        pan_number,
        addressline1,
        addressline2,
        state,
        pincode,
        country,
        gstn_state,
        kyc_completed_sw,
        kyc_completed_date,
        aadhaar_number,
        agreement_signed_sw,
        agreement_signed_date,
        db_connection,
        update_by,
        update_date,
        status_sw,
        gstn,
        pan_docid,
        aadhaar_docid,
        gstn_docid,
        organization_sw,
        city,
        brand_name,
        contact_phone,
        contact_email,
        sin_number,
        sin_docid,
        tin_number,
        tin_docid,
        moa_docid,
        aoa_docid,
        trading_certificate_docid,
        director_information_docid,
        partnership_agreement_docid
      `,
        paginate ? { count: "exact" } : undefined,
      );

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
    await logControllerError(req, err, "MerchantController", "getMerchants");
    res.status(500).json({ error: "Internal Server Error" });
  }
};

export const setMerchants = async (
  req: Request,
  res: Response,
): Promise<void> => {
  const {
    contact_person_name,
    organization_name,
    email,
    phone_country_code,
    phone,
    pan_number,
    addressline1,
    addressline2,
    state,
    pincode,
    country,
    gstn_state,
    kyc_completed_sw,
    kyc_completed_date,
    aadhaar_number,
    agreement_signed_sw,
    agreement_signed_date,
    db_connection,
    update_date,
    status_sw,
    gstn,
    pan_docid,
    aadhaar_docid,
    gstn_docid,
    organization_sw,
    city,
    brand_name,
    contact_phone,
    contact_email,
    sin_number,
    sin_docid,
    tin_number,
    tin_docid,
    moa_docid,
    aoa_docid,
    trading_certificate_docid,
    director_information_docid,
    partnership_agreement_docid,
  } = req.body;
  const update_by = (req as any).user?.user_id;

  try {
    const { data, error } = await supabase
      .schema("master")
      .from("merchant")
      .insert([{
        contact_person_name,
        organization_name,
        email,
        phone_country_code,
        phone,
        pan_number,
        addressline1,
        addressline2,
        state,
        pincode,
        country,
        gstn_state,
        kyc_completed_sw,
        kyc_completed_date,
        aadhaar_number,
        agreement_signed_sw,
        agreement_signed_date,
        db_connection,
        update_by,
        update_date,
        status_sw,
        gstn,
        pan_docid,
        aadhaar_docid,
        gstn_docid,
        organization_sw,
        city,
        brand_name,
        contact_phone,
        contact_email,
        sin_number,
        sin_docid,
        tin_number,
        tin_docid,
        moa_docid,
        aoa_docid,
        trading_certificate_docid,
        director_information_docid,
        partnership_agreement_docid,
      }])
      .select();

    if (error) {
      res.status(400).json({ error: error.message });
      return;
    }

    res.status(201).json({
      success: true,
      data,
    });
  } catch (err) {
    await logControllerError(req, err, "MerchantController", "setMerchants");
    res.status(500).json({ error: "Internal Server Error" });
  }
};

export const updateMerchant = async (
  req: Request,
  res: Response,
): Promise<void> => {
  const { id } = req.params;
  const updateData = {
    ...req.body,
    update_by: (req as any).user?.user_id,
  };

  try {
    const { data, error } = await supabase
      .schema("master")
      .from("merchant")
      .update(updateData)
      .eq("id", id)
      .select();

    if (error) {
      res.status(400).json({ error: error.message });
      return;
    }

    res.status(200).json({
      success: true,
      data,
    });
  } catch (err) {
    await logControllerError(req, err, "MerchantController", "updateMerchant");
    res.status(500).json({ error: "Internal Server Error" });
  }
};
