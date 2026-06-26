# Auth UI/UX Refresh + Supabase Schema — Summary

## 1. What Was Built
A redesigned authentication flow plus the project's first committed Supabase
schema.

**New files**
- `src/constants/auth-theme.ts` — branded auth color tokens.
- `src/components/ui/input.tsx` — labeled input with icon, focus ring, error,
  and password show/hide toggle.
- `src/components/ui/button.tsx` — variant button (primary/secondary/ghost) with
  loading + disabled states.
- `src/components/auth/family-code-input.tsx` — segmented 6-cell code field.
- `src/lib/supabase/schema.sql` — full schema (was empty).
- `src/lib/supabase/seed.sql` — dev seed template (was empty).

**Changed files**
- `src/app/(auth)/login.tsx`, `register-owner.tsx`, `register-caregiver.tsx` —
  rebuilt on the new primitives; inline errors replace blocking `Alert`s for
  validation; `KeyboardAvoidingView` + `ScrollView`.
- `src/lib/auth.ts` — typed the caregiver family lookup result.
- `src/types/database.ts` — added `create_family_for_owner` to `Functions`.

## 2. Architecture Decisions
- **Fixed branded palette for auth.** First-run screens stay light regardless of
  device theme for a predictable brand impression.
- **`my_family_id()`-centric RLS.** A single `SECURITY DEFINER` helper drives
  every table policy, keeping authorization rules short and uniform.
- **`SECURITY DEFINER` for `create_family_for_owner`.** A just-signed-up user has
  no profile/family yet, so normal RLS would block creating them; the definer
  function inserts the family and owner profile atomically.
- **Inline validation over `Alert`.** Non-blocking, accessible, less jarring.

## 3. Technical Implementation
- Tables: `families`, `profiles`, `patients`, `medications`, `medication_logs`,
  `appointments` with enums, FKs, and supporting indexes.
- Functions: `my_family_id()`, `decrement_stock(uuid)`,
  `create_family_for_owner(text,text,text,text)`.
- RLS enabled on all tables; `families` is publicly selectable (lookup-by-code),
  everything else is family-scoped.

## 4. Challenges & Solutions
- **New-user chicken-and-egg** at owner signup → `SECURITY DEFINER` RPC.
- **Caregiver join before auth** needs to read `families` → explicit public
  SELECT policy, with the code as the gating secret (documented inline).

## 5. Testing Coverage
- `tsc --noEmit`: all new/changed auth UI files are clean.
- Manual QA recommended: owner signup → code → caregiver join → verify two
  families cannot see each other's data.

## 6. Code Quality
- No new dependencies. No `any` in new files. Functions are small and single
  purpose. Comments explain *why* (RLS chicken-and-egg, public-code tradeoff).

## 7. Known Issues / Next Steps
- Pre-existing (2 errors in `src/lib/auth.ts`): the hand-written `Database` type
  doesn't fully satisfy supabase-js generics, so the typed client degrades the
  `profiles` insert and the `rpc(...)` arg to `never`/`undefined`. This predates
  this change (original main had 3 such errors; now 2). Follow-up: regenerate
  `Database` from the live schema with `supabase gen types`.
- Consider promoting `families` lookup to an RPC that returns only `id`+`name`
  to avoid exposing the full row on public SELECT.
