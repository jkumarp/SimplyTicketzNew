import { Request, Response } from 'express';
import { supabase } from '../config/supabase.ts';
import { logControllerError } from '../services/loggerService';

export const getInvoices = async (req: Request, res: Response): Promise<void> => {
  try {
    const { merchantId, invoiceId } = req.query;
    let query = supabase
      .schema('transaction')
      .from('invoice')
      .select('*');

    if (merchantId) {
      query = query.eq('merchant_id', merchantId);
    }
    if (invoiceId) {
      query = query.eq('id', invoiceId);
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
    await logControllerError(req, err, 'InvoiceController', 'getInvoices');
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

export const createInvoice = async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      invoice_number,
      merchant_id,
      customer_id,
      merchant_service_id,
      total_amount,
      scgst_merchant,
      cgst_merchant,
      igst_merchant,
      convinience_fee,
      sgst,
      cgst,
      igst,
      discount_value,
      grand_total,
      discount_percentage
    } = req.body;
    const update_by = (req as any).user?.user_id;

    const { data, error } = await supabase
      .schema('transaction')
      .from('invoice')
      .insert([{
        invoice_number,
        merchant_id,
        customer_id,
        merchant_service_id,
        total_amount,
        scgst_merchant,
        cgst_merchant,
        igst_merchant,
        convinience_fee,
        sgst,
        cgst,
        igst,
        discount_value,
        grand_total,
        update_by,
        update_date: new Date().toISOString(),
        discount_percentage: discount_percentage || 0
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
    await logControllerError(req, err, 'InvoiceController', 'createInvoice');
    res.status(500).json({ error: 'Internal Server Error' });
  }
};