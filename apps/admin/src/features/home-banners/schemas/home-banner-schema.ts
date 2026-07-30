import { z } from "zod";

const optionalText = (maximum: number) =>
  z.union([z.string().trim().max(maximum), z.null()]).optional().transform((value) => value || null);

const mediaUrl = z.string().trim().url().max(2_000);
const optionalMediaUrl = z.union([mediaUrl, z.literal(""), z.null()]).optional().transform((value) => value || null);
const dateValue = z.union([z.string().datetime({ offset: true }), z.literal(""), z.null()])
  .optional()
  .transform((value) => value ? new Date(value) : null);

export const homeBannerInputSchema = z.object({
  internalName: z.string().trim().min(1, "Internal name is required.").max(120),
  mediaType: z.enum(["image", "video"]),
  desktopMediaUrl: mediaUrl,
  mobileMediaUrl: optionalMediaUrl,
  posterUrl: optionalMediaUrl,
  altText: z.string().trim().min(1, "Accessible alt text is required.").max(240),
  headline: optionalText(160),
  subheading: optionalText(320),
  buttonLabel: optionalText(80),
  destinationUrl: z.union([
    z.string().trim().max(2_000).refine(
      (value) => value === "" || value.startsWith("/") || /^https?:\/\//i.test(value),
      "Use a relative path or an HTTP/HTTPS URL.",
    ),
    z.null(),
  ]).optional().transform((value) => value || null),
  openInNewTab: z.boolean().default(false),
  isActive: z.boolean().default(true),
  startsAt: dateValue,
  endsAt: dateValue,
}).superRefine((value, context) => {
  if (value.mediaType === "image" && !value.mobileMediaUrl) {
    context.addIssue({ code: "custom", path: ["mobileMediaUrl"], message: "A mobile image is required." });
  }
  if (value.mediaType === "video" && !value.posterUrl) {
    context.addIssue({ code: "custom", path: ["posterUrl"], message: "A video poster image is required." });
  }
  if (value.startsAt && value.endsAt && value.endsAt <= value.startsAt) {
    context.addIssue({ code: "custom", path: ["endsAt"], message: "End time must be after start time." });
  }
  if (value.buttonLabel && !value.destinationUrl) {
    context.addIssue({ code: "custom", path: ["destinationUrl"], message: "A button needs a destination." });
  }
});

export const bannerIdSchema = z.string().uuid();
export const bannerReorderSchema = z.object({
  bannerIds: z.array(z.string().uuid()).min(1).max(5),
});
export const bannerVideoUploadSchema = z.object({
  fileName: z.string().trim().min(1).max(240),
  size: z.number().int().positive().max(40 * 1024 * 1024),
  contentType: z.literal("video/mp4"),
});
export const bannerFinalizeSchema = z.object({
  path: z.string().trim().regex(/^videos\/[a-f0-9-]+\.mp4$/),
  size: z.number().int().positive().max(40 * 1024 * 1024),
});

export type ParsedHomeBannerInput = z.infer<typeof homeBannerInputSchema>;
