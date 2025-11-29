"use client";

import { useTranslations } from "next-intl";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import Image from "next/image";
import { useState } from "react";
import { UserProfile } from "@/types/UserProfile";
import { SUPPORTED_LOCALES, LOCALE_NAMES } from "@/config/i18n";

const profileSchema = z.object({
  fullName: z.string().min(2, "Full name is required"),
  displayName: z.string().optional(),
  bio: z.string().max(500).optional(),
  location: z
    .object({
      country: z.string(),
      city: z.string().optional(),
      timezone: z.string(),
    })
    .optional(),
  phoneNumber: z.string().optional(),
  preferredLanguage: z.enum([...SUPPORTED_LOCALES] as unknown as [
    string,
    ...string[],
  ]),
  profession: z.string().optional(),
  company: z.string().optional(),
  interests: z.array(z.string()).optional(),
  socialMedia: z
    .array(
      z.object({
        platform: z.enum(["twitter", "linkedin", "facebook", "instagram"]),
        url: z.string().url(),
      })
    )
    .optional(),
  avatar: z.string().optional(),
  privacySettings: z.object({
    profileVisibility: z.enum(["public", "private", "connections"]),
    showEmail: z.boolean(),
    showPhone: z.boolean(),
    showLocation: z.boolean(),
  }),
  communicationPreferences: z.object({
    email: z.boolean(),
    sms: z.boolean(),
    inApp: z.boolean(),
  }),
});

type ProfileFormData = z.infer<typeof profileSchema>;

