// tests/smoke.spec.js - Test simple para verificar configuración

const { test, expect } = require('@playwright/test');

test.describe('Smoke Test', () => {
  test('debe cargar la página de login', async ({ page }) => {
    await page.goto('/login');

    // Verificar que el título está presente
    await expect(page.locator('h1:has-text("Sistema Registro TxH")')).toBeVisible();

    // Verificar que hay campos de email y password
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();

    // Verificar que hay botón de submit
    await expect(page.locator('button[type="submit"]')).toBeVisible();
  });

  test('debe mostrar error con credenciales incorrectas', async ({ page }) => {
    await page.goto('/login');

    await page.fill('input[type="email"]', 'wrong@example.com');
    await page.fill('input[type="password"]', 'wrongpassword');
    await page.click('button[type="submit"]');

    // Esperar mensaje de error (puede tardar un poco por la validación del backend)
    await page.waitForTimeout(2000);

    // Debería mostrar algún error
    const hasError = await page.locator('.alert-error, [role="alert"]').count() > 0;
    expect(hasError).toBeTruthy();
  });
});
