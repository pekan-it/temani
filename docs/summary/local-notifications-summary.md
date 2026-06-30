# Pengingat Lokal (Local Notifications) — Implementation Summary

## 1. What Was Built

Pengingat obat & cek-up sekarang dijadwalkan sebagai **notifikasi lokal** di perangkat
(`expo-notifications`), bukan lagi semata-mata bergantung pada pipeline push + cron
Supabase. Notifikasi lokal tetap berbunyi walau offline / app ditutup, tidak butuh
server, cron, push token, atau internet.

Pipeline push lama (`registerPushToken` + Edge Function) tetap dipertahankan sebagai
pelengkap agar anggota keluarga lain ikut menerima notifikasi.

Key files:
- `src/lib/notifications.ts` — logika utama (`syncAllReminders`, scheduler obat & cek-up).
- `src/app/(app)/_layout.tsx` — sync saat app dibuka.
- `src/app/(app)/medications/[patientId]/add.tsx` — sync setelah tambah obat.
- `src/app/(app)/medications/[medicationId]/index.tsx` — sync setelah edit / hapus obat.
- `src/components/appointments/checkup-form.tsx` — sync setelah tambah cek-up.
- `src/app/(app)/settings/index.tsx` — sync setelah toggle preferensi notifikasi.

## 2. Architecture Decisions

- **Full re-sync, bukan tracking id per-item.** `syncAllReminders()` membatalkan semua
  notifikasi lokal lalu menjadwalkan ulang dari data Supabase. Idempoten, jadi tidak perlu
  menyimpan mapping id notifikasi ↔ obat/cek-up. Dipanggil saat app dibuka dan setiap
  mutasi obat/cek-up.
- **Trigger harian untuk obat** (`SchedulableTriggerInputTypes.DAILY`, hour/minute) → kambuh
  tiap hari pada jam yang sama, sesuai sifat jadwal minum obat.
- **Trigger tanggal untuk cek-up** (`SchedulableTriggerInputTypes.DATE`): H-1 pukul 08:00 dan
  T-60 menit sebelum kunjungan, masing-masing hanya dijadwalkan bila masih di masa depan.
- **Respect preferensi** `notify_medications` / `notify_checkups` dari tabel `profiles`.

## 3. Catatan / Trade-off

- Skema lama menyimpan jadwal obat sebagai `"pagi|07:00"`. Layar **edit** obat menyimpan
  hanya key (`"pagi"`) tanpa jam — bug pra-eksisting. Scheduler menambal ini dengan
  `DEFAULT_SCHEDULE_TIME` (pagi 07:00, siang 12:00, malam 19:00, sebelum_tidur 21:00) supaya
  notifikasi tetap terjadwal. Perbaikan ideal: tambahkan time picker di layar edit.
- Tidak menghapus jadwal saat obat dinonaktifkan/ status cek-up berubah secara langsung dari
  layar lain; perubahan tersebut ikut tersinkron pada pembukaan app berikutnya.

## 4. Testing (manual)

Wajib **development/production build (EAS)** — notifikasi lokal terjadwal tidak berfungsi
penuh di Expo Go (SDK 53+).

1. Tambah obat dengan jadwal beberapa menit ke depan (mis. sekarang 07:30 → set 07:35).
2. Izinkan notifikasi saat diminta.
3. Tunggu sampai jam tersebut → notifikasi muncul (termasuk saat app di-background).
