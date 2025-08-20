import { db } from '../db';
import { usersTable } from '../db/schema';
import { eq } from 'drizzle-orm';
import { type GetUserByUsernameInput, type User } from '../schema';

export async function getUserByUsername(input: GetUserByUsernameInput): Promise<User | null> {
  try {
    // Query user by username
    const result = await db.select()
      .from(usersTable)
      .where(eq(usersTable.username, input.username))
      .limit(1)
      .execute();

    // Return null if user not found
    if (result.length === 0) {
      return null;
    }

    // Return the user data (no numeric conversions needed for users table)
    return result[0];
  } catch (error) {
    console.error('Get user by username failed:', error);
    throw error;
  }
}