import { serial, text, pgTable, timestamp, integer, boolean, pgEnum } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// Define theme enum
export const themeEnum = pgEnum('theme', ['light', 'dark', 'gradient', 'minimal']);

// Users table for creators
export const usersTable = pgTable('users', {
  id: serial('id').primaryKey(),
  username: text('username').notNull().unique(),
  email: text('email').notNull().unique(),
  display_name: text('display_name'), // Nullable by default
  bio: text('bio'), // Nullable by default
  avatar_url: text('avatar_url'), // Nullable by default
  theme: themeEnum('theme').notNull().default('minimal'),
  is_active: boolean('is_active').notNull().default(true),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull(),
});

// Links table for link-in-bio entries
export const linksTable = pgTable('links', {
  id: serial('id').primaryKey(),
  user_id: integer('user_id').notNull().references(() => usersTable.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  url: text('url').notNull(),
  description: text('description'), // Nullable by default
  icon: text('icon'), // Nullable by default, can store icon name or URL
  position: integer('position').notNull().default(0),
  is_active: boolean('is_active').notNull().default(true),
  click_count: integer('click_count').notNull().default(0),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull(),
});

// Define relations
export const usersRelations = relations(usersTable, ({ many }) => ({
  links: many(linksTable),
}));

export const linksRelations = relations(linksTable, ({ one }) => ({
  user: one(usersTable, {
    fields: [linksTable.user_id],
    references: [usersTable.id],
  }),
}));

// TypeScript types for the table schemas
export type User = typeof usersTable.$inferSelect; // For SELECT operations
export type NewUser = typeof usersTable.$inferInsert; // For INSERT operations

export type Link = typeof linksTable.$inferSelect; // For SELECT operations
export type NewLink = typeof linksTable.$inferInsert; // For INSERT operations

// Important: Export all tables and relations for proper query building
export const tables = { 
  users: usersTable, 
  links: linksTable 
};

export const tableRelations = {
  usersRelations,
  linksRelations
};