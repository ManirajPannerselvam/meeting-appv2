<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { supabase } from '$lib/supabase/client';

	let loading = false;
	let saving = false;
	let activeTab = 'profile';

	let message = '';
	let messageType: 'success' | 'error' | 'info' = 'info';

	function showMessage(
		text: string,
		type: 'success' | 'error' | 'info' = 'info'
	) {
		message = text;
		messageType = type;

		setTimeout(() => {
			message = '';
	}, 3500);
	}

	// ===== ALL SETTINGS OBJECTS - unchanged =====
	let profile = { full_name: '', email: '', phone: '', avatar: '' };
	let company = { company_name: '', plant: '', department: '', location: '', timezone: 'Asia/Kolkata' };
	let appearance = { theme: 'System', language: 'English', dateFormat: 'DD/MM/YYYY', timeFormat: '24 Hours' };
	let notifications = { email: true, meetingReminder: true, reportReminder: true, aiNotification: true, systemNotification: true };
	let security = { twoFactor: false, sessionTimeout: 30, loginNotification: true };
	let password = { current: '', newPassword: '', confirmPassword: '' };
	let aiSettings = { enabled: true, provider: 'OpenAI', model: 'gpt-5.5', temperature: 0.7, autoSummary: true, autoSuggestions: true, autoClassification: true };
	let backup = { autoBackup: true, backupTime: '23:00', retentionDays: 30, cloudBackup: false };
	let audit = { enableAudit: true, retainLogs: 365, exportFormat: 'PDF' };
	let system = { pageSize: 20, autoRefresh: 60, defaultDepartment: 'Production', defaultShift: 'A' };
	let emailSettings = { smtpServer: '', smtpPort: 587, smtpUser: '', smtpPassword: '', senderName: 'EMS System', senderEmail: '' };
	let database = { host: '', database: '', schema: 'public', poolSize: 20, ssl: true };
	let apiKeys = { openAI: '', gemini: '', azure: '', weather: '' };
	let factory = { factoryName: 'Temple Manufacturing', siteCode: 'PLANT-01', address: '', city: '', state: '', country: 'India', currency: 'INR' };
	let storage = { provider: 'Supabase', bucket: 'reports', retentionDays: 365, maxUploadMB: 100 };
	const applicationInfo = { application: 'Enterprise Manufacturing System', version: '2.0.0', framework: 'SvelteKit', database: 'Supabase PostgreSQL', ai: 'GPT-5.5', build: '2026.08' };
	const tabs = [ { id: 'profile', label: '👤 Profile' }, { id: 'company', label: '🏭 Company' }, { id: 'appearance', label: '🎨 Appearance' }, { id: 'notifications', label: '🔔 Notifications' }, { id: 'security', label: '🔒 Security' }, { id: 'ai', label: '🤖 AI' }, { id: 'backup', label: '💾 Backup' }, { id: 'email', label: '📧 Email' }, { id: 'api', label: '🔑 API Keys' }, { id: 'system', label: '⚙️ System' }, { id: 'factory', label: '🏭 Factory' }, { id: 'storage', label: '🗂 Storage' } ];

	// ===== REPLACED: loadSettings =====
	async function loadSettings() {
	loading = true;
		message = '';

		try {
			const { data, error } = await supabase
				.from('settings')
				.select('*')
				.eq('id', 1)
				.maybeSingle();

			if (error) {
				throw error;
			}

			if (data) {
				profile = {...profile,...(data.profile?? {}) };
				company = {...company,...(data.company?? {}) };
				appearance = {...appearance,...(data.appearance?? {}) };
				notifications = {...notifications,...(data.notifications?? {}) };
				security = {...security,...(data.security?? {}) };

				// IMPORTANT: Supabase column = ai_settings
				aiSettings = {...aiSettings,...(data.ai_settings?? {}) };

				backup = {...backup,...(data.backup?? {}) };
				audit = {...audit,...(data.audit?? {}) };
				system = {...system,...(data.system?? {}) };

				// IMPORTANT: Supabase column = email_settings
				emailSettings = {...emailSettings,...(data.email_settings?? {}) };

				database = {...database,...(data.database?? {}) };

				// IMPORTANT: Supabase column = api_keys
				apiKeys = {...apiKeys,...(data.api_keys?? {}) };

				factory = {...factory,...(data.factory?? {}) };
				storage = {...storage,...(data.storage?? {}) };
			}

			applyTheme();
		} catch (err) {
			console.error('[Settings] Load failed:', err);
			showMessage( err instanceof Error? err.message : 'Failed to load settings.', 'error' );
		} finally {
			loading = false;
	}
	}

	// ===== REPLACED: saveAllSettings =====
	async function saveAllSettings() {
		saving = true;

		try {
			const payload = {
				id: 1,
				profile,
				company,
				appearance,
				notifications,
				security,
				// IMPORTANT: These MUST match the Supabase column names.
				ai_settings: aiSettings,
				backup,
				audit,
				system,
				// Supabase column name
				email_settings: emailSettings,
				database,
				// Supabase column name
				api_keys: apiKeys,
				factory,
				storage,
				updated_at: new Date().toISOString()
			};

			const { error } = await supabase
				.from('settings')
				.upsert(payload, { onConflict: 'id' });

			if (error) {
				throw error;
			}

			applyTheme();
			showMessage('Settings saved successfully.', 'success');
	} catch (err) {
			console.error('[Settings] Save failed:', err);
			showMessage( err instanceof Error? err.message : 'Failed to save settings.', 'error' );
	} finally {
			saving = false;
		}
	}

	// ===== REPLACED: exportSettings =====
	function exportSettings() {
		const settings = {
			profile,
			company,
			appearance,
			notifications,
			security,
			ai_settings: aiSettings,
			backup,
			audit,
			system,
			email_settings: emailSettings,
			database,
			api_keys: apiKeys,
			factory,
			storage
	};

		const blob = new Blob([JSON.stringify(settings, null, 2)], { type: 'application/json' });
		const url = URL.createObjectURL(blob);
		const a = document.createElement('a');
		a.href = url;
		a.download = 'ems-settings.json';
		document.body.appendChild(a);
		a.click();
		a.remove();
		URL.revokeObjectURL(url);

		showMessage('Settings exported.', 'success');
	}

	// ===== rest of your functions unchanged =====
	async function changePassword() {
		if (!password.newPassword) { showMessage('Enter a new password.', 'error'); return; }
		if (password.newPassword.length < 8) { showMessage('Password must be at least 8 characters.', 'error'); return; }
		if (password.newPassword!== password.confirmPassword) { showMessage('Passwords do not match.', 'error'); return; }
		const { error } = await supabase.auth.updateUser({ password: password.newPassword });
		if (error) { showMessage(error.message, 'error'); return; }
		password = { current: '', newPassword: '', confirmPassword: '' };
		showMessage('Password updated successfully.', 'success');
	}

	function restoreDefaults() {
		if (!confirm('Restore application defaults?')) return;
	appearance = { theme: 'System', language: 'English', dateFormat: 'DD/MM/YYYY', timeFormat: '24 Hours' };
		applyTheme();
		showMessage('Application defaults restored.', 'info');
	}

	function testSMTP() { showMessage('SMTP test requested.', 'info'); }
	function saveAPIKeys() { showMessage('API keys are included when you click Save All.', 'info'); }
	function runBackup() { showMessage('Database backup started.', 'info'); }

	function applyTheme() {
		if (typeof document === 'undefined') return;
		document.documentElement.setAttribute('data-theme', appearance.theme.toLowerCase());
	}

	async function uploadAvatar(event: Event) {
		const input = event.target as HTMLInputElement;
		const file = input.files?.[0];
		if (!file) return;
		const extension = file.name.split('.').pop()?.toLowerCase()?? 'jpg';
		const filename = `avatar-${Date.now()}.${extension}`;
		const { error } = await supabase.storage.from('avatars').upload(filename, file, { upsert: true });
		if (error) { showMessage(error.message, 'error'); return; }
		const { data } = supabase.storage.from('avatars').getPublicUrl(filename);
	profile = {...profile, avatar: data.publicUrl };
		showMessage('Profile image uploaded.', 'success');
	}

	onMount(loadSettings);
