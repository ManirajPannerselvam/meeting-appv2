/**
 * ============================================================
 * Temple Operations Reporting System
 * File : src/lib/utils/permissions.ts
 * ============================================================
 * PURPOSE
 * Permission utility helpers.
 * ============================================================
 */

import type { User } from "@supabase/supabase-js";
import type { Permission } from "$lib/auth/rbac";
import { hasPermission } from "$lib/auth/rbac";

/**
 * Check whether a user has a permission.
 *
 * Usage:
 * can(user, "finance:create")
 */
export function can(
	user: User | null,
	permission: Permission
): boolean {
	return hasPermission(user, permission);
}

/**
 * Finance permission helpers
 */
export function canCreateFinance(
	user: User | null
): boolean {
	return hasPermission(user, "finance:create");
}

export function canDeleteFinance(
	user: User | null
): boolean {
	return hasPermission(user, "finance:delete");
}

export function canUpdateFinance(
	user: User | null
): boolean {
	return hasPermission(user, "finance:update");
}

export function canViewFinance(
	user: User | null
): boolean {
	return hasPermission(user, "finance:view");
}

/**
 * Report permission helpers
 */
export function canCreateReport(
	user: User | null
): boolean {
	return hasPermission(user, "report:create");
}

export function canEditReport(
	user: User | null
): boolean {
	return hasPermission(user, "report:edit");
}

export function canDeleteReport(
	user: User | null
): boolean {
	return hasPermission(user, "report:delete");
}

export function canViewReport(
	user: User | null
): boolean {
	return hasPermission(user, "report:view");
}

/**
 * Admin permission helper
 */
export function canManageUsers(
	user: User | null
): boolean {
	return hasPermission(user, "user:manage");
}