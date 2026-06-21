#!/bin/bash
# Jalankan dari root folder project Temani
# bash setup-temani.sh

BASE="src"

echo "Creating folders..."

# ── app/ routes (Expo Router v3) ────────────────────────────
mkdir -p "$BASE/app/(auth)"
mkdir -p "$BASE/app/(app)/dashboard"
mkdir -p "$BASE/app/(app)/patients"
mkdir -p "$BASE/app/(app)/patients/[id]"
mkdir -p "$BASE/app/(app)/medications/[patientId]"
mkdir -p "$BASE/app/(app)/appointments/[patientId]"
mkdir -p "$BASE/app/(app)/care-score"
mkdir -p "$BASE/app/(app)/settings"

# ── components/ by feature ──────────────────────────────────
mkdir -p "$BASE/components/auth"
mkdir -p "$BASE/components/dashboard"
mkdir -p "$BASE/components/patients"
mkdir -p "$BASE/components/medications"
mkdir -p "$BASE/components/appointments"
mkdir -p "$BASE/components/care-score"

# ── lib/ supabase + feature queries ─────────────────────────
mkdir -p "$BASE/lib/supabase"

# ── hooks/ custom ───────────────────────────────────────────
# (folder sudah ada di src/hooks/, hanya tambah files)

# ── types/ ──────────────────────────────────────────────────
mkdir -p "$BASE/types"

# ── context/ global state ───────────────────────────────────
mkdir -p "$BASE/context"

echo "Creating files..."

# ════════════════════════════════════════════════════════════
# APP ROUTES
# ════════════════════════════════════════════════════════════

# Root layout sudah ada (src/app/_layout.tsx) — skip
# index.tsx sudah ada — skip

# Auth group
touch "$BASE/app/(auth)/_layout.tsx"
touch "$BASE/app/(auth)/login.tsx"
touch "$BASE/app/(auth)/register-owner.tsx"
touch "$BASE/app/(auth)/register-caregiver.tsx"

# App group
touch "$BASE/app/(app)/_layout.tsx"
touch "$BASE/app/(app)/dashboard/index.tsx"
touch "$BASE/app/(app)/patients/index.tsx"
touch "$BASE/app/(app)/patients/add.tsx"
touch "$BASE/app/(app)/patients/[id]/index.tsx"
touch "$BASE/app/(app)/patients/[id]/edit.tsx"
touch "$BASE/app/(app)/medications/[patientId]/index.tsx"
touch "$BASE/app/(app)/medications/[patientId]/add.tsx"
touch "$BASE/app/(app)/appointments/[patientId]/index.tsx"
touch "$BASE/app/(app)/appointments/[patientId]/add.tsx"
touch "$BASE/app/(app)/appointments/[patientId]/[appointmentId].tsx"
touch "$BASE/app/(app)/care-score/index.tsx"
touch "$BASE/app/(app)/settings/index.tsx"

# ════════════════════════════════════════════════════════════
# COMPONENTS
# ════════════════════════════════════════════════════════════

# auth
touch "$BASE/components/auth/family-code-input.tsx"

# dashboard
touch "$BASE/components/dashboard/today-meds-list.tsx"
touch "$BASE/components/dashboard/upcoming-appointment-banner.tsx"
touch "$BASE/components/dashboard/patient-summary-card.tsx"

# patients
touch "$BASE/components/patients/patient-card.tsx"
touch "$BASE/components/patients/patient-form.tsx"

# medications
touch "$BASE/components/medications/medication-card.tsx"
touch "$BASE/components/medications/medication-form.tsx"
touch "$BASE/components/medications/confirm-med-button.tsx"
touch "$BASE/components/medications/stock-badge.tsx"

# appointments
touch "$BASE/components/appointments/appointment-card.tsx"
touch "$BASE/components/appointments/appointment-form.tsx"
touch "$BASE/components/appointments/days-until-badge.tsx"
touch "$BASE/components/appointments/complete-appointment-sheet.tsx"

# care-score
touch "$BASE/components/care-score/score-circle.tsx"
touch "$BASE/components/care-score/compliance-chart.tsx"
touch "$BASE/components/care-score/score-breakdown.tsx"

# shared ui (tambahan dari yang sudah ada)
touch "$BASE/components/ui/button.tsx"
touch "$BASE/components/ui/input.tsx"
touch "$BASE/components/ui/card.tsx"
touch "$BASE/components/ui/badge.tsx"
touch "$BASE/components/ui/avatar.tsx"
touch "$BASE/components/ui/loading-screen.tsx"
touch "$BASE/components/ui/empty-state.tsx"
touch "$BASE/components/ui/bottom-sheet.tsx"

# ════════════════════════════════════════════════════════════
# LIB
# ════════════════════════════════════════════════════════════

touch "$BASE/lib/supabase/client.ts"
touch "$BASE/lib/supabase/schema.sql"
touch "$BASE/lib/supabase/seed.sql"
touch "$BASE/lib/auth.ts"
touch "$BASE/lib/family.ts"
touch "$BASE/lib/patients.ts"
touch "$BASE/lib/medications.ts"
touch "$BASE/lib/appointments.ts"
touch "$BASE/lib/care-score.ts"
touch "$BASE/lib/utils.ts"

# ════════════════════════════════════════════════════════════
# HOOKS
# ════════════════════════════════════════════════════════════

touch "$BASE/hooks/use-auth.ts"
touch "$BASE/hooks/use-family.ts"
touch "$BASE/hooks/use-patients.ts"
touch "$BASE/hooks/use-medications.ts"
touch "$BASE/hooks/use-appointments.ts"
touch "$BASE/hooks/use-care-score.ts"
touch "$BASE/hooks/use-realtime-sync.ts"

# ════════════════════════════════════════════════════════════
# TYPES
# ════════════════════════════════════════════════════════════

touch "$BASE/types/database.ts"
touch "$BASE/types/index.ts"

# ════════════════════════════════════════════════════════════
# CONTEXT
# ════════════════════════════════════════════════════════════

touch "$BASE/context/auth-context.tsx"
touch "$BASE/context/family-context.tsx"

# ════════════════════════════════════════════════════════════
# ENV (jika belum ada)
# ════════════════════════════════════════════════════════════

if [ ! -f ".env.local" ]; then
  cat > ".env.local" << 'ENVEOF'
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
ENVEOF
  echo "Created .env.local — isi dengan kredensial Supabase kamu"
fi

echo ""
echo "Done! Struktur yang ditambahkan:"
find src -type f | grep -v node_modules | sort
