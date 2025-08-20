import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, linksTable } from '../db/schema';
import { type TrackLinkClickInput } from '../schema';
import { trackLinkClick } from '../handlers/track_link_click';
import { eq } from 'drizzle-orm';

// Test input for tracking a link click
const testInput: TrackLinkClickInput = {
  link_id: 1
};

describe('trackLinkClick', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should increment click count for existing link', async () => {
    // Create prerequisite user
    const userResult = await db.insert(usersTable)
      .values({
        username: 'testuser',
        email: 'test@example.com',
        theme: 'minimal'
      })
      .returning()
      .execute();

    // Create test link with initial click count
    const linkResult = await db.insert(linksTable)
      .values({
        user_id: userResult[0].id,
        title: 'Test Link',
        url: 'https://example.com',
        description: 'A test link',
        position: 0,
        click_count: 5
      })
      .returning()
      .execute();

    const result = await trackLinkClick({
      link_id: linkResult[0].id
    });

    // Should return success
    expect(result.success).toBe(true);

    // Verify click count was incremented
    const updatedLinks = await db.select()
      .from(linksTable)
      .where(eq(linksTable.id, linkResult[0].id))
      .execute();

    expect(updatedLinks).toHaveLength(1);
    expect(updatedLinks[0].click_count).toEqual(6);
    expect(updatedLinks[0].updated_at).toBeInstanceOf(Date);
  });

  it('should increment click count from zero', async () => {
    // Create prerequisite user
    const userResult = await db.insert(usersTable)
      .values({
        username: 'testuser',
        email: 'test@example.com',
        theme: 'minimal'
      })
      .returning()
      .execute();

    // Create test link with zero click count
    const linkResult = await db.insert(linksTable)
      .values({
        user_id: userResult[0].id,
        title: 'Test Link',
        url: 'https://example.com',
        position: 0,
        click_count: 0
      })
      .returning()
      .execute();

    const result = await trackLinkClick({
      link_id: linkResult[0].id
    });

    // Should return success
    expect(result.success).toBe(true);

    // Verify click count was incremented from 0 to 1
    const updatedLinks = await db.select()
      .from(linksTable)
      .where(eq(linksTable.id, linkResult[0].id))
      .execute();

    expect(updatedLinks).toHaveLength(1);
    expect(updatedLinks[0].click_count).toEqual(1);
  });

  it('should return false for non-existent link', async () => {
    const result = await trackLinkClick({
      link_id: 999999 // Non-existent link ID
    });

    // Should return false since no row was updated
    expect(result.success).toBe(false);
  });

  it('should handle multiple increments correctly', async () => {
    // Create prerequisite user
    const userResult = await db.insert(usersTable)
      .values({
        username: 'testuser',
        email: 'test@example.com',
        theme: 'minimal'
      })
      .returning()
      .execute();

    // Create test link
    const linkResult = await db.insert(linksTable)
      .values({
        user_id: userResult[0].id,
        title: 'Test Link',
        url: 'https://example.com',
        position: 0,
        click_count: 10
      })
      .returning()
      .execute();

    // Track multiple clicks
    for (let i = 0; i < 3; i++) {
      const result = await trackLinkClick({
        link_id: linkResult[0].id
      });
      expect(result.success).toBe(true);
    }

    // Verify final click count
    const updatedLinks = await db.select()
      .from(linksTable)
      .where(eq(linksTable.id, linkResult[0].id))
      .execute();

    expect(updatedLinks).toHaveLength(1);
    expect(updatedLinks[0].click_count).toEqual(13); // 10 + 3 clicks
  });

  it('should update the updated_at timestamp', async () => {
    // Create prerequisite user
    const userResult = await db.insert(usersTable)
      .values({
        username: 'testuser',
        email: 'test@example.com',
        theme: 'minimal'
      })
      .returning()
      .execute();

    // Create test link
    const linkResult = await db.insert(linksTable)
      .values({
        user_id: userResult[0].id,
        title: 'Test Link',
        url: 'https://example.com',
        position: 0,
        click_count: 0
      })
      .returning()
      .execute();

    const originalTimestamp = linkResult[0].updated_at;
    
    // Wait a small amount to ensure timestamp difference
    await new Promise(resolve => setTimeout(resolve, 10));

    const result = await trackLinkClick({
      link_id: linkResult[0].id
    });

    expect(result.success).toBe(true);

    // Verify updated_at timestamp was changed
    const updatedLinks = await db.select()
      .from(linksTable)
      .where(eq(linksTable.id, linkResult[0].id))
      .execute();

    expect(updatedLinks).toHaveLength(1);
    expect(updatedLinks[0].updated_at).toBeInstanceOf(Date);
    expect(updatedLinks[0].updated_at.getTime()).toBeGreaterThan(originalTimestamp.getTime());
  });
});