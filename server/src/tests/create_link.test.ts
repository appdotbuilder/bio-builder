import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { linksTable, usersTable } from '../db/schema';
import { type CreateLinkInput } from '../schema';
import { createLink } from '../handlers/create_link';
import { eq } from 'drizzle-orm';

// Test user data
const testUser = {
  username: 'testuser',
  email: 'test@example.com',
  display_name: 'Test User',
  bio: 'Test bio',
  avatar_url: 'https://example.com/avatar.jpg',
  theme: 'minimal' as const
};

// Test link input
const testLinkInput: CreateLinkInput = {
  user_id: 1, // Will be set dynamically after user creation
  title: 'My Website',
  url: 'https://example.com',
  description: 'Check out my personal website',
  icon: 'globe',
  position: 0
};

describe('createLink', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should create a link with all fields', async () => {
    // Create test user first
    const userResult = await db.insert(usersTable)
      .values(testUser)
      .returning()
      .execute();

    const userId = userResult[0].id;
    const linkInput = { ...testLinkInput, user_id: userId };

    const result = await createLink(linkInput);

    // Verify all fields
    expect(result.user_id).toEqual(userId);
    expect(result.title).toEqual('My Website');
    expect(result.url).toEqual('https://example.com');
    expect(result.description).toEqual('Check out my personal website');
    expect(result.icon).toEqual('globe');
    expect(result.position).toEqual(0);
    expect(result.is_active).toEqual(true);
    expect(result.click_count).toEqual(0);
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should save link to database', async () => {
    // Create test user
    const userResult = await db.insert(usersTable)
      .values(testUser)
      .returning()
      .execute();

    const userId = userResult[0].id;
    const linkInput = { ...testLinkInput, user_id: userId };

    const result = await createLink(linkInput);

    // Query database to verify link was saved
    const links = await db.select()
      .from(linksTable)
      .where(eq(linksTable.id, result.id))
      .execute();

    expect(links).toHaveLength(1);
    expect(links[0].title).toEqual('My Website');
    expect(links[0].url).toEqual('https://example.com');
    expect(links[0].user_id).toEqual(userId);
    expect(links[0].position).toEqual(0);
  });

  it('should auto-assign position when not provided', async () => {
    // Create test user
    const userResult = await db.insert(usersTable)
      .values(testUser)
      .returning()
      .execute();

    const userId = userResult[0].id;

    // Create first link without position
    const linkInput1 = {
      user_id: userId,
      title: 'First Link',
      url: 'https://first.com',
      description: null,
      icon: null
    };

    const result1 = await createLink(linkInput1);
    expect(result1.position).toEqual(0);

    // Create second link without position - should get next position
    const linkInput2 = {
      user_id: userId,
      title: 'Second Link',
      url: 'https://second.com',
      description: null,
      icon: null
    };

    const result2 = await createLink(linkInput2);
    expect(result2.position).toEqual(1);

    // Create third link without position
    const linkInput3 = {
      user_id: userId,
      title: 'Third Link',
      url: 'https://third.com',
      description: null,
      icon: null
    };

    const result3 = await createLink(linkInput3);
    expect(result3.position).toEqual(2);
  });

  it('should handle nullable fields correctly', async () => {
    // Create test user
    const userResult = await db.insert(usersTable)
      .values(testUser)
      .returning()
      .execute();

    const userId = userResult[0].id;

    // Create link with null description and icon
    const linkInput = {
      user_id: userId,
      title: 'Simple Link',
      url: 'https://simple.com',
      description: null,
      icon: null
    };

    const result = await createLink(linkInput);

    expect(result.title).toEqual('Simple Link');
    expect(result.url).toEqual('https://simple.com');
    expect(result.description).toBeNull();
    expect(result.icon).toBeNull();
    expect(result.position).toEqual(0); // Auto-assigned
  });

  it('should respect explicit position when provided', async () => {
    // Create test user
    const userResult = await db.insert(usersTable)
      .values(testUser)
      .returning()
      .execute();

    const userId = userResult[0].id;

    // Create link with explicit position
    const linkInput = {
      user_id: userId,
      title: 'Positioned Link',
      url: 'https://positioned.com',
      description: null,
      icon: null,
      position: 5
    };

    const result = await createLink(linkInput);
    expect(result.position).toEqual(5);
  });

  it('should throw error when user does not exist', async () => {
    const linkInput = {
      user_id: 999, // Non-existent user
      title: 'Test Link',
      url: 'https://test.com',
      description: null,
      icon: null
    };

    await expect(createLink(linkInput)).rejects.toThrow(/User with id 999 not found/i);
  });

  it('should handle position assignment for multiple users independently', async () => {
    // Create two test users
    const user1Result = await db.insert(usersTable)
      .values({ ...testUser, username: 'user1', email: 'user1@example.com' })
      .returning()
      .execute();

    const user2Result = await db.insert(usersTable)
      .values({ ...testUser, username: 'user2', email: 'user2@example.com' })
      .returning()
      .execute();

    const userId1 = user1Result[0].id;
    const userId2 = user2Result[0].id;

    // Create links for user1
    const link1User1 = await createLink({
      user_id: userId1,
      title: 'User1 Link1',
      url: 'https://user1-link1.com',
      description: null,
      icon: null
    });

    const link2User1 = await createLink({
      user_id: userId1,
      title: 'User1 Link2',
      url: 'https://user1-link2.com',
      description: null,
      icon: null
    });

    // Create links for user2 - positions should start from 0
    const link1User2 = await createLink({
      user_id: userId2,
      title: 'User2 Link1',
      url: 'https://user2-link1.com',
      description: null,
      icon: null
    });

    // Verify positions are independent per user
    expect(link1User1.position).toEqual(0);
    expect(link2User1.position).toEqual(1);
    expect(link1User2.position).toEqual(0); // Starts from 0 for user2
  });
});