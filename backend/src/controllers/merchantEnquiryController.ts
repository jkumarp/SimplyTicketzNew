import { Request, Response } from 'express';
import { supabase } from '../config/supabase.ts';
import { logControllerError } from '../services/loggerService';

export const getMerchantEnquiries = async (req: Request, res: Response): Promise<void> => {
  try {
    const { search, status, page, pageSize } = req.query;

    const pageNum = Math.max(parseInt(String(page ?? '1'), 10) || 1, 1);
    const pageSizeNum = Math.min(
      Math.max(parseInt(String(pageSize ?? '10'), 10) || 10, 1),
      100,
    );
    const from = (pageNum - 1) * pageSizeNum;
    const to = from + pageSizeNum - 1;

    let query = supabase
      .from('merchant_enquiry')
      .select('*', { count: 'exact' });

    if (status) {
      query = query.eq('status', status);
    }

    if (search) {
      // `search` gets interpolated directly into a raw PostgREST filter
      // string below (.or() takes a filter expression, not a bound
      // parameter), so it must be stripped of characters that have special
      // meaning in that syntax (`,` separates conditions, `()` group them,
      // `.` separates column/operator/value) before use.
      const term = String(search).trim().replace(/[^a-zA-Z0-9 +\-@.]/g, "").slice(0, 100);
      if (term) {
        query = query.or(
          `merchant_name.ilike.%${term}%,merchant_email.ilike.%${term}%`,
        );
      }
    }

    const { data, error, count } = await query
      .order('id', { ascending: false })
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
    await logControllerError(req, err, 'MerchantEnquiryController', 'getMerchantEnquiries');
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

export const createMerchantEnquiry = async (req: Request, res: Response): Promise<void> => {
  const { merchant_name, merchant_email, enquiry_details } = req.body;

  try {
    const { data, error } = await supabase
      .from('merchant_enquiry')
      .insert([{
        merchant_name,
        merchant_email,
        enquiry_details,
        status: 'Created'
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
    await logControllerError(req, err, 'MerchantEnquiryController', 'createMerchantEnquiry');
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

export const updateMerchantEnquiry = async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  const updateData = req.body;

  try {
    const { data, error } = await supabase
      .from('merchant_enquiry')
      .update(updateData)
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
    await logControllerError(req, err, 'MerchantEnquiryController', 'updateMerchantEnquiry');
    res.status(500).json({ error: 'Internal Server Error' });
  }
};