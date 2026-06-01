"use server";

import cloudinary from "@/lib/config/cloudinary";

const FOLDERS = {
  avatar: "flowgrid/avatars",
  companyLogo: "flowgrid/logos",
} as const;

// ── Upload avatar user ────────────────────────────────────────────────────────
// publicId pakai userId biar tiap upload overwrite file lama (tidak numpuk)

export const uploadUserAvatar = async (input: {
  base64: string;
  userId: string;
}) => {
  try {
    const result = await cloudinary.uploader.upload(input.base64, {
      folder: FOLDERS.avatar,
      public_id: input.userId,
      resource_type: "image",
      overwrite: true,
      // Crop square otomatis — cocok untuk avatar
      transformation: [{ width: 400, height: 400, crop: "fill", gravity: "face" }],
    });

    return {
      url: result.secure_url,
      publicId: result.public_id,
    };
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Failed to upload avatar";
    console.error("[uploadUserAvatar]", error);
    throw new Error(msg);
  }
};

// ── Upload logo company ───────────────────────────────────────────────────────
// publicId pakai companyId biar overwrite logo lama

export const uploadCompanyLogo = async (input: {
  base64: string;
  companyId: string;
}) => {
  try {
    const result = await cloudinary.uploader.upload(input.base64, {
      folder: FOLDERS.companyLogo,
      public_id: input.companyId,
      resource_type: "image",
      overwrite: true,
      // Preserve aspect ratio, max 800px — cocok untuk logo
      transformation: [{ width: 800, height: 800, crop: "limit" }],
    });

    return {
      url: result.secure_url,
      publicId: result.public_id,
    };
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Failed to upload logo";
    console.error("[uploadCompanyLogo]", error);
    throw new Error(msg);
  }
};

// ── Delete image (utility — untuk cleanup kalau perlu) ────────────────────────

export const deleteCloudinaryImage = async (publicId: string) => {
  try {
    await cloudinary.uploader.destroy(publicId);
  } catch (error) {
    // Non-fatal — log saja, jangan throw
    console.error("[deleteCloudinaryImage]", error);
  }
};