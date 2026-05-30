import { Request, Response } from 'express';
import { supabase } from '../config/supabase.ts';

export const getMerchants = async (req: Request, res: Response): Promise<void> => {
  try {
    const { data, error } = await supabase
      .schema('master')
      .from('merchant')
      .select(`
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
        gstn_docid
      `);

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

export const setMerchants = async (req: Request, res: Response): Promise<void> => {
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
    update_by,
    update_date,
    status_sw,
    gstn,
    pan_docid,
    aadhaar_docid,
    gstn_docid
  } = req.body;

  try {
    const { data, error } = await supabase
      .schema('master')
      .from('merchant')
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
        gstn_docid
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
    res.status(500).json({ error: 'Internal Server Error' });
  }
};