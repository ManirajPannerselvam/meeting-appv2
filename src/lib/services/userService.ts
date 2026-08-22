import { supabase } from "$lib/supabase";

export interface UserFilters {
	search?: string;
	department?: string;
	role?: string;
	status?: string;
	page?: number;
	pageSize?: number;
}

class UserService {

	/* ===========================
	   Get Users
	=========================== */

	async getUsers(filters?: UserFilters) {

		let query = supabase
			.from("users")
			.select("*", { count: "exact" });

		if (filters?.search) {
			query = query.or(
				`employee_id.ilike.%${filters.search}%,full_name.ilike.%${filters.search}%,email.ilike.%${filters.search}%`
			);
		}

		if (
			filters?.department &&
			filters.department !== "All"
		) {
			query = query.eq(
				"department",
				filters.department
			);
		}

		if (
			filters?.role &&
			filters.role !== "All"
		) {
			query = query.eq("role", filters.role);
		}

		if (
			filters?.status &&
			filters.status !== "All"
		) {
			query = query.eq(
				"status",
				filters.status
			);
		}

		if (
			filters?.page &&
			filters?.pageSize
		) {

			const from =
				(filters.page - 1) *
				filters.pageSize;

			query = query.range(
				from,
				from + filters.pageSize - 1
			);

		}

		return query.order("full_name");

	}

	/* ===========================
	   Get User
	=========================== */

	async getUser(id: string) {

		return supabase
			.from("users")
			.select("*")
			.eq("id", id)
			.single();

	}

	/* ===========================
	   Create User
	=========================== */

	async createUser(payload: any) {

		return supabase
			.from("users")
			.insert(payload);

	}

	/* ===========================
	   Update User
	=========================== */

	async updateUser(
		id: string,
		payload: any
	) {

		return supabase
			.from("users")
			.update(payload)
			.eq("id", id);

	}

	/* ===========================
	   Deactivate User
	=========================== */

	async deactivateUser(id: string) {

		return supabase
			.from("users")
			.update({
				status: "Inactive"
			})
			.eq("id", id);

	}

	/* ===========================
	   Delete User
	=========================== */

	async deleteUser(id: string) {

		return supabase
			.from("users")
			.delete()
			.eq("id", id);

	}

	/* ===========================
	   Upload Profile
	=========================== */

	async uploadProfilePhoto(
		file: File,
		userId: string
	) {

		const fileName =
			`${userId}/${Date.now()}-${file.name}`;

		const upload = await supabase
			.storage
			.from("users")
			.upload(fileName, file);

		if (upload.error)
			throw upload.error;

		return supabase
			.storage
			.from("users")
			.getPublicUrl(fileName);

	}

	/* ===========================
	   Permissions
	=========================== */

	async getPermissions(userId: string) {

		return supabase
			.from("user_permissions")
			.select("*")
			.eq("user_id", userId);

	}

	async savePermissions(
		userId: string,
		permissions: any[]
	) {

		await supabase
			.from("user_permissions")
			.delete()
			.eq("user_id", userId);

		return supabase
			.from("user_permissions")
			.insert(
				permissions.map(p => ({
					...p,
					user_id: userId
				}))
			);

	}

	/* ===========================
	   Activity
	=========================== */

	async getActivity(userId: string) {

		return supabase
			.from("audit_logs")
			.select("*")
			.eq("user_id", userId)
			.order("created_at", {
				ascending: false
			});

	}

	/* ===========================
	   Audit
	=========================== */

	async writeAudit(
		userId: string,
		module: string,
		action: string,
		description: string
	) {

		return supabase
			.from("audit_logs")
			.insert({
				user_id: userId,
				module,
				action,
				description
			});

	}

	/* ===========================
	   Import Users
	=========================== */

	async bulkInsert(users: any[]) {

		return supabase
			.from("users")
			.insert(users);

	}

	/* ===========================
	   Export
	=========================== */

	async exportUsers() {

		return supabase
			.from("users")
			.select("*");

	}

}

export const userService = new UserService();