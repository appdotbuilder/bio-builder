import { z } from 'zod';

// User schema for creators
export const userSchema = z.object({
  id: z.number(),
  username: z.string(),
  email: z.string().email(),
  display_name: z.string().nullable(),
  bio: z.string().nullable(),
  avatar_url: z.string().nullable(),
  theme: z.enum(['light', 'dark', 'gradient', 'minimal']),
  is_active: z.boolean(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export type User = z.infer<typeof userSchema>;

// Input schema for creating users
export const createUserInputSchema = z.object({
  username: z.string().min(3).max(50),
  email: z.string().email(),
  display_name: z.string().nullable(),
  bio: z.string().max(500).nullable(),
  avatar_url: z.string().url().nullable(),
  theme: z.enum(['light', 'dark', 'gradient', 'minimal']).default('minimal')
});

export type CreateUserInput = z.infer<typeof createUserInputSchema>;

// Input schema for updating users
export const updateUserInputSchema = z.object({
  id: z.number(),
  display_name: z.string().nullable().optional(),
  bio: z.string().max(500).nullable().optional(),
  avatar_url: z.string().url().nullable().optional(),
  theme: z.enum(['light', 'dark', 'gradient', 'minimal']).optional(),
  is_active: z.boolean().optional()
});

export type UpdateUserInput = z.infer<typeof updateUserInputSchema>;

// Link schema for link-in-bio entries
export const linkSchema = z.object({
  id: z.number(),
  user_id: z.number(),
  title: z.string(),
  url: z.string(),
  description: z.string().nullable(),
  icon: z.string().nullable(),
  position: z.number().int(),
  is_active: z.boolean(),
  click_count: z.number().int(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export type Link = z.infer<typeof linkSchema>;

// Input schema for creating links
export const createLinkInputSchema = z.object({
  user_id: z.number(),
  title: z.string().min(1).max(100),
  url: z.string().url(),
  description: z.string().max(200).nullable(),
  icon: z.string().nullable(),
  position: z.number().int().nonnegative().optional()
});

export type CreateLinkInput = z.infer<typeof createLinkInputSchema>;

// Input schema for updating links
export const updateLinkInputSchema = z.object({
  id: z.number(),
  title: z.string().min(1).max(100).optional(),
  url: z.string().url().optional(),
  description: z.string().max(200).nullable().optional(),
  icon: z.string().nullable().optional(),
  position: z.number().int().nonnegative().optional(),
  is_active: z.boolean().optional()
});

export type UpdateLinkInput = z.infer<typeof updateLinkInputSchema>;

// Schema for reordering links
export const reorderLinksInputSchema = z.object({
  user_id: z.number(),
  link_orders: z.array(z.object({
    id: z.number(),
    position: z.number().int().nonnegative()
  }))
});

export type ReorderLinksInput = z.infer<typeof reorderLinksInputSchema>;

// Schema for getting user profile by username
export const getUserByUsernameInputSchema = z.object({
  username: z.string()
});

export type GetUserByUsernameInput = z.infer<typeof getUserByUsernameInputSchema>;

// Schema for getting links by user ID
export const getLinksByUserInputSchema = z.object({
  user_id: z.number()
});

export type GetLinksByUserInput = z.infer<typeof getLinksByUserInputSchema>;

// Schema for public profile view (includes user and links)
export const publicProfileSchema = z.object({
  user: userSchema,
  links: z.array(linkSchema)
});

export type PublicProfile = z.infer<typeof publicProfileSchema>;

// Schema for link click tracking
export const trackLinkClickInputSchema = z.object({
  link_id: z.number()
});

export type TrackLinkClickInput = z.infer<typeof trackLinkClickInputSchema>;