import { supabase } from '../config/supabase.ts';

export const createMerchantWithDocs = async (merchantData: any) => {
  const { data, error } = await supabase
    .schema('master')
    .from('merchant')
    .insert([merchantData])
    .select();

  if (error) throw error;
  return data[0];
};