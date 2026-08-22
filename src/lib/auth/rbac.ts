import type { User } from "@supabase/supabase-js";

export type Role = 'admin' | 'manager' | 'user' | 'accountant';

export type Permission =
	| 'dashboard:read'
	| 'workflow:read'
	| 'workflow:create'
	| 'workflow:*'
	| 'reports:read'
	| 'reports:export'
	| 'finance:read'
	| 'finance:*'
	| 'finance:create'
	| 'finance:delete'
	| 'finance:update'
	| 'finance:view'
	| '*';

const permissions: Record<Role, string[]> = {
	admin: ['*'], // all access
	manager: ['dashboard:read', 'workflow:*', 'reports:read', 'finance:read'],
	accountant: ['dashboard:read', 'finance:*', 'reports:read', 'reports:export'],
	user: ['dashboard:read', 'workflow:read', 'workflow:create']
};

export function hasPermission(
	user: User | null,
	permission: string
): boolean {
	if (!user) return false;
	
	const role = (user.user_metadata?.role as Role) || 'user';
	const userPerms = permissions[role] || [];
	
	// admin has all
	if (userPerms.includes('*')) return true;
	
	// exact match or wildcard match: "finance:*" matches "finance:create"
	return userPerms.some(p =>
		p === permission ||
		(p.endsWith('*') && permission.startsWith(p.replace('*', '')))
	);
}

export function hasRole(user: User | null, role: Role): boolean {
	return (user?.user_metadata?.role as Role) === role;
}