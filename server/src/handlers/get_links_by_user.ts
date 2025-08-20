import { db } from '../db';
import { linksTable } from '../db/schema';
import { type GetLinksByUserInput, type Link } from '../schema';
import { eq, asc } from 'drizzle-orm';

export const getLinksByUser = async (input: GetLinksByUserInput): Promise<Link[]> => {
  try {
    // Query links for the specified user, ordered by position for display
    const results = await db.select()
      .from(linksTable)
      .where(eq(linksTable.user_id, input.user_id))
      .orderBy(asc(linksTable.position))
      .execute();

    // Return the results directly - no numeric conversions needed as all fields are integers/text
    return results;
  } catch (error) {
    console.error('Failed to get links by user:', error);
    throw error;
  }
};