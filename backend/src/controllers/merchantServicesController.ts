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
      status_sw,
      sgst,
      cgst,
      igst,
      start_date,
      end_date,
      recurring_sw,
      city,
      advance_booking_days
    } = req.body;

    const { data, error } = await supabase
      .schema('master')
      .from('merchant_service')
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
        advance_booking_days
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
      .from('merchant_service')
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
    let query = supabase.schema('master').from('merchant_service').select('*');
    
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

/**
 * getMerchantServiceBookingCal: Returns a list of valid booking dates for a service.
 * Considers working days, holidays, advance booking window, and service validity dates.
 */
export const getMerchantServiceBookingCal = async (req: Request, res: Response): Promise<void> => {
  try {
    const { serviceId } = req.query;
    if (!serviceId) {
      res.status(400).json({ error: 'Service ID is required' });
      return;
    }

    // 1. Fetch Service Details
    const { data: service, error: serviceError } = await supabase
      .schema('master')
      .from('merchant_service')
      .select('*')
      .eq('id', serviceId)
      .single();

    if (serviceError || !service) {
      res.status(404).json({ error: 'Service not found' });
      return;
    }

    // 2. Fetch Holidays
    const { data: holidays } = await supabase
      .schema('master')
      .from('merchant_service_holiday')
      .select('holiday_date')
      .eq('merchant_service_id', serviceId)
      .eq('status_sw', true);

    const holidayDates = new Set(holidays?.map(h => h.holiday_date));

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
      service.sat_working_sw
    ];

    // 4. Iterate through dates and filter
    for (let d = new Date(today); d <= maxDate; d.setDate(d.getDate() + 1)) {
      const dateStr = d.toISOString().split('T')[0];
      
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
      data:validDates
    });

  } catch (err) {
    res.status(500).json({ error: 'Internal Server Error' });
  }
};