import { Request, Response } from 'express';
import { supabase } from '../config/supabase.ts';

export const createMerchantService = async (req: Request, res: Response): Promise<void> => {
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
      update_by,
      status_sw
    } = req.body;

    const { data, error } = await supabase
      .schema('master')
      .from('merchant_services')
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
        status_sw
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

export const updateMerchantService = async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  const updateData = { ...req.body };

  try {
    const { data, error } = await supabase
      .schema('master')
      .from('merchant_services')
      .update({
        ...updateData,
        update_date: new Date().toISOString()
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

export const getMerchantServices = async (req: Request, res: Response): Promise<void> => {
  try {
    const { merchantId } = req.query;
    let query = supabase.schema('master').from('merchant_services').select('*');
    
    if (merchantId) {
      query = query.eq('merchant_id', merchantId);
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