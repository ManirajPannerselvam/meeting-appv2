/**
 * Temple Operations Reporting System
 * File: src/lib/services/auth.service.ts - FIXED
 */

import { supabase } from "$lib/supabase/client";
import { authStore } from "$lib/stores/auth";
import { toast } from "$lib/stores/toast";
import type { Session, User } from "@supabase/supabase-js";
import type { UserRecord } from "$lib/types/database";

type AuthUser = User & Partial<UserRecord>;

class AuthService {
	private authListener: { subscription: { unsubscribe(): void; }; } | null = null;

	private setLoading(value: boolean): void { authStore.setLoading(value); }

	private handleError(error: unknown, message = "Authentication error"): never {
		console.error(message, error);
		const err = error instanceof Error? error : new Error(String(error));
		toast.error(err.message);
		throw err;
	}

	async signIn(email: string): Promise<void> {
		this.setLoading(true);
		try {
			const { error } = await supabase.auth.signInWithOtp({
				email,
				options: { emailRedirectTo: `${window.location.origin}/auth/callback` }
			});
			if (error) throw error;
			toast.success("OTP sent to your email.");
		} catch (error) {
			this.handleError(error, "Failed to send OTP");
		} finally { this.setLoading(false); }
	}

	async verifyOtp(email: string, token: string): Promise<Session | null> {
		this.setLoading(true);
		try {
			const { data, error } = await supabase.auth.verifyOtp({ email, token, type: "email" });
			if (error) throw error;
			if (data.session?.user) {
				await this.loadUserProfile(data.session.user);
				toast.success("Login successful.");
			}
			return data.session;
		} catch (error) {
			this.handleError(error, "Invalid OTP");
		} finally { this.setLoading(false); }
	}

	// FIXED: profiles table with id column
	private async loadUserProfile(authUser: User): Promise<void> {
		try {
			const { data: profile, error } = await supabase
				.from("profiles")
				.select("*")
				.eq("id", authUser.id)
				.maybeSingle();

			if (error) {
				console.warn("Profile fetch error:", error.message);
				authStore.setUser({...authUser } as AuthUser);
				return;
			}

			if (profile) {
				const userWithProfile: AuthUser = {...authUser,...profile };
				authStore.setUser(userWithProfile);
				if (!authUser.user_metadata?.role && (profile as any).role) {
					await supabase.auth.updateUser({
						data: { role: (profile as any).role, full_name: (profile as any).full_name || (profile as any).name }
					});
				}
			} else {
				// Auto-create profile if not exists
				await supabase.from("profiles").insert({
					id: authUser.id,
					email: authUser.email,
					name: authUser.user_metadata?.full_name || authUser.email?.split('@')[0],
					avatar_url: authUser.user_metadata?.avatar_url || null
				}).select().maybeSingle();
				authStore.setUser({...authUser } as AuthUser);
			}
		} catch (error) {
			console.error("Failed to load profile", error);
			authStore.setUser({...authUser } as AuthUser);
		}
	}

	async refreshUser(): Promise<void> {
		this.setLoading(true);
		try {
			const { data: { user } } = await supabase.auth.getUser();
			if (user) await this.loadUserProfile(user);
		} catch (error) { this.handleError(error, "Failed to refresh user"); }
		finally { this.setLoading(false); }
	}

	async restoreSession(): Promise<Session | null> {
		this.setLoading(true);
		try {
			const { data: { session }, error } = await supabase.auth.getSession();
			if (error) throw error;
			authStore.setSession(session);
			if (session?.user) await this.loadUserProfile(session.user);
			this.initAuthListener();
			return session;
		} catch (error) { this.handleError(error, "Failed to restore session"); }
		finally { this.setLoading(false); }
	}

	async getCurrentUser(): Promise<AuthUser | null> {
		const { data: { user }, error } = await supabase.auth.getUser();
		if (error) throw error;
		if (user) await this.loadUserProfile(user);
		return user as AuthUser | null;
	}

	initAuthListener(): void {
		if (this.authListener) return;
		const { data } = supabase.auth.onAuthStateChange(async (event, session) => {
			authStore.setSession(session);
			if (session?.user) { await this.loadUserProfile(session.user); }
			else { authStore.setUser(null); }
			switch (event) {
				case "SIGNED_IN": toast.success("Welcome back!"); break;
				case "SIGNED_OUT": toast.info("Logged out."); break;
			}
		});
		this.authListener = data;
	}

	destroyAuthListener(): void {
		this.authListener?.subscription.unsubscribe();
		this.authListener = null;
	}

	async signOut(): Promise<void> {
		this.setLoading(true);
		try {
			const { error } = await supabase.auth.signOut();
			if (error) throw error;
			authStore.reset();
			this.destroyAuthListener();
			toast.success("Logged out successfully.");
		} catch (error) { this.handleError(error, "Logout failed"); }
		finally { this.setLoading(false); }
	}

	async isAuthenticated(): Promise<boolean> {
		const { data: { session } } = await supabase.auth.getSession();
		return!!session;
	}

	async updatePassword(newPassword: string): Promise<void> {
		const { error } = await supabase.auth.updateUser({ password: newPassword });
		if (error) throw error;
		toast.success("Password updated.");
	}
}

export const authService = new AuthService();
export default authService;