export default function ProfilePage() {
  const t = useTranslations("Profile");
  const { data: session } = useSession();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [avatarPreview, setAvatarPreview] = useState("");

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: async () => {
      try {
        const response = await fetch("/api/user/profile");
        if (!response.ok) throw new Error("Failed to fetch profile");
        const profile: UserProfile = await response.json();

        return {
          fullName: profile.fullName || "",
          displayName: profile.displayName || "",
          bio: profile.bio || "",
          location: profile.location || { country: "", timezone: "" },
          phoneNumber: profile.phoneNumber || "",
          preferredLanguage: profile.preferredLanguage || "en",
          profession: profile.profession || "",
          company: profile.company || "",
          interests: profile.interests || [],
          socialMedia: profile.socialMedia || [],
          avatar: profile.avatar || "",
          privacySettings: profile.privacySettings || {
            profileVisibility: "public",
            showEmail: true,
            showPhone: false,
            showLocation: false,
          },
          communicationPreferences: profile.communicationPreferences || {
            email: true,
            sms: false,
            inApp: true,
          },
        };
      } catch (err) {
        setError("Failed to load profile data");
        return {
          fullName: "",
          displayName: "",
          bio: "",
          location: { country: "", timezone: "" },
          phoneNumber: "",
          preferredLanguage: "en",
          profession: "",
          company: "",
          interests: [],
          socialMedia: [],
          avatar: "",
          privacySettings: {
            profileVisibility: "public",
            showEmail: true,
            showPhone: false,
            showLocation: false,
          },
          communicationPreferences: {
            email: true,
            sms: false,
            inApp: true,
          },
        };
      }
    },
  });

  const onSubmit = async (data: ProfileFormData) => {
    setIsLoading(true);
    setError("");

    try {
      const response = await fetch("/api/user/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        throw new Error("Failed to update profile");
      }

      const currentLang = watch("preferredLanguage");
      if (data.preferredLanguage !== currentLang) {
        router.refresh();
      }
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("Unexpected error");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      setAvatarPreview(reader.result as string);
    };
    reader.readAsDataURL(file);

    const formData = new FormData();
    formData.append("avatar", file);

    try {
      const response = await fetch("/api/user/avatar", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error("Failed to upload avatar");
      }

      const { avatarUrl } = await response.json();
      setValue("avatar", avatarUrl);
    } catch {
      setError("Failed to upload avatar");
    }
  };

  if (!session) {
    return <div className="text-center py-10">{t("notSignedIn")}</div>;
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">{t("title")}</h1>

      {error && (
        <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-md">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
        {/* Avatar Section */}
        <div className="space-y-4">
          <label className="block text-sm font-medium text-gray-700">
            {t("avatar")}
          </label>
          <div className="flex items-center space-x-6">
            <div className="relative h-24 w-24">
              <Image
                src={
                  typeof watch("avatar") === "string"
                    ? watch("avatar") || avatarPreview || "/default-avatar.png"
                    : "/default-avatar.png"
                }
                alt={t("avatar")}
                className="rounded-full object-cover"
                fill
              />
            </div>
            <input
              type="file"
              accept="image/*"
              onChange={handleAvatarChange}
              aria-label={t("avatar")}
              className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
            />
          </div>
        </div>

        {/* Full Name and Display Name */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700">
              {t("fullName")}
            </label>
            <input
              type="text"
              placeholder={t("fullName")}
              {...register("fullName")}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            />
            {errors.fullName && (
              <p className="mt-1 text-sm text-red-600">
                {errors.fullName.message}
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              {t("displayName")}
            </label>
            <input
              type="text"
              placeholder={t("displayName")}
              {...register("displayName")}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Language Preference */}
        <div>
          <label className="block text-sm font-medium text-gray-700">
            {t("preferredLanguage")}
          </label>
          <select
            {...register("preferredLanguage")}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
          >
            {SUPPORTED_LOCALES.map((locale) => (
              <option key={locale} value={locale}>
                {LOCALE_NAMES[locale]}
              </option>
            ))}
          </select>
        </div>

        {/* Bio */}
        <div>
          <label className="block text-sm font-medium text-gray-700">
            {t("bio")}
          </label>
          <textarea
            {...register("bio")}
            rows={4}
            placeholder={t("bio")}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
          />
          {errors.bio && (
            <p className="mt-1 text-sm text-red-600">{errors.bio.message}</p>
          )}
        </div>

        {/* Privacy Settings */}
        <div>
          <h3 className="text-lg font-medium text-gray-900 mb-4">
            {t("privacySettings")}
          </h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">
                {t("profileVisibility")}
              </label>
              <select
                {...register("privacySettings.profileVisibility")}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              >
                <option value="public">{t("public")}</option>
                <option value="private">{t("private")}</option>
                <option value="connections">{t("connectionsOnly")}</option>
              </select>
            </div>

            <div className="space-y-2">
              <div className="flex items-center">
                <input
                  type="checkbox"
                  {...register("privacySettings.showEmail")}
                  className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <label className="ml-2 block text-sm text-gray-700">
                  {t("showEmail")}
                </label>
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  {...register("privacySettings.showPhone")}
                  className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <label className="ml-2 block text-sm text-gray-700">
                  {t("showPhone")}
                </label>
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  {...register("privacySettings.showLocation")}
                  className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <label className="ml-2 block text-sm text-gray-700">
                  {t("showLocation")}
                </label>
              </div>
            </div>
          </div>
        </div>

        {/* Communication Preferences */}
        <div>
          <h3 className="text-lg font-medium text-gray-900 mb-4">
            {t("communicationPreferences")}
          </h3>
          <div className="space-y-2">
            <div className="flex items-center">
              <input
                type="checkbox"
                {...register("communicationPreferences.email")}
                className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <label className="ml-2 block text-sm text-gray-700">
                {t("email")}
              </label>
            </div>

            <div className="flex items-center">
              <input
                type="checkbox"
                {...register("communicationPreferences.sms")}
                className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <label className="ml-2 block text-sm text-gray-700">
                {t("sms")}
              </label>
            </div>

            <div className="flex items-center">
              <input
                type="checkbox"
                {...register("communicationPreferences.inApp")}
                className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <label className="ml-2 block text-sm text-gray-700">
                {t("inApp")}
              </label>
            </div>
          </div>
        </div>

        {/* Submit Button */}
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={isLoading}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
          >
            {isLoading ? t("saving") : t("saveChanges")}
          </button>
        </div>
      </form>
    </div>
  );
}
