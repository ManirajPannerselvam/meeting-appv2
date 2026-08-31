<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { supabase, supabaseChat } from '$lib/supabase/client';

	let loading = false;
	let saving = false;
	let activeTab = 'profile';
	let currentUserId = '';
	let showDetail = false; // mobile detail view

	let message = '';
	let messageType: 'success' | 'error' | 'info' = 'info';

	function showMessage(text: string, type: 'success' | 'error' | 'info' = 'info') {
		message = text;
		messageType = type;
		setTimeout(() => { message = ''; }, 3500);
	}

	let profile = { full_name: '', email: '', phone: '', avatar: '' };
	let company = { company_name: '', plant: '', department: '', location: '', timezone: 'Asia/Kolkata' };
	let appearance = { theme: 'whatsapp', language: 'English', dateFormat: 'DD/MM/YYYY', timeFormat: '24 Hours' };
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
	const tabs = [ { id: 'profile', label: '👤 Profile', desc:'Name, avatar, phone' }, { id: 'company', label: '🏭 Company', desc:'Plant & location' }, { id: 'appearance', label: '🎨 Appearance', desc:'10 themes' }, { id: 'notifications', label: '🔔 Notifications', desc:'Alerts' }, { id: 'security', label: '🔒 Security', desc:'Password & 2FA' }, { id: 'ai', label: '🤖 AI', desc:'Models' }, { id: 'backup', label: '💾 Backup', desc:'Auto backup' }, { id: 'email', label: '📧 Email', desc:'SMTP' }, { id: 'api', label: '🔑 API Keys', desc:'Keys' }, { id: 'system', label: '⚙️ System', desc:'Defaults' }, { id: 'factory', label: '🏭 Factory', desc:'Factory info' }, { id: 'storage', label: '🗂 Storage', desc:'Bucket' } ];

	const themeOptions = [
		{ id: 'System', label: '🖥️ System Auto' },
		{ id: 'Light', label: '☀️ Light' },
		{ id: 'Dark', label: '🌙 Dark' },
		{ id: 'whatsapp', label: '💚 WhatsApp Forest' },
		{ id: 'telegram', label: '💙 Telegram Sky' },
		{ id: 'instagram', label: '💜 Instagram Sunset' },
		{ id: 'imessage', label: '💬 iMessage Blue' },
		{ id: 'discord', label: '🎮 Discord Midnight' },
		{ id: 'snapchat', label: '💛 Snapchat Sunny' },
		{ id: 'slack', label: '💼 Slack Aubergine' },
		{ id: 'messenger', label: '⚡ Messenger Gradient' },
		{ id: 'twitter', label: '🖤 X Pitch Black' },
		{ id: 'minimal', label: '📄 Minimal Paper' }
	];

	function selectTab(id:string){
		activeTab = id;
		if(typeof window!== 'undefined' && window.innerWidth <= 900){
			showDetail = true;
		}
	}

	async function loadSettings() {
		loading = true;
		try {
			const { data: { user } } = await supabase.auth.getUser();
			if(!user){ showMessage('Not logged in', 'error'); loading=false; return; }
			currentUserId = user.id;
			const meta = user.user_metadata || {};
			let authProfile = {
				full_name: meta.full_name || meta.name || user.email?.split('@')[0] || '',
				email: user.email || '',
				phone: meta.phone || user.phone || '',
				avatar: meta.avatar_url || ''
			};
			try{
				const { data: prof } = await supabase.from('profiles').select('*').eq('id', user.id).maybeSingle();
				if(prof){
					authProfile.full_name = prof.name || prof.full_name || authProfile.full_name;
					authProfile.email = prof.email || authProfile.email;
					authProfile.phone = prof.phone || authProfile.phone;
					authProfile.avatar = prof.avatar_url || authProfile.avatar;
				}
				const { data: up } = await supabase.from('user_profiles').select('*').eq('id', user.id).maybeSingle();
				if(up?.avatar_url &&!authProfile.avatar) authProfile.avatar = up.avatar_url;
			}catch(e){}
			profile = {...profile,...authProfile };
			const { data, error } = await supabase.from('settings').select('*').eq('id', 1).maybeSingle();
			if (data) {
				company = {...company,...(data.company?? {}) };
				appearance = {...appearance,...(data.appearance?? {}) };
				notifications = {...notifications,...(data.notifications?? {}) };
				security = {...security,...(data.security?? {}) };
				aiSettings = {...aiSettings,...(data.ai_settings?? {}) };
				backup = {...backup,...(data.backup?? {}) };
				audit = {...audit,...(data.audit?? {}) };
				system = {...system,...(data.system?? {}) };
				emailSettings = {...emailSettings,...(data.email_settings?? {}) };
				database = {...database,...(data.database?? {}) };
				apiKeys = {...apiKeys,...(data.api_keys?? {}) };
				factory = {...factory,...(data.factory?? {}) };
				storage = {...storage,...(data.storage?? {}) };
				if(data.profile){
					profile = {...profile,...data.profile, full_name: profile.full_name || data.profile.full_name, email: profile.email || data.profile.email, phone: profile.phone || data.profile.phone, avatar: profile.avatar || data.profile.avatar };
				}
			}
			applyTheme(appearance.theme);
		} catch (err) {
			showMessage( err instanceof Error? err.message : 'Failed to load settings.', 'error' );
		} finally {
			loading = false;
		}
	}

	async function saveAllSettings() {
		saving = true;
		try {
			if(!currentUserId){
				const { data: { user } } = await supabase.auth.getUser();
				if(user) currentUserId = user.id;
			}
			if(currentUserId){
				await supabase.from('profiles').upsert({ id: currentUserId, name: profile.full_name, full_name: profile.full_name, email: profile.email, phone: profile.phone, avatar_url: profile.avatar, updated_at: new Date().toISOString() }, { onConflict: 'id' });
				await supabase.from('user_profiles').upsert({ id: currentUserId, avatar_url: profile.avatar, updated_at: new Date().toISOString() }, { onConflict: 'id' });
				await supabase.auth.updateUser({ data: { full_name: profile.full_name, name: profile.full_name, avatar_url: profile.avatar, phone: profile.phone } });
			}
			const payload = { id: 1, profile, company, appearance, notifications, security, ai_settings: aiSettings, backup, audit, system, email_settings: emailSettings, database, api_keys: apiKeys, factory, storage, updated_at: new Date().toISOString() };
			const { error } = await supabase.from('settings').upsert(payload, { onConflict: 'id' });
			if (error) throw error;
			applyTheme(appearance.theme);
			showMessage('Saved — full app updated.', 'success');
		} catch (err) {
			showMessage( err instanceof Error? err.message : 'Failed to save settings.', 'error' );
		} finally {
			saving = false;
		}
	}

	function exportSettings() {
		const settings = { profile, company, appearance, notifications, security, ai_settings: aiSettings, backup, audit, system, email_settings: emailSettings, database, api_keys: apiKeys, factory, storage };
		const blob = new Blob([JSON.stringify(settings, null, 2)], { type: 'application/json' });
		const url = URL.createObjectURL(blob);
		const a = document.createElement('a');
		a.href = url; a.download = 'ems-settings.json';
		document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
		showMessage('Settings exported.', 'success');
	}
	async function changePassword() {
		if (!password.newPassword) { showMessage('Enter a new password.', 'error'); return; }
		if (password.newPassword.length < 8) { showMessage('Password must be at least 8 characters.', 'error'); return; }
		if (password.newPassword!== password.confirmPassword) { showMessage('Passwords do not match.', 'error'); return; }
		const { error } = await supabase.auth.updateUser({ password: password.newPassword });
		if (error) { showMessage(error.message, 'error'); return; }
		password = { current: '', newPassword: '', confirmPassword: '' };
		showMessage('Password updated.', 'success');
	}
	function restoreDefaults() {
		if (!confirm('Restore defaults?')) return;
		appearance = { theme: 'System', language: 'English', dateFormat: 'DD/MM/YYYY', timeFormat: '24 Hours' };
		applyTheme(appearance.theme);
		showMessage('Defaults restored.', 'info');
	}
	function testSMTP() { showMessage('SMTP test requested.', 'info'); }
	function saveAPIKeys() { showMessage('API keys included in Save All.', 'info'); }
	function runBackup() { showMessage('Database backup started.', 'info'); }
	function applyTheme(val: string) {
		if (typeof document === 'undefined') return;
		let t = (val || 'System').toLowerCase();
		try{ localStorage.setItem('ems_theme', val); }catch{}
		if(t==='system'){
			const isDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
			t = isDark? 'dark' : 'light';
			document.documentElement.setAttribute('data-theme', t);
		} else {
			document.documentElement.setAttribute('data-theme', t);
		}
		appearance.theme = val;
	}
	async function uploadAvatar(event: Event) {
		const input = event.target as HTMLInputElement;
		const file = input.files?.[0];
		if (!file) return;
		const extension = file.name.split('.').pop()?.toLowerCase()?? 'jpg';
		const filename = `avatar-${currentUserId || Date.now()}-${Date.now()}.${extension}`;
		const { error } = await supabase.storage.from('avatars').upload(filename, file, { upsert: true });
		if (error) { showMessage(error.message, 'error'); return; }
		const { data } = supabase.storage.from('avatars').getPublicUrl(filename);
		profile = {...profile, avatar: data.publicUrl };
		if(currentUserId){
			await supabase.from('profiles').update({ avatar_url: data.publicUrl }).eq('id', currentUserId);
			await supabase.from('user_profiles').update({ avatar_url: data.publicUrl }).eq('id', currentUserId);
			await supabase.auth.updateUser({ data: { avatar_url: data.publicUrl } });
		}
		showMessage('Profile image synced.', 'success');
	}
	onMount(loadSettings);
