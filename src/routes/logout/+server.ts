import { redirect } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ locals: { supabase }, cookies }) => {
	await supabase.auth.signOut();
	// Clear all supabase cookies
	cookies.getAll().forEach(c => {
		if(c.name.startsWith('sb-')) cookies.delete(c.name, { path: '/' });
	});
	throw redirect(303, '/login');
};

export const POST: RequestHandler = async ({ locals: { supabase }, cookies }) => {
	await supabase.auth.signOut();
	cookies.getAll().forEach(c => {
		if(c.name.startsWith('sb-')) cookies.delete(c.name, { path: '/' });
	});
	throw redirect(303, '/login');
};