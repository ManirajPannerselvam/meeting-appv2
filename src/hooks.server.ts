import { createServerClient } from '@supabase/ssr'
import { type Handle } from '@sveltejs/kit'
import { env } from '$env/dynamic/public'

const supabaseHandle: Handle = async ({ event, resolve }) => {
	// 1. /api/ping, /api/auth maathiri public routes ku auth check vendaam
	// Ithaan 50K request-a stop pannum
	if (
		event.url.pathname.startsWith('/api/ping') ||
		event.url.pathname.startsWith('/api/health') ||
		event.url.pathname.startsWith('/api/auth/callback')
	) {
		return resolve(event)
	}

	const supabaseUrl = env.PUBLIC_SUPABASE_CHAT_URL || env.PUBLIC_SUPABASE_URL
	const supabaseAnonKey = env.PUBLIC_SUPABASE_CHAT_ANON_KEY || env.PUBLIC_SUPABASE_ANON_KEY

	if (!supabaseUrl || !supabaseAnonKey) {
		console.error('Missing Supabase env')
		return resolve(event)
	}

	event.locals.supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
		cookies: {
			getAll() {
				return event.cookies.getAll()
			},
			setAll(cookiesToSet) {
				cookiesToSet.forEach(({ name, value, options }) => {
					try {
						event.cookies.set(name, value, { ...options, path: '/' })
					} catch {}
				})
			}
		}
	})

	try {
		const { data: { session } } = await event.locals.supabase.auth.getSession()

		if (!session) {
			event.locals.user = null
			event.locals.session = null
		} else {
			// getUser call vendaam - getSession pothum, speed ku
			// getUser thevaipatta mattum call pannu
			event.locals.user = session.user ?? null
			event.locals.session = session ?? null
		}
	} catch (error: any) {
		// Silent-a iru, log panna koodathu - log thaan Vercel bill ah ethuthu
		event.locals.user = null
		event.locals.session = null
	}

	return resolve(event, {
		filterSerializedResponseHeaders(name) {
			return name === 'content-range' || name === 'x-supabase-api-version'
		}
	})
}

export const handle = supabaseHandle