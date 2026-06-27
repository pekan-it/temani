import { supabase } from "@/lib/supabase/client";
import type { Family } from "@/types/database";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;

function generateFamilyCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

export async function registerOwner(
  fullName: string,
  email: string,
  password: string,
  familyName: string,
) {
  const { data: authData, error: authError } = await supabase.auth.signUp({
    email: email.trim().toLowerCase(),
    password,
  });
  if (authError) throw new Error(authError.message);
  if (!authData.user) throw new Error("Gagal membuat akun");

  const familyCode = generateFamilyCode();

  // RPC pakai SECURITY DEFINER — bypass RLS, tidak perlu session
  const { error: rpcError } = await supabase.rpc("register_owner", {
    p_user_id: authData.user.id,
    p_email: email.trim().toLowerCase(),
    p_full_name: fullName.trim(),
    p_family_name: familyName.trim(),
    p_family_code: familyCode,
  });
  if (rpcError) throw new Error("Gagal mendaftar: " + rpcError.message);

  return { familyCode };
}

export async function registerCaregiver(
  fullName: string,
  email: string,
  password: string,
  familyCode: string,
) {
  const { data: family, error: familyError } = await supabase
    .from("families")
    .select("*")
    .eq("family_code", familyCode.trim().toUpperCase())
    .single();
  if (familyError || !family) throw new Error("Kode keluarga tidak ditemukan");
  const foundFamily = family as Family;

  const { data: authData, error: authError } = await supabase.auth.signUp({
    email: email.trim().toLowerCase(),
    password,
  });
  if (authError) throw new Error(authError.message);
  if (!authData.user) throw new Error("Gagal membuat akun");
  if (!authData.session) {
    throw new Error(
      "Konfirmasi email kamu terlebih dahulu sebelum melanjutkan.",
    );
  }

  const { access_token } = authData.session;

  const authedClient = createClient(supabaseUrl, supabaseAnonKey, {
    global: {
      headers: {
        Authorization: `Bearer ${access_token}`,
      },
    },
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });

  const { error: profileError } = await authedClient.from("profiles").insert({
    id: authData.user.id,
    email: email.trim().toLowerCase(),
    full_name: fullName.trim(),
    family_id: foundFamily.id,
    role: "caregiver",
  });
  if (profileError) throw new Error("Gagal bergabung: " + profileError.message);

  return { family: foundFamily };
}

export async function login(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email: email.trim().toLowerCase(),
    password,
  });
  if (error) {
    if (error.message.includes("Invalid login credentials")) {
      throw new Error("Email atau kata sandi salah");
    }
    throw new Error(error.message);
  }
  return data;
}

export async function logout() {
  const { error } = await supabase.auth.signOut();
  if (error) throw new Error(error.message);
}
