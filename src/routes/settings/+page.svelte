<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import { supabase } from '$lib/supabase/client';

	let loading = true;
	let saving = false;
	let activeTab = 'profile';
	let currentUserId = '';
	let message = '';
	let messageType: 'success' | 'error' | 'info' = 'info';
	function showMessage(text: string, type: 'success' | 'error' | 'info' = 'info') {
		message = text; messageType = type; setTimeout(() => { message = ''; }, 3500);
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
	const tabs = [
		{ id: 'profile', label: '👤 Profile', desc:'Name, avatar, phone' },
		{ id: 'company', label: '🏭 Company', desc:'Plant & location' },
		{ id: 'appearance', label: '🎨 Appearance', desc:'10 themes' },
		{ id: 'notifications', label: '🔔 Notifications', desc:'Alerts' },
		{ id: 'security', label: '🔒 Security', desc:'Password & 2FA' },
		{ id: 'ai', label: '🤖 AI', desc:'Models' },
		{ id: 'backup', label: '💾 Backup', desc:'Auto backup' },
		{ id: 'email', label: '📧 Email', desc:'SMTP' },
		{ id: 'api', label: '🔑 API Keys', desc:'Keys' },
		{ id: 'system', label: '⚙️ System', desc:'Defaults' },
		{ id: 'factory', label: '🏭 Factory', desc:'Factory info' },
		{ id: 'storage', label: '🗂 Storage', desc:'Bucket' }
	];
	const themeOptions = [
		{ id: 'system', label: '🖥️ System Auto' },{ id: 'light', label: '☀️ Light' },{ id: 'dark', label: '🌙 Dark' },{ id: 'whatsapp', label: '💚 WhatsApp Forest' },
		{ id: 'telegram', label: '💙 Telegram Sky' },{ id: 'instagram', label: '💜 Instagram Sunset' },{ id: 'imessage', label: '💬 iMessage Blue' },{ id: 'discord', label: '🎮 Discord Midnight' },{ id: 'snapchat', label: '💛 Snapchat Sunny' },{ id: 'slack', label: '💼 Slack Aubergine' },{ id: 'messenger', label: '⚡ Messenger Gradient' },{ id: 'twitter', label: '🖤 X Pitch Black' },{ id: 'minimal', label: '📄 Minimal Paper' }
	];
	let topProfile = { name: '', email: '', avatar: '', phone: '' };
	
	function selectTab(id:string){
		// Toggle for mobile accordion
		if(activeTab === id){
			// On mobile, toggle close if same tab clicked again
			if(typeof window !== 'undefined' && window.innerWidth <= 900){
				activeTab = '';
				return;
			}
		}
		activeTab = id;
		// Scroll to the opened tab on mobile
		setTimeout(()=>{
			const el = document.getElementById(`tab-${id}`);
			if(el && window.innerWidth <= 900) el.scrollIntoView({behavior:'smooth', block:'start'});
		}, 100);
	}
	async function loadSettings() {
		loading = true;
		try {
			let serverUser = $page.data.user; let user = serverUser;
			if(!user){
				const { data: { session } } = await supabase.auth.getSession();
				if(!session){ await goto('/login'); return; }
				const { data: { user: u }, error } = await supabase.auth.getUser();
				if(error ||!u){ await goto('/login'); return; } user = u;
			}
			currentUserId = user.id;
			topProfile = { name: user.user_metadata?.full_name || user.user_metadata?.name || user.email?.split('@')[0] || '', email: user.email || '', avatar: user.user_metadata?.avatar_url || '', phone: user.user_metadata?.phone || user.phone || '' };
			let authProfile = { full_name: topProfile.name, email: topProfile.email, phone: topProfile.phone, avatar: topProfile.avatar };
			try{ const { data: prof } = await supabase.from('profiles').select('*').eq('id', user.id).maybeSingle(); if(prof){ authProfile.full_name = prof.name || prof.full_name || authProfile.full_name; authProfile.email = prof.email || authProfile.email; authProfile.phone = prof.phone || authProfile.phone; authProfile.avatar = prof.avatar_url || authProfile.avatar; topProfile = { name: authProfile.full_name, email: authProfile.email, avatar: authProfile.avatar, phone: authProfile.phone }; } }catch{}
			profile = {...profile,...authProfile };
			const { data } = await supabase.from('settings').select('*').eq('id', 1).maybeSingle();
			if (data) {
				company = {...company,...(data.company?? {}) }; appearance = {...appearance,...(data.appearance?? {}) }; notifications = {...notifications,...(data.notifications?? {}) }; security = {...security,...(data.security?? {}) }; aiSettings = {...aiSettings,...(data.ai_settings?? {}) }; backup = {...backup,...(data.backup?? {}) }; system = {...system,...(data.system?? {}) }; emailSettings = {...emailSettings,...(data.email_settings?? {}) }; apiKeys = {...apiKeys,...(data.api_keys?? {}) }; factory = {...factory,...(data.factory?? {}) }; storage = {...storage,...(data.storage?? {}) };
				if(data.profile){ profile = {...profile,...data.profile }; }
			}
			applyTheme(appearance.theme);
		} catch (err) { showMessage( err instanceof Error? err.message : 'Failed to load settings.', 'error' ); } finally { loading = false; }
	}
	async function saveAllSettings() {
		if(!currentUserId){ await goto('/login'); return; } saving = true;
		try {
			const { data: { user } } = await supabase.auth.getUser(); if(!user){ await goto('/login'); return; }
			await supabase.from('profiles').upsert({ id: user.id, name: profile.full_name, full_name: profile.full_name, email: profile.email, phone: profile.phone, avatar_url: profile.avatar, updated_at: new Date().toISOString() }, { onConflict: 'id' });
			await supabase.auth.updateUser({ data: { full_name: profile.full_name, name: profile.full_name, avatar_url: profile.avatar, phone: profile.phone } });
			topProfile = { name: profile.full_name, email: profile.email, avatar: profile.avatar, phone: profile.phone };
			const payload = { id: 1, profile, company, appearance, notifications, security, ai_settings: aiSettings, backup, system, email_settings: emailSettings, api_keys: apiKeys, factory, storage, updated_at: new Date().toISOString() };
			const { error } = await supabase.from('settings').upsert(payload, { onConflict: 'id' }); if (error) throw error;
			applyTheme(appearance.theme); showMessage('Saved ✓', 'success');
		} catch (err) { showMessage( err instanceof Error? err.message : 'Failed to save.', 'error' ); } finally { saving = false; }
	}
	function exportSettings() { const blob = new Blob([JSON.stringify({profile,company,appearance}, null, 2)], { type: 'application/json' }); const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = 'ems-settings.json'; a.click(); URL.revokeObjectURL(url); }
	async function changePassword() { if (password.newPassword.length < 8) { showMessage('Min 8 chars', 'error'); return; } if (password.newPassword!== password.confirmPassword) { showMessage('Not match', 'error'); return; } const { error } = await supabase.auth.updateUser({ password: password.newPassword }); if (error) { showMessage(error.message, 'error'); return; } showMessage('Password updated.', 'success'); }
	function restoreDefaults() { if (!confirm('Restore defaults?')) return; appearance = { theme: 'whatsapp', language: 'English', dateFormat: 'DD/MM/YYYY', timeFormat: '24 Hours' }; applyTheme(appearance.theme); }
	function applyTheme(val: string) { if (typeof document === 'undefined') return; let t = (val || 'whatsapp').toLowerCase(); const raw = val || 'whatsapp'; try { localStorage.setItem('ems_theme', raw); } catch {} document.documentElement.setAttribute('data-theme', t); appearance.theme = raw; }
	async function uploadAvatar(event: Event) {
		const input = event.target as HTMLInputElement; const file = input.files?.[0]; if (!file) return;
		const filename = `avatar-${currentUserId}-${Date.now()}.${file.name.split('.').pop()}`;
		const { error } = await supabase.storage.from('avatars').upload(filename, file, { upsert: true }); if (error) { showMessage(error.message, 'error'); return; }
		const { data } = supabase.storage.from('avatars').getPublicUrl(filename); profile = {...profile, avatar: data.publicUrl }; topProfile.avatar = data.publicUrl;
		await supabase.from('profiles').update({ avatar_url: data.publicUrl }).eq('id', currentUserId); showMessage('Avatar updated.', 'success');
	}
	async function handleLogout(){ try{ supabase.auth.signOut({ scope: 'local' }).catch(()=>{}); localStorage.clear(); sessionStorage.clear(); }catch{} window.location.replace('/login'); }
	onMount(loadSettings);
</script>

<div class="page">
	{#if message}<div class="message {messageType}">{message}</div>{/if}
	
	<div class="topbar">
		<div class="top-left">
			{#if topProfile.avatar || profile.avatar}<img src={topProfile.avatar || profile.avatar} class="top-avatar" alt="avatar" />{:else}<div class="top-avatar ph">{(topProfile.name || '?').charAt(0)}</div>{/if}
			<div class="top-info"><b>{topProfile.name || profile.full_name}</b><small>{topProfile.email || profile.email}</small></div>
		</div>
		<button class="danger" on:click={handleLogout}>Logout</button>
	</div>

	<div class="page-header">
		<div class="title-block"><h1>⚙ Settings</h1><p>{profile.full_name} ({profile.email})</p></div>
		<div class="actions"><button class="secondary" on:click={exportSettings}>📤 Export</button><button class="secondary" on:click={restoreDefaults}>🔄 Reset</button><button class="primary" disabled={saving} on:click={saveAllSettings}>{saving?'Saving...':'💾 Save All'}</button></div>
	</div>

	{#if loading}<div class="loading">Loading...</div>
	{:else}
	<div class="layout">
		<!-- LEFT SIDEBAR - MOBILE ACCORDION -->
		<div class="sidebar">
			{#each tabs as tab (tab.id)}
				<div class="tab-wrap" id="tab-{tab.id}" class:active={activeTab===tab.id}>
					<button type="button" class="tab-btn" class:active={activeTab === tab.id} on:click={() => selectTab(tab.id)}>
						<div class="tab-left"><span class="tab-label">{tab.label}</span><span class="tab-desc">{tab.desc}</span></div>
						<span class="arrow">{activeTab===tab.id ? '⌄' : '›'}</span>
					</button>
					
					<!-- MOBILE DOWNSIDE DETAIL - SHOWS BELOW CLICKED TAB -->
					{#if activeTab === tab.id}
					<div class="mobile-detail">
						{#if tab.id === 'profile'}
							<div class="card inner"><h2>👤 Profile</h2>
								<div class="avatar-upload">{#if profile.avatar}<img src={profile.avatar} class="avatar" alt="Profile" />{:else}<div class="avatar placeholder">{profile.full_name.charAt(0)}</div>{/if}<input type="file" accept="image/*" on:change={uploadAvatar} /></div>
								<label>Full Name</label><input bind:value={profile.full_name} />
								<label>Email</label><input bind:value={profile.email} readonly />
								<label>Phone</label><input bind:value={profile.phone} inputmode="numeric"/>
								<div class="info-box">From auth + profiles table.</div>
							</div>
						{:else if tab.id === 'company'}<div class="card inner"><h2>🏭 Company</h2><label>Company</label><input bind:value={company.company_name} /><label>Plant</label><input bind:value={company.plant} /><label>Location</label><input bind:value={company.location} /></div>
						{:else if tab.id === 'appearance'}<div class="card inner"><h2>🎨 Appearance</h2><label>Theme</label><select bind:value={appearance.theme} on:change={(e)=>applyTheme((e.target as HTMLSelectElement).value)}>{#each themeOptions as th}<option value={th.id}>{th.label}</option>{/each}</select></div>
						{:else if tab.id === 'notifications'}<div class="card inner"><h2>🔔 Notifications</h2><label class="toggle"><input type="checkbox" bind:checked={notifications.email} />Email</label><label class="toggle"><input type="checkbox" bind:checked={notifications.meetingReminder} />Meeting</label></div>
						{:else if tab.id === 'security'}<div class="card inner"><h2>🔒 Security</h2><label>New Password</label><input type="password" bind:value={password.newPassword} /><label>Confirm</label><input type="password" bind:value={password.confirmPassword} /><button class="primary" on:click={changePassword}>Update Password</button></div>
						{:else if tab.id === 'ai'}<div class="card inner"><h2>🤖 AI</h2><label>Provider</label><select bind:value={aiSettings.provider}><option>OpenAI</option><option>Gemini</option></select><label>Model</label><input bind:value={aiSettings.model} /></div>
						{:else if tab.id === 'backup'}<div class="card inner"><h2>💾 Backup</h2><label class="toggle"><input type="checkbox" bind:checked={backup.autoBackup} />Auto Backup</label></div>
						{:else if tab.id === 'email'}<div class="card inner"><h2>📧 Email</h2><label>Server</label><input bind:value={emailSettings.smtpServer} /><label>Port</label><input type="number" bind:value={emailSettings.smtpPort} /></div>
						{:else if tab.id === 'api'}<div class="card inner"><h2>🔑 API Keys</h2><label>OpenAI</label><input type="password" bind:value={apiKeys.openAI} /></div>
						{:else if tab.id === 'system'}<div class="card inner"><h2>⚙️ System</h2><label>Page Size</label><input type="number" bind:value={system.pageSize} /></div>
						{:else if tab.id === 'factory'}<div class="card inner"><h2>🏭 Factory</h2><label>Factory</label><input bind:value={factory.factoryName} /><label>City</label><input bind:value={factory.city} /></div>
						{:else if tab.id === 'storage'}<div class="card inner"><h2>🗂 Storage</h2><label>Bucket</label><input bind:value={storage.bucket} /></div>
						{/if}
					</div>
					{/if}
				</div>
			{/each}
		</div>

		<!-- RIGHT CONTENT - DESKTOP ONLY -->
		<div class="content desktop-only">
			{#if activeTab === 'profile'}<div class="card"><h2>👤 Profile</h2><div class="avatar-upload">{#if profile.avatar}<img src={profile.avatar} class="avatar" alt="Profile" />{:else}<div class="avatar placeholder">{profile.full_name.charAt(0)}</div>{/if}<input type="file" accept="image/*" on:change={uploadAvatar} /></div><label>Full Name</label><input bind:value={profile.full_name} /><label>Email</label><input bind:value={profile.email} readonly /><label>Phone</label><input bind:value={profile.phone} /></div>
			{:else if activeTab === 'company'}<div class="card"><h2>🏭 Company</h2><label>Company</label><input bind:value={company.company_name} /><label>Plant</label><input bind:value={company.plant} /><label>Location</label><input bind:value={company.location} /></div>
			{:else if activeTab === 'appearance'}<div class="card"><h2>🎨 Appearance - 10 Themes</h2><label>Theme</label><select bind:value={appearance.theme} on:change={(e)=>applyTheme((e.target as HTMLSelectElement).value)}>{#each themeOptions as th}<option value={th.id}>{th.label}</option>{/each}</select></div>
			{:else if activeTab === 'notifications'}<div class="card"><h2>🔔 Notifications</h2><label class="toggle"><input type="checkbox" bind:checked={notifications.email} />Email</label></div>
			{:else if activeTab === 'security'}<div class="card"><h2>🔒 Security</h2><label>New Password</label><input type="password" bind:value={password.newPassword} /><label>Confirm</label><input type="password" bind:value={password.confirmPassword} /><button class="primary" on:click={changePassword}>Update</button></div>
			{:else if activeTab === 'ai'}<div class="card"><h2>🤖 AI Settings</h2><label>Provider</label><select bind:value={aiSettings.provider}><option>OpenAI</option><option>Gemini</option></select></div>
			{:else if activeTab === 'backup'}<div class="card"><h2>💾 Backup</h2><label class="toggle"><input type="checkbox" bind:checked={backup.autoBackup} />Auto Backup</label></div>
			{:else if activeTab === 'email'}<div class="card"><h2>📧 Email</h2><label>Server</label><input bind:value={emailSettings.smtpServer} /></div>
			{:else if activeTab === 'api'}<div class="card"><h2>🔑 API Keys</h2><label>OpenAI</label><input type="password" bind:value={apiKeys.openAI} /></div>
			{:else if activeTab === 'system'}<div class="card"><h2>⚙️ System</h2><label>Page Size</label><input type="number" bind:value={system.pageSize} /></div>
			{:else if activeTab === 'factory'}<div class="card"><h2>🏭 Factory</h2><label>Factory</label><input bind:value={factory.factoryName} /></div>
			{:else if activeTab === 'storage'}<div class="card"><h2>🗂 Storage</h2><label>Bucket</label><input bind:value={storage.bucket} /></div>
			{/if}
		</div>
	</div>
	{/if}
</div>

<style>
	.page { width: 100%; max-width: 1400px; margin: 0 auto; padding: 16px; display: flex; flex-direction: column; gap: 14px; background: #0f172a; color: #e2e8f0; min-height:100dvh; box-sizing:border-box; }
	.message { padding: 12px 16px; border-radius: 10px; font-weight:600; position:sticky; top:0; z-index:20; background:#ecfdf5; color:#065f46; }
	.message.error{ background:#fef2f2; color:#b91c1c; }
	.topbar{ display:flex; justify-content:space-between; align-items:center; padding:12px 14px; background:#1e293b; border:1px solid #334155; border-radius:12px; }
	.top-left{ display:flex; align-items:center; gap:10px; min-width:0; }
	.top-avatar{ width:44px; height:44px; border-radius:50%; object-fit:cover; border:2px solid #334155; }
	.top-avatar.ph{ display:flex; align-items:center; justify-content:center; background:#334155; font-weight:700; width:44px; height:44px; border-radius:50%; }
	.top-info b{ font-size:14px; } .top-info small{ font-size:11px; color:#94a3b8; }
	.page-header{ display:flex; justify-content:space-between; align-items:center; gap:12px; flex-wrap:wrap; background:#1e293b; border:1px solid #334155; padding:12px 14px; border-radius:12px; }
	.title-block h1{ margin:0; font-size:20px; } .title-block p{ margin:4px 0 0; color:#94a3b8; font-size:12px; }
	.actions{ display:flex; gap:8px; flex-wrap:wrap; }
	.layout{ display:grid; grid-template-columns:280px 1fr; gap:14px; align-items:start; }
	.sidebar{ display:flex; flex-direction:column; gap:6px; padding:8px; background:#1e293b; border-radius:12px; border:1px solid #334155; position:sticky; top:10px; }
	.tab-wrap{ background:#0f172a; border:1px solid #1e293b; border-radius:10px; overflow:hidden; }
	.tab-wrap.active{ border-color:#00a884; background:#0b1f1a; }
	.tab-btn{ width:100%; padding:14px 12px; text-align:left; border:none; background:transparent; color:#e2e8f0; display:flex; justify-content:space-between; align-items:center; cursor:pointer; }
	.tab-btn.active{ background:#00a884; color:#fff; }
	.tab-left{ display:flex; flex-direction:column; gap:2px; } .tab-label{ font-weight:700; font-size:13px; } .tab-desc{ font-size:11px; opacity:0.7; } .arrow{ font-size:18px; }
	.mobile-detail{ display:none; } /* hidden on desktop */
	.content{ min-width:0; }
	.card{ background:#fff7ed; color:#1e293b; padding:18px; border-radius:12px; border:1px solid #fed7aa; display:flex; flex-direction:column; gap:10px; }
	.card.inner{ background:#fff7ed; margin:0; border-radius:0 0 10px 10px; border:none; border-top:1px solid #fed7aa; }
	.card label{ font-size:11px; font-weight:800; color:#78350f; text-transform:uppercase; }
	.card input,.card select{ width:100%; padding:12px; border:1px solid #e7c4b0; border-radius:10px; background:#3a241c; color:#ffedd5; font-size:14px; font-weight:600; box-sizing:border-box; }
	.card input:focus,.card select:focus{ border-color:#00a884; outline:none; }
	.toggle{ display:flex; align-items:center; gap:10px; font-size:13px; font-weight:700; }
	.avatar-upload{ display:flex; align-items:center; gap:14px; flex-wrap:wrap; }
	.avatar{ width:64px; height:64px; border-radius:50%; object-fit:cover; border:2px solid #fed7aa; }
	.avatar.placeholder{ display:flex; align-items:center; justify-content:center; background:#3a241c; color:#ffedd5; font-size:26px; font-weight:800; }
	.info-box{ background:#ffedd5; border:1px dashed #e7c4b0; padding:8px 10px; border-radius:8px; font-size:11px; color:#78350f; }
	.primary,.secondary,.danger{ padding:10px 16px; border:none; border-radius:10px; font-weight:800; cursor:pointer; font-size:13px; }
	.primary{ background:#00a884; color:#fff; } .secondary{ background:#334155; color:#e2e8f0; border:1px solid #475569; } .danger{ background:#ef4444; color:#fff; }
	.loading{ padding:20px; text-align:center; color:#94a3b8; }

	/* DESKTOP: hide mobile accordion, show right panel */
	@media (min-width: 901px){
		.mobile-detail{ display:none !important; }
		.desktop-only{ display:block !important; }
	}

	/* MOBILE: accordion downside */
	@media (max-width: 900px){
		.page{ padding:10px; background:#111b21; }
		.layout{ display:block; }
		.sidebar{ position:relative; top:0; background:transparent; border:none; padding:0; gap:8px; }
		.tab-wrap{ background:#202c33; border:1px solid #2a3942; }
		.tab-wrap.active{ border-color:#00a884; }
		.tab-btn{ color:#e9edef; }
		.tab-btn.active{ background:#00a884; }

		/* KEY FIX - Show detail BELOW clicked tab */
		.mobile-detail{ display:block !important; animation:slideDown 0.25s ease; }
		@keyframes slideDown{ from{ opacity:0; transform:translateY(-8px); } to{ opacity:1; transform:translateY(0); } }

		/* Hide desktop right panel on mobile */
		.desktop-only{ display:none !important; }

		.page-header{ flex-direction:column; align-items:stretch; }
		.topbar{ background:#202c33; border-color:#2a3942; }
		.page-header{ background:#202c33; border-color:#2a3942; }
		.page-header h1{ color:#e9edef; }
	}
</style>