import { supabase } from "@/lib/supabase/client";

export interface NotificationPreferences {
  medicationReminders: boolean;
  checkupReminders: boolean;
  familyInvites: boolean;
}

export async function updateProfile(fullName: string, phone: string | null) {
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    throw new Error("User tidak terautentikasi");
  }

  const { error: authError } = await supabase.auth.updateUser({
    data: { phone: phone ?? "" },
  });
  if (authError) {
    throw new Error(authError.message);
  }

  const { error: profileError } = await supabase
    .from("profiles")
    .update({ full_name: fullName })
    .eq("id", user.id);

  if (profileError) {
    throw new Error(profileError.message);
  }
}

export async function updateAvatarUrl(avatarUrl: string) {
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    throw new Error("User tidak terautentikasi");
  }

  const { error } = await supabase.auth.updateUser({
    data: { avatar_url: avatarUrl },
  });

  if (error) {
    throw new Error(error.message);
  }
}

export async function updateNotificationPreferences(
  preferences: NotificationPreferences,
) {
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    throw new Error("User tidak terautentikasi");
  }

  const { error } = await supabase.auth.updateUser({
    data: { notification_preferences: preferences },
  });

  if (error) {
    throw new Error(error.message);
  }
}
