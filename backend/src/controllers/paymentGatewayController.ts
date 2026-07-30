import { Request, Response } from 'express';
import { supabase } from '../config/supabase.ts';
import { logControllerError } from '../services/loggerService';

/**
 * List available payment gateways (master.payment_gateway), for populating
 * the gateway selector on the merchant payment gateway mapping screen.
 * `api_url` is intentionally excluded from the response - it's an internal
 * routing endpoint, not something the mapping UI needs to display.
 */
export const getPaymentGateways = async (req: Request, res: Response): Promise<void> => {
  try {
    const { status } = req.query;

    let query = supabase
      .schema('master')
      .from('payment_gateway')
      .select('id, gateway_name, gateway_code, status');

    if (status !== undefined) {
      query = query.eq('status', status === 'true');
    }

    const { data, error } = await query.order('gateway_name', { ascending: true });

    if (error) {
      res.status(400).json({ error: error.message });
      return;
    }

    res.status(200).json({
      success: true,
      data,
    });
  } catch (err) {
    await logControllerError(req, err, 'PaymentGatewayController', 'getPaymentGateways');
    res.status(500).json({ error: 'Internal Server Error' });
  }
};
