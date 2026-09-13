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
		{ id: 'ai', label: '🤖 AI', desc:'Models, summary' },
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
	let bottomTab = 'user';
	let avatarUploading = false;
	function goBottom(tab:string){ bottomTab=tab; if(tab==='chat') goto('/chat'); if(tab==='report') goto('/reports'); if(tab==='user') goto('/settings'); }
	function sanitizeName(str:string){ return str.toString().slice(0,80).trim().replace(/<[^>]*>/g,''); }
	function selectTab(id:string){
		if(activeTab===id && typeof window!=='undefined' && window.innerWidth<=900){ activeTab=''; return; }
		activeTab=id;
		if(typeof window!=='undefined' && window.innerWidth<=900){
			setTimeout(()=>{ document.getElementById(`tab-${id}`)?.scrollIntoView({behavior:'smooth', block:'nearest'}); },80);
		}
	}
	async function loadSettings() {
		loading=true;
		try{
			let serverUser = $page.data.user; let user=serverUser;
			if(!user){ const {data:{session}}=await supabase.auth.getSession(); if(!session){ await goto('/login'); return; } const {data:{user:u},error}=await supabase.auth.getUser(); if(error||!u){ await goto('/login'); return; } user=u; }
			currentUserId=user.id;
			topProfile={ name:user.user_metadata?.full_name||user.user_metadata?.name||user.email?.split('@')[0]||'', email:user.email||'', avatar:user.user_metadata?.avatar_url||'', phone:user.user_metadata?.phone||user.phone||'' };
			let authProfile={ full_name:topProfile.name, email:topProfile.email, phone:topProfile.phone, avatar:topProfile.avatar };
			try{ const {data:prof}=await supabase.from('profiles').select('id,name,full_name,email,phone,avatar_url').eq('id',user.id).maybeSingle(); if(prof){ authProfile.full_name=prof.name||prof.full_name||authProfile.full_name; authProfile.email=prof.email||authProfile.email; authProfile.phone=prof.phone||authProfile.phone; authProfile.avatar=prof.avatar_url||authProfile.avatar; topProfile={name:authProfile.full_name,email:authProfile.email,avatar:authProfile.avatar,phone:authProfile.phone}; } }catch{}
			profile={...profile,...authProfile};
			const {data}=await supabase.from('settings').select('*').eq('id',1).maybeSingle();
			if(data){ company={...company,...(data.company??{})}; appearance={...appearance,...(data.appearance??{})}; notifications={...notifications,...(data.notifications??{})}; security={...security,...(data.security??{})}; aiSettings={...aiSettings,...(data.ai_settings??{})}; backup={...backup,...(data.backup??{})}; system={...system,...(data.system??{})}; emailSettings={...emailSettings,...(data.email_settings??{})}; apiKeys={...apiKeys,...(data.api_keys??{})}; factory={...factory,...(data.factory??{})}; storage={...storage,...(data.storage??{})}; if(data.profile) profile={...profile,...data.profile}; }
			applyTheme(appearance.theme);
		}catch(err){ showMessage(err instanceof Error? err.message:'Failed to load','error'); } finally{ loading=false; }
	}
	async function saveAllSettings(){
		if(!currentUserId){ await goto('/login'); return; } const cleanName=sanitizeName(profile.full_name); if(cleanName.length<2){ showMessage('Name min 2 chars','error'); return; } saving=true;
		try{ const {data:{user}}=await supabase.auth.getUser(); if(!user){ await goto('/login'); return; }
			await supabase.from('profiles').upsert({id:user.id,name:cleanName,full_name:cleanName,email:profile.email.toLowerCase().trim(),phone:profile.phone.trim().slice(0,20),avatar_url:profile.avatar,updated_at:new Date().toISOString()},{onConflict:'id'});
			await supabase.auth.updateUser({data:{full_name:cleanName,name:cleanName,avatar_url:profile.avatar}});
			topProfile={name:cleanName,email:profile.email,avatar:profile.avatar,phone:profile.phone}; profile.full_name=cleanName;
			await supabase.from('settings').upsert({id:1,profile:{...profile,full_name:cleanName},company,appearance,notifications,security,ai_settings:aiSettings,backup,system,email_settings:emailSettings,api_keys:apiKeys,factory,storage,updated_at:new Date().toISOString()},{onConflict:'id'});
			applyTheme(appearance.theme); showMessage('Saved ✓','success');
		}catch(err){ showMessage(err instanceof Error? err.message:'Failed','error'); } finally{ saving=false; }
	}
	function exportSettings(){ const blob=new Blob([JSON.stringify({profile,company,appearance},null,2)],{type:'application/json'}); const url=URL.createObjectURL(blob); const a=document.createElement('a'); a.href=url; a.download='ems-settings.json'; a.click(); URL.revokeObjectURL(url); }
	async function changePassword(){ if(password.newPassword.length<8){ showMessage('Min 8 chars','error'); return; } if(password.newPassword!==password.confirmPassword){ showMessage('Not match','error'); return; } const {error}=await supabase.auth.updateUser({password:password.newPassword}); if(error){ showMessage(error.message,'error'); return; } showMessage('Password updated.','success'); }
	function restoreDefaults(){ if(!confirm('Restore defaults?')) return; appearance={theme:'whatsapp',language:'English',dateFormat:'DD/MM/YYYY',timeFormat:'24 Hours'}; applyTheme(appearance.theme); }
	function applyTheme(val:string){ if(typeof document==='undefined') return; const raw=val||'whatsapp'; try{localStorage.setItem('ems_theme',raw);}catch{} document.documentElement.setAttribute('data-theme',raw.toLowerCase()); appearance.theme=raw; }
	function resizeTo128(file: File): Promise<Blob>{ return new Promise((resolve,reject)=>{ const img=new Image(); const url=URL.createObjectURL(file); img.onload=()=>{ const canvas=document.createElement('canvas'); canvas.width=128; canvas.height=128; const ctx=canvas.getContext('2d')!; const scale=Math.max(128/img.width,128/img.height); const w=img.width*scale,h=img.height*scale; ctx.fillStyle='#fff'; ctx.fillRect(0,0,128,128); ctx.drawImage(img,(128-w)/2,(128-h)/2,w,h); canvas.toBlob(b=>b?resolve(b):reject('blob'),'image/webp',0.8); URL.revokeObjectURL(url); }; img.onerror=reject; img.src=url; }); }
	async function uploadAvatar(event: Event){
		const input=event.target as HTMLInputElement; const file=input.files?.[0]; if(!file) return; if(file.size>5*1024*1024){ showMessage('Max 5MB','error'); return; }
		const preview=URL.createObjectURL(file); profile.avatar=preview; topProfile.avatar=preview; avatarUploading=true;
		try{ const blob=await resizeTo128(file); const fileName=`avatar-${currentUserId}-${Date.now()}.webp`; let publicUrl=''; for(const bucket of ['avatars','chat-avatars','public']){ try{ const {error}=await supabase.storage.from(bucket).upload(fileName,blob,{upsert:true,contentType:'image/webp'}); if(!error){ const {data}=supabase.storage.from(bucket).getPublicUrl(fileName); publicUrl=data.publicUrl; break; } }catch{} } if(!publicUrl){ const fd=new FormData(); fd.append('file',blob); fd.append('fileName',fileName); const res=await fetch('/api/upload-avatar',{method:'POST',body:fd}); const j=await res.json(); if(j.url) publicUrl=j.url; } profile.avatar=publicUrl||preview; topProfile.avatar=publicUrl||preview; if(publicUrl){ await supabase.from('profiles').update({avatar_url:publicUrl}).eq('id',currentUserId); await supabase.auth.updateUser({data:{avatar_url:publicUrl}}); showMessage('Photo updated ✓','success'); } }catch(e:any){ showMessage('Upload failed','error'); } finally{ avatarUploading=false; }
	}
	async function handleLogout(){ try{ supabase.auth.signOut({scope:'local'}).catch(()=>{}); localStorage.clear(); sessionStorage.clear(); }catch{} window.location.replace('/login'); }
	onMount(loadSettings);
