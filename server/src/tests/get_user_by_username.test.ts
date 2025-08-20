import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable } from '../db/schema';
import { type GetUserByUsernameInput, type CreateUserInput } from '../schema';
import { getUserByUsername } from '../handlers/get_user_by_username';

// Test user input data
const testUser: CreateUserInput = {
  username: 'testcreator',
  email: 'test@example.com',
  display_name: 'Test Creator',
  bio: 'A bio for testing purposes',
  avatar_url: 'https://example.com/avatar.jpg',
  theme: 'dark'
};

const testUser2: CreateUserInput = {
  username: 'anothercreator',
  email: 'another@example.com',
  display_name: null,
  bio: null,
  avatar_url: null,
  theme: 'minimal'
};

describe('getUserByUsername', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should find an existing user by username', async () => {
    // Create test user first
    const insertResult = await db.insert(usersTable)
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

    const createdUser = insertResult[0];

    // Test the handler
    const input: GetUserByUsernameInput = {
      username: 'testcreator'
    };

    const result = await getUserByUsername(input);

    // Verify user was found
    expect(result).not.toBeNull();
    expect(result!.id).toEqual(createdUser.id);
    expect(result!.username).toEqual('testcreator');
    expect(result!.email).toEqual('test@example.com');
    expect(result!.display_name).toEqual('Test Creator');
    expect(result!.bio).toEqual('A bio for testing purposes');
    expect(result!.avatar_url).toEqual('https://example.com/avatar.jpg');
    expect(result!.theme).toEqual('dark');
    expect(result!.is_active).toBe(true);
    expect(result!.created_at).toBeInstanceOf(Date);
    expect(result!.updated_at).toBeInstanceOf(Date);
  });

  it('should return null for non-existent username', async () => {
    const input: GetUserByUsernameInput = {
      username: 'nonexistentuser'
    };

    const result = await getUserByUsername(input);

    expect(result).toBeNull();
  });

  it('should handle user with null optional fields', async () => {
    // Create user with null optional fields
    await db.insert(usersTable)
      .values({
        username: testUser2.username,
        email: testUser2.email,
        display_name: testUser2.display_name,
        bio: testUser2.bio,
        avatar_url: testUser2.avatar_url,
        theme: testUser2.theme
      })
      .execute();

    const input: GetUserByUsernameInput = {
      username: 'anothercreator'
    };

    const result = await getUserByUsername(input);

    expect(result).not.toBeNull();
    expect(result!.username).toEqual('anothercreator');
    expect(result!.email).toEqual('another@example.com');
    expect(result!.display_name).toBeNull();
    expect(result!.bio).toBeNull();
    expect(result!.avatar_url).toBeNull();
    expect(result!.theme).toEqual('minimal');
    expect(result!.is_active).toBe(true);
  });

  it('should be case-sensitive for usernames', async () => {
    // Create user with lowercase username
    await db.insert(usersTable)
      .values({
        username: 'lowercase',
        email: 'test@example.com',
        display_name: 'Test User',
        bio: null,
        avatar_url: null,
        theme: 'minimal'
      })
      .execute();

    // Search with different case
    const input: GetUserByUsernameInput = {
      username: 'LOWERCASE'
    };

    const result = await getUserByUsername(input);

    // Should not find user due to case sensitivity
    expect(result).toBeNull();
  });

  it('should handle inactive users', async () => {
    // Create inactive user
    await db.insert(usersTable)
      .values({
        username: 'inactiveuser',
        email: 'inactive@example.com',
        display_name: 'Inactive User',
        bio: null,
        avatar_url: null,
        theme: 'minimal',
        is_active: false
      })
      .execute();

    const input: GetUserByUsernameInput = {
      username: 'inactiveuser'
    };

    const result = await getUserByUsername(input);

    // Should still find inactive user (business logic may filter elsewhere)
    expect(result).not.toBeNull();
    expect(result!.username).toEqual('inactiveuser');
    expect(result!.is_active).toBe(false);
  });

  it('should handle special characters in username', async () => {
    // Create user with special characters (if allowed by database constraints)
    await db.insert(usersTable)
      .values({
        username: 'user_with-dots.123',
        email: 'special@example.com',
        display_name: 'Special User',
        bio: null,
        avatar_url: null,
        theme: 'gradient'
      })
      .execute();

    const input: GetUserByUsernameInput = {
      username: 'user_with-dots.123'
    };

    const result = await getUserByUsername(input);

    expect(result).not.toBeNull();
    expect(result!.username).toEqual('user_with-dots.123');
    expect(result!.theme).toEqual('gradient');
  });
});