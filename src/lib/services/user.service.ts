/**
 * ============================================================
 * Temple Operations Reporting System
 * File        : src/lib/services/user.service.ts
 * ============================================================
 * PURPOSE
 *   User business logic with Auth + Profile + Audit
 *
 * TABLES
 *   users - profile table
 *   auth.users - supabase auth
 * ============================================================
 */

import { supabase } from "$lib/supabase/client";
import { userStore } from "$lib/stores/user";
import { writeAuditLog } from "$lib/audit";
import { toast } from "$lib/stores/toast";

import type { UserRecord, UUID } from "$lib/types/database";
import type { User } from "@supabase/supabase-js";

type CreateUserPayload = {
	email: string;
	password: string;
	full_name: string;
	role: 'admin' | 'manager' | 'accountant' | 'user';
	phone?: string;
}

class UserService {

	private setLoading(value: boolean): void {
		userStore.setLoading(value);
	}

	private handleError(error: unknown, msg = "User error"): never {
		console.error(msg, error);
		toast.error(error instanceof Error ? error.message : String(error));
		throw error instanceof Error ? error : new Error(String(error));
	}

	/**
	 * Load all users with filters + pagination
	 */
	async loadUsers(
		filters?: { is_active?: boolean; role?: string },
		range: [number, number] = [0, 99]
	): Promise<UserRecord[]> {
		this.setLoading(true);
		try {
			let query = supabase
				.from("users")
				.select("*")
				.order("full_name", { ascending: true })
				.range(range[0], range[1]);

			if (filters?.is_active !== undefined) query = query.eq('is_active', filters.is_active);
			if (filters?.role) query = query.eq('role', filters.role);

			const { data, error } = await query;
			if (error) throw error;

			const users = (data ?? []) as UserRecord[];
			userStore.setUsers(users);
			return users;
	}
		catch (error) {
			this.handleError(error, "Failed to load users");
	}
		finally {
			this.setLoading(false);
		}
	}

	/**
	 * Get one user
	 */
	async getUser(userId: UUID): Promise<UserRecord | null> {
		const { data, error } = await supabase
			.from("users")
			.select("*")
			.eq("user_id", userId)
			.maybeSingle();

		if (error) throw new Error(error.message);
		return data as UserRecord | null;
	}

	/**
	 * Search users
	 */
	async searchUsers(searchText: string): Promise<UserRecord[]> {
		if (!searchText.trim()) return this.loadUsers();
		
		const { data, error } = await supabase
			.from("users")
			.select("*")
			.or(`full_name.ilike.%${searchText}%,email.ilike.%${searchText}%,phone.ilike.%${searchText}%`)
			.eq("is_active", true)
			.order("full_name", { ascending: true })
			.limit(20);

		if (error) throw new Error(error.message);
		return (data ?? []) as UserRecord[];
	}

	/**
	 * Load active users for dropdowns
	 */
	async loadActiveUsers(): Promise<UserRecord[]> {
		const { data, error } = await supabase
			.from("users")
			.select("user_id, full_name, email, role")
			.eq("is_active", true)
			.order("full_name", { ascending: true });

		if (error) throw new Error(error.message);
		return (data ?? []) as UserRecord[];
	}

	/**
	 * Create user: Auth + Profile
	 */
	async createUser(
		payload: CreateUserPayload,
	adminUser: User | null
	): Promise<UserRecord | null> {
		try {
			// 1. Create in Supabase Auth
			const { data: authData, error: authError } = await supabase.auth.admin.createUser({
				email: payload.email,
				password: payload.password,
				email_confirm: true,
				user_metadata: {
					full_name: payload.full_name,
					role: payload.role
				}
			});
			if (authError) throw authError;
			if (!authData.user) throw new Error("Failed to create auth user");

			// 2. Create in public.users profile table
			const profile: Omit<UserRecord, 'created_at' | 'updated_at'> = {
				user_id: authData.user.id,
				email: payload.email,
				full_name: payload.full_name,
				role: payload.role,
				phone: payload.phone || null,
				is_active: true
			};

			const { data, error } = await supabase.from("users").insert(profile).select().single();
			if (error) throw error;

			await this.loadUsers();

			await writeAuditLog(supabase, adminUser, {
				action: "CREATE",
				module: "User",
				record_id: data.user_id,
				description: `Created user: ${data.full_name} - ${data.role}`
			});

			toast.success("User created successfully");
			return data;
	}
		catch (error) {
			this.handleError(error, "Failed to create user");
	}
	}

	/**
	 * Update user profile + role
	 */
	async updateUser(
		userId: UUID,
		values: Partial<UserRecord>,
	adminUser: User | null
	): Promise<UserRecord | null> {
		try {
			const { data, error } = await supabase
				.from("users")
				.update({ ...values, updated_at: new Date().toISOString() })
				.eq("user_id", userId)
				.select()
				.single();

			if (error) throw error;

			// Update role in auth metadata too
			if (values.role) {
				await supabase.auth.admin.updateUserById(userId, {
					user_metadata: { role: values.role }
				});
			}

			await this.loadUsers();

			await writeAuditLog(supabase, adminUser, {
				action: "UPDATE",
				module: "User",
				record_id: userId,
				description: `Updated user: ${data.full_name}`,
				new_data: data
			});

			toast.success("User updated");
			return data;
		}
		catch (error) {
			this.handleError(error, "Failed to update user");
	}
	}

	/**
	 * Activate / Deactivate user
	 */
	async updateUserStatus(
		userId: UUID,
		isActive: boolean,
		adminUser: User | null
	): Promise<void> {
		try {
			const { error } = await supabase
				.from("users")
				.update({ is_active: isActive, updated_at: new Date().toISOString() })
				.eq("user_id", userId);

			if (error) throw error;

			// Also disable auth login
			await supabase.auth.admin.updateUserById(userId, { ban_duration: isActive ? 'none' : '876000h' });

			await this.loadUsers();

			await writeAuditLog(supabase, adminUser, {
				action: "UPDATE",
				module: "User",
				record_id: userId,
				description: `User ${isActive ? 'activated' : 'deactivated'}`
			});

			toast.success(`User ${isActive ? 'activated' : 'deactivated'}`);
		}
		catch (error) {
			this.handleError(error, "Failed to update user status");
	}
	}

	/**
	 * Reset password - sends email
	 */
	async resetPassword(email: string): Promise<void> {
		const { error } = await supabase.auth.resetPasswordForEmail(email, {
			redirectTo: `${window.location.origin}/reset-password`
		});
		if (error) throw error;
		toast.success("Password reset email sent");
	}

	/**
	 * Soft delete user - deactivate only. Never hard delete
	 */
	async deleteUser(
		userId: UUID,
		adminUser: User | null
	): Promise<void> {
		try {
			await this.updateUserStatus(userId, false, adminUser);
			
			await writeAuditLog(supabase, adminUser, {
				action: "DELETE",
				module: "User",
				record_id: userId,
				description: "User soft deleted"
			});

			toast.success("User deactivated");
	}
		catch (error) {
			this.handleError(error, "Failed to delete user");
	}
	}

	/**
	 * Refresh users
	 */
	async refresh(): Promise<void> {
		await this.loadUsers();
	}
}

export const userService = new UserService();
export default userService;