import { db } from '../db';
import { linksTable } from '../db/schema';
import { type ReorderLinksInput } from '../schema';
import { eq, and, inArray } from 'drizzle-orm';

export async function reorderLinks(input: ReorderLinksInput): Promise<{ success: boolean }> {
  try {
    const { user_id, link_orders } = input;

    // If no links to reorder, return success
    if (link_orders.length === 0) {
      return { success: true };
    }

    // Extract link IDs for validation
    const linkIds = link_orders.map(item => item.id);

    // Validate that all provided links belong to the specified user
    const existingLinks = await db.select()
      .from(linksTable)
      .where(and(
        eq(linksTable.user_id, user_id),
        inArray(linksTable.id, linkIds)
      ))
      .execute();

    // Check if all provided link IDs exist and belong to the user
    if (existingLinks.length !== link_orders.length) {
      throw new Error('Some links do not exist or do not belong to the specified user');
    }

    // Update each link's position in a transaction-like manner
    // Note: We'll update them one by one to ensure data integrity
    for (const linkOrder of link_orders) {
      await db.update(linksTable)
        .set({ 
          position: linkOrder.position,
          updated_at: new Date()
        })
        .where(and(
          eq(linksTable.id, linkOrder.id),
          eq(linksTable.user_id, user_id)
        ))
        .execute();
    }

    return { success: true };
  } catch (error) {
    console.error('Links reordering failed:', error);
    throw error;
  }
}