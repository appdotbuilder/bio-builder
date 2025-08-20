import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, linksTable } from '../db/schema';
import { eq } from 'drizzle-orm';
import { type UpdateLinkInput, type CreateUserInput } from '../schema';
import { updateLink } from '../handlers/update_link';

// Test user for creating links
const testUser: CreateUserInput = {
  username: 'testuser',
  email: 'test@example.com',
  display_name: 'Test User',
  bio: 'Testing bio',
  avatar_url: null,
  theme: 'minimal'
};

// Helper function to create a test user and return the ID
async function createTestUser(): Promise<number> {
  const result = await db.insert(usersTable)
    .values({
      username: testUser.username,
      email: testUser.email,
      display_name: testUser.display_name,
      bio: testUser.bio,
      avatar_url: testUser.avatar_url,
      theme: testUser.theme
    })
    .returning()
    .execute();
  
  return result[0].id;
}

// Helper function to create a test link
async function createTestLink(userId: number) {
  const result = await db.insert(linksTable)
    .values({
      user_id: userId,
      title: 'Original Title',
      url: 'https://original.com',
      description: 'Original description',
      icon: 'original-icon',
      position: 0,
      is_active: true,
      click_count: 5
    })
    .returning()
    .execute();
  
  return result[0];
}

describe('updateLink', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should update link title', async () => {
    const userId = await createTestUser();
    const link = await createTestLink(userId);

    const input: UpdateLinkInput = {
      id: link.id,
      title: 'Updated Title'
    };

    const result = await updateLink(input);

    expect(result.id).toBe(link.id);
    expect(result.title).toBe('Updated Title');
    expect(result.url).toBe(link.url); // Should remain unchanged
    expect(result.description).toBe(link.description); // Should remain unchanged
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should update link URL', async () => {
    const userId = await createTestUser();
    const link = await createTestLink(userId);

    const input: UpdateLinkInput = {
      id: link.id,
      url: 'https://updated.com'
    };

    const result = await updateLink(input);

    expect(result.id).toBe(link.id);
    expect(result.url).toBe('https://updated.com');
    expect(result.title).toBe(link.title); // Should remain unchanged
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should update multiple fields at once', async () => {
    const userId = await createTestUser();
    const link = await createTestLink(userId);

    const input: UpdateLinkInput = {
      id: link.id,
      title: 'New Title',
      url: 'https://new.com',
      description: 'New description',
      icon: 'new-icon',
      position: 10,
      is_active: false
    };

    const result = await updateLink(input);

    expect(result.id).toBe(link.id);
    expect(result.title).toBe('New Title');
    expect(result.url).toBe('https://new.com');
    expect(result.description).toBe('New description');
    expect(result.icon).toBe('new-icon');
    expect(result.position).toBe(10);
    expect(result.is_active).toBe(false);
    expect(result.click_count).toBe(link.click_count); // Should remain unchanged
    expect(result.updated_at).toBeInstanceOf(Date);
    expect(result.updated_at > link.updated_at).toBe(true);
  });

  it('should update nullable fields to null', async () => {
    const userId = await createTestUser();
    const link = await createTestLink(userId);

    const input: UpdateLinkInput = {
      id: link.id,
      description: null,
      icon: null
    };

    const result = await updateLink(input);

    expect(result.description).toBeNull();
    expect(result.icon).toBeNull();
    expect(result.title).toBe(link.title); // Should remain unchanged
  });

  it('should update position to zero', async () => {
    const userId = await createTestUser();
    const link = await createTestLink(userId);

    // First set position to non-zero
    await db.update(linksTable)
      .set({ position: 5 })
      .where(eq(linksTable.id, link.id))
      .execute();

    const input: UpdateLinkInput = {
      id: link.id,
      position: 0
    };

    const result = await updateLink(input);

    expect(result.position).toBe(0);
  });

  it('should save changes to database', async () => {
    const userId = await createTestUser();
    const link = await createTestLink(userId);

    const input: UpdateLinkInput = {
      id: link.id,
      title: 'Database Test Title',
      is_active: false
    };

    await updateLink(input);

    // Verify changes were saved to database
    const savedLinks = await db.select()
      .from(linksTable)
      .where(eq(linksTable.id, link.id))
      .execute();

    expect(savedLinks).toHaveLength(1);
    expect(savedLinks[0].title).toBe('Database Test Title');
    expect(savedLinks[0].is_active).toBe(false);
    expect(savedLinks[0].updated_at).toBeInstanceOf(Date);
    expect(savedLinks[0].updated_at > link.updated_at).toBe(true);
  });

  it('should preserve unchanged fields', async () => {
    const userId = await createTestUser();
    const link = await createTestLink(userId);

    const input: UpdateLinkInput = {
      id: link.id,
      title: 'Only Title Changed'
    };

    const result = await updateLink(input);

    // All other fields should remain the same
    expect(result.user_id).toBe(link.user_id);
    expect(result.url).toBe(link.url);
    expect(result.description).toBe(link.description);
    expect(result.icon).toBe(link.icon);
    expect(result.position).toBe(link.position);
    expect(result.is_active).toBe(link.is_active);
    expect(result.click_count).toBe(link.click_count);
    expect(result.created_at).toEqual(link.created_at);
  });

  it('should throw error for non-existent link', async () => {
    const input: UpdateLinkInput = {
      id: 999999, // Non-existent ID
      title: 'This should fail'
    };

    await expect(updateLink(input)).rejects.toThrow(/Link with id 999999 not found/i);
  });

  it('should handle partial updates correctly', async () => {
    const userId = await createTestUser();
    const link = await createTestLink(userId);

    // Update only one field
    const input1: UpdateLinkInput = {
      id: link.id,
      is_active: false
    };

    const result1 = await updateLink(input1);
    expect(result1.is_active).toBe(false);
    expect(result1.title).toBe(link.title);

    // Update a different field
    const input2: UpdateLinkInput = {
      id: link.id,
      position: 99
    };

    const result2 = await updateLink(input2);
    expect(result2.position).toBe(99);
    expect(result2.is_active).toBe(false); // Should preserve previous update
    expect(result2.title).toBe(link.title); // Should still be original
  });
});