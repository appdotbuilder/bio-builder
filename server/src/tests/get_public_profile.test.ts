import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, linksTable } from '../db/schema';
import { type GetUserByUsernameInput } from '../schema';
import { getPublicProfile } from '../handlers/get_public_profile';

describe('getPublicProfile', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return public profile with user and links', async () => {
    // Create a test user
    const userResult = await db.insert(usersTable)
      .values({
        username: 'testcreator',
        email: 'test@example.com',
        display_name: 'Test Creator',
        bio: 'Hello world!',
        theme: 'dark',
        is_active: true
      })
      .returning()
      .execute();

    const userId = userResult[0].id;

    // Create test links in different positions
    await db.insert(linksTable)
      .values([
        {
          user_id: userId,
          title: 'Portfolio',
          url: 'https://portfolio.com',
          description: 'My work',
          icon: 'portfolio',
          position: 2,
          is_active: true,
          click_count: 10
        },
        {
          user_id: userId,
          title: 'Blog',
          url: 'https://blog.com',
          description: 'My thoughts',
          icon: 'blog',
          position: 0,
          is_active: true,
          click_count: 5
        },
        {
          user_id: userId,
          title: 'Contact',
          url: 'https://contact.com',
          description: 'Get in touch',
          icon: 'contact',
          position: 1,
          is_active: true,
          click_count: 3
        }
      ])
      .execute();

    const input: GetUserByUsernameInput = {
      username: 'testcreator'
    };

    const result = await getPublicProfile(input);

    // Verify user data
    expect(result).not.toBeNull();
    expect(result!.user.username).toEqual('testcreator');
    expect(result!.user.email).toEqual('test@example.com');
    expect(result!.user.display_name).toEqual('Test Creator');
    expect(result!.user.bio).toEqual('Hello world!');
    expect(result!.user.theme).toEqual('dark');
    expect(result!.user.is_active).toBe(true);
    expect(result!.user.created_at).toBeInstanceOf(Date);

    // Verify links are returned in correct order (by position)
    expect(result!.links).toHaveLength(3);
    expect(result!.links[0].title).toEqual('Blog'); // position 0
    expect(result!.links[0].position).toEqual(0);
    expect(result!.links[1].title).toEqual('Contact'); // position 1
    expect(result!.links[1].position).toEqual(1);
    expect(result!.links[2].title).toEqual('Portfolio'); // position 2
    expect(result!.links[2].position).toEqual(2);

    // Verify link data structure
    const firstLink = result!.links[0];
    expect(firstLink.url).toEqual('https://blog.com');
    expect(firstLink.description).toEqual('My thoughts');
    expect(firstLink.icon).toEqual('blog');
    expect(firstLink.is_active).toBe(true);
    expect(firstLink.click_count).toEqual(5);
    expect(firstLink.created_at).toBeInstanceOf(Date);
  });

  it('should return null for non-existent username', async () => {
    const input: GetUserByUsernameInput = {
      username: 'nonexistent'
    };

    const result = await getPublicProfile(input);

    expect(result).toBeNull();
  });

  it('should return null for inactive user', async () => {
    // Create an inactive user
    await db.insert(usersTable)
      .values({
        username: 'inactiveuser',
        email: 'inactive@example.com',
        theme: 'minimal',
        is_active: false
      })
      .execute();

    const input: GetUserByUsernameInput = {
      username: 'inactiveuser'
    };

    const result = await getPublicProfile(input);

    expect(result).toBeNull();
  });

  it('should only return active links', async () => {
    // Create a test user
    const userResult = await db.insert(usersTable)
      .values({
        username: 'linktester',
        email: 'links@example.com',
        theme: 'gradient',
        is_active: true
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
          url: 'https://active.com',
          position: 0,
          is_active: true,
          click_count: 0
        },
        {
          user_id: userId,
          title: 'Inactive Link',
          url: 'https://inactive.com',
          position: 1,
          is_active: false,
          click_count: 0
        }
      ])
      .execute();

    const input: GetUserByUsernameInput = {
      username: 'linktester'
    };

    const result = await getPublicProfile(input);

    expect(result).not.toBeNull();
    expect(result!.links).toHaveLength(1);
    expect(result!.links[0].title).toEqual('Active Link');
    expect(result!.links[0].is_active).toBe(true);
  });

  it('should return user with empty links array when no active links', async () => {
    // Create a test user
    const userResult = await db.insert(usersTable)
      .values({
        username: 'nolinks',
        email: 'nolinks@example.com',
        theme: 'light',
        is_active: true
      })
      .returning()
      .execute();

    const input: GetUserByUsernameInput = {
      username: 'nolinks'
    };

    const result = await getPublicProfile(input);

    expect(result).not.toBeNull();
    expect(result!.user.username).toEqual('nolinks');
    expect(result!.links).toHaveLength(0);
    expect(Array.isArray(result!.links)).toBe(true);
  });

  it('should handle nullable fields correctly', async () => {
    // Create user with null optional fields
    await db.insert(usersTable)
      .values({
        username: 'minimal',
        email: 'minimal@example.com',
        display_name: null,
        bio: null,
        avatar_url: null,
        theme: 'minimal',
        is_active: true
      })
      .returning()
      .execute();

    const input: GetUserByUsernameInput = {
      username: 'minimal'
    };

    const result = await getPublicProfile(input);

    expect(result).not.toBeNull();
    expect(result!.user.display_name).toBeNull();
    expect(result!.user.bio).toBeNull();
    expect(result!.user.avatar_url).toBeNull();
    expect(result!.user.theme).toEqual('minimal');
  });
});