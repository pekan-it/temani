import { CheckupForm } from "@/components/appointments/checkup-form";
import { Stack } from "expo-router";

export default function AppointmentAddScreen() {
  return (
    <>
      <Stack.Screen
        options={{
          title: "Tambah Jadwal Cek-up",
          headerShown: true,
          headerBackTitle: "Kembali",
        }}
      />
      <CheckupForm />
    </>
  );
}
