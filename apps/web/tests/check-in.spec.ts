import { test, expect } from '@playwright/test';

test.describe('Group Check-in Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Login first
    await page.goto('/login');
    await page.fill('#email', 'admin@sunshinepg.com');
    await page.fill('#password', 'password123');
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL('/dashboard', { timeout: 15000 });
  });

  test('Check-in page loads and shows Group Composition step', async ({ page }) => {
    await page.goto('/residents/check-in');
    
    // Should show Group Composition step
    await expect(page.locator('h3:has-text("Group Composition")')).toBeVisible();
    await expect(page.locator('text=How many residents are checking in together?')).toBeVisible();
    
    // Should have counters for males, females, couples
    await expect(page.locator('text=Male Residents')).toBeVisible();
    await expect(page.locator('text=Female Residents')).toBeVisible();
    await expect(page.locator('text=Couples')).toBeVisible();
  });

  test('Adding residents and finding rooms', async ({ page }) => {
    await page.goto('/residents/check-in');
    
    // Add 1 Male - use first plus button
    await page.locator('button:has-text("+")').first().click();
    
    // Add 1 Female - use second plus button  
    await page.locator('button:has-text("+")').nth(1).click();
    
    // Click Find Rooms
    await page.click('button:has-text("Find Rooms")');
    
    // Should navigate to Room Selection step
    await expect(page.locator('h3:has-text("Room Selection")')).toBeVisible({ timeout: 15000 });
    
    // Should show combinations
    await expect(page.locator('text=Combination 1')).toBeVisible();
    
    // Should show Male Residents and Female Residents sections
    await expect(page.locator('text=Male Residents')).toBeVisible();
    await expect(page.locator('text=Female Residents')).toBeVisible();
  });

  test('Bed locking: Male assignment blocks Female from same room', async ({ page }) => {
    await page.goto('/residents/check-in');
    
    await page.locator('button:has-text("+")').first().click(); // 1 Male
    await page.locator('button:has-text("+")').nth(1).click(); // 1 Female
    
    await page.click('button:has-text("Find Rooms")');
    
    // Wait for room selection
    await expect(page.locator('h3:has-text("Room Selection")')).toBeVisible({ timeout: 15000 });
    
    // Assign male to first available bed
    await page.locator('text=Male Residents').locator('..').locator('button:has-text("Bed 1")').first().click();
    
    // Female bed in same room should be disabled
    const femaleBed = page.locator('text=Female Residents').locator('..').locator('button:has-text("Bed")').first();
    await expect(femaleBed).toBeDisabled({ timeout: 10000 });
    
    // Should show lock icon
    await expect(page.locator('text=🔒')).toBeVisible();
  });
});