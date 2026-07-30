import { Request, Response } from "express";
import { supabase } from "../config/supabase.ts";
import * as jose from "jose";
import { encryptText } from "../services/eciesService";
import { logControllerError } from "../services/loggerService";
// In a real app, this should be a 32-byte key from environment variables
const jweSecret = new TextEncoder().encode(
  process.env.JWE_SECRET,
);
const jwtSecret = new TextEncoder().encode(
  process.env.JWT_SECRET,
);
const exp = process.env.SESSION_EXPIRY??"5m";
/**
 * Internal helper to handle Supabase Auth sign up
 */
export const signUp = async (userData: any) => {
  const { email, password } = userData;
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
  });

  if (error) throw error;
  return data;
};

/**
 * Internal helper to handle database record creation in master.user
 */
export const setUser = async (authData: any, userData: any, updateBy?: number) => {
  const {
    user_fname,
    user_mname,
    user_lname,
    user_type_id,
    phone,
    merchant_id,
  } = userData;

  const { data, error } = await supabase
    .schema("master")
    .from("user")
    .insert([{
      auth_uuid: authData.user.id,
      email: authData.user.email,
      user_fname: user_fname,
      user_mname: user_mname,
      user_lname: user_lname,
      phone: phone,
      user_type_id: user_type_id,
      merchant_id: merchant_id || null,
      status_sw: true,
      update_by: updateBy,
      update_date: new Date().toISOString(),
    }])
    .select();

  if (error) throw error;
  return data[0];
};

export const getUsers = async (req: Request, res: Response): Promise<void> => {
  try {
    const { page, pageSize } = req.query;
    // Pagination is opt-in: callers that don't pass page/pageSize (e.g. the
    // admin dashboard's user count, merchant dropdowns) keep getting the
    // full unpaginated list exactly as before, since they rely on that.
    const paginate = page !== undefined || pageSize !== undefined;

    let query = supabase
      .schema("master")
      .from("user")
      .select(
        `
        id,
        auth_uuid,
        user_type_id,
        merchant_id,
        user_fname,
        user_mname,
        user_lname,
        phone_country_code,
        phone,
        email,
        update_by,
        update_date,
        status_sw
      `,
        paginate ? { count: "exact" } : undefined,
      );

    let pageNum = 1;
    let pageSizeNum = 10;
    if (paginate) {
      pageNum = Math.max(parseInt(String(page ?? "1"), 10) || 1, 1);
      pageSizeNum = Math.min(
        Math.max(parseInt(String(pageSize ?? "10"), 10) || 10, 1),
        100,
      );
      const from = (pageNum - 1) * pageSizeNum;
      const to = from + pageSizeNum - 1;
      query = query.order("id", { ascending: false }).range(from, to);
    }

    const { data, error, count } = await query;

    if (error) {
      res.status(400).json({ error: error.message });
      return;
    }

    const responseBody: any = {
      success: true,
      data,
    };

    if (paginate) {
      const total = count ?? 0;
      responseBody.pagination = {
        page: pageNum,
        pageSize: pageSizeNum,
        total,
        totalPages: Math.max(Math.ceil(total / pageSizeNum), 1),
      };
    }

    res.status(200).json(responseBody);
  } catch (err) {
    await logControllerError(req, err, "UserController", "getUsers");
    res.status(500).json({ error: "Internal Server Error" });
  }
};

export const getUsersByMerchantId = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const { merchantId } = req.query;

    const { data, error } = await supabase
      .schema("master")
      .from("user")
      .select(`
        id, 
        auth_uuid,
        user_type_id, 
        merchant_id, 
        user_fname, 
        user_mname, 
        user_lname,
        email
      `)
      .eq("merchant_id", merchantId)
      .in("user_type_id", [5, 6]);

    if (error) {
      res.status(400).json({ error: error.message });
      return;
    }

    res.status(200).json({
      success: true,
      data,
    });
  } catch (err) {
    await logControllerError(req, err, "UserController", "getUsersByMerchantId");
    res.status(500).json({ error: "Internal Server Error" });
  }
};

export const createUser = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const authData = await signUp(req.body);
    if (authData.user) {
      const updateBy = (req as any).user?.user_id;
      const dbUser = await setUser(authData, req.body, updateBy);
      res.status(201).json({
        success: true,
        data: { auth: authData, user: dbUser },
      });
    } else {
      res.status(201).json({ success: true, data: { auth: authData } });
    }
  } catch (err: any) {
    await logControllerError(req, err, "UserController", "createUser", 400);
    res.status(400).json({ error: err.message || "Error creating user" });
  }
};

export const updateUser = async (
  req: Request,
  res: Response,
): Promise<void> => {
  const { id } = req.params;
  const updateData = { ...req.body };

  // We don't update password or email through this endpoint for security
  delete updateData.password;
  delete updateData.email;
  delete updateData.auth_uuid;

  try {
    const { data, error } = await supabase
      .schema("master")
      .from("user")
      .update({
        ...updateData,
        update_by: (req as any).user?.user_id,
        update_date: new Date().toISOString(),
      })
      .eq("id", id)
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
    await logControllerError(req, err, "UserController", "updateUser");
    res.status(500).json({ error: "Internal Server Error" });
  }
};

