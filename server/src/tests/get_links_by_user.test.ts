import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, linksTable } from '../db/schema';
import { type GetLinksByUserInput } from '../schema';
import { getLinksByUser } from '../handlers/get_links_by_user';

describe('getLinksByUser', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return empty array for user with no links', async () => {
    // Create a user first
    const userResult = await db.insert(usersTable)
      .values({
        username: 'testuser',
        email: 'test@example.com',
        theme: 'minimal'
      })
      .returning()
      .execute();

    const input: GetLinksByUserInput = {
      user_id: userResult[0].id
    };

    const result = await getLinksByUser(input);

    expect(result).toHaveLength(0);
    expect(Array.isArray(result)).toBe(true);
  });

  it('should return links ordered by position', async () => {
    // Create a user first
    const userResult = await db.insert(usersTable)
      .values({
        username: 'creator',
        email: 'creator@example.com',
        theme: 'gradient'
      })
      .returning()
      .execute();

    const userId = userResult[0].id;

    // Create multiple links with different positions
    await db.insert(linksTable)
      .values([
        {
          user_id: userId,
          title: 'Third Link',
          url: 'https://example.com/third',
          description: 'Should be third',
          position: 2,
          click_count: 5
        },
        {
          user_id: userId,
          title: 'First Link',
          url: 'https://example.com/first',
          description: 'Should be first',
          position: 0,
          click_count: 10
        },
        {
          user_id: userId,
          title: 'Second Link',
          url: 'https://example.com/second',
          description: 'Should be second',
          position: 1,
          click_count: 7
        }
      ])
      .execute();

    const input: GetLinksByUserInput = {
      user_id: userId
    };

    const result = await getLinksByUser(input);

    expect(result).toHaveLength(3);
    
    // Verify ordering by position
    expect(result[0].title).toEqual('First Link');
    expect(result[0].position).toEqual(0);
    expect(result[1].title).toEqual('Second Link');
    expect(result[1].position).toEqual(1);
    expect(result[2].title).toEqual('Third Link');
    expect(result[2].position).toEqual(2);
  });

  it('should return all link fields correctly', async () => {
    // Create a user first
    const userResult = await db.insert(usersTable)
      .values({
        username: 'linkowner',
        email: 'owner@example.com',
        theme: 'dark'
      })
      .returning()
      .execute();

    const userId = userResult[0].id;

    // Create a link with all fields populated
    const linkResult = await db.insert(linksTable)
      .values({
        user_id: userId,
        title: 'My Portfolio',
        url: 'https://portfolio.example.com',
        description: 'Check out my latest work',
        icon: 'portfolio-icon',
        position: 0,
        is_active: true,
        click_count: 42
      })
      .returning()
      .execute();

    const input: GetLinksByUserInput = {
      user_id: userId
    };

    const result = await getLinksByUser(input);

    expect(result).toHaveLength(1);
    
    const link = result[0];
    expect(link.id).toBeDefined();
    expect(link.user_id).toEqual(userId);
    expect(link.title).toEqual('My Portfolio');
    expect(link.url).toEqual('https://portfolio.example.com');
    expect(link.description).toEqual('Check out my latest work');
    expect(link.icon).toEqual('portfolio-icon');
    expect(link.position).toEqual(0);
    expect(link.is_active).toEqual(true);
    expect(link.click_count).toEqual(42);
    expect(link.created_at).toBeInstanceOf(Date);
    expect(link.updated_at).toBeInstanceOf(Date);
  });

  it('should return links with null values for nullable fields', async () => {
    // Create a user first
    const userResult = await db.insert(usersTable)
      .values({
        username: 'minimal_user',
        email: 'minimal@example.com',
        theme: 'minimal'
      })
      .returning()
      .execute();

    const userId = userResult[0].id;

    // Create a link with minimal fields (nullable fields as null)
    await db.insert(linksTable)
      .values({
        user_id: userId,
        title: 'Simple Link',
        url: 'https://simple.example.com',
        description: null,
        icon: null,
        position: 0
      })
      .execute();

    const input: GetLinksByUserInput = {
      user_id: userId
    };

    const result = await getLinksByUser(input);

    expect(result).toHaveLength(1);
    
    const link = result[0];
    expect(link.title).toEqual('Simple Link');
    expect(link.url).toEqual('https://simple.example.com');
    expect(link.description).toBeNull();
    expect(link.icon).toBeNull();
    expect(link.position).toEqual(0);
    expect(link.is_active).toEqual(true); // Default value
    expect(link.click_count).toEqual(0); // Default value
  });

  it('should only return links for the specified user', async () => {
    // Create two users
    const user1Result = await db.insert(usersTable)
      .values({
        username: 'user1',
        email: 'user1@example.com',
        theme: 'light'
      })
      .returning()
      .execute();

    const user2Result = await db.insert(usersTable)
      .values({
        username: 'user2',
        email: 'user2@example.com',
        theme: 'dark'
      })
      .returning()
      .execute();

    const user1Id = user1Result[0].id;
    const user2Id = user2Result[0].id;

    // Create links for both users
    await db.insert(linksTable)
      .values([
        {
          user_id: user1Id,
          title: 'User 1 Link',
          url: 'https://user1.example.com',
          position: 0
        },
        {
          user_id: user2Id,
          title: 'User 2 Link',
          url: 'https://user2.example.com',
          position: 0
        }
      ])
      .execute();

    // Query links for user 1
    const input: GetLinksByUserInput = {
      user_id: user1Id
    };

    const result = await getLinksByUser(input);

    expect(result).toHaveLength(1);
    expect(result[0].title).toEqual('User 1 Link');
    expect(result[0].user_id).toEqual(user1Id);
  });

  it('should handle inactive links', async () => {
    // Create a user first
    const userResult = await db.insert(usersTable)
      .values({
        username: 'mixed_user',
        email: 'mixed@example.com',
        theme: 'gradient'
      })
      .returning()
      .execute();

    const userId = userResult[0].id;

    // Create both active and inactive links
    await db.insert(linksTable)
      .values([
        {
          user_id: userId,
          title: 'Active Link',
          url: 'https://active.example.com',
          position: 0,
          is_active: true
        },
        {
          user_id: userId,
          title: 'Inactive Link',
          url: 'https://inactive.example.com',
          position: 1,
          is_active: false
        }
      ])
      .execute();

    const input: GetLinksByUserInput = {
      user_id: userId
    };

    const result = await getLinksByUser(input);

    // Should return both active and inactive links (filtering is handled by UI/other layers)
    expect(result).toHaveLength(2);
    expect(result[0].title).toEqual('Active Link');
    expect(result[0].is_active).toEqual(true);
    expect(result[1].title).toEqual('Inactive Link');
    expect(result[1].is_active).toEqual(false);
  });
});