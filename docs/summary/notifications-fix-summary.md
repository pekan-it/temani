# Perbaikan Fitur #3 — Notifikasi (Pengingat Obat & Cek-up)

## 1. What Was Built
Memperbaiki fitur notifikasi yang sebelumnya tidak berfungsi end-to-end.

Files changed:
- `src/lib/supabase/schema.sql` — sinkronisasi skema dengan kode aplikasi.
- `supabase/functions/send-medication-reminders/index.ts` — ditulis ulang.
- `supabase/cron.sql` — baru, penjadwal pemicu Edge Function.
- `src/lib/supabase/settings.ts` — toggle notifikasi kini tersimpan ke `profiles`.
- `src/lib/notifications.ts` — hapus dead code (`no-unreachable`).

## 2. Masalah yang Ditemukan (sebelum perbaikan)
1. **Skema tidak sinkron**: `medications.schedules` bertipe `med_schedule[]` (enum),
   padahal aplikasi menyimpan `"pagi|07:00"` → insert gagal.
2. Kolom `profiles.push_token` dipakai kode tapi tidak ada di skema.
3. Tabel `notification_logs` dipakai Edge Function tapi tidak ada di skema.
4. **Tidak ada cron** yang memicu Edge Function → notifikasi tidak pernah terkirim.
5. **Pengingat cek-up (H-1 & hari H) belum ada** — padahal diminta di spesifikasi.
6. Reminder obat 10 menit, spesifikasi meminta 15 menit.
7. **Bug timezone**: waktu dibandingkan dalam UTC, padahal user memilih jam WIB
   (selisih 7 jam).
8. Toggle notifikasi di Pengaturan tidak memengaruhi pengiriman.

## 3. Technical Implementation
### Skema (`schema.sql`)
- `medications.schedules` → `text[]` (menyimpan slot + jam, mis. `pagi|07:00`).
- `profiles` + `push_token`, `notify_medications`, `notify_checkups`.
- Tabel baru `notification_logs` (ledger dedupe) dengan unique
  `(ref_id, ref_type, kind, slot_key, slot_date)` + RLS read per-keluarga.
- Blok migrasi idempoten (`alter ... if not exists`, `alter column type`) untuk
  database yang sudah terlanjur dibuat.

### Edge Function
- Waktu diselesaikan dalam **WIB** via `Intl.DateTimeFormat("Asia/Jakarta")`,
  bukan jam UTC runtime.
- **Obat**: reminder 15 menit sebelum jam; lewati dosis yang sudah dikonfirmasi.
- **Cek-up**: H-1 pukul 08:00 WIB, dan hari-H 60 menit sebelum `scheduled_time`.
- Dedupe via `notification_logs` (insert + tangani `23505`), sehingga cron
  per-menit tidak mengirim ganda.
- Hanya kirim ke anggota yang masih mengaktifkan toggle terkait.

### Penjadwal (`cron.sql`)
- `pg_cron` + `pg_net` memanggil Edge Function tiap menit (placeholder
  `<PROJECT_REF>` / `<SERVICE_ROLE_KEY>`).

### Settings
- `updateNotificationPreferences` kini juga menulis `notify_medications` /
  `notify_checkups` ke `profiles` agar dibaca backend.

## 4. Langkah Deploy (manual, oleh tim)
1. Jalankan `schema.sql` di Supabase SQL Editor (aman di-rerun).
2. Deploy Edge Function: `supabase functions deploy send-medication-reminders`.
3. Isi placeholder di `cron.sql`, lalu jalankan di SQL Editor.

## 5. Catatan & Next Steps
- Penjadwalan cek-up memakai jam tetap (H-1 08:00, hari-H T-60m); bisa dibuat
  dapat dikonfigurasi bila perlu.
- Pertimbangkan fallback notifikasi lokal untuk Expo Go (push di-skip di sana).
