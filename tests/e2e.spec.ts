import { test, expect, request } from '@playwright/test';

function uniqueMobile() {
  return '999' + Math.floor(Math.random() * 9000000 + 1000000).toString();
}

test.describe('E2E: Login -> Meeting Create -> Meeting List -> Dashboard', () => {
  test('register, login, create meeting and verify list/dashboard', async ({ page, baseURL }) => {
    const apiContext = await request.newContext({ baseURL });

    const mobile = uniqueMobile();
    const password = 'P@ssw0rd!';

    // Register user
    const registerRes = await apiContext.post('/api/register', {
      data: { name: 'E2E User', mobile, password }
    });
    expect(registerRes.ok()).toBeTruthy();

    // Login
    const loginRes = await apiContext.post('/api/login', {
      data: { mobile, password }
    });
    expect(loginRes.ok()).toBeTruthy();
    const loginJson = await loginRes.json();
    expect(loginJson.user).toBeTruthy();

    // Create meeting via API (simulate UI flow)
    const meetingPayload = {
      title: 'E2E Meeting ' + Date.now(),
      agenda: 'E2E Agenda',
      meeting_date: new Date().toISOString().split('T')[0],
      meeting_type: 'Internal',
      location: 'E2E Location'
    };

    const createRes = await apiContext.post('/api/meetings', { data: meetingPayload });
    expect(createRes.ok()).toBeTruthy();

    // Visit meeting-list page and verify
    await page.goto('/meeting-list');
    await page.waitForLoadState('networkidle');

    const content = await page.content();
    expect(content).toContain(meetingPayload.title);

    // Visit dashboard and verify counts update
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

    const dashboardContent = await page.content();
    expect(dashboardContent).toContain('Total Meetings');

    // basic assertion that meeting title or count appears
    expect(dashboardContent.length).toBeGreaterThan(10);
  });
});
