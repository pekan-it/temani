# Auth UI/UX Refresh + Supabase Schema — Planning

## 1. Problem Statement
The auth flow (login, register-owner, register-caregiver) used raw `TextInput`
fields, `Alert`-based validation, and inconsistent styling. There was also no
database schema committed — `schema.sql`/`seed.sql` were empty even though the
app code already calls specific tables and RPCs. New developers could not stand
up a working Supabase backend.

## 2. Requirements
**Functional**
- Polished, consistent auth screens with inline (non-blocking) validation.
- Password visibility toggle; segmented family-code entry for caregivers.
- A runnable SQL schema that matches `src/types/database.ts` and the calls in
  `src/lib/*` (tables, functions, RLS).

**Non-functional**
- Keyboard-aware layouts (no fields hidden behind the keyboard).
- No new runtime dependencies.
- RLS enforced so a user only ever sees their own family's data.

**Constraints**
- Expo SDK 54 / React Native 0.81 / expo-router. Supabase as backend.
- Reuse the existing brand green (`#2D6A4F`).

## 3. Architecture & Approach
- Extract reusable UI primitives: `ui/Input`, `ui/Button`, `auth/FamilyCodeInput`.
- A fixed branded palette in `constants/auth-theme.ts` (auth screens are always
  light, independent of device color scheme).
- SQL authorization centers on `public.my_family_id()`; every table policy is
  expressed in terms of it. `create_family_for_owner` is `SECURITY DEFINER` to
  resolve the new-user chicken-and-egg (no profile/family yet at signup).

## 4. Implementation Steps
1. `constants/auth-theme.ts` — color tokens.
2. `ui/input.tsx`, `ui/button.tsx` — primitives with focus/error/loading states.
3. `auth/family-code-input.tsx` — segmented 6-cell code field.
4. Rewrite the three `(auth)` screens using the primitives.
5. `supabase/schema.sql` — tables, enums, indexes, functions, RLS, grants.
6. `supabase/seed.sql` — dev seed template.
7. Type alignment: add `create_family_for_owner` to `Database.Functions`.

## 5. Testing Strategy
- Typecheck the touched files (`tsc --noEmit`).
- Manual: run schema in Supabase SQL Editor, register owner, copy code, join as
  caregiver, confirm RLS isolation between two families.

## 6. Potential Risks
- `families` SELECT is public so caregivers can look up a family by code before
  signup. Mitigation: the 6-char code is the shared secret; no sensitive data is
  exposed on that table. Documented inline in the policy.
- Pre-existing: the hand-written `Database` type does not fully satisfy
  supabase-js generics, so the typed client degrades some inserts/RPCs to
  `never`. Out of scope here; tracked for a follow-up type regeneration.

## 7. Success Criteria
- Auth screens render consistently and validate inline.
- `schema.sql` runs clean and enforces per-family RLS.
- New/changed TS files typecheck; no new dependencies.
