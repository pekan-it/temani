import { supabase } from "@/lib/supabase/client";
import { Appointment } from "@/types/database";

export async function createCheckupSchedule(input: {
  patientId: string;
  scheduledDate: string; // YYYY-MM-DD
  doctorName?: string;
  notes?: string;
}): Promise<Appointment> {
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

  // Validate patient belongs to this family
  const { data: patient } = await supabase
    .from("patients")
    .select("id")
    .eq("id", input.patientId)
    .eq("family_id", profile.family_id)
    .single();

  if (!patient) throw new Error("Pasien tidak ditemukan");

  const { data, error } = await supabase
    .from("appointments")
    .insert({
      patient_id: input.patientId,
      family_id: profile.family_id,
      hospital_name: "",
      doctor_name: input.doctorName || "",
      appointment_type: "kontrol_rutin",
      scheduled_date: input.scheduledDate,
      scheduled_time: "09:00",
      status: "scheduled",
      notes: input.notes || null,
    })
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data;
}

export async function getCheckupSchedules(): Promise<Appointment[]> {
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
    .from("appointments")
    .select("*")
    .eq("family_id", profile.family_id)
    .eq("appointment_type", "kontrol_rutin")
    .order("scheduled_date", { ascending: true });

  if (error) throw new Error(error.message);
  return data ?? [];
}
