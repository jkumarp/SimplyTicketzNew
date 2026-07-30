import { Request, Response } from 'express';
import { supabase } from '../config/supabase.ts';
import { logControllerError } from '../services/loggerService';

export const getMerchantServiceHolidays = async (req: Request, res: Response): Promise<void> => {
  try {
    const { merchantId, serviceId, page, pageSize } = req.query;

    const pageNum = Math.max(parseInt(String(page ?? '1'), 10) || 1, 1);
    const pageSizeNum = Math.min(
      Math.max(parseInt(String(pageSize ?? '10'), 10) || 10, 1),
      100,
    );
    const from = (pageNum - 1) * pageSizeNum;
    const to = from + pageSizeNum - 1;

    let query = supabase
      .schema('master')
      .from('merchant_service_holiday')
      .select('*', { count: 'exact' });

    if (merchantId) query = query.eq('merchant_id', merchantId);
    if (serviceId) query = query.eq('merchant_service_id', serviceId);

    const { data, error, count } = await query
      .order('holiday_date', { ascending: false })
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
    await logControllerError(req, err, 'MerchantServiceHolidayController', 'getMerchantServiceHolidays');
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

export const createMerchantServiceHoliday = async (req: Request, res: Response): Promise<void> => {
  try {
    const { merchant_id, merchant_service_id, holiday_name, holiday_date, status_sw } = req.body;
    const update_by = (req as any).user?.user_id;

    const { data, error } = await supabase
      .schema('master')
      .from('merchant_service_holiday')
      .insert([{
        merchant_id,
        merchant_service_id,
        holiday_name,
        holiday_date,
        update_by,
        update_date: new Date().toISOString(),
        status_sw: status_sw ?? true
      }])
      .select();

    if (error) {
      res.status(400).json({ error: error.message });
      return;
    }

    res.status(201).json({ success: true, data: data[0] });
  } catch (err) {
    await logControllerError(req, err, 'MerchantServiceHolidayController', 'createMerchantServiceHoliday');
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

export const updateMerchantServiceHoliday = async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  try {
    const { data, error } = await supabase
      .schema('master')
      .from('merchant_service_holiday')
      .update({
        ...req.body,
        update_by: (req as any).user?.user_id,
        update_date: new Date().toISOString()
      })
      .eq('id', id)
      .select();

    if (error) {
      res.status(400).json({ error: error.message });
      return;
    }

    res.status(200).json({ success: true, data: data[0] });
  } catch (err) {
    await logControllerError(req, err, 'MerchantServiceHolidayController', 'updateMerchantServiceHoliday');
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

export const deleteMerchantServiceHoliday = async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  try {
    const { error } = await supabase
      .schema('master')
      .from('merchant_service_holiday')
      .delete()
      .eq('id', id);

    if (error) {
      res.status(400).json({ error: error.message });
      return;
    }

    res.status(200).json({ success: true, message: 'Holiday deleted successfully' });
  } catch (err) {
    await logControllerError(req, err, 'MerchantServiceHolidayController', 'deleteMerchantServiceHoliday');
    res.status(500).json({ error: 'Internal Server Error' });
  }
};