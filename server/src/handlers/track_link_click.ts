import { db } from '../db';
import { linksTable } from '../db/schema';
import { type TrackLinkClickInput } from '../schema';
import { eq, sql } from 'drizzle-orm';

export const trackLinkClick = async (input: TrackLinkClickInput): Promise<{ success: boolean }> => {
  try {
    // Use SQL to increment the click count atomically
    const result = await db
      .update(linksTable)
      .set({
        click_count: sql`${linksTable.click_count} + 1`,
        updated_at: new Date()
      })
      .where(eq(linksTable.id, input.link_id))
      .returning()
      .execute();

    // Return success if at least one row was updated
    return { success: result.length > 0 };
  } catch (error) {
    console.error('Link click tracking failed:', error);
    throw error;
  }
};