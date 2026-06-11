import { test, expect, type ConsoleMessage } from '@playwright/test';

/**
 * Phase 1 smoke test — the app must bootstrap without console errors.
 *
 * This guards the foundation: any future PR that breaks the new
 * `bootstrapApplication` shell, the lazy routes, or the new providers
 * will be caught here.
 */
test('app bootstraps without console errors', async ({ page }) => {
    const consoleErrors: string[] = [];
    const pageErrors: string[] = [];

    page.on('console', (msg: ConsoleMessage) => {
        if (msg.type() === 'error') {
            consoleErrors.push(msg.text());
        }
    });
    page.on('pageerror', (err) => {
        pageErrors.push(err.message);
    });

    await page.goto('/');

    // The shell should render — at minimum, the <app-root> must be present.
    await expect(page.locator('app-root')).toBeVisible();

    // Loading the app should not produce uncaught exceptions.
    // (Filtered: ignore benign noise like favicon 404 if any.)
    const fatalErrors = [
        ...consoleErrors.filter((m) => !/favicon\.ico/.test(m)),
        ...pageErrors,
    ];
    expect(fatalErrors, `Unexpected errors:\n${fatalErrors.join('\n')}`).toEqual([]);
});
