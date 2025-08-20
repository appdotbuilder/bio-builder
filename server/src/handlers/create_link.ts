import { db } from '../db';
import { linksTable, usersTable } from '../db/schema';
import { type CreateLinkInput, type Link } from '../schema';
import { eq, max } from 'drizzle-orm';

export const createLink = async (input: CreateLinkInput): Promise<Link> => {
  try {
    // Verify user exists before creating link
    const user = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, input.user_id))
      .execute();

    if (user.length === 0) {
      throw new Error(`User with id ${input.user_id} not found`);
    }

    // Determine position if not provided
    let position = input.position;
    if (position === undefined) {
      // Get the highest position for this user
      const maxPositionResult = await db
        .select({ maxPosition: max(linksTable.position) })
        .from(linksTable)
        .where(eq(linksTable.user_id, input.user_id))
        .execute();

      const currentMaxPosition = maxPositionResult[0]?.maxPosition;
      position = currentMaxPosition !== null ? currentMaxPosition + 1 : 0;
    }

    // Insert link record
    const result = await db.insert(linksTable)
      .values({
        user_id: input.user_id,
        title: input.title,
        url: input.url,
        description: input.description || null,
        icon: input.icon || null,
        position: position
      })
      .returning()
      .execute();

    return result[0];
  } catch (error) {
    console.error('Link creation failed:', error);
    throw error;
  }
};