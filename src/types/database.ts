// src/types/database.ts
// Generated manually — sync dengan schema.sql

export type UserRole = "owner" | "caregiver";
export type MedSchedule = "pagi" | "siang" | "malam" | "sebelum_tidur";
export type AppointmentStatus = "scheduled" | "completed" | "cancelled";
export type AppointmentType =
  | "kontrol_rutin"
  | "ambil_resep"
  | "cek_lab"
  | "lainnya";

// ── Raw DB rows ───────────────────────────────────────────────
export interface Family {
  id: string;
  name: string;
  family_code: string;
  created_at: string;
}

export interface Profile {
  id: string;
  email: string;
  full_name: string;
  family_id: string | null;
  role: UserRole;
  created_at: string;
}

export interface Patient {
  id: string;
  family_id: string;
  name: string;
  age: number;
  diagnosis: string;
  notes: string | null;
  created_at: string;
}

export interface Medication {
  id: string;
  patient_id: string;
  name: string;
  dose: string;
  schedules: MedSchedule[];
  stock: number;
  expiry_date: string | null;
  is_active: boolean;
  created_at: string;
}

export interface MedicationLog {
  id: string;
  medication_id: string;
  patient_id: string;
  schedule: MedSchedule;
  date: string; // format: YYYY-MM-DD
  confirmed: boolean;
  confirmed_by: string | null;
  confirmed_at: string | null;
  created_at: string;
}

export interface Appointment {
  id: string;
  patient_id: string;
  family_id: string;
  hospital_name: string;
  doctor_name: string;
  appointment_type: AppointmentType;
  scheduled_date: string; // format: YYYY-MM-DD
  scheduled_time: string; // format: HH:MM
  status: AppointmentStatus;
  notes: string | null;
  result_notes: string | null;
  created_at: string;
}

// ── Supabase Database type (untuk createClient<Database>) ─────
export interface Database {
  public: {
    Tables: {
      families: {
        Row: Family;
        Insert: Omit<Family, "id" | "created_at">;
        Update: Partial<Omit<Family, "id" | "created_at">>;
      };
      profiles: {
        Row: Profile;
        Insert: Omit<Profile, "created_at">;
        Update: Partial<Omit<Profile, "id" | "created_at">>;
      };
      patients: {
        Row: Patient;
        Insert: Omit<Patient, "id" | "created_at">;
        Update: Partial<Omit<Patient, "id" | "created_at">>;
      };
      medications: {
        Row: Medication;
        Insert: Omit<Medication, "id" | "created_at">;
        Update: Partial<Omit<Medication, "id" | "created_at">>;
      };
      medication_logs: {
        Row: MedicationLog;
        Insert: Omit<MedicationLog, "id" | "created_at">;
        Update: Partial<Omit<MedicationLog, "id" | "created_at">>;
      };
      appointments: {
        Row: Appointment;
        Insert: Omit<Appointment, "id" | "created_at">;
        Update: Partial<Omit<Appointment, "id" | "created_at">>;
      };
    };
    Functions: {
      my_family_id: {
        Args: Record<string, never>;
        Returns: string;
      };
      decrement_stock: {
        Args: { med_id: string };
        Returns: void;
      };
      create_family_for_owner: {
        Args: {
          p_family_name: string;
          p_family_code: string;
          p_full_name: string;
          p_email: string;
        };
        Returns: string;
      };
    };
  };
}

// ── App-level types (bukan raw DB) ────────────────────────────
export interface CareScore {
  patientId: string;
  total: number;
  medicationScore: number;
  appointmentScore: number;
  level: "good" | "warning" | "danger";
}

export interface TodayMedItem {
  medication: Medication;
  schedule: MedSchedule;
  log: MedicationLog | null;
}

// Appointment dengan nama pasien (dari join)
export interface AppointmentWithPatient extends Appointment {
  patients: Pick<Patient, "name">;
}
