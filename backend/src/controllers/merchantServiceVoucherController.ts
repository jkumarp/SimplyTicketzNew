import { Request, Response } from 'express';
import { supabase } from '../config/supabase.ts';

/**
 * Create a new merchant service voucher
 */
export const createMerchantServiceVoucher = async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      merchant_id,
      service_id,
      voucher_code,
      percentage,
      start_date,
      end_date,
      status_sw,
      updated_by
    } = req.body;

    const { data, error } = await supabase
      .schema('master')
      .from('merchant_service_voucher')
      .insert([{
        merchant_id,
        service_id,
        voucher_code,
        percentage,
        start_date,
        end_date,
        status_sw: status_sw ?? true,
        updated_by,
        updated_at: new Date().toISOString()
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
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

/**
 * Retrieve merchant service vouchers (with optional merchantId and serviceId filtering)
 */
export const getMerchantServiceVouchers = async (req: Request, res: Response): Promise<void> => {
  try {
    const { merchantId, serviceId } = req.query;
    let query = supabase.schema('master').from('merchant_service_voucher').select('*');
    
    if (merchantId) {
      query = query.eq('merchant_id', merchantId);
    }
    if (serviceId) {
      query = query.eq('service_id', serviceId);
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
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

export const validateMerchantServiceVouchers = async (req: Request, res: Response): Promise<void> => {
  try {
    const { merchantId, serviceId,voucherCode } = req.query;
    const dtValue = new Date().toISOString().split("T")[0];
    let query = supabase.schema('master').from('merchant_service_voucher').select('percentage');
    
    if (merchantId) {
      query = query.eq('merchant_id', merchantId);
    }
    if (serviceId) {
      query = query.eq('service_id', serviceId);
    }
    if (voucherCode) {
      query = query.eq('voucher_code', voucherCode);
    }
    query = query.gte("end_date", dtValue)
    query = query.lte("start_date", dtValue)
    
    const { data:voucherData, error:voucherError } = await query.maybeSingle();

    if (voucherError) {
      res.status(400).json({ error: voucherError.message });
      return;
    }

    if(!voucherData)
    {
      res.status(400).json({ error: "Voucher code not valid" });
      return;
    }
    res.status(200).json({
      success: true,
      data:voucherData?.percentage ?? 0,
    });
  } catch (err) {
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

/**
 * Update an existing merchant service voucher
 */
export const updateMerchantServiceVoucher = async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  const updateData = { ...req.body };

  try {
    const { data, error } = await supabase
      .schema('master')
      .from('merchant_service_voucher')
      .update({
        ...updateData,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
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
    res.status(500).json({ error: 'Internal Server Error' });
  }
};