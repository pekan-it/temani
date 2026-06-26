import { supabase } from "@/lib/supabase/client";
import { Patient } from "@/types/database";

export async function getPatients(): Promise<Patient[]> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("User tidak terautentikasi");

  const { data: profile } = await supabase
    .from("profiles")
    .select("family_id")
    .eq("id", user.id)
    .single();

  if (!profile?.family_id) throw new Error("Family tidak ditemukan");

  const { data, error } = await supabase
    .from("patients")
    .select("*")
    .eq("family_id", profile.family_id);

  if (error) throw new Error(error.message);
  return data ?? [];
}