</script>


<svelte:head>
	<title>Settings</title>
	<meta
		name="description"
		content="Manage account, application, company, AI, security and system settings."
	/>
</svelte:head>

<div class="page">

	{#if message}
		<div
			class:error-message={messageType === 'error'}
			class:success-message={messageType === 'success'}
			class:info-message={messageType === 'info'}
			class="message"
			role="alert"
		>
			{message}
		</div>
	{/if}

	<div class="page-header">
		<div>
			<h1>⚙ Settings</h1>
			<p>
				Manage your account, application, and company preferences.
			</p>
		</div>

		<div class="actions">
			<button
				class="secondary"
				type="button"
				on:click={exportSettings}
			>
				📤 Export
			</button>

			<button
				class="secondary"
				type="button"
				on:click={restoreDefaults}
			>
				🔄 Reset
			</button>

			<button
				class="primary"
				type="button"
				disabled={saving}
				on:click={saveAllSettings}
			>
				{saving ? 'Saving...' : '💾 Save All'}
			</button>
		</div>
	</div>

	{#if loading}

		<div class="loading">
			<div class="loading-row"></div>
			<div class="loading-row"></div>
			<div class="loading-row"></div>
		</div>

	{:else}

		<div class="layout">

			<div class="sidebar">

				{#each tabs as tab}

					<button
						type="button"
						class:active={activeTab === tab.id}
						on:click={() => (activeTab = tab.id)}
					>
						{tab.label}
					</button>

				{/each}

			</div>

			<div class="content">

				{#if activeTab === 'profile'}

					<div class="card">

						<h2>👤 Profile</h2>

						<div class="avatar-upload">

							{#if profile.avatar}

								<img
									src={profile.avatar}
									class="avatar"
									alt="Profile"
								/>

							{:else}

								<div class="avatar placeholder">
									{profile.full_name
										? profile.full_name.charAt(0).toUpperCase()
										: '?'}
								</div>

							{/if}

							<input
								type="file"
								accept="image/*"
								on:change={uploadAvatar}
							/>

						</div>

						<label for="full-name">Full Name</label>
						<input
							id="full-name"
							bind:value={profile.full_name}
						/>

						<label for="email">Email</label>
						<input
							id="email"
							bind:value={profile.email}
							readonly
						/>

						<label for="phone">Phone</label>
						<input
							id="phone"
							bind:value={profile.phone}
						/>

					</div>

				{:else if activeTab === 'company'}

					<div class="card">

						<h2>🏭 Company</h2>

						<label>Company</label>
						<input bind:value={company.company_name} />

						<label>Plant</label>
						<input bind:value={company.plant} />

						<label>Department</label>
						<input bind:value={company.department} />

						<label>Location</label>
						<input bind:value={company.location} />

						<label>Timezone</label>

						<select bind:value={company.timezone}>
							<option>Asia/Kolkata</option>
							<option>UTC</option>
							<option>America/New_York</option>
						</select>

					</div>

				{:else if activeTab === 'appearance'}

					<div class="card">

						<h2>🎨 Appearance</h2>

						<label>Theme</label>

						<select
							bind:value={appearance.theme}
							on:change={applyTheme}
						>
							<option>Light</option>
							<option>Dark</option>
							<option>System</option>
						</select>

						<label>Language</label>

						<select bind:value={appearance.language}>
							<option>English</option>
							<option>Tamil</option>
						</select>

						<label>Date Format</label>

						<select bind:value={appearance.dateFormat}>
							<option>DD/MM/YYYY</option>
							<option>MM/DD/YYYY</option>
						</select>

						<label>Time Format</label>

						<select bind:value={appearance.timeFormat}>
							<option>24 Hours</option>
							<option>12 Hours</option>
						</select>

					</div>

				{:else if activeTab === 'notifications'}

					<div class="card">

						<h2>🔔 Notifications</h2>

						<label class="toggle">
							<input
								type="checkbox"
								bind:checked={notifications.email}
							/>
							Email
						</label>

						<label class="toggle">
							<input
								type="checkbox"
								bind:checked={notifications.meetingReminder}
							/>
							Meeting Reminder
						</label>

						<label class="toggle">
							<input
								type="checkbox"
								bind:checked={notifications.reportReminder}
							/>
							Report Reminder
						</label>

						<label class="toggle">
							<input
								type="checkbox"
								bind:checked={notifications.aiNotification}
							/>
							AI Notification
						</label>

						<label class="toggle">
							<input
								type="checkbox"
								bind:checked={notifications.systemNotification}
							/>
							System Notifications
						</label>

					</div>

				{:else if activeTab === 'security'}

					<div class="card">

						<h2>🔒 Security</h2>

						<label class="toggle">
							<input
								type="checkbox"
								bind:checked={security.twoFactor}
							/>
							Two-factor authentication
						</label>

						<label>Session Timeout (minutes)</label>

						<input
							type="number"
							bind:value={security.sessionTimeout}
						/>

						<label class="toggle">
							<input
								type="checkbox"
								bind:checked={security.loginNotification}
							/>
							Login Notifications
						</label>

						<hr />

						<h3>Change Password</h3>

						<label>New Password</label>

						<input
							type="password"
							bind:value={password.newPassword}
						/>

						<label>Confirm Password</label>

						<input
							type="password"
							bind:value={password.confirmPassword}
						/>

						<button
							type="button"
							class="primary"
							on:click={changePassword}
						>
							Update Password
						</button>

					</div>

				{:else if activeTab === 'ai'}

					<div class="card">

						<h2>🤖 AI Settings</h2>

						<label class="toggle">
							<input
								type="checkbox"
								bind:checked={aiSettings.enabled}
							/>
							Enable AI
						</label>

						<label>Provider</label>

						<select bind:value={aiSettings.provider}>
							<option>OpenAI</option>
							<option>Gemini</option>
							<option>Azure</option>
						</select>

						<label>Model</label>

						<input bind:value={aiSettings.model} />

						<label>
							Temperature: {aiSettings.temperature}
						</label>

						<input
							type="range"
							min="0"
							max="1"
							step="0.1"
							bind:value={aiSettings.temperature}
						/>

						<label class="toggle">
							<input
								type="checkbox"
								bind:checked={aiSettings.autoSummary}
							/>
							Automatic Summary
						</label>

						<label class="toggle">
							<input
								type="checkbox"
								bind:checked={aiSettings.autoSuggestions}
							/>
							Automatic Suggestions
						</label>

						<label class="toggle">
							<input
								type="checkbox"
								bind:checked={aiSettings.autoClassification}
							/>
							Automatic Classification
						</label>

					</div>

				{:else if activeTab === 'backup'}

					<div class="card">

						<h2>💾 Backup</h2>

						<label class="toggle">
							<input
								type="checkbox"
								bind:checked={backup.autoBackup}
							/>
							Automatic Backup
						</label>

						<label>Backup Time</label>
						<input
							type="time"
							bind:value={backup.backupTime}
						/>

						<label>Retention Days</label>
						<input
							type="number"
							bind:value={backup.retentionDays}
						/>

						<label class="toggle">
							<input
								type="checkbox"
								bind:checked={backup.cloudBackup}
							/>
							Cloud Backup
						</label>

						<button
							type="button"
							class="blue"
							on:click={runBackup}
						>
							Backup Now
						</button>

					</div>

				{:else if activeTab === 'email'}

					<div class="card">

						<h2>📧 SMTP Settings</h2>

						<label>SMTP Server</label>
						<input bind:value={emailSettings.smtpServer} />

						<label>Port</label>
						<input
							type="number"
							bind:value={emailSettings.smtpPort}
						/>

						<label>Username</label>
						<input bind:value={emailSettings.smtpUser} />

						<label>Password</label>
						<input
							type="password"
							bind:value={emailSettings.smtpPassword}
						/>

						<label>Sender Name</label>
						<input bind:value={emailSettings.senderName} />

						<label>Sender Email</label>
						<input bind:value={emailSettings.senderEmail} />

						<button
							type="button"
							class="blue"
							on:click={testSMTP}
						>
							Test SMTP
						</button>

					</div>

				{:else if activeTab === 'api'}

					<div class="card">

						<h2>🔑 API Keys</h2>

						<label>OpenAI</label>
						<input
							type="password"
							bind:value={apiKeys.openAI}
						/>

						<label>Gemini</label>
						<input
							type="password"
							bind:value={apiKeys.gemini}
						/>

						<label>Azure</label>
						<input
							type="password"
							bind:value={apiKeys.azure}
						/>

						<label>Weather</label>
						<input
							type="password"
							bind:value={apiKeys.weather}
						/>

						<button
							type="button"
							class="green"
							on:click={saveAPIKeys}
						>
							Save Keys
						</button>

					</div>

				{:else if activeTab === 'system'}

					<div class="card">

						<h2>⚙️ System</h2>

						<label>Page Size</label>
						<input
							type="number"
							bind:value={system.pageSize}
						/>

						<label>Auto Refresh (seconds)</label>
						<input
							type="number"
							bind:value={system.autoRefresh}
						/>

						<label>Default Department</label>
						<input bind:value={system.defaultDepartment} />

						<label>Default Shift</label>
						<input bind:value={system.defaultShift} />

						<hr />

						<h3>Application Information</h3>

						{#each Object.entries(applicationInfo) as [key, value]}
							<p>
								<b>{key}:</b> {value}
							</p>
						{/each}

					</div>

				{:else if activeTab === 'factory'}

					<div class="card">

						<h2>🏭 Factory Information</h2>

						<label>Factory Name</label>
						<input bind:value={factory.factoryName} />

						<label>Site Code</label>
						<input bind:value={factory.siteCode} />

						<label>Address</label>
						<input bind:value={factory.address} />

						<label>City</label>
						<input bind:value={factory.city} />

						<label>State</label>
						<input bind:value={factory.state} />

						<label>Country</label>
						<input bind:value={factory.country} />

						<label>Currency</label>

						<select bind:value={factory.currency}>
							<option>INR</option>
							<option>USD</option>
							<option>EUR</option>
							<option>JPY</option>
						</select>

					</div>

				{:else if activeTab === 'storage'}

					<div class="card">

						<h2>🗂 Storage</h2>

						<label>Provider</label>
						<input bind:value={storage.provider} />

						<label>Bucket</label>
						<input bind:value={storage.bucket} />

						<label>Retention Days</label>
						<input
							type="number"
							bind:value={storage.retentionDays}
						/>

						<label>Maximum Upload (MB)</label>
						<input
							type="number"
							bind:value={storage.maxUploadMB}
						/>

					</div>

				{/if}

			</div>
		</div>

		<div class="footer-actions">

			<button
				type="button"
				class="danger"
				on:click={() => goto('/dashboard')}
			>
				⬅ Return Dashboard
			</button>

		</div>

	{/if}

</div>

<style>
	.page {
		width: 100%;
		max-width: 1400px;
		margin: auto;
		padding: 24px;
		display: flex;
		flex-direction: column;
		gap: 24px;
	}

	.message {
		padding: 12px 16px;
		border-radius: 10px;
		font-size: 14px;
		font-weight: 500;
	}

	.success-message {
		background: #ecfdf5;
		color: #047857;
		border: 1px solid #a7f3d0;
	}

	.error-message {
		background: #fef2f2;
		color: #b91c1c;
		border: 1px solid #fecaca;
	}

	.info-message {
		background: #eff6ff;
		color: #1d4ed8;
		border: 1px solid #bfdbfe;
	}

	.page-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		gap: 20px;
	}

	.page-header h1 {
		margin: 0;
		font-size: 28px;
	}

	.page-header p {
		margin: 6px 0 0;
		color: #64748b;
	}

	.actions {
		display: flex;
		gap: 10px;
		flex-wrap: wrap;
	}

	.layout {
		display: grid;
		grid-template-columns: 260px minmax(0, 1fr);
		gap: 20px;
		align-items: start;
	}

	.sidebar {
		display: flex;
		flex-direction: column;
		gap: 6px;
		padding: 14px;
		background: white;
		border-radius: 14px;
		box-shadow: 0 4px 14px rgba(0, 0, 0, 0.07);
	}

	.sidebar button {
		width: 100%;
		padding: 11px 12px;
		text-align: left;
		border: none;
		background: transparent;
		border-radius: 9px;
		cursor: pointer;
		font-size: 14px;
		color: #334155;
		transition:
			background 0.15s ease,
			color 0.15s ease;
	}

	.sidebar button:hover {
		background: #eff6ff;
		color: #1d4ed8;
	}

	.sidebar button.active {
		background: #2563eb;
		color: white;
	}

	.content {
		min-width: 0;
	}

	.card {
		background: white;
		padding: 24px;
		border-radius: 14px;
		box-shadow: 0 6px 18px rgba(0, 0, 0, 0.07);
		display: flex;
		flex-direction: column;
		gap: 12px;
	}

	.card h2 {
		margin: 0 0 8px;
	}

	.card h3 {
		margin: 8px 0 0;
	}

	.card hr {
		width: 100%;
		border: none;
		border-top: 1px solid #e2e8f0;
	}

	.card input,
	.card select {
		width: 100%;
		box-sizing: border-box;
		padding: 10px 12px;
		border: 1px solid #cbd5e1;
		border-radius: 8px;
		background: white;
		font-size: 14px;
	}

	.card input:focus,
	.card select:focus {
		outline: none;
		border-color: #2563eb;
		box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1);
	}

	.toggle {
		display: flex;
		align-items: center;
		gap: 10px;
		cursor: pointer;
	}

	.toggle input {
		width: auto;
	}

	.avatar-upload {
		display: flex;
		align-items: center;
		gap: 18px;
		margin-bottom: 10px;
		flex-wrap: wrap;
	}

	.avatar {
		width: 80px;
		height: 80px;
		border-radius: 50%;
		object-fit: cover;
		border: 2px solid #e2e8f0;
	}

	.avatar.placeholder {
		display: flex;
		align-items: center;
		justify-content: center;
		background: #e2e8f0;
		color: #475569;
		font-size: 30px;
		font-weight: 700;
	}

	.primary,
	.secondary,
	.blue,
	.green,
	.danger {
		padding: 10px 18px;
		border: none;
		border-radius: 8px;
		cursor: pointer;
		font-weight: 600;
	}

	.primary {
		background: #2563eb;
		color: white;
	}

	.secondary {
		background: #64748b;
		color: white;
	}

	.blue {
		background: #2563eb;
		color: white;
	}

	.green {
		background: #16a34a;
		color: white;
	}

	.danger {
		background: #dc2626;
		color: white;
	}

	button:disabled {
		opacity: 0.6;
		cursor: not-allowed;
	}

	.loading-row {
		height: 60px;
		margin-bottom: 12px;
		border-radius: 10px;
		background: #f1f5f9;
		animation: pulse 1.4s infinite;
	}

	.footer-actions {
		margin-top: 4px;
	}

	@keyframes pulse {
		0% {
			opacity: 0.45;
		}

		50% {
			opacity: 1;
		}

		100% {
			opacity: 0.45;
		}
	}

	@media (max-width: 1000px) {
		.layout {
			grid-template-columns: 1fr;
		}

		.sidebar {
			display: grid;
			grid-template-columns: repeat(
				auto-fit,
				minmax(140px, 1fr)
			);
		}
	}

	@media (max-width: 600px) {
		.page {
			padding: 16px;
		}

		.page-header {
			flex-direction: column;
			align-items: stretch;
		}

		.actions {
			display: grid;
			grid-template-columns: 1fr;
		}

		.actions button {
			width: 100%;
		}
	}
</style>