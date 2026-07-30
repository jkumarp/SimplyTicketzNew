import { Request, Response } from 'express';
import { supabase } from '../config/supabase.ts';
import { logControllerError } from '../services/loggerService';
import { CacheService } from '../services/cacheService';

const COUNTRIES_CACHE_KEY = 'countries:all';
const COUNTRIES_CACHE_TTL_SECONDS = 3600;

export const getCountries = async (req: Request, res: Response): Promise<void> => {
  try {
    try {
      const cached = await CacheService.get<unknown[]>(COUNTRIES_CACHE_KEY);
      if (cached && cached.length > 0) {
        res.status(200).json({ success: true, data: cached });
        return;
      }
    } catch (cacheErr) {
      // Fail open: Redis being unavailable should not break this endpoint
      console.error('Redis cache read failed, falling back to database:', cacheErr);
    }

    const { data, error } = await supabase
      .schema('master')
      .from('country')
      .select('id, name');

    if (error) {
      res.status(400).json({ error: error.message });
      return;
    }

    try {
      await CacheService.set(COUNTRIES_CACHE_KEY, data, COUNTRIES_CACHE_TTL_SECONDS);
    } catch (cacheErr) {
      console.error('Redis cache write failed:', cacheErr);
    }

    res.status(200).json({
      success: true,
      data,
    });
  } catch (err) {
    await logControllerError(req, err, 'CountryController', 'getCountries');
    res.status(500).json({ error: 'Internal Server Error' });
  }
};