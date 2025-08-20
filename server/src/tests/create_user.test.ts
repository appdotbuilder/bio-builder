import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable } from '../db/schema';
import { type CreateUserInput } from '../schema';
import { createUser } from '../handlers/create_user';
import { eq } from 'drizzle-orm';

// Test input with all fields
const testInput: CreateUserInput = {
  username: 'testcreator',
  email: 'test@example.com',
  display_name: 'Test Creator',
  bio: 'A bio for testing purposes',
  avatar_url: 'https://example.com/avatar.jpg',
  theme: 'dark'
};

// Minimal test input with required fields only
const minimalInput: CreateUserInput = {
  username: 'minimal_user',
  email: 'minimal@example.com',
  display_name: null,
  bio: null,
  avatar_url: null,
  theme: 'minimal' // Uses Zod default
};

describe('createUser', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should create a user with all fields', async () => {
    const result = await createUser(testInput);

    // Basic field validation
    expect(result.username).toEqual('testcreator');
    expect(result.email).toEqual('test@example.com');
    expect(result.display_name).toEqual('Test Creator');
    expect(result.bio).toEqual('A bio for testing purposes');
    expect(result.avatar_url).toEqual('https://example.com/avatar.jpg');
    expect(result.theme).toEqual('dark');
    expect(result.is_active).toEqual(true);
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should create a user with minimal required fields', async () => {
    const result = await createUser(minimalInput);

    expect(result.username).toEqual('minimal_user');
    expect(result.email).toEqual('minimal@example.com');
    expect(result.display_name).toBeNull();
    expect(result.bio).toBeNull();
    expect(result.avatar_url).toBeNull();
    expect(result.theme).toEqual('minimal');
    expect(result.is_active).toEqual(true);
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should save user to database', async () => {
    const result = await createUser(testInput);

    // Query using proper drizzle syntax
    const users = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, result.id))
      .execute();

    expect(users).toHaveLength(1);
    expect(users[0].username).toEqual('testcreator');
    expect(users[0].email).toEqual('test@example.com');
    expect(users[0].display_name).toEqual('Test Creator');
    expect(users[0].bio).toEqual('A bio for testing purposes');
    expect(users[0].avatar_url).toEqual('https://example.com/avatar.jpg');
    expect(users[0].theme).toEqual('dark');
    expect(users[0].is_active).toEqual(true);
    expect(users[0].created_at).toBeInstanceOf(Date);
    expect(users[0].updated_at).toBeInstanceOf(Date);
  });

  it('should enforce unique username constraint', async () => {
    // Create first user
    await createUser(testInput);

    // Attempt to create second user with same username but different email
    const duplicateUsernameInput: CreateUserInput = {
      ...testInput,
      email: 'different@example.com'
    };

    await expect(createUser(duplicateUsernameInput))
      .rejects.toThrow(/duplicate key value violates unique constraint/i);
  });

  it('should enforce unique email constraint', async () => {
    // Create first user
    await createUser(testInput);

    // Attempt to create second user with same email but different username
    const duplicateEmailInput: CreateUserInput = {
      ...testInput,
      username: 'different_username'
    };

    await expect(createUser(duplicateEmailInput))
      .rejects.toThrow(/duplicate key value violates unique constraint/i);
  });

  it('should handle all theme values correctly', async () => {
    const themes: Array<'light' | 'dark' | 'gradient' | 'minimal'> = ['light', 'dark', 'gradient', 'minimal'];
    
    for (const theme of themes) {
      const themeInput: CreateUserInput = {
        username: `user_${theme}`,
        email: `${theme}@example.com`,
        display_name: null,
        bio: null,
        avatar_url: null,
        theme
      };

      const result = await createUser(themeInput);
      expect(result.theme).toEqual(theme);
    }
  });

  it('should set default values correctly', async () => {
    const result = await createUser(minimalInput);

    // Check database defaults are applied
    expect(result.is_active).toEqual(true); // Database default
    expect(result.theme).toEqual('minimal'); // Zod default
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
    
    // Verify timestamps are recent (within last minute)
    const now = new Date();
    const oneMinuteAgo = new Date(now.getTime() - 60000);
    expect(result.created_at >= oneMinuteAgo).toBe(true);
    expect(result.updated_at >= oneMinuteAgo).toBe(true);
  });

  it('should handle null values for optional fields', async () => {
    const nullFieldsInput: CreateUserInput = {
      username: 'null_fields_user',
      email: 'null@example.com',
      display_name: null,
      bio: null,
      avatar_url: null,
      theme: 'light'
    };

    const result = await createUser(nullFieldsInput);

    expect(result.display_name).toBeNull();
    expect(result.bio).toBeNull();
    expect(result.avatar_url).toBeNull();
    
    // Verify these are stored as NULL in database
    const users = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, result.id))
      .execute();

    expect(users[0].display_name).toBeNull();
    expect(users[0].bio).toBeNull();
    expect(users[0].avatar_url).toBeNull();
  });
});