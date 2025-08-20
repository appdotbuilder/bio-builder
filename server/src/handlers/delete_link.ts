import { db } from '../db';
import { linksTable } from '../db/schema';
import { eq, and, gt, sql } from 'drizzle-orm';

export interface DeleteLinkInput {
  id: number;
}

export const deleteLink = async (input: DeleteLinkInput): Promise<{ success: boolean }> => {
  try {
    // First, get the link to be deleted to retrieve its user_id and position
    const linkToDelete = await db.select()
      .from(linksTable)
      .where(eq(linksTable.id, input.id))
      .execute();

    if (linkToDelete.length === 0) {
      throw new Error(`Link with id ${input.id} not found`);
    }

    const { user_id, position } = linkToDelete[0];

    // Delete the link
    const deleteResult = await db.delete(linksTable)
      .where(eq(linksTable.id, input.id))
      .returning()
      .execute();

    if (deleteResult.length === 0) {
      throw new Error('Failed to delete link');
    }

    // Reorder remaining links - decrease position by 1 for all links 
    // with position greater than the deleted link's position
    await db.update(linksTable)
      .set({
        position: sql`${linksTable.position} - 1`,
        updated_at: new Date()
      })
      .where(
        and(
          eq(linksTable.user_id, user_id),
          gt(linksTable.position, position)
        )
      )
      .execute();

    return { success: true };
  } catch (error) {
    console.error('Link deletion failed:', error);
    throw error;
  }
};