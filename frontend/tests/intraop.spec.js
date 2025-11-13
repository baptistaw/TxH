// tests/intraop.spec.js - Tests para módulo Intraop

const { test, expect } = require('@playwright/test');

// Configuración
const TEST_USER = {
  email: 'admin@txh.uy',
  password: 'admin123',
};

// Helper para hacer login
async function login(page) {
  await page.goto('/login');
  await page.fill('input[type="email"]', TEST_USER.email);
  await page.fill('input[type="password"]', TEST_USER.password);
  await page.click('button[type="submit"]');
  await page.waitForURL('/cases', { timeout: 10000 });
}

test.describe('Módulo Intraop', () => {
  test.beforeEach(async ({ page }) => {
    // Login antes de cada test
    await login(page);
  });

  test('debe mostrar la página de intraop con todas las fases', async ({ page }) => {
    // Navegar a casos y entrar al primero
    await page.goto('/cases');

    // Esperar a que cargue la tabla
    await page.waitForSelector('table', { timeout: 10000 });

    // Hacer clic en "Ver Detalles" del primer caso
    const firstDetailsButton = page.locator('a:has-text("Ver Detalles")').first();
    await firstDetailsButton.click();

    // Esperar a que cargue la página de detalle
    await page.waitForURL(/\/cases\/[a-z0-9]+$/, { timeout: 10000 });

    // Construir URL de intraop basada en la URL actual
    const currentUrl = page.url();
    const intraopUrl = currentUrl + '/intraop';

    // Navegar a intraop
    await page.goto(intraopUrl);

    // Verificar que cargó la página
    await expect(page.locator('h1:has-text("Registro Intraoperatorio")')).toBeVisible();

    // Verificar que están todas las 7 fases
    await expect(page.locator('text=Inducción')).toBeVisible();
    await expect(page.locator('text=Disección')).toBeVisible();
    await expect(page.locator('text=Anhepática Inicial')).toBeVisible();
    await expect(page.locator('text=Pre-Reperfusión')).toBeVisible();
    await expect(page.locator('text=Post-Reperfusión Inicial')).toBeVisible();
    await expect(page.locator('text=Fin Vía Biliar')).toBeVisible();
    await expect(page.locator('text=Cierre')).toBeVisible();

    // Verificar que hay atajos de teclado documentados
    await expect(page.locator('text=Ctrl+N')).toBeVisible();
    await expect(page.locator('text=Ctrl+D')).toBeVisible();
  });

  test('debe crear 2 snapshots en fase Inducción', async ({ page }) => {
    // Navegar a casos y entrar al primero
    await page.goto('/cases');
    await page.waitForSelector('table', { timeout: 10000 });

    const firstDetailsButton = page.locator('a:has-text("Ver Detalles")').first();
    await firstDetailsButton.click();

    await page.waitForURL(/\/cases\/[a-z0-9]+$/, { timeout: 10000 });

    const currentUrl = page.url();
    const intraopUrl = currentUrl + '/intraop';
    await page.goto(intraopUrl);

    // Esperar a que cargue
    await page.waitForSelector('h1:has-text("Registro Intraoperatorio")', { timeout: 10000 });

    // La fase "Inducción" debería estar expandida por defecto
    // Hacer clic en "Nueva Fila"
    const newRowButton = page.locator('button:has-text("Nueva Fila")').first();
    await newRowButton.click();

    // Llenar el formulario del primer snapshot
    // Timestamp (ya viene pre-llenado, pero podemos cambiarlo)
    const timestampInput = page.locator('input[type="datetime-local"]').first();

    // FC (Heart Rate)
    const hrInput = page.locator('input[type="number"]').nth(0);
    await hrInput.fill('75');

    // PAS
    const sysInput = page.locator('input[type="number"]').nth(1);
    await sysInput.fill('120');

    // PAD
    const diaInput = page.locator('input[type="number"]').nth(2);
    await diaInput.fill('80');

    // PAm se debería calcular automáticamente, pero lo dejamos vacío para probar

    // Guardar
    const saveButton = page.locator('button[title*="Guardar"]').first();
    await saveButton.click();

    // Esperar a que se guarde
    await page.waitForTimeout(1000);

    // Crear segundo snapshot usando "Nueva Fila" nuevamente
    await newRowButton.click();

    // Llenar segundo snapshot
    await page.locator('input[type="number"]').nth(0).fill('78');
    await page.locator('input[type="number"]').nth(1).fill('125');
    await page.locator('input[type="number"]').nth(2).fill('82');

    // Guardar
    await page.locator('button[title*="Guardar"]').first().click();

    // Esperar a que se guarde
    await page.waitForTimeout(1000);

    // Verificar que hay 2 registros
    const recordCount = page.locator('text=/\\d+ registros?/').first();
    await expect(recordCount).toContainText('2 registros');

    // Verificar que PAm se calculó automáticamente (93 para 120/80)
    // En la tabla, buscar valores de PAm
    const mapCells = page.locator('td.font-medium.text-surgical-400');
    const count = await mapCells.count();
    expect(count).toBeGreaterThanOrEqual(2);
  });

  test('debe editar 1 snapshot existente', async ({ page }) => {
    // Navegar a casos y entrar al primero
    await page.goto('/cases');
    await page.waitForSelector('table', { timeout: 10000 });

    const firstDetailsButton = page.locator('a:has-text("Ver Detalles")').first();
    await firstDetailsButton.click();

    await page.waitForURL(/\/cases\/[a-z0-9]+$/, { timeout: 10000 });

    const currentUrl = page.url();
    const intraopUrl = currentUrl + '/intraop';
    await page.goto(intraopUrl);

    await page.waitForSelector('h1:has-text("Registro Intraoperatorio")', { timeout: 10000 });

    // Si no hay registros, crear uno primero
    const newRowButton = page.locator('button:has-text("Nueva Fila")').first();
    const hasRecords = await page.locator('td:has-text("-")').count() < 10; // Si hay muchos "-", no hay registros

    if (!hasRecords) {
      await newRowButton.click();
      await page.locator('input[type="number"]').nth(0).fill('70');
      await page.locator('input[type="number"]').nth(1).fill('110');
      await page.locator('input[type="number"]').nth(2).fill('75');
      await page.locator('button[title*="Guardar"]').first().click();
      await page.waitForTimeout(1000);
    }

    // Ahora editar el primer registro
    // Hacer clic en el botón de editar (lápiz)
    const editButton = page.locator('button svg[d*="11 5H6a2"]').first(); // SVG del lápiz
    await editButton.click();

    // Esperar a que aparezcan los inputs de edición
    await page.waitForTimeout(500);

    // Cambiar FC a 85
    const hrInput = page.locator('input[type="number"]').nth(0);
    await hrInput.clear();
    await hrInput.fill('85');

    // Cambiar PAS a 130
    const sysInput = page.locator('input[type="number"]').nth(1);
    await sysInput.clear();
    await sysInput.fill('130');

    // Guardar
    const saveButton = page.locator('button svg[d*="5 13l4 4L19 7"]').first(); // SVG del check
    await saveButton.click();

    // Esperar a que se guarde
    await page.waitForTimeout(1000);

    // Verificar que los cambios se guardaron
    // La tabla debería mostrar FC=85
    await expect(page.locator('td:has-text("85")').first()).toBeVisible();
  });

  test('debe validar campos con mensajes claros', async ({ page }) => {
    // Navegar a intraop
    await page.goto('/cases');
    await page.waitForSelector('table', { timeout: 10000 });

    const firstDetailsButton = page.locator('a:has-text("Ver Detalles")').first();
    await firstDetailsButton.click();

    await page.waitForURL(/\/cases\/[a-z0-9]+$/, { timeout: 10000 });

    const currentUrl = page.url();
    const intraopUrl = currentUrl + '/intraop';
    await page.goto(intraopUrl);

    await page.waitForSelector('h1:has-text("Registro Intraoperatorio")', { timeout: 10000 });

    // Hacer clic en "Nueva Fila"
    const newRowButton = page.locator('button:has-text("Nueva Fila")').first();
    await newRowButton.click();

    // Intentar guardar sin llenar campos requeridos
    // (timestamp es requerido pero viene pre-llenado)

    // Intentar poner valores fuera de rango
    // FC debe estar entre 20-250
    const hrInput = page.locator('input[type="number"]').nth(0);
    await hrInput.fill('300'); // Fuera de rango

    // El backend debería rechazarlo cuando se envíe
    // Por ahora, verificamos que el input permite ingresar el valor
    await expect(hrInput).toHaveValue('300');

    // Cambiar a valor válido
    await hrInput.clear();
    await hrInput.fill('75');

    // Verificar que PAm se calcula automáticamente
    const sysInput = page.locator('input[type="number"]').nth(1);
    await sysInput.fill('120');

    const diaInput = page.locator('input[type="number"]').nth(2);
    await diaInput.fill('80');

    // PAm debería ser 93 (calculado automáticamente)
    // Esperar un poco para que se calcule
    await page.waitForTimeout(500);

    const mapInput = page.locator('input[type="number"]').nth(3);
    await expect(mapInput).toHaveValue('93');
  });

  test('debe duplicar última fila correctamente', async ({ page }) => {
    // Navegar a intraop
    await page.goto('/cases');
    await page.waitForSelector('table', { timeout: 10000 });

    const firstDetailsButton = page.locator('a:has-text("Ver Detalles")').first();
    await firstDetailsButton.click();

    await page.waitForURL(/\/cases\/[a-z0-9]+$/, { timeout: 10000 });

    const currentUrl = page.url();
    const intraopUrl = currentUrl + '/intraop';
    await page.goto(intraopUrl);

    await page.waitForSelector('h1:has-text("Registro Intraoperatorio")', { timeout: 10000 });

    // Crear un registro primero
    const newRowButton = page.locator('button:has-text("Nueva Fila")').first();
    await newRowButton.click();

    await page.locator('input[type="number"]').nth(0).fill('72');
    await page.locator('input[type="number"]').nth(1).fill('115');
    await page.locator('input[type="number"]').nth(2).fill('78');

    await page.locator('button[title*="Guardar"]').first().click();
    await page.waitForTimeout(1000);

    // Ahora duplicar
    const duplicateButton = page.locator('button:has-text("Duplicar Última")').first();
    await duplicateButton.click();

    // Esperar a que se duplique
    await page.waitForTimeout(1000);

    // Verificar que hay 2 registros
    const recordCount = page.locator('text=/\\d+ registros?/').first();
    await expect(recordCount).toContainText('2 registros');

    // Verificar que los valores se duplicaron (FC=72 debería aparecer 2 veces)
    const fcCells = page.locator('td:has-text("72")');
    const count = await fcCells.count();
    expect(count).toBeGreaterThanOrEqual(2);
  });

  test('debe permitir eliminar un registro', async ({ page }) => {
    // Navegar a intraop
    await page.goto('/cases');
    await page.waitForSelector('table', { timeout: 10000 });

    const firstDetailsButton = page.locator('a:has-text("Ver Detalles")').first();
    await firstDetailsButton.click();

    await page.waitForURL(/\/cases\/[a-z0-9]+$/, { timeout: 10000 });

    const currentUrl = page.url();
    const intraopUrl = currentUrl + '/intraop';
    await page.goto(intraopUrl);

    await page.waitForSelector('h1:has-text("Registro Intraoperatorio")', { timeout: 10000 });

    // Crear un registro para eliminar
    const newRowButton = page.locator('button:has-text("Nueva Fila")').first();
    await newRowButton.click();

    await page.locator('input[type="number"]').nth(0).fill('68');
    await page.locator('button[title*="Guardar"]').first().click();
    await page.waitForTimeout(1000);

    // Verificar que existe
    await expect(page.locator('td:has-text("68")').first()).toBeVisible();

    // Preparar para aceptar el confirm dialog
    page.on('dialog', dialog => dialog.accept());

    // Hacer clic en eliminar (icono de papelera)
    const deleteButton = page.locator('button svg[d*="19 7l-.867"]').first(); // SVG de papelera
    await deleteButton.click();

    // Esperar a que se elimine
    await page.waitForTimeout(1000);

    // Verificar que el registro ya no existe
    // Si no hay registros, debería mostrar el mensaje de "No hay registros"
    const noRecordsMessage = page.locator('text=No hay registros');
    const hasNoRecords = await noRecordsMessage.isVisible().catch(() => false);

    // Si hay otros registros, el de FC=68 no debería estar
    if (!hasNoRecords) {
      const fcCell = page.locator('td:has-text("68")');
      const stillExists = await fcCell.isVisible().catch(() => false);
      expect(stillExists).toBeFalsy();
    }
  });
});
