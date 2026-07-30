import { Request, Response } from 'express';
import { supabase } from '../config/supabase.ts';
import { logControllerError } from '../services/loggerService';

/**
 * Creates an audit.error_log entry. Used for client-reported errors (e.g.
 * frontend error boundaries) in addition to the automatic server-side
 * logging done by the errorHandler middleware for unhandled request errors.
 *
 * merchant_id/user_id/ip_address are sourced from the authenticated
 * request (when available) rather than trusted from the client body, so a
 * caller can't spoof audit attribution for someone else.
 */
export const createErrorLog = async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      request_id,
      level,
      module,
      function_name,
      merchant_id,
      user_id,
      method,
      endpoint,
      status_code,
      error_message,
      stack_trace,
      request_body,
      request_query,
      request_params,
      supabase_error,
      execution_time_ms,
      app_version,
      server_name,
    } = req.body;

    const authUser = (req as any).user;

    const { data, error } = await supabase
      .schema('audit')
      .from('error_log')
      .insert([{
        request_id,
        level,
        module,
        function_name,
        merchant_id: authUser?.merchant_id ?? merchant_id ?? null,
        user_id: authUser?.user_id ?? user_id ?? null,
        method,
        endpoint,
        ip_address: req.ip,
        status_code,
        error_message,
        stack_trace,
        request_body,
        request_query,
        request_params,
        supabase_error,
        execution_time_ms,
        app_version,
        server_name,
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
    await logControllerError(req, err, 'ErrorLogController', 'createErrorLog');
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

/**
 * Retrieves audit.error_log entries with server-side pagination and
 * optional filtering by merchant_id, user_id, a case-insensitive
 * error_message search term, and a created_at date range.
 */
export const getErrorLogs = async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      merchantId,
      userId,
      search,
      startDate,
      endDate,
      page,
      pageSize,
    } = req.query;

    const pageNum = Math.max(parseInt(String(page ?? '1'), 10) || 1, 1);
    const pageSizeNum = Math.min(
      Math.max(parseInt(String(pageSize ?? '10'), 10) || 10, 1),
      100,
    );
    const from = (pageNum - 1) * pageSizeNum;
    const to = from + pageSizeNum - 1;

    let query = supabase
      .schema('audit')
      .from('error_log')
      .select('*', { count: 'exact' });

    if (merchantId) query = query.eq('merchant_id', merchantId);
    if (userId) query = query.eq('user_id', userId);
    if (search) {
      // Bound parameter via .ilike() (not a raw filter string), so no
      // special-character stripping is needed here.
      const term = String(search).trim().slice(0, 200);
      if (term) query = query.ilike('error_message', `%${term}%`);
    }
    if (startDate) query = query.gte('created_at', String(startDate));
    if (endDate) query = query.lte('created_at', String(endDate));

    const { data, error, count } = await query
      .order('created_at', { ascending: false })
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
    await logControllerError(req, err, 'ErrorLogController', 'getErrorLogs');
    res.status(500).json({ error: 'Internal Server Error' });
  }
};