export const signInUser = async (
  req: Request,
  res: Response,
): Promise<void> => {
  const { email, password } = req.body;

  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) throw error;

    // Fetch user role from database
    const { data: dbUser } = await supabase
      .schema("master")
      .from("user")
      .select("user_type_id,merchant_id,id")
      .eq("auth_uuid", data.user.id)
      .single();

    const role = dbUser?.user_type_id || 6;
    const merchant_id = dbUser?.merchant_id || "";
    const user_id = dbUser?.id || 0;
    const payLoad = { email: data.user.email, role, merchant_id, user_id };
    

    const jwt = await new jose.SignJWT(payLoad)
      .setProtectedHeader({ alg: "HS256" })
      .setIssuedAt()
      .setIssuer("simplyticketz")
      .setAudience("merchant-portal")
      .setExpirationTime(exp)
      .sign(jwtSecret);
    // Create JWE (JSON Web Encryption)
    const jwe = await new jose.CompactEncrypt(
      new TextEncoder().encode(
        jwt,
      ),
    )
      .setProtectedHeader({ alg: "dir", enc: "A256GCM" })
      .encrypt(jweSecret);

    res.status(200).json({
      success: true,
      token: jwe,
      // The frontend needs this to know the signed-in user's role/merchant
      // without ever holding JWT_SECRET/JWE_SECRET itself. Previously the
      // client decrypted and verified its own token to get this - which
      // meant those secrets had to be shipped to the browser (as
      // VITE_JWT_SECRET/VITE_JWE_SECRET), letting anyone forge a token with
      // any role once they read the secrets out of the bundle.
      user: payLoad,
    });
  } catch (err: any) {
    await logControllerError(req, err, "UserController", "signInUser", 401);
    res.status(401).json({ error: err.message });
  }
};

export const refreshToken = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader?.startsWith("Bearer ")) {
      res.status(401).json({ error: "Missing token" });
      return;
    }

    const token = authHeader.split(" ")[1];

    // Decrypt JWE
    const { plaintext } = await jose.compactDecrypt(token, jweSecret);

    const jwt = new TextDecoder().decode(plaintext);

    // Verify current token (must not be expired)
    const { payload } = await jose.jwtVerify(jwt, jwtSecret, {
      issuer: "simplyticketz",
      audience: "merchant-portal",
    });

    const refreshedUser = {
      email: payload.email,
      role: payload.role,
      merchant_id: payload.merchant_id,
      user_id: payload.user_id,
    };

    // Create new access token
    const newJwt = await new jose.SignJWT(refreshedUser)
      .setProtectedHeader({ alg: "HS256" })
      .setIssuedAt()
      .setIssuer("simplyticketz")
      .setAudience("merchant-portal")
      .setExpirationTime(exp)
      .sign(jwtSecret);

    // Encrypt it
    const newJwe = await new jose.CompactEncrypt(
      new TextEncoder().encode(newJwt)
    )
      .setProtectedHeader({
        alg: "dir",
        enc: "A256GCM",
      })
      .encrypt(jweSecret);

    res.status(200).json({
      success: true,
      token: newJwe,
      // See signInUser - avoids the client needing JWT_SECRET/JWE_SECRET
      // to read its own refreshed session back out of the token.
      user: refreshedUser,
    });
  } catch (err: any) {
    await logControllerError(req, err, "UserController", "refreshToken", 401);
    res.status(401).json({
      success: false,
      error: "Session expired",
    });
  }
};

export const generateGuestToken = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const { email } = req.body;

    const role = 7; // Customer Role - unauthenticated guests browsing/booking tickets
    const merchant_id = "";
    const user_id = 0;
    const payLoad = { email: email || "", role, merchant_id, user_id };

    // Guest tokens have to be a signed JWT wrapped in a JWE, same as a real
    // login (see signInUser) - authorizeRoles() calls jose.jwtVerify() on
    // the decrypted contents, which requires a valid signed JWT. This
    // previously encrypted the raw JSON payload directly with no signature,
    // which isn't a JWT, so every request made with a guest token failed
    // authorizeRoles() with a generic 401 regardless of role.
    const jwt = await new jose.SignJWT(payLoad)
      .setProtectedHeader({ alg: "HS256" })
      .setIssuedAt()
      .setIssuer("simplyticketz")
      .setAudience("merchant-portal")
      .setExpirationTime(exp)
      .sign(jwtSecret);

    const jwe = await new jose.CompactEncrypt(
      new TextEncoder().encode(jwt),
    )
      .setProtectedHeader({
        alg: "dir",
        enc: "A256GCM",
      })
      .encrypt(jweSecret);

    res.status(200).json({
      success: true,
      token: jwe,
      user: payLoad,
    });
  } catch (err: any) {
    await logControllerError(req, err, "UserController", "generateGuestToken");
    res.status(500).json({
      success: false,
      error: err.message,
    });
  }
};

export const signOutUser = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    await supabase.auth.signOut();
    res.status(200).json({ success: true, message: "Signed out successfully" });
  } catch (err: any) {
    await logControllerError(req, err, "UserController", "signOutUser");
    res.status(500).json({ error: err.message });
  }
};
