import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, linksTable } from '../db/schema';
import { type DeleteLinkInput } from '../handlers/delete_link';
import { deleteLink } from '../handlers/delete_link';
import { eq, and, asc } from 'drizzle-orm';

describe('deleteLink', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should delete a link successfully', async () => {
    // Create test user
    const userResult = await db.insert(usersTable)
      .values({
        username: 'testuser',
        email: 'test@example.com',
        display_name: 'Test User',
        bio: null,
        avatar_url: null,
        theme: 'minimal'
      })
      .returning()
      .execute();

    const userId = userResult[0].id;

    // Create test link
    const linkResult = await db.insert(linksTable)
      .values({
        user_id: userId,
        title: 'Test Link',
        url: 'https://example.com',
        description: 'A test link',
        icon: null,
        position: 0
      })
      .returning()
      .execute();

    const linkId = linkResult[0].id;

    const input: DeleteLinkInput = { id: linkId };

    // Delete the link
    const result = await deleteLink(input);

    expect(result.success).toBe(true);

    // Verify link is deleted from database
    const deletedLinks = await db.select()
      .from(linksTable)
      .where(eq(linksTable.id, linkId))
      .execute();

    expect(deletedLinks).toHaveLength(0);
  });

  it('should reorder remaining links after deletion', async () => {
    // Create test user
    const userResult = await db.insert(usersTable)
      .values({
        username: 'testuser',
        email: 'test@example.com',
        display_name: 'Test User',
        bio: null,
        avatar_url: null,
        theme: 'minimal'
      })
      .returning()
      .execute();

    const userId = userResult[0].id;

    // Create multiple test links with different positions
    const linksData = [
      { title: 'Link 0', position: 0 },
      { title: 'Link 1', position: 1 },
      { title: 'Link 2', position: 2 },
      { title: 'Link 3', position: 3 }
    ];

    const createdLinks = [];
    for (const linkData of linksData) {
      const linkResult = await db.insert(linksTable)
        .values({
          user_id: userId,
          title: linkData.title,
          url: 'https://example.com',
          description: null,
          icon: null,
          position: linkData.position
        })
        .returning()
        .execute();
      createdLinks.push(linkResult[0]);
    }

    // Delete the middle link (position 1)
    const linkToDelete = createdLinks.find(link => link.position === 1);
    const input: DeleteLinkInput = { id: linkToDelete!.id };

    await deleteLink(input);

    // Check that remaining links are properly reordered
    const remainingLinks = await db.select()
      .from(linksTable)
      .where(eq(linksTable.user_id, userId))
      .orderBy(asc(linksTable.position))
      .execute();

    expect(remainingLinks).toHaveLength(3);

    // Verify positions are 0, 1, 2 (no gaps)
    expect(remainingLinks[0].position).toBe(0);
    expect(remainingLinks[0].title).toBe('Link 0');

    expect(remainingLinks[1].position).toBe(1);
    expect(remainingLinks[1].title).toBe('Link 2'); // This was position 2, now position 1

    expect(remainingLinks[2].position).toBe(2);
    expect(remainingLinks[2].title).toBe('Link 3'); // This was position 3, now position 2
  });

  it('should only reorder links for the same user', async () => {
    // Create two test users
    const user1Result = await db.insert(usersTable)
      .values({
        username: 'user1',
        email: 'user1@example.com',
        display_name: 'User 1',
        bio: null,
        avatar_url: null,
        theme: 'minimal'
      })
      .returning()
      .execute();

    const user2Result = await db.insert(usersTable)
      .values({
        username: 'user2',
        email: 'user2@example.com',
        display_name: 'User 2',
        bio: null,
        avatar_url: null,
        theme: 'minimal'
      })
      .returning()
      .execute();

    const user1Id = user1Result[0].id;
    const user2Id = user2Result[0].id;

    // Create links for both users with same positions
    const user1LinkResult = await db.insert(linksTable)
      .values({
        user_id: user1Id,
        title: 'User 1 Link 1',
        url: 'https://example.com',
        description: null,
        icon: null,
        position: 1
      })
      .returning()
      .execute();

    await db.insert(linksTable)
      .values({
        user_id: user2Id,
        title: 'User 2 Link 1',
        url: 'https://example.com',
        description: null,
        icon: null,
        position: 1
      })
      .execute();

    await db.insert(linksTable)
      .values({
        user_id: user2Id,
        title: 'User 2 Link 2',
        url: 'https://example.com',
        description: null,
        icon: null,
        position: 2
      })
      .execute();

    // Delete user1's link
    const input: DeleteLinkInput = { id: user1LinkResult[0].id };
    await deleteLink(input);

    // Verify user2's links are unchanged
    const user2Links = await db.select()
      .from(linksTable)
      .where(eq(linksTable.user_id, user2Id))
      .orderBy(asc(linksTable.position))
      .execute();

    expect(user2Links).toHaveLength(2);
    expect(user2Links[0].position).toBe(1); // Should remain unchanged
    expect(user2Links[1].position).toBe(2); // Should remain unchanged
  });

  it('should handle deletion of last positioned link', async () => {
    // Create test user
    const userResult = await db.insert(usersTable)
      .values({
        username: 'testuser',
        email: 'test@example.com',
        display_name: 'Test User',
        bio: null,
        avatar_url: null,
        theme: 'minimal'
      })
      .returning()
      .execute();

    const userId = userResult[0].id;

    // Create multiple links
    const linksData = [
      { title: 'Link 0', position: 0 },
      { title: 'Link 1', position: 1 },
      { title: 'Link 2', position: 2 }
    ];

    const createdLinks = [];
    for (const linkData of linksData) {
      const linkResult = await db.insert(linksTable)
        .values({
          user_id: userId,
          title: linkData.title,
          url: 'https://example.com',
          description: null,
          icon: null,
          position: linkData.position
        })
        .returning()
        .execute();
      createdLinks.push(linkResult[0]);
    }

    // Delete the last link (position 2)
    const lastLink = createdLinks.find(link => link.position === 2);
    const input: DeleteLinkInput = { id: lastLink!.id };

    await deleteLink(input);

    // Check remaining links maintain their positions (no reordering needed)
    const remainingLinks = await db.select()
      .from(linksTable)
      .where(eq(linksTable.user_id, userId))
      .orderBy(asc(linksTable.position))
      .execute();

    expect(remainingLinks).toHaveLength(2);
    expect(remainingLinks[0].position).toBe(0);
    expect(remainingLinks[1].position).toBe(1);
  });

  it('should throw error when link does not exist', async () => {
    const input: DeleteLinkInput = { id: 99999 };

    expect(deleteLink(input)).rejects.toThrow(/Link with id 99999 not found/i);
  });

  it('should handle deletion when user has only one link', async () => {
    // Create test user
    const userResult = await db.insert(usersTable)
      .values({
        username: 'testuser',
        email: 'test@example.com',
        display_name: 'Test User',
        bio: null,
        avatar_url: null,
        theme: 'minimal'
      })
      .returning()
      .execute();

    const userId = userResult[0].id;

    // Create single link
    const linkResult = await db.insert(linksTable)
      .values({
        user_id: userId,
        title: 'Only Link',
        url: 'https://example.com',
        description: null,
        icon: null,
        position: 0
      })
      .returning()
      .execute();

    const input: DeleteLinkInput = { id: linkResult[0].id };

    const result = await deleteLink(input);

    expect(result.success).toBe(true);

    // Verify no links remain
    const remainingLinks = await db.select()
      .from(linksTable)
      .where(eq(linksTable.user_id, userId))
      .execute();

    expect(remainingLinks).toHaveLength(0);
  });
});