</script>

<div class="page">
	{#if message}
		<div class:error-message={messageType === 'error'} class:success-message={messageType === 'success'} class:info-message={messageType === 'info'} class="message" role="alert">{message}</div>
	{/if}

	<div class="page-header">
		<div class="title-block"><h1>⚙ Settings</h1><p>Manage your account & app</p></div>
		<!-- SINGLE HORIZONTAL LINE IN MOBILE -->
		<div class="actions">
			<button class="secondary" type="button" on:click={exportSettings}>📤 Export</button>
			<button class="secondary" type="button" on:click={restoreDefaults}>🔄 Reset</button>
			<button class="primary" type="button" disabled={saving} on:click={saveAllSettings}>{saving? 'Saving...' : '💾 Save All'}</button>
		</div>
	</div>

	{#if loading}
		<div class="loading"><div class="loading-row"></div><div class="loading-row"></div><div class="loading-row"></div></div>
	{:else}
		<div class="layout" class:show-detail={showDetail}>
			<!-- VERTICAL LIST LIKE CHAT CONTACTS -->
			<div class="sidebar">
				{#each tabs as tab}
					<button type="button" class:active={activeTab === tab.id} on:click={() => selectTab(tab.id)}>
						<div class="tab-left">
							<span class="tab-label">{tab.label}</span>
							<span class="tab-desc">{tab.desc}</span>
						</div>
						<span class="arrow">›</span>
					</button>
				{/each}
			</div>

			<!-- DETAIL LIKE CHAT MESSAGE OPEN -->
			<div class="content">
				<div class="mobile-back"><button type="button" on:click={()=>showDetail=false}>‹ Back to Settings</button><span>{tabs.find(t=>t.id===activeTab)?.label}</span></div>

				{#if activeTab === 'profile'}
					<div class="card">
						<h2>👤 Profile</h2>
						<div class="avatar-upload">
							{#if profile.avatar}<img src={profile.avatar} class="avatar" alt="Profile" />{:else}<div class="avatar placeholder">{profile.full_name? profile.full_name.charAt(0).toUpperCase() : '?'}</div>{/if}
							<input type="file" accept="image/*" on:change={uploadAvatar} />
						</div>
						<label>Full Name</label><input bind:value={profile.full_name} />
						<label>Email</label><input bind:value={profile.email} readonly />
						<label>Phone</label><input bind:value={profile.phone} />
					</div>
				{:else if activeTab === 'company'}
					<div class="card"><h2>🏭 Company</h2><label>Company</label><input bind:value={company.company_name} /><label>Plant</label><input bind:value={company.plant} /><label>Department</label><input bind:value={company.department} /><label>Location</label><input bind:value={company.location} /><label>Timezone</label><select bind:value={company.timezone}><option>Asia/Kolkata</option><option>UTC</option><option>America/New_York</option></select></div>
				{:else if activeTab === 'appearance'}
					<div class="card">
						<h2>🎨 Appearance - 10 Themes</h2>
						<label>Theme (Full App)</label>
						<select bind:value={appearance.theme} on:change={(e)=>applyTheme((e.target as HTMLSelectElement).value)}>
							{#each themeOptions as th}<option value={th.id}>{th.label}</option>{/each}
						</select>
						<div class="theme-preview"><div class="preview-box"><div class="preview-bubble own">{appearance.theme} Own</div><div class="preview-bubble other">Other preview</div></div></div>
						<label>Language</label><select bind:value={appearance.language}><option>English</option><option>Tamil</option></select>
						<label>Date Format</label><select bind:value={appearance.dateFormat}><option>DD/MM/YYYY</option><option>MM/DD/YYYY</option></select>
						<label>Time Format</label><select bind:value={appearance.timeFormat}><option>24 Hours</option><option>12 Hours</option></select>
					</div>
				{:else if activeTab === 'notifications'}
					<div class="card"><h2>🔔 Notifications</h2><label class="toggle"><input type="checkbox" bind:checked={notifications.email} />Email</label><label class="toggle"><input type="checkbox" bind:checked={notifications.meetingReminder} />Meeting Reminder</label><label class="toggle"><input type="checkbox" bind:checked={notifications.reportReminder} />Report Reminder</label><label class="toggle"><input type="checkbox" bind:checked={notifications.aiNotification} />AI Notification</label><label class="toggle"><input type="checkbox" bind:checked={notifications.systemNotification} />System Notifications</label></div>
				{:else if activeTab === 'security'}
					<div class="card"><h2>🔒 Security</h2><label class="toggle"><input type="checkbox" bind:checked={security.twoFactor} />Two-factor</label><label>Session Timeout (minutes)</label><input type="number" bind:value={security.sessionTimeout} /><label class="toggle"><input type="checkbox" bind:checked={security.loginNotification} />Login Notifications</label><hr /><h3>Change Password</h3><label>New Password</label><input type="password" bind:value={password.newPassword} /><label>Confirm Password</label><input type="password" bind:value={password.confirmPassword} /><button type="button" class="primary" on:click={changePassword}>Update Password</button></div>
				{:else if activeTab === 'ai'}
					<div class="card"><h2>🤖 AI Settings</h2><label class="toggle"><input type="checkbox" bind:checked={aiSettings.enabled} />Enable AI</label><label>Provider</label><select bind:value={aiSettings.provider}><option>OpenAI</option><option>Gemini</option><option>Azure</option></select><label>Model</label><input bind:value={aiSettings.model} /><label>Temperature: {aiSettings.temperature}</label><input type="range" min="0" max="1" step="0.1" bind:value={aiSettings.temperature} /><label class="toggle"><input type="checkbox" bind:checked={aiSettings.autoSummary} />Auto Summary</label><label class="toggle"><input type="checkbox" bind:checked={aiSettings.autoSuggestions} />Auto Suggestions</label><label class="toggle"><input type="checkbox" bind:checked={aiSettings.autoClassification} />Auto Classification</label></div>
				{:else if activeTab === 'backup'}
					<div class="card"><h2>💾 Backup</h2><label class="toggle"><input type="checkbox" bind:checked={backup.autoBackup} />Auto Backup</label><label>Backup Time</label><input type="time" bind:value={backup.backupTime} /><label>Retention Days</label><input type="number" bind:value={backup.retentionDays} /><label class="toggle"><input type="checkbox" bind:checked={backup.cloudBackup} />Cloud Backup</label><button type="button" class="blue" on:click={runBackup}>Backup Now</button></div>
				{:else if activeTab === 'email'}
					<div class="card"><h2>📧 SMTP</h2><label>SMTP Server</label><input bind:value={emailSettings.smtpServer} /><label>Port</label><input type="number" bind:value={emailSettings.smtpPort} /><label>Username</label><input bind:value={emailSettings.smtpUser} /><label>Password</label><input type="password" bind:value={emailSettings.smtpPassword} /><label>Sender Name</label><input bind:value={emailSettings.senderName} /><label>Sender Email</label><input bind:value={emailSettings.senderEmail} /><button type="button" class="blue" on:click={testSMTP}>Test SMTP</button></div>
				{:else if activeTab === 'api'}
					<div class="card"><h2>🔑 API Keys</h2><label>OpenAI</label><input type="password" bind:value={apiKeys.openAI} /><label>Gemini</label><input type="password" bind:value={apiKeys.gemini} /><label>Azure</label><input type="password" bind:value={apiKeys.azure} /><label>Weather</label><input type="password" bind:value={apiKeys.weather} /><button type="button" class="green" on:click={saveAPIKeys}>Save Keys</button></div>
				{:else if activeTab === 'system'}
					<div class="card"><h2>⚙️ System</h2><label>Page Size</label><input type="number" bind:value={system.pageSize} /><label>Auto Refresh</label><input type="number" bind:value={system.autoRefresh} /><label>Default Department</label><input bind:value={system.defaultDepartment} /><label>Default Shift</label><input bind:value={system.defaultShift} /></div>
				{:else if activeTab === 'factory'}
					<div class="card"><h2>🏭 Factory</h2><label>Factory Name</label><input bind:value={factory.factoryName} /><label>Site Code</label><input bind:value={factory.siteCode} /><label>Address</label><input bind:value={factory.address} /><label>City</label><input bind:value={factory.city} /><label>State</label><input bind:value={factory.state} /><label>Country</label><input bind:value={factory.country} /><label>Currency</label><select bind:value={factory.currency}><option>INR</option><option>USD</option><option>EUR</option><option>JPY</option></select></div>
				{:else if activeTab === 'storage'}
					<div class="card"><h2>🗂 Storage</h2><label>Provider</label><input bind:value={storage.provider} /><label>Bucket</label><input bind:value={storage.bucket} /><label>Retention Days</label><input type="number" bind:value={storage.retentionDays} /><label>Maximum Upload (MB)</label><input type="number" bind:value={storage.maxUploadMB} /></div>
				{/if}
			</div>
		</div>
	{/if}
</div>

<style>
	.page { width: 100%; max-width: 1400px; margin: auto; padding: 16px; display: flex; flex-direction: column; gap: 14px; background:var(--bg); color:var(--text); min-height:100dvh; }
	.message { padding: 12px 16px; border-radius: 10px; font-size: 14px; font-weight: 500; position:sticky; top:0; z-index:20; }
	.success-message { background: #ecfdf5; color: #047857; border: 1px solid #a7f3d0; }
	.error-message { background: #fef2f2; color: #b91c1c; border: 1px solid #fecaca; }
	.info-message { background: #eff6ff; color: #1d4ed8; border: 1px solid #bfdbfe; }

	.page-header { display: flex; justify-content: space-between; align-items: center; gap: 12px; flex-wrap:wrap; }
	.title-block h1 { margin: 0; font-size: 22px; color:var(--text); }
	.title-block p { margin: 4px 0 0; color: var(--text-2); font-size:12px; }
	.actions { display: flex; gap: 8px; flex-wrap: nowrap; align-items:center; }
	.actions button{ white-space:nowrap; }

	.layout { display: grid; grid-template-columns: 260px minmax(0, 1fr); gap: 14px; align-items: start; }
	.sidebar { display: flex; flex-direction: column; gap: 2px; padding: 8px; background: var(--card); border-radius: 12px; border:1px solid var(--border); position:sticky; top:10px; }
	.sidebar button { width: 100%; padding: 12px 12px; text-align: left; border: none; background: transparent; border-radius: 10px; cursor: pointer; color: var(--text); display:flex; justify-content:space-between; align-items:center; transition: all 0.15s; }
	.sidebar button:hover { background: var(--bg); }
	.sidebar button.active { background: var(--accent); color: white; }
	.tab-left{ display:flex; flex-direction:column; gap:2px; }
	.tab-label{ font-size:13px; font-weight:600; }
	.tab-desc{ font-size:11px; color:var(--text-2); }
	.arrow{ font-size:18px; opacity:0.5; }

	.content { min-width: 0; }
	.mobile-back{ display:none; }

	.card { background: var(--card); color:var(--text); padding: 18px; border-radius: 12px; border:1px solid var(--border); display: flex; flex-direction: column; gap: 10px; }
	.card h2 { margin: 0 0 6px; font-size:16px; }
	.card label{ font-size:12px; color:var(--text-2); }
	.card input,.card select { width: 100%; padding: 10px 12px; border: 1px solid var(--border); border-radius: 8px; background: var(--input-bg); color:var(--text); font-size: 14px; }
	.toggle { display: flex; align-items: center; gap: 10px; font-size:13px; }
	.toggle input{ width:auto; }
	.avatar-upload { display: flex; align-items: center; gap: 14px; flex-wrap: wrap; }
	.avatar { width: 68px; height: 68px; border-radius: 50%; object-fit: cover; border: 2px solid var(--border); }
	.avatar.placeholder { display: flex; align-items: center; justify-content: center; background: var(--bg); color: var(--text-2); font-size: 26px; font-weight: 700; width:68px; height:68px; border-radius:50%; }
	.primary,.secondary,.blue,.green,.danger { padding: 9px 14px; border: none; border-radius: 8px; cursor: pointer; font-weight: 600; font-size:13px; }
	.primary { background: var(--accent); color: white; }.secondary { background: var(--border); color: var(--text); }.blue { background: #2563eb; color: white; }.green { background: #16a34a; color: white; }.danger { background: #dc2626; color: white; }
	.loading-row { height: 56px; margin-bottom: 10px; border-radius: 10px; background: var(--card); animation: pulse 1.4s infinite; }
	.theme-preview{ padding:10px; background:var(--bg); border-radius:10px; border:1px dashed var(--border); }
	.preview-box{ display:flex; flex-direction:column; gap:8px; }
	.preview-bubble{ padding:8px 12px; border-radius:14px; font-size:12px; max-width:70%; }
	.preview-bubble.own{ align-self:flex-end; background:var(--accent); color:white; }
	.preview-bubble.other{ align-self:flex-start; background:var(--border); color:var(--text); }
	@keyframes pulse { 0% { opacity: 0.45; } 50% { opacity: 1; } 100% { opacity: 0.45; } }

	/* ===== MOBILE: CHAT STYLE - FIXED ===== */
	@media (max-width: 900px) {
		.page{ padding:10px; }
		.page-header{ flex-direction:column; align-items:stretch; gap:10px; }
		/* SINGLE HORIZONTAL LINE - Export Reset SaveAll */
		.actions{
			display:flex; flex-direction:row; flex-wrap:nowrap;
			gap:6px; width:100%;
		}
		.actions button{ flex:1 1 0; min-height:40px; font-size:12px; padding:8px 6px; }

		.layout{ grid-template-columns:1fr; }

		/* LIST VIEW */
		.layout:not(.show-detail) .sidebar{ display:flex !important; }
		.layout:not(.show-detail) .content{ display:none !important; }

		/* DETAIL VIEW - ONLY PROFILE SHOWS */
		.layout.show-detail .sidebar{ display:none !important; }
		.layout.show-detail .content{ display:block !important; }
		.layout.show-detail ~ .footer-actions{ display:none; } /* hide footer when detail open */

		.sidebar{ flex-direction:column; gap:0; padding:0; border-radius:10px; overflow:hidden; position:static; }
		.sidebar button{ border-radius:0; padding:14px 14px; border-bottom:1px solid var(--border); }
		.sidebar button:last-child{ border-bottom:none; }

		.mobile-back{
			display:flex; align-items:center; gap:10px;
			padding:8px 0; margin-bottom:8px;
			position:sticky; top:0; z-index:5;
			background:var(--bg);
		}
		.mobile-back button{
			background:var(--card); border:1px solid var(--border);
			color:var(--text); padding:6px 14px; border-radius:20px;
			font-size:13px; font-weight:600;
		}
		.mobile-back span{ font-weight:600; font-size:14px; }
		.card{ padding:14px; }
		.card input,.card select{ font-size:16px; }
	}
</style>