</script>

<div class="page">
	{#if message}<div class="message {messageType}">{message}</div>{/if}
	<div class="topbar">
		<div class="top-left">
			{#if topProfile.avatar || profile.avatar}<img src={topProfile.avatar || profile.avatar} class="top-avatar" alt="avatar" />{:else}<div class="top-avatar ph">{(topProfile.name || '?').charAt(0).toUpperCase()}</div>{/if}
			<div class="top-info"><b>{topProfile.name || profile.full_name}</b><small>{topProfile.email || profile.email}</small></div>
		</div>
		<div style="display:flex; gap:8px;"><button class="secondary" on:click={()=>goto('/chat')}>← Chat</button><button class="danger" on:click={handleLogout}>Logout</button></div>
	</div>
	<div class="page-header">
		<div class="title-block"><h1>⚙ Settings</h1><p>{profile.full_name} • {tabs.length} sections - scroll down to see all</p></div>
		<div class="actions"><button class="secondary" on:click={exportSettings}>📤 Export</button><button class="primary" disabled={saving} on:click={saveAllSettings}>{saving?'Saving...':'💾 Save'}</button></div>
	</div>

	{#if loading}<div class="loading">Loading...</div>
	{:else}
	<div class="layout">
		<!-- LEFT: scrolls independently -->
		<div class="sidebar" id="sidebar">
			<div class="scroll-hint">↓ Scroll to see AI, Email, API, Factory, Storage</div>
			{#each tabs as tab (tab.id)}
				<div class="tab-wrap" id="tab-{tab.id}" class:active={activeTab===tab.id}>
					<button type="button" class="tab-btn" class:active={activeTab===tab.id} on:click={()=>selectTab(tab.id)}>
						<div class="tab-left"><span class="tab-label">{tab.label}</span><span class="tab-desc">{tab.desc}</span></div>
						<span class="arrow">{activeTab===tab.id ? '⌄' : '›'}</span>
					</button>
					{#if activeTab===tab.id}
					<div class="mobile-detail">
						{#if tab.id==='profile'}
							<div class="card inner"><h2>👤 Profile</h2>
								<div class="avatar-upload">
									{#if profile.avatar}<img src={profile.avatar} class="avatar" alt="Profile" />{:else}<div class="avatar placeholder">{(profile.full_name||'?').charAt(0).toUpperCase()}</div>{/if}
									<label class="primary sm">{avatarUploading?'...':'📷 Photo'}<input type="file" accept="image/*" hidden disabled={avatarUploading} on:change={uploadAvatar} /></label>
								</div>
								<label>Full Name *</label><input bind:value={profile.full_name} maxlength="80" />
								<label>Email</label><input bind:value={profile.email} readonly />
								<label>Phone</label><input bind:value={profile.phone} maxlength="20" />
								<div class="info-box">✅ Chat name = profiles.name</div>
							</div>
						{:else if tab.id==='company'}<div class="card inner"><h2>🏭 Company</h2><label>Company</label><input bind:value={company.company_name} /><label>Plant</label><input bind:value={company.plant} /><label>Location</label><input bind:value={company.location} /></div>
						{:else if tab.id==='appearance'}<div class="card inner"><h2>🎨 Appearance</h2><label>Theme</label><select bind:value={appearance.theme} on:change={(e)=>applyTheme((e.target as HTMLSelectElement).value)}>{#each themeOptions as th}<option value={th.id}>{th.label}</option>{/each}</select></div>
						{:else if tab.id==='notifications'}<div class="card inner"><h2>🔔 Notifications</h2><label class="toggle"><input type="checkbox" bind:checked={notifications.email} />Email</label><label class="toggle"><input type="checkbox" bind:checked={notifications.meetingReminder} />Meeting</label></div>
						{:else if tab.id==='security'}<div class="card inner"><h2>🔒 Security</h2><label>New Password</label><input type="password" bind:value={password.newPassword} /><label>Confirm</label><input type="password" bind:value={password.confirmPassword} /><button class="primary" on:click={changePassword}>Update</button></div>
						{:else if tab.id==='ai'}<div class="card inner"><h2>🤖 AI - Models</h2><label>Provider</label><select bind:value={aiSettings.provider}><option>OpenAI</option><option>Gemini</option></select><label>Model</label><input bind:value={aiSettings.model} /><label class="toggle"><input type="checkbox" bind:checked={aiSettings.autoSummary} />Auto Summary</label><label class="toggle"><input type="checkbox" bind:checked={aiSettings.autoSuggestions} />Auto Suggestions</label></div>
						{:else if tab.id==='backup'}<div class="card inner"><h2>💾 Backup</h2><label class="toggle"><input type="checkbox" bind:checked={backup.autoBackup} />Auto Backup</label><label>Time</label><input bind:value={backup.backupTime} /><label>Retention</label><input type="number" bind:value={backup.retentionDays} /></div>
						{:else if tab.id==='email'}<div class="card inner"><h2>📧 Email - SMTP</h2><label>Server</label><input bind:value={emailSettings.smtpServer} /><label>Port</label><input type="number" bind:value={emailSettings.smtpPort} /><label>User</label><input bind:value={emailSettings.smtpUser} /><label>Password</label><input type="password" bind:value={emailSettings.smtpPassword} /></div>
						{:else if tab.id==='api'}<div class="card inner"><h2>🔑 API Keys</h2><label>OpenAI</label><input type="password" bind:value={apiKeys.openAI} /><label>Gemini</label><input type="password" bind:value={apiKeys.gemini} /><label>Azure</label><input type="password" bind:value={apiKeys.azure} /></div>
						{:else if tab.id==='system'}<div class="card inner"><h2>⚙️ System</h2><label>Page Size</label><input type="number" bind:value={system.pageSize} /><label>Default Dept</label><input bind:value={system.defaultDepartment} /></div>
						{:else if tab.id==='factory'}<div class="card inner"><h2>🏭 Factory</h2><label>Factory Name</label><input bind:value={factory.factoryName} /><label>City</label><input bind:value={factory.city} /><label>State</label><input bind:value={factory.state} /></div>
						{:else if tab.id==='storage'}<div class="card inner"><h2>🗂 Storage</h2><label>Provider</label><input bind:value={storage.provider} /><label>Bucket</label><input bind:value={storage.bucket} /><label>Max MB</label><input type="number" bind:value={storage.maxUploadMB} /></div>
						{/if}
					</div>
					{/if}
				</div>
			{/each}
			<div style="height:20px;"></div>
		</div>

		<!-- RIGHT: scrolls independently desktop -->
		<div class="content" id="content">
			{#if activeTab==='profile'}<div class="card"><h2>👤 Profile</h2><div class="avatar-upload">{#if profile.avatar}<img src={profile.avatar} class="avatar" alt="Profile" />{:else}<div class="avatar placeholder">{(profile.full_name||'?').charAt(0).toUpperCase()}</div>{/if}<label class="primary">{avatarUploading?'Uploading...':'📷 Change'}<input type="file" accept="image/*" hidden on:change={uploadAvatar} /></label></div><label>Full Name *</label><input bind:value={profile.full_name} maxlength="80" /><label>Email</label><input bind:value={profile.email} readonly /><button class="primary" disabled={saving} on:click={saveAllSettings}>{saving?'Saving...':'💾 Save'}</button></div>
			{:else if activeTab==='ai'}<div class="card"><h2>🤖 AI Settings</h2><label>Provider</label><select bind:value={aiSettings.provider}><option>OpenAI</option><option>Gemini</option></select><label>Model</label><input bind:value={aiSettings.model} /><label class="toggle"><input type="checkbox" bind:checked={aiSettings.autoSummary} />Auto Summary</label><label class="toggle"><input type="checkbox" bind:checked={aiSettings.autoSuggestions} />Auto Suggestions</label><label class="toggle"><input type="checkbox" bind:checked={aiSettings.autoClassification} />Auto Classification</label></div>
			{:else if activeTab==='backup'}<div class="card"><h2>💾 Backup Settings</h2><label class="toggle"><input type="checkbox" bind:checked={backup.autoBackup} />Enable Auto Backup</label><label>Backup Time</label><input bind:value={backup.backupTime} /><label>Retention Days</label><input type="number" bind:value={backup.retentionDays} /></div>
			{:else if activeTab==='email'}<div class="card"><h2>📧 Email SMTP</h2><label>SMTP Server</label><input bind:value={emailSettings.smtpServer} /><label>Port</label><input type="number" bind:value={emailSettings.smtpPort} /><label>Username</label><input bind:value={emailSettings.smtpUser} /><label>Password</label><input type="password" bind:value={emailSettings.smtpPassword} /></div>
			{:else if activeTab==='api'}<div class="card"><h2>🔑 API Keys</h2><label>OpenAI</label><input type="password" bind:value={apiKeys.openAI} /><label>Gemini</label><input type="password" bind:value={apiKeys.gemini} /></div>
			{:else if activeTab==='system'}<div class="card"><h2>⚙️ System</h2><label>Page Size</label><input type="number" bind:value={system.pageSize} /><label>Default Dept</label><input bind:value={system.defaultDepartment} /></div>
			{:else if activeTab==='factory'}<div class="card"><h2>🏭 Factory</h2><label>Factory</label><input bind:value={factory.factoryName} /><label>City</label><input bind:value={factory.city} /></div>
			{:else if activeTab==='storage'}<div class="card"><h2>🗂 Storage</h2><label>Bucket</label><input bind:value={storage.bucket} /></div>
			{:else}<div class="card"><h2>{tabs.find(t=>t.id===activeTab)?.label}</h2><p>Edit in left panel</p></div>{/if}
		</div>
	</div>
	{/if}
	<nav class="bottom-fixed"><button class:active={bottomTab==='chat'} on:click={()=>goBottom('chat')}><span class="b-icon">💬</span><small>Chat</small></button><button class:active={bottomTab==='report'} on:click={()=>goBottom('report')}><span class="b-icon">📋</span><small>Report</small></button><button class:active={bottomTab==='user'} on:click={()=>goBottom('user')}><span class="b-icon">👤</span><small>User</small></button></nav>
</div>

<style>
	.page{ width:100%; max-width:1400px; margin:0 auto; padding:12px 12px 80px 12px; display:flex; flex-direction:column; gap:12px; background:#0f172a; color:#e2e8f0; min-height:100dvh; box-sizing:border-box; }
	.message{ padding:10px 14px; border-radius:8px; font-weight:600; position:sticky; top:0; z-index:30; }
	.message.success{ background:#ecfdf5; color:#065f46; } .message.error{ background:#fef2f2; color:#b91c1c; } .message.info{ background:#eff6ff; color:#1e40af; }
	.topbar{ display:flex; justify-content:space-between; align-items:center; padding:10px 12px; background:#1e293b; border:1px solid #334155; border-radius:12px; }
	.top-left{ display:flex; align-items:center; gap:10px; min-width:0; } .top-avatar{ width:42px; height:42px; border-radius:50%; object-fit:cover; border:2px solid #00a884; } .top-avatar.ph{ display:flex; align-items:center; justify-content:center; background:#334155; font-weight:700; width:42px; height:42px; border-radius:50%; }
	.top-info b{ font-size:13px; } .top-info small{ font-size:11px; color:#94a3b8; display:block; }
	.page-header{ display:flex; justify-content:space-between; align-items:center; gap:10px; background:#1e293b; border:1px solid #334155; padding:10px 12px; border-radius:12px; }
	.title-block h1{ margin:0; font-size:18px; } .title-block p{ margin:3px 0 0; color:#94a3b8; font-size:11px; }
	.actions{ display:flex; gap:6px; }
	/* DESKTOP: two independent scrollers */
	.layout{ display:grid; grid-template-columns:300px 1fr; gap:12px; align-items:start; min-height:0; flex:1; }
	.sidebar{ background:#1e293b; border:1px solid #334155; border-radius:12px; padding:8px; display:flex; flex-direction:column; gap:6px; height:calc(100dvh - 170px); overflow-y:auto; overflow-x:hidden; -webkit-overflow-scrolling:touch; touch-action:pan-y; overscroll-behavior:contain; position:sticky; top:10px; }
	.content{ background:transparent; min-width:0; height:calc(100dvh - 170px); overflow-y:auto; overflow-x:hidden; -webkit-overflow-scrolling:touch; touch-action:pan-y; overscroll-behavior:contain; }
	.scroll-hint{ background:#0b1f1a; color:#00a884; font-size:10px; font-weight:700; padding:6px 8px; border-radius:6px; text-align:center; border:1px dashed #00a884; position:sticky; top:0; z-index:2; }
	.tab-wrap{ background:#0f172a; border:1px solid #1e293b; border-radius:10px; overflow:hidden; flex-shrink:0; }
	.tab-wrap.active{ border-color:#00a884; }
	.tab-btn{ width:100%; padding:12px 10px; border:none; background:transparent; color:#e2e8f0; display:flex; justify-content:space-between; align-items:center; cursor:pointer; text-align:left; }
	.tab-btn.active{ background:#00a884; color:#fff; }
	.tab-left{ display:flex; flex-direction:column; } .tab-label{ font-weight:700; font-size:13px; } .tab-desc{ font-size:11px; opacity:0.7; }
	.arrow{ font-size:16px; }
	.mobile-detail{ display:none; }
	.card{ background:#fff7ed; color:#1e293b; padding:16px; border-radius:12px; border:1px solid #fed7aa; display:flex; flex-direction:column; gap:10px; }
	.card.inner{ background:#fff7ed; border-radius:0 0 10px 10px; border-top:1px solid #fed7aa; margin:0; }
	.card label{ font-size:11px; font-weight:800; color:#78350f; text-transform:uppercase; }
	.card input,.card select{ width:100%; padding:11px; border:1px solid #e7c4b0; border-radius:10px; background:#3a241c; color:#ffedd5; font-size:14px; font-weight:600; box-sizing:border-box; }
	.toggle{ display:flex; align-items:center; gap:8px; font-size:13px; font-weight:700; }
	.avatar-upload{ display:flex; align-items:center; gap:12px; }
	.avatar{ width:60px; height:60px; border-radius:50%; object-fit:cover; border:2px solid #00a884; }
	.avatar.placeholder{ display:flex; align-items:center; justify-content:center; background:#3a241c; color:#ffedd5; font-size:24px; font-weight:800; }
	.info-box{ background:#ffedd5; border:1px dashed #e7c4b0; padding:6px 8px; border-radius:6px; font-size:11px; }
	.primary,.secondary,.danger{ padding:9px 14px; border:none; border-radius:10px; font-weight:800; cursor:pointer; font-size:13px; }
	.primary{ background:#00a884; color:#fff; } .primary.sm{ padding:6px 10px; font-size:12px; }
	.secondary{ background:#334155; color:#e2e8f0; } .danger{ background:#ef4444; color:#fff; }
	.loading{ padding:20px; text-align:center; color:#94a3b8; }
	.bottom-fixed{ position:fixed; bottom:0; left:0; right:0; height:66px; background:#202c33; border-top:1px solid #2a3942; display:flex; justify-content:space-around; align-items:center; z-index:40; padding-bottom:env(safe-area-inset-bottom); }
	.bottom-fixed button{ background:none; border:none; display:flex; flex-direction:column; align-items:center; gap:2px; color:#8696a0; cursor:pointer; flex:1; }
	.bottom-fixed button.active{ color:#00a884; } .b-icon{ font-size:20px; } .bottom-fixed small{ font-size:11px; font-weight:600; }

	@media (max-width:900px){
		.page{ padding:8px 8px 80px 8px; background:#111b21; height:auto; min-height:100dvh; overflow:visible; }
		.layout{ display:block; height:auto; overflow:visible; }
		.sidebar{ position:relative; top:0; height:auto; max-height:none; overflow:visible; background:transparent; border:none; padding:0; gap:8px; }
		.content{ display:none !important; } /* mobile uses accordion */
		.mobile-detail{ display:block !important; }
		.tab-wrap{ background:#202c33; border:1px solid #2a3942; }
		.scroll-hint{ position:sticky; top:0; }
	}
	@media (min-width:901px){
		.mobile-detail{ display:none !important; }
	}
</style>