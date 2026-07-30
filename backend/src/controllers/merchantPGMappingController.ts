import { Request, Response } from 'express';
import { supabase } from '../config/supabase.ts';
import { logControllerError } from '../services/loggerService';

const TABLE = 'merchant_payment_gateway_mapping';

/**
 * Clears `is_default` on every other mapping for a merchant. Only one
 * gateway mapping should be the default per merchant at a time, so this
 * runs before a create/update that sets `is_default: true`.
 */
async function clearOtherDefaults(
  merchantId: number,
  excludeId?: string,
): Promise<string | null> {
  let query = supabase
    .schema('master')
    .from(TABLE)
    .update({
      is_default: false,
      updated_at: new Date().toISOString(),
    })
    .eq('merchant_id', merchantId)
    .eq('is_default', true);

  if (excludeId) {
    query = query.neq('id', excludeId);
  }

  const { error } = await query;
  return error?.message ?? null;
}

/**
 * Create a new merchant payment gateway mapping.
 */
export const createMerchantPGMapping = async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      merchant_id,
      gateway_id,
      payment_method,
      currency,
      priority,
      is_default,
      is_active,
      success_url,
      failure_url,
      cancel_url,
      webhook_url,
      environment,
      effective_from,
      effective_to,
      remarks,
      api_id,
      encryption_key,
    } = req.body;

    if (is_default) {
      const clearError = await clearOtherDefaults(merchant_id);
      if (clearError) {
        res.status(400).json({ error: clearError });
        return;
      }
    }

    const { data, error } = await supabase
      .schema('master')
      .from(TABLE)
      .insert([{
        merchant_id,
        gateway_id,
        payment_method: payment_method ?? 'ALL',
        currency: currency || 'INR',
        priority: priority ?? 1,
        is_default: is_default ?? false,
        is_active: is_active ?? true,
        success_url: success_url ?? null,
        failure_url: failure_url ?? null,
        cancel_url: cancel_url ?? null,
        webhook_url: webhook_url ?? null,
        environment: environment || 'PROD',
        effective_from: effective_from ?? null,
        effective_to: effective_to ?? null,
        remarks: remarks ?? null,
        api_id: api_id ?? null,
        encryption_key: encryption_key ?? null,
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
    await logControllerError(req, err, 'MerchantPGMappingController', 'createMerchantPGMapping');
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

/**
 * Retrieve merchant payment gateway mappings, optionally filtered by
 * merchant, gateway, or active status, ordered by routing priority.
 */
export const getMerchantPGMappings = async (req: Request, res: Response): Promise<void> => {
  try {
    const { merchantId, gatewayId, isActive, environment, search, page, pageSize } = req.query;

    const pageNum = Math.max(parseInt(String(page ?? '1'), 10) || 1, 1);
    const pageSizeNum = Math.min(
      Math.max(parseInt(String(pageSize ?? '10'), 10) || 10, 1),
      100,
    );
    const from = (pageNum - 1) * pageSizeNum;
    const to = from + pageSizeNum - 1;

    let query = supabase
      .schema('master')
      .from(TABLE)
      .select('*', { count: 'exact' });

    if (merchantId) {
      query = query.eq('merchant_id', merchantId);
    }
    if (gatewayId) {
      query = query.eq('gateway_id', gatewayId);
    }
    if (isActive !== undefined) {
      query = query.eq('is_active', isActive === 'true');
    }
    if (environment) {
      query = query.eq('environment', environment);
    }

    // This table has no text columns of its own to search, so a merchant
    // name/contact search resolves to merchant IDs first (same term
    // sanitization as merchantEnquiryController's search, since the term
    // is interpolated into a raw PostgREST .or() filter string) and then
    // filters the mapping list by those IDs.
    if (search) {
      const term = String(search).trim().replace(/[^a-zA-Z0-9 +\-@.]/g, "").slice(0, 100);
      if (term) {
        const { data: matchingMerchants, error: merchantSearchError } = await supabase
          .schema('master')
          .from('merchant')
          .select('id')
          .or(`organization_name.ilike.%${term}%,contact_person_name.ilike.%${term}%`);

        if (merchantSearchError) {
          res.status(400).json({ error: merchantSearchError.message });
          return;
        }

        const merchantIds = (matchingMerchants || []).map((m: any) => m.id);
        // No matches - use an id that can never exist so the query returns
        // an empty page instead of (incorrectly) falling through to "all".
        query = query.in('merchant_id', merchantIds.length ? merchantIds : [-1]);
      }
    }

    const { data, error, count } = await query
      .order('priority', { ascending: true })
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
    await logControllerError(req, err, 'MerchantPGMappingController', 'getMerchantPGMappings');
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

/**
 * Update an existing merchant payment gateway mapping.
 */
export const updateMerchantPGMapping = async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  const updateData = { ...req.body };

  try {
    if (updateData.is_default) {
      let merchantId = updateData.merchant_id;

      if (merchantId === undefined) {
        const { data: existing, error: existingError } = await supabase
          .schema('master')
          .from(TABLE)
          .select('merchant_id')
          .eq('id', id)
          .single();

        if (existingError) {
          res.status(400).json({ error: existingError.message });
          return;
        }
        merchantId = existing?.merchant_id;
      }

      const clearError = await clearOtherDefaults(merchantId, String(id));
      if (clearError) {
        res.status(400).json({ error: clearError });
        return;
      }
    }

    const { data, error } = await supabase
      .schema('master')
      .from(TABLE)
      .update({
        ...updateData,
        updated_at: new Date().toISOString(),
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
    await logControllerError(req, err, 'MerchantPGMappingController', 'updateMerchantPGMapping');
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

/**
 * Delete a merchant payment gateway mapping.
 */
export const deleteMerchantPGMapping = async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;

  try {
    const { error } = await supabase
      .schema('master')
      .from(TABLE)
      .delete()
      .eq('id', id);

    if (error) {
      res.status(400).json({ error: error.message });
      return;
    }

    res.status(200).json({
      success: true,
      message: 'Merchant payment gateway mapping deleted successfully',
    });
  } catch (err) {
    await logControllerError(req, err, 'MerchantPGMappingController', 'deleteMerchantPGMapping');
    res.status(500).json({ error: 'Internal Server Error' });
  }
};
