import { supabase } from "@/lib/supabase/client";
import type { Family } from "@/types/database";

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

  if (authData.session) {
    await supabase.auth.setSession({
      access_token: authData.session.access_token,
      refresh_token: authData.session.refresh_token,
    });
  }

  const familyCode = generateFamilyCode();

  const { error: fnError } = await supabase.rpc("create_family_for_owner", {
    p_family_name: familyName.trim(),
    p_family_code: familyCode,
    p_full_name: fullName.trim(),
    p_email: email.trim().toLowerCase(),
  });
  if (fnError) throw new Error("Gagal membuat keluarga: " + fnError.message);

  return { familyCode };
}

export async function registerCaregiver(
  fullName: string,
  email: string,
  password: string,
  familyCode: string,
) {
  // Cek family code dulu — tidak perlu auth
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

  if (authData.session) {
    await supabase.auth.setSession({
      access_token: authData.session.access_token,
      refresh_token: authData.session.refresh_token,
    });
  }

  const { error: profileError } = await supabase.from("profiles").insert({
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
