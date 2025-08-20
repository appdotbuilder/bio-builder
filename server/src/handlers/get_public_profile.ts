import { db } from '../db';
import { usersTable, linksTable } from '../db/schema';
import { type GetUserByUsernameInput, type PublicProfile } from '../schema';
import { eq, and, asc } from 'drizzle-orm';

export async function getPublicProfile(input: GetUserByUsernameInput): Promise<PublicProfile | null> {
  try {
    // First, find the user by username
    const userResults = await db.select()
      .from(usersTable)
      .where(and(
        eq(usersTable.username, input.username),
        eq(usersTable.is_active, true)
      ))
      .execute();

    if (userResults.length === 0) {
      return null;
    }

    const user = userResults[0];

    // Fetch all active links for this user, ordered by position
    const linkResults = await db.select()
      .from(linksTable)
      .where(and(
        eq(linksTable.user_id, user.id),
        eq(linksTable.is_active, true)
      ))
      .orderBy(asc(linksTable.position))
      .execute();

    return {
      user,
      links: linkResults
    };
  } catch (error) {
    console.error('Get public profile failed:', error);
    throw error;
  }
}