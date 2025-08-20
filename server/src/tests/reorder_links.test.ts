import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, linksTable } from '../db/schema';
import { type ReorderLinksInput } from '../schema';
import { reorderLinks } from '../handlers/reorder_links';
import { eq, asc } from 'drizzle-orm';

// Test data setup
const testUser = {
  username: 'testuser',
  email: 'test@example.com',
  display_name: 'Test User',
  bio: 'A test user',
  avatar_url: null,
  theme: 'minimal' as const
};

const testLinks = [
  {
    title: 'First Link',
    url: 'https://example.com/1',
    description: 'First test link',
    icon: null,
    position: 0
  },
  {
    title: 'Second Link',
    url: 'https://example.com/2',
    description: 'Second test link',
    icon: null,
    position: 1
  },
  {
    title: 'Third Link',
    url: 'https://example.com/3',
    description: 'Third test link',
    icon: null,
    position: 2
  }
];

describe('reorderLinks', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should successfully reorder links', async () => {
    // Create test user
    const userResult = await db.insert(usersTable)
      .values(testUser)
      .returning()
      .execute();
    const userId = userResult[0].id;

    // Create test links
    const linkResults = await db.insert(linksTable)
      .values(testLinks.map(link => ({ ...link, user_id: userId })))
      .returning()
      .execute();

    // Prepare reorder input - reverse the order
    const reorderInput: ReorderLinksInput = {
      user_id: userId,
      link_orders: [
        { id: linkResults[2].id, position: 0 }, // Third -> First
        { id: linkResults[1].id, position: 1 }, // Second -> Second
        { id: linkResults[0].id, position: 2 }  // First -> Third
      ]
    };

    // Execute reorder
    const result = await reorderLinks(reorderInput);

    // Verify success response
    expect(result.success).toBe(true);

    // Verify database changes
    const reorderedLinks = await db.select()
      .from(linksTable)
      .where(eq(linksTable.user_id, userId))
      .orderBy(asc(linksTable.position))
      .execute();

    expect(reorderedLinks).toHaveLength(3);
    expect(reorderedLinks[0].title).toEqual('Third Link');
    expect(reorderedLinks[0].position).toEqual(0);
    expect(reorderedLinks[1].title).toEqual('Second Link');
    expect(reorderedLinks[1].position).toEqual(1);
    expect(reorderedLinks[2].title).toEqual('First Link');
    expect(reorderedLinks[2].position).toEqual(2);
  });

  it('should update updated_at timestamps', async () => {
    // Create test user
    const userResult = await db.insert(usersTable)
      .values(testUser)
      .returning()
      .execute();
    const userId = userResult[0].id;

    // Create test link
    const linkResult = await db.insert(linksTable)
      .values({ ...testLinks[0], user_id: userId })
      .returning()
      .execute();

    const originalUpdatedAt = linkResult[0].updated_at;

    // Wait a bit to ensure timestamp difference
    await new Promise(resolve => setTimeout(resolve, 10));

    // Reorder (even if position doesn't change)
    const reorderInput: ReorderLinksInput = {
      user_id: userId,
      link_orders: [
        { id: linkResult[0].id, position: 5 }
      ]
    };

    await reorderLinks(reorderInput);

    // Check updated timestamp
    const updatedLink = await db.select()
      .from(linksTable)
      .where(eq(linksTable.id, linkResult[0].id))
      .execute();

    expect(updatedLink[0].updated_at).not.toEqual(originalUpdatedAt);
    expect(updatedLink[0].position).toEqual(5);
  });

  it('should handle empty link_orders array', async () => {
    // Create test user
    const userResult = await db.insert(usersTable)
      .values(testUser)
      .returning()
      .execute();
    const userId = userResult[0].id;

    const reorderInput: ReorderLinksInput = {
      user_id: userId,
      link_orders: []
    };

    const result = await reorderLinks(reorderInput);

    expect(result.success).toBe(true);
  });

  it('should throw error when link does not exist', async () => {
    // Create test user
    const userResult = await db.insert(usersTable)
      .values(testUser)
      .returning()
      .execute();
    const userId = userResult[0].id;

    const reorderInput: ReorderLinksInput = {
      user_id: userId,
      link_orders: [
        { id: 99999, position: 0 } // Non-existent link ID
      ]
    };

    expect(reorderLinks(reorderInput)).rejects.toThrow(/do not exist or do not belong/i);
  });

  it('should throw error when link belongs to different user', async () => {
    // Create two test users
    const user1Result = await db.insert(usersTable)
      .values(testUser)
      .returning()
      .execute();
    const user1Id = user1Result[0].id;

    const user2Result = await db.insert(usersTable)
      .values({
        ...testUser,
        username: 'testuser2',
        email: 'test2@example.com'
      })
      .returning()
      .execute();
    const user2Id = user2Result[0].id;

    // Create link for user1
    const linkResult = await db.insert(linksTable)
      .values({ ...testLinks[0], user_id: user1Id })
      .returning()
      .execute();

    // Try to reorder user1's link as user2
    const reorderInput: ReorderLinksInput = {
      user_id: user2Id,
      link_orders: [
        { id: linkResult[0].id, position: 0 }
      ]
    };

    expect(reorderLinks(reorderInput)).rejects.toThrow(/do not exist or do not belong/i);
  });

  it('should handle partial invalid link IDs', async () => {
    // Create test user
    const userResult = await db.insert(usersTable)
      .values(testUser)
      .returning()
      .execute();
    const userId = userResult[0].id;

    // Create one valid link
    const linkResult = await db.insert(linksTable)
      .values({ ...testLinks[0], user_id: userId })
      .returning()
      .execute();

    // Mix valid and invalid link IDs
    const reorderInput: ReorderLinksInput = {
      user_id: userId,
      link_orders: [
        { id: linkResult[0].id, position: 0 }, // Valid
        { id: 99999, position: 1 } // Invalid
      ]
    };

    expect(reorderLinks(reorderInput)).rejects.toThrow(/do not exist or do not belong/i);
  });

  it('should allow duplicate positions', async () => {
    // Create test user
    const userResult = await db.insert(usersTable)
      .values(testUser)
      .returning()
      .execute();
    const userId = userResult[0].id;

    // Create test links
    const linkResults = await db.insert(linksTable)
      .values([
        { ...testLinks[0], user_id: userId },
        { ...testLinks[1], user_id: userId }
      ])
      .returning()
      .execute();

    // Set both links to same position
    const reorderInput: ReorderLinksInput = {
      user_id: userId,
      link_orders: [
        { id: linkResults[0].id, position: 5 },
        { id: linkResults[1].id, position: 5 }
      ]
    };

    const result = await reorderLinks(reorderInput);

    expect(result.success).toBe(true);

    // Verify both have same position
    const updatedLinks = await db.select()
      .from(linksTable)
      .where(eq(linksTable.user_id, userId))
      .execute();

    expect(updatedLinks).toHaveLength(2);
    expect(updatedLinks[0].position).toEqual(5);
    expect(updatedLinks[1].position).toEqual(5);
  });
});