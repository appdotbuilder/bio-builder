import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable } from '../db/schema';
import { type UpdateUserInput } from '../schema';
import { updateUser } from '../handlers/update_user';
import { eq } from 'drizzle-orm';

describe('updateUser', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  // Helper function to create a test user
  const createTestUser = async () => {
    const result = await db.insert(usersTable)
      .values({
        username: 'testuser',
        email: 'test@example.com',
        display_name: 'Original Name',
        bio: 'Original bio',
        avatar_url: 'https://example.com/avatar.jpg',
        theme: 'light',
        is_active: true
      })
      .returning()
      .execute();
    return result[0];
  };

  it('should update display_name field', async () => {
    const testUser = await createTestUser();
    const input: UpdateUserInput = {
      id: testUser.id,
      display_name: 'Updated Display Name'
    };

    const result = await updateUser(input);

    expect(result.id).toEqual(testUser.id);
    expect(result.display_name).toEqual('Updated Display Name');
    expect(result.username).toEqual(testUser.username); // Should remain unchanged
    expect(result.email).toEqual(testUser.email); // Should remain unchanged
    expect(result.bio).toEqual(testUser.bio); // Should remain unchanged
    expect(result.updated_at).toBeInstanceOf(Date);
    expect(result.updated_at > testUser.updated_at).toBe(true);
  });

  it('should update bio field', async () => {
    const testUser = await createTestUser();
    const input: UpdateUserInput = {
      id: testUser.id,
      bio: 'This is my updated bio with more details'
    };

    const result = await updateUser(input);

    expect(result.bio).toEqual('This is my updated bio with more details');
    expect(result.display_name).toEqual(testUser.display_name); // Should remain unchanged
  });

  it('should update avatar_url field', async () => {
    const testUser = await createTestUser();
    const input: UpdateUserInput = {
      id: testUser.id,
      avatar_url: 'https://example.com/new-avatar.jpg'
    };

    const result = await updateUser(input);

    expect(result.avatar_url).toEqual('https://example.com/new-avatar.jpg');
    expect(result.display_name).toEqual(testUser.display_name); // Should remain unchanged
  });

  it('should update theme field', async () => {
    const testUser = await createTestUser();
    const input: UpdateUserInput = {
      id: testUser.id,
      theme: 'dark'
    };

    const result = await updateUser(input);

    expect(result.theme).toEqual('dark');
    expect(result.display_name).toEqual(testUser.display_name); // Should remain unchanged
  });

  it('should update is_active field', async () => {
    const testUser = await createTestUser();
    const input: UpdateUserInput = {
      id: testUser.id,
      is_active: false
    };

    const result = await updateUser(input);

    expect(result.is_active).toEqual(false);
    expect(result.display_name).toEqual(testUser.display_name); // Should remain unchanged
  });

  it('should update multiple fields at once', async () => {
    const testUser = await createTestUser();
    const input: UpdateUserInput = {
      id: testUser.id,
      display_name: 'Multi Update Name',
      bio: 'Multi update bio',
      theme: 'gradient',
      is_active: false
    };

    const result = await updateUser(input);

    expect(result.display_name).toEqual('Multi Update Name');
    expect(result.bio).toEqual('Multi update bio');
    expect(result.theme).toEqual('gradient');
    expect(result.is_active).toEqual(false);
    expect(result.username).toEqual(testUser.username); // Should remain unchanged
    expect(result.email).toEqual(testUser.email); // Should remain unchanged
  });

  it('should set nullable fields to null', async () => {
    const testUser = await createTestUser();
    const input: UpdateUserInput = {
      id: testUser.id,
      display_name: null,
      bio: null,
      avatar_url: null
    };

    const result = await updateUser(input);

    expect(result.display_name).toBeNull();
    expect(result.bio).toBeNull();
    expect(result.avatar_url).toBeNull();
    expect(result.theme).toEqual(testUser.theme); // Should remain unchanged
  });

  it('should save changes to database', async () => {
    const testUser = await createTestUser();
    const input: UpdateUserInput = {
      id: testUser.id,
      display_name: 'Database Test Name',
      bio: 'Database test bio'
    };

    await updateUser(input);

    // Verify changes were persisted to database
    const updatedUser = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, testUser.id))
      .execute();

    expect(updatedUser).toHaveLength(1);
    expect(updatedUser[0].display_name).toEqual('Database Test Name');
    expect(updatedUser[0].bio).toEqual('Database test bio');
    expect(updatedUser[0].username).toEqual(testUser.username);
    expect(updatedUser[0].email).toEqual(testUser.email);
    expect(updatedUser[0].updated_at).toBeInstanceOf(Date);
    expect(updatedUser[0].updated_at > testUser.updated_at).toBe(true);
  });

  it('should throw error when user does not exist', async () => {
    const input: UpdateUserInput = {
      id: 99999, // Non-existent user ID
      display_name: 'Should Fail'
    };

    await expect(updateUser(input)).rejects.toThrow(/User with id 99999 not found/i);
  });

  it('should handle partial updates correctly', async () => {
    const testUser = await createTestUser();
    
    // First update - only display_name
    const firstInput: UpdateUserInput = {
      id: testUser.id,
      display_name: 'First Update'
    };

    const firstResult = await updateUser(firstInput);
    expect(firstResult.display_name).toEqual('First Update');
    expect(firstResult.bio).toEqual(testUser.bio); // Should remain unchanged

    // Second update - only bio (display_name should remain from first update)
    const secondInput: UpdateUserInput = {
      id: testUser.id,
      bio: 'Second update bio'
    };

    const secondResult = await updateUser(secondInput);
    expect(secondResult.display_name).toEqual('First Update'); // Should remain from first update
    expect(secondResult.bio).toEqual('Second update bio');
  });

  it('should update updated_at timestamp on every update', async () => {
    const testUser = await createTestUser();
    const originalUpdatedAt = testUser.updated_at;

    // Small delay to ensure timestamp difference
    await new Promise(resolve => setTimeout(resolve, 10));

    const input: UpdateUserInput = {
      id: testUser.id,
      display_name: 'Timestamp Test'
    };

    const result = await updateUser(input);

    expect(result.updated_at).toBeInstanceOf(Date);
    expect(result.updated_at > originalUpdatedAt).toBe(true);
  });
});