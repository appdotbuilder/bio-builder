import { db } from '../db';
import { linksTable } from '../db/schema';
import { eq } from 'drizzle-orm';
import { type UpdateLinkInput, type Link } from '../schema';

export const updateLink = async (input: UpdateLinkInput): Promise<Link> => {
  try {
    // First, check if the link exists
    const existingLink = await db.select()
      .from(linksTable)
      .where(eq(linksTable.id, input.id))
      .execute();

    if (existingLink.length === 0) {
      throw new Error(`Link with id ${input.id} not found`);
    }

    // Build update object with only provided fields
    const updateFields: Partial<typeof linksTable.$inferInsert> = {
      updated_at: new Date()
    };

    if (input.title !== undefined) {
      updateFields.title = input.title;
    }

    if (input.url !== undefined) {
      updateFields.url = input.url;
    }

    if (input.description !== undefined) {
      updateFields.description = input.description;
    }

    if (input.icon !== undefined) {
      updateFields.icon = input.icon;
    }

    if (input.position !== undefined) {
      updateFields.position = input.position;
    }

    if (input.is_active !== undefined) {
      updateFields.is_active = input.is_active;
    }

    // Update the link
    const result = await db.update(linksTable)
      .set(updateFields)
      .where(eq(linksTable.id, input.id))
      .returning()
      .execute();

    return result[0];
  } catch (error) {
    console.error('Link update failed:', error);
    throw error;
  }
};