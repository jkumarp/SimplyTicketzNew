import { supabase } from '../config/supabase.ts';

/**
 * Creates a new user by signing them up with Supabase Auth 
 * and then creating a corresponding record in the master.user table.
 */
export const createUser = async (userData: any) => {
  const { email, password, user_fname, phone } = userData;

  // Step 1: Sign up with Supabase Auth
  const { data: authData, error: authError } = await supabase.auth.signUp({
    email,
    password,
  });

  if (authError) {
    throw authError;
  }

  if (authData.user) {
    // Step 2: Create the user record in the master.user table
    const { data: dbData, error: dbError } = await supabase
      .schema('master')
      .from('user')
      .insert([{
        id: authData.user.id,
        email: authData.user.email,
        user_fname: user_fname,
        phone: phone,
        user_type_id: 1, // Default user type
        status_sw: true,
        update_by: 1,
        update_date: new Date().toISOString()
      }])
      .select();

    if (dbError) {
      throw dbError;
    }

    return {
      auth: authData,
      user: dbData[0]
    };
  }

  return { auth: authData };
};