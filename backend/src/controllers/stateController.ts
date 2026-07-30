import { Request, Response } from 'express';
import { supabase } from '../config/supabase.ts';
import { logControllerError } from '../services/loggerService';
import { CacheService } from '../services/cacheService';

const STATES_CACHE_TTL_SECONDS = 3600;

export const getStates = async (req: Request, res: Response): Promise<void> => {
  try {
    const { countryId } = req.query;
    const cacheKey = countryId ? `states:country:${countryId}` : 'states:all';

    try {
      const cached = await CacheService.get<unknown[]>(cacheKey);
      if (cached && cached.length > 0) {
        res.status(200).json({ success: true, data: cached });
        return;
      }
    } catch (cacheErr) {
      // Fail open: Redis being unavailable should not break this endpoint
      console.error('Redis cache read failed, falling back to database:', cacheErr);
    }

    let query = supabase
      .schema('master')
      .from('state')
      .select('id, name, country_id');

    if (countryId) {
      query = query.eq('country_id', countryId);
    }

    const { data, error } = await query;

    if (error) {
      res.status(400).json({ error: error.message });
      return;
    }

    try {
      await CacheService.set(cacheKey, data, STATES_CACHE_TTL_SECONDS);
    } catch (cacheErr) {
      console.error('Redis cache write failed:', cacheErr);
    }

    res.status(200).json({
      success: true,
      data,
    });
  } catch (err) {
    await logControllerError(req, err, 'StateController', 'getStates');
    res.status(500).json({ error: 'Internal Server Error' });
  }
};