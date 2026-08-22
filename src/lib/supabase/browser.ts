/**
 * ============================================================
 * Temple Operations Reporting System
 * File        : src/lib/supabase/browser.ts
 * Author      : Your Name
 * Created     : YYYY-MM-DD
 * ============================================================
 * PURPOSE
 *   Create the browser-side Supabase client.
 *
 * DESCRIPTION
 *   - Browser only
 *   - Uses SvelteKit SSR helpers
 *   - Handles authentication
 *   - Handles realtime
 *   - Handles storage
 *
 * DEPENDS ON
 *   src/lib/supabase/client.ts
 *
 * USED BY
 *   +layout.ts
 *   +layout.svelte
 *   Auth
 *   Chat
 *   Reports
 * ============================================================
 */

import { browser } from '$app/environment';
import { supabase } from './client';

/**
 * Browser Supabase Client
 *
 * Returns the shared client only when
 * running inside the browser.
 */
export function getSupabaseBrowser() {
	if (!browser) {
		throw new Error('Supabase browser client can only be used in the browser.');
	}

	return supabase;
}

export default getSupabaseBrowser;