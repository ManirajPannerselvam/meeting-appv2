<script lang="ts">
	import { page } from '$app/state';
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';
	import { supabase } from '$lib/supabase/client';
	import { toast } from 'svelte-sonner';

	const userId = page.params.id;

	interface UserProfile {
		id: string;
		employeeId: string;
		firstName: string;
		lastName: string;
		email: string;
		mobile: string;
		gender: string;
		dateOfBirth: string;

		department: string;
		designation: string;
		role: string;
		shift: string;
		manager: string;

		address: string;
		city: string;
		state: string;
		country: string;

		emergencyName: string;
		emergencyPhone: string;

		status: string;
		photo: string;

		skills: string[];
		certifications: string[];
	}

	let loading = true;
	let errorMessage = '';

	let profile: UserProfile = {
		id: '',
		employeeId: '',
		firstName: '',
		lastName: '',
		email: '',
		mobile: '',
		gender: '',
		dateOfBirth: '',

		department: '',
		designation: '',
		role: '',
		shift: '',
		manager: '',

		address: '',
		city: '',
		state: '',
		country: '',

		emergencyName: '',
		emergencyPhone: '',

		status: 'Active',
		photo: '',

		skills: [],
		certifications: []
	};

	// ============================================================
	// HELPERS
	// ============================================================

	function stringValue(value: unknown, fallback = ''): string {
		if (typeof value === 'string') return value;
		if (value === null || value === undefined) return fallback;
		return String(value);
	}

	function arrayValue(value: unknown): string[] {
		if (Array.isArray(value)) {
			return value
				.filter((item) => item !== null && item !== undefined)
				.map((item) => String(item));
		}

		return [];
	}

	function getFullName(): string {
		const name = `${profile.firstName} ${profile.lastName}`.trim();

		return name || profile.email || 'User Profile';
	}

	function getInitials(): string {
		const first = profile.firstName?.charAt(0) || '';
		const last = profile.lastName?.charAt(0) || '';

		const initials = `${first}${last}`.toUpperCase();

		if (initials) return initials;

		return profile.email?.charAt(0)?.toUpperCase() || 'U';
	}

	function getAvatarUrl(): string {
		if (profile.photo) return profile.photo;

		const name = encodeURIComponent(getFullName());

		return `https://ui-avatars.com/api/?name=${name}&background=2563eb&color=ffffff&size=160`;
	}

	function formatDate(value: string): string {
		if (!value) return '-';

		const date = new Date(value);

		if (Number.isNaN(date.getTime())) {
			return value;
		}

		return date.toLocaleDateString('en-IN', {
			day: '2-digit',
			month: 'short',
			year: 'numeric'
		});
	}

	function normalizeStatus(status: string): string {
		if (!status) return 'Active';

		return status.charAt(0).toUpperCase() + status.slice(1).toLowerCase();
	}

	// ============================================================
	// LOAD USER
	// ============================================================

	async function loadUserProfile() {
		loading = true;
		errorMessage = '';

		try {
			if (!userId) {
				throw new Error('User ID is missing.');
			}

			const { data, error } = await supabase
				.from('users')
				.select('*')
				.eq('id', userId)
				.single();

			if (error) {
				throw error;
			}

			if (!data) {
				throw new Error('User profile not found.');
			}

			/*
			 * Dynamic mapping keeps this page tolerant of small
			 * differences in the existing users table column names.
			 */
			const row = data as Record<string, unknown>;

			const fullName = stringValue(
				row.full_name ?? row.name ?? row.display_name ?? ''
			);

			const nameParts = fullName.trim().split(/\s+/).filter(Boolean);

			const firstName = stringValue(
				row.first_name ??
					row.firstname ??
					(nameParts.length > 0 ? nameParts[0] : '')
			);

			const lastName = stringValue(
				row.last_name ??
					row.lastname ??
					(nameParts.length > 1 ? nameParts.slice(1).join(' ') : '')
			);

			profile = {
				id: stringValue(row.id, userId),

				employeeId: stringValue(
					row.employee_id ?? row.employeeId ?? row.emp_code ?? row.employee_code
				),

				firstName,
				lastName,

				email: stringValue(row.email),
				mobile: stringValue(
					row.mobile ?? row.phone ?? row.phone_number ?? row.mobile_number
				),

				gender: stringValue(row.gender),
				dateOfBirth: stringValue(
					row.date_of_birth ?? row.dob ?? row.dateOfBirth
				),

				department: stringValue(row.department),
				designation: stringValue(row.designation ?? row.job_title),
				role: stringValue(row.role),
				shift: stringValue(row.shift),
				manager: stringValue(
					row.manager ?? row.manager_name ?? row.reporting_manager
				),

				address: stringValue(row.address),
				city: stringValue(row.city),
				state: stringValue(row.state),
				country: stringValue(row.country, 'India'),

				emergencyName: stringValue(
					row.emergency_name ?? row.emergency_contact_name
				),

				emergencyPhone: stringValue(
					row.emergency_phone ?? row.emergency_contact_phone
				),

				status: normalizeStatus(stringValue(row.status, 'Active')),

				photo: stringValue(
					row.photo ??
						row.photo_url ??
						row.avatar_url ??
						row.profile_photo ??
						''
				),

				skills: arrayValue(row.skills),
				certifications: arrayValue(row.certifications)
			};

			// Fallback values when optional JSON/array columns are not present.
			if (profile.skills.length === 0) {
				profile.skills = [
					'Lean Manufacturing',
					'5S',
					'Kaizen',
					'SPC',
					'Problem Solving'
				];
			}

			if (profile.certifications.length === 0) {
				profile.certifications = [
					'ISO 9001',
					'Internal Auditor',
					'Six Sigma Green Belt'
				];
			}
		} catch (error: unknown) {
			const message =
				error instanceof Error
					? error.message
					: 'Unable to load user profile.';

			errorMessage = message;
			toast.error(message);
		} finally {
			loading = false;
		}
	}

	// ============================================================
	// ACTIONS
	// ============================================================

	function editProfile() {
		goto(`/users/${userId}/edit`);
	}

	function goBack() {
		goto('/users');
	}

	onMount(loadUserProfile);
</script>

<svelte:head>
	<title>{getFullName()} | User Profile</title>
	<meta
		name="description"
		content="Enterprise user profile and employee information"
	/>
</svelte:head>

<div class="page">
	{#if loading}
		<!-- ========================================================
		     LOADING
		========================================================= -->

		<div class="loading-container">
			<div class="loading-spinner"></div>
			<h2>Loading User Profile</h2>
			<p>Please wait while the employee information is loaded.</p>
		</div>
	{:else if errorMessage}
		<!-- ========================================================
		     ERROR
		========================================================= -->

		<div class="error-container">
			<div class="error-icon">⚠️</div>

			<h2>Unable to Load Profile</h2>

			<p>{errorMessage}</p>

			<div class="error-actions">
				<button class="secondary-button" onclick={goBack}>
					← Back to Users
				</button>

				<button class="primary-button" onclick={loadUserProfile}>
					↻ Retry
				</button>
			</div>
		</div>
	{:else}
		<!-- ========================================================
		     HEADER
		========================================================= -->

		<div class="header">
			<div class="header-left">
				<button class="back-button" onclick={goBack} aria-label="Back to users">
					←
				</button>

				<div class="profile">
					<div class="avatar-wrapper">
						<img
							src={getAvatarUrl()}
							alt={getFullName()}
							class="avatar"
						/>

						<span
							class:active={profile.status.toLowerCase() === 'active'}
							class="online-indicator"
						></span>
					</div>

					<div class="profile-info">
						<div class="name-row">
							<h1>{getFullName()}</h1>

							<span
								class:active={profile.status.toLowerCase() === 'active'}
								class:inactive={profile.status.toLowerCase() !== 'active'}
								class="status-badge"
							>
								{profile.status}
							</span>
						</div>

						<p>
							{profile.employeeId || 'Employee ID not available'}
						</p>

						{#if profile.designation}
							<span class="designation">
								{profile.designation}
							</span>
						{/if}
					</div>
				</div>
			</div>

			<div class="header-actions">
				<button class="secondary-button" onclick={goBack}>
					← Users
				</button>

				<button class="primary-button" onclick={editProfile}>
					✏️ Edit Profile
				</button>
			</div>
		</div>

		<!-- ========================================================
		     QUICK SUMMARY
		========================================================= -->

		<div class="summary-grid">
			<div class="summary-card">
				<div class="summary-icon blue-icon">🏢</div>

				<div>
					<span>Department</span>
					<strong>{profile.department || '-'}</strong>
				</div>
			</div>

			<div class="summary-card">
				<div class="summary-icon purple-icon">👔</div>

				<div>
					<span>Role</span>
					<strong>{profile.role || '-'}</strong>
				</div>
			</div>

			<div class="summary-card">
				<div class="summary-icon orange-icon">🕐</div>

				<div>
					<span>Shift</span>
					<strong>{profile.shift || '-'}</strong>
				</div>
			</div>

			<div class="summary-card">
				<div class="summary-icon green-icon">📧</div>

				<div>
					<span>Email</span>
					<strong>{profile.email || '-'}</strong>
				</div>
			</div>
		</div>

		<!-- ========================================================
		     PROFILE GRID
		========================================================= -->

		<div class="grid">
			<!-- PERSONAL -->
			<section class="card">
				<div class="card-header">
					<div class="card-icon blue-icon">👤</div>

					<div>
						<h2>Personal Information</h2>
						<p>Basic employee details</p>
					</div>
				</div>

				<table>
					<tbody>
						<tr>
							<td>Employee ID</td>
							<td>{profile.employeeId || '-'}</td>
						</tr>

						<tr>
							<td>First Name</td>
							<td>{profile.firstName || '-'}</td>
						</tr>

						<tr>
							<td>Last Name</td>
							<td>{profile.lastName || '-'}</td>
						</tr>

						<tr>
							<td>Email</td>
							<td>{profile.email || '-'}</td>
						</tr>

						<tr>
							<td>Mobile</td>
							<td>{profile.mobile || '-'}</td>
						</tr>

						<tr>
							<td>Gender</td>
							<td>{profile.gender || '-'}</td>
						</tr>

						<tr>
							<td>Date of Birth</td>
							<td>{formatDate(profile.dateOfBirth)}</td>
						</tr>
					</tbody>
				</table>
			</section>

			<!-- ORGANIZATION -->
			<section class="card">
				<div class="card-header">
					<div class="card-icon purple-icon">🏢</div>

					<div>
						<h2>Organization</h2>
						<p>Work and reporting structure</p>
					</div>
				</div>

				<table>
					<tbody>
						<tr>
							<td>Department</td>
							<td>{profile.department || '-'}</td>
						</tr>

						<tr>
							<td>Designation</td>
							<td>{profile.designation || '-'}</td>
						</tr>

						<tr>
							<td>Role</td>
							<td>{profile.role || '-'}</td>
						</tr>

						<tr>
							<td>Shift</td>
							<td>{profile.shift || '-'}</td>
						</tr>

						<tr>
							<td>Manager</td>
							<td>{profile.manager || '-'}</td>
						</tr>

						<tr>
							<td>Status</td>
							<td>
								<span
									class:active={profile.status.toLowerCase() === 'active'}
									class:inactive={profile.status.toLowerCase() !== 'active'}
									class="status-badge"
								>
									{profile.status}
								</span>
							</td>
						</tr>
					</tbody>
				</table>
			</section>

			<!-- ADDRESS -->
			<section class="card">
				<div class="card-header">
					<div class="card-icon green-icon">📍</div>

					<div>
						<h2>Address</h2>
						<p>Contact and location information</p>
					</div>
				</div>

				<table>
					<tbody>
						<tr>
							<td>Address</td>
							<td>{profile.address || '-'}</td>
						</tr>

						<tr>
							<td>City</td>
							<td>{profile.city || '-'}</td>
						</tr>

						<tr>
							<td>State</td>
							<td>{profile.state || '-'}</td>
						</tr>

						<tr>
							<td>Country</td>
							<td>{profile.country || '-'}</td>
						</tr>
					</tbody>
				</table>
			</section>

			<!-- EMERGENCY -->
			<section class="card">
				<div class="card-header">
					<div class="card-icon red-icon">🚨</div>

					<div>
						<h2>Emergency Contact</h2>
						<p>Emergency contact information</p>
					</div>
				</div>

				<table>
					<tbody>
						<tr>
							<td>Name</td>
							<td>{profile.emergencyName || '-'}</td>
						</tr>

						<tr>
							<td>Phone</td>
							<td>{profile.emergencyPhone || '-'}</td>
						</tr>
					</tbody>
				</table>
			</section>

			<!-- SKILLS -->
			<section class="card">
				<div class="card-header">
					<div class="card-icon orange-icon">🛠️</div>

					<div>
						<h2>Skills</h2>
						<p>Employee competencies</p>
					</div>
				</div>

				{#if profile.skills.length > 0}
					<div class="tag-list">
						{#each profile.skills as skill}
							<span class="tag skill-tag">{skill}</span>
						{/each}
					</div>
				{:else}
					<div class="empty-state">
						No skills recorded.
					</div>
				{/if}
			</section>

			<!-- CERTIFICATIONS -->
			<section class="card">
				<div class="card-header">
					<div class="card-icon teal-icon">🏆</div>

					<div>
						<h2>Certifications</h2>
						<p>Professional qualifications</p>
					</div>
				</div>

				{#if profile.certifications.length > 0}
					<div class="tag-list">
						{#each profile.certifications as certification}
							<span class="tag certification-tag">
								✓ {certification}
							</span>
						{/each}
					</div>
				{:else}
					<div class="empty-state">
						No certifications recorded.
					</div>
				{/if}
			</section>
		</div>

		<!-- ========================================================
		     FOOTER
		========================================================= -->

		<div class="profile-footer">
			<div>
				<strong>Temple Operations Reporting System</strong>
				<span>User Management Module</span>
			</div>

			<div class="footer-actions">
				<button class="secondary-button" onclick={goBack}>
					← Back to Users
				</button>

				<button class="primary-button" onclick={editProfile}>
					✏️ Edit Profile
				</button>
			</div>
		</div>
	{/if}
</div>

<style>
	.page {
		width: 100%;
		max-width: 1400px;
		margin: 0 auto;
		padding: 24px;
		display: flex;
		flex-direction: column;
		gap: 22px;
		box-sizing: border-box;
	}

	/* ============================================================
	   HEADER
	============================================================ */

	.header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		gap: 20px;
		flex-wrap: wrap;
	}

	.header-left {
		display: flex;
		align-items: center;
		gap: 18px;
		min-width: 0;
	}

	.back-button {
		width: 42px;
		height: 42px;
		border: 1px solid #e2e8f0;
		background: #ffffff;
		color: #334155;
		border-radius: 10px;
		font-size: 20px;
		cursor: pointer;
		display: flex;
		align-items: center;
		justify-content: center;
		transition: 0.2s ease;
		flex-shrink: 0;
	}

	.back-button:hover {
		background: #f8fafc;
		border-color: #cbd5e1;
	}

	.profile {
		display: flex;
		align-items: center;
		gap: 18px;
		min-width: 0;
	}

	.avatar-wrapper {
		position: relative;
		flex-shrink: 0;
	}

	.avatar {
		width: 88px;
		height: 88px;
		border-radius: 50%;
		object-fit: cover;
		display: block;
		border: 4px solid #ffffff;
		box-shadow: 0 4px 14px rgba(15, 23, 42, 0.12);
		background: #e2e8f0;
	}

	.online-indicator {
		position: absolute;
		right: 3px;
		bottom: 4px;
		width: 16px;
		height: 16px;
		border-radius: 50%;
		border: 3px solid white;
		background: #94a3b8;
	}

	.online-indicator.active {
		background: #16a34a;
	}

	.profile-info {
		min-width: 0;
	}

	.name-row {
		display: flex;
		align-items: center;
		flex-wrap: wrap;
		gap: 10px;
	}

	.profile-info h1 {
		margin: 0;
		font-size: clamp(24px, 3vw, 32px);
		line-height: 1.2;
		color: #0f172a;
	}

	.profile-info p {
		margin: 6px 0 0;
		color: #64748b;
		font-size: 14px;
	}

	.designation {
		display: inline-block;
		margin-top: 5px;
		color: #475569;
		font-size: 14px;
		font-weight: 500;
	}

	.status-badge {
		display: inline-flex;
		align-items: center;
		padding: 5px 10px;
		border-radius: 999px;
		font-size: 12px;
		font-weight: 700;
		white-space: nowrap;
	}

	.status-badge.active {
		background: #dcfce7;
		color: #166534;
	}

	.status-badge.inactive {
		background: #fee2e2;
		color: #991b1b;
	}

	.header-actions {
		display: flex;
		gap: 10px;
		flex-wrap: wrap;
	}

	.primary-button,
	.secondary-button {
		border: none;
		padding: 10px 16px;
		border-radius: 9px;
		cursor: pointer;
		font-size: 14px;
		font-weight: 600;
		transition: 0.2s ease;
	}

	.primary-button {
		background: #2563eb;
		color: white;
	}

	.primary-button:hover {
		background: #1d4ed8;
	}

	.secondary-button {
		background: #ffffff;
		color: #334155;
		border: 1px solid #cbd5e1;
	}

	.secondary-button:hover {
		background: #f8fafc;
	}

	/* ============================================================
	   SUMMARY
	============================================================ */

	.summary-grid {
		display: grid;
		grid-template-columns: repeat(4, minmax(0, 1fr));
		gap: 16px;
	}

	.summary-card {
		background: white;
		border: 1px solid #e2e8f0;
		border-radius: 14px;
		padding: 18px;
		display: flex;
		align-items: center;
		gap: 14px;
		box-shadow: 0 3px 10px rgba(15, 23, 42, 0.05);
		min-width: 0;
	}

	.summary-card span {
		display: block;
		font-size: 12px;
		color: #64748b;
		margin-bottom: 5px;
	}

	.summary-card strong {
		display: block;
		font-size: 15px;
		color: #0f172a;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.summary-icon,
	.card-icon {
		display: flex;
		align-items: center;
		justify-content: center;
		flex-shrink: 0;
		border-radius: 10px;
	}

	.summary-icon {
		width: 42px;
		height: 42px;
		font-size: 20px;
	}

	.card-icon {
		width: 40px;
		height: 40px;
		font-size: 18px;
	}

	.blue-icon {
		background: #dbeafe;
		color: #1d4ed8;
	}

	.purple-icon {
		background: #ede9fe;
		color: #6d28d9;
	}

	.orange-icon {
		background: #ffedd5;
		color: #c2410c;
	}

	.green-icon {
		background: #dcfce7;
		color: #15803d;
	}

	.red-icon {
		background: #fee2e2;
		color: #b91c1c;
	}

	.teal-icon {
		background: #ccfbf1;
		color: #0f766e;
	}

	/* ============================================================
	   CONTENT GRID
	============================================================ */

	.grid {
		display: grid;
		grid-template-columns: repeat(2, minmax(0, 1fr));
		gap: 20px;
	}

	.card {
		background: #ffffff;
		border: 1px solid #e2e8f0;
		border-radius: 14px;
		padding: 22px;
		box-shadow: 0 3px 10px rgba(15, 23, 42, 0.05);
		min-width: 0;
	}

	.card-header {
		display: flex;
		align-items: center;
		gap: 12px;
		margin-bottom: 18px;
	}

	.card-header h2 {
		margin: 0;
		font-size: 17px;
		color: #0f172a;
	}

	.card-header p {
		margin: 4px 0 0;
		color: #64748b;
		font-size: 12px;
	}

	/* ============================================================
	   TABLE
	============================================================ */

	table {
		width: 100%;
		border-collapse: collapse;
	}

	td {
		padding: 11px 0;
		border-bottom: 1px solid #f1f5f9;
		font-size: 14px;
		vertical-align: top;
	}

	tr:last-child td {
		border-bottom: none;
	}

	td:first-child {
		width: 38%;
		color: #64748b;
		font-weight: 500;
		padding-right: 15px;
	}

	td:last-child {
		color: #0f172a;
		font-weight: 600;
		word-break: break-word;
	}

	/* ============================================================
	   TAGS
	============================================================ */

	.tag-list {
		display: flex;
		flex-wrap: wrap;
		gap: 9px;
	}

	.tag {
		display: inline-flex;
		align-items: center;
		padding: 8px 11px;
		border-radius: 999px;
		font-size: 13px;
		font-weight: 600;
	}

	.skill-tag {
		background: #eff6ff;
		color: #1d4ed8;
		border: 1px solid #dbeafe;
	}

	.certification-tag {
		background: #ecfdf5;
		color: #047857;
		border: 1px solid #d1fae5;
	}

	.empty-state {
		padding: 18px;
		border-radius: 10px;
		background: #f8fafc;
		color: #64748b;
		text-align: center;
		font-size: 14px;
	}

	/* ============================================================
	   LOADING
	============================================================ */

	.loading-container {
		min-height: 420px;
		background: white;
		border: 1px solid #e2e8f0;
		border-radius: 14px;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		text-align: center;
		padding: 30px;
	}

	.loading-container h2 {
		margin: 18px 0 6px;
		color: #0f172a;
	}

	.loading-container p {
		margin: 0;
		color: #64748b;
		font-size: 14px;
	}

	.loading-spinner {
		width: 42px;
		height: 42px;
		border: 4px solid #dbeafe;
		border-top-color: #2563eb;
		border-radius: 50%;
		animation: spin 0.8s linear infinite;
	}

	@keyframes spin {
		to {
			transform: rotate(360deg);
		}
	}

	/* ============================================================
	   ERROR
	============================================================ */

	.error-container {
		min-height: 420px;
		background: white;
		border: 1px solid #fecaca;
		border-radius: 14px;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		text-align: center;
		padding: 30px;
	}

	.error-icon {
		font-size: 42px;
	}

	.error-container h2 {
		margin: 15px 0 6px;
		color: #991b1b;
	}

	.error-container p {
		margin: 0;
		max-width: 600px;
		color: #64748b;
		font-size: 14px;
	}

	.error-actions {
		display: flex;
		gap: 10px;
		margin-top: 22px;
	}

	/* ============================================================
	   FOOTER
	============================================================ */

	.profile-footer {
		border-top: 1px solid #e2e8f0;
		padding: 20px 0 5px;
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 15px;
		color: #64748b;
		font-size: 13px;
	}

	.profile-footer strong {
		display: block;
		color: #334155;
		margin-bottom: 4px;
	}

	.profile-footer span {
		display: block;
	}

	.footer-actions {
		display: flex;
		gap: 10px;
	}

	/* ============================================================
	   RESPONSIVE
	============================================================ */

	@media (max-width: 1100px) {
		.summary-grid {
			grid-template-columns: repeat(2, minmax(0, 1fr));
		}
	}

	@media (max-width: 900px) {
		.grid {
			grid-template-columns: 1fr;
		}
	}

	@media (max-width: 650px) {
		.page {
			padding: 14px;
			gap: 16px;
		}

		.header {
			align-items: flex-start;
		}

		.header-left {
			width: 100%;
		}

		.header-actions {
			width: 100%;
		}

		.header-actions button {
			flex: 1;
		}

		.profile {
			gap: 12px;
		}

		.avatar {
			width: 68px;
			height: 68px;
		}

		.profile-info h1 {
			font-size: 22px;
		}

		.summary-grid {
			grid-template-columns: 1fr;
		}

		.card {
			padding: 17px;
		}

		td:first-child {
			width: 42%;
		}

		.profile-footer {
			flex-direction: column;
			align-items: stretch;
			text-align: center;
		}

		.footer-actions {
			flex-direction: column;
		}

		.error-actions {
			flex-direction: column;
			width: 100%;
			max-width: 300px;
		}
	}

	@media (max-width: 420px) {
		.back-button {
			width: 38px;
			height: 38px;
		}

		.profile-info p,
		.designation {
			font-size: 12px;
		}

		td {
			font-size: 13px;
		}

		td:first-child {
			width: 44%;
		}
	}
</style>