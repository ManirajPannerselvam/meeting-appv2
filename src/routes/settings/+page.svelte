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
	let system = { pageSize: 20, autoRefresh: 60, defaultDepartment: 'Production', defaultShift: 'A' };
	let emailSettings = { smtpServer: '', smtpPort: 587, smtpUser: '', smtpPassword: '', senderName: 'EMS System', senderEmail: '' };
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
		{ id: 'email', label: '📧 Email', desc:'SMTP config' },
		{ id: 'api', label: '🔑 API Keys', desc:'OpenAI, Gemini' },
		{ id: 'system', label: '⚙️ System', desc:'Defaults' },
		{ id: 'factory', label: '🏭 Factory', desc:'Factory info' },
		{ id: 'storage', label: '🗂 Storage', desc:'Bucket' }
	];
	const themeOptions = [
		{ id: 'system', label: '🖥️ System Auto' },{ id: 'light', label: '☀️ Light' },{ id: 'dark', label: '🌙 Dark' },{ id: 'whatsapp', label: '💚 WhatsApp Forest' },
		{ id: 'telegram', label: '💙 Telegram Sky' },{ id: 'instagram', label: '💜 Instagram Sunset' },{ id: 'imessage', label: '💬 iMessage Blue' },{ id: 'discord', label: '🎮 Discord Midnight' },{ id: 'snapchat', label: '💛 Snapchat Sunny' },{ id: 'slack', label: '💼 Slack Aubergine' },{ id: 'messenger', label: '⚡ Messenger Gradient' },{ id: 'twitter', label: '🖤 X Pitch Black' },{ id: 'minimal', label: '📄 Minimal Paper' }
	];
	const ALLOWED_THEMES = new Set(themeOptions.map(t=>t.id));
	let topProfile = { name: '', email: '', avatar: '', phone: '' };
	let bottomTab = 'user';
	let avatarUploading = false;

	function goBottom(tab:string){ bottomTab=tab; if(tab==='chat') goto('/chat'); if(tab==='report') goto('/reports'); if(tab==='user') goto('/settings'); }
	function sanitizeName(str:string){ if(!str) return ""; return str.toString().slice(0,80).trim().replace(/[<>`$]/g,''); }
	function selectTab(id:string){
		if(activeTab===id && typeof window!=='undefined' && window.innerWidth<=900){
			const el = document.getElementById(`detail-${id}`);
			if(el) el.scrollIntoView({behavior:'smooth', block:'start'});
			return;
		}
		activeTab=id;
		if(typeof window!=='undefined'){
			setTimeout(()=>{
				const el = document.getElementById(`tab-${id}`);
				el?.scrollIntoView({behavior:'smooth', block:'nearest'});
			},100);
		}
	}
	async function loadSettings() {
		loading=true;
		try{
			let serverUser = $page.data.user; let user=serverUser;
			if(!user){ const {data:{session}}=await supabase.auth.getSession(); if(!session){ await goto('/login'); return; } const {data:{user:u},error}=await supabase.auth.getUser(); if(error||!u){ await goto('/login'); return; } user=u; }
			currentUserId=user.id;
			topProfile={ name:sanitizeName(user.user_metadata?.full_name||user.user_metadata?.name||user.email?.split('@')[0]||''), email:(user.email||'').toLowerCase().trim().slice(0,100), avatar:user.user_metadata?.avatar_url||'', phone:(user.user_metadata?.phone||user.phone||'').toString().slice(0,20) };
			let authProfile={ full_name:topProfile.name, email:topProfile.email, phone:topProfile.phone, avatar:topProfile.avatar };
			const [profRes, settingsRes] = await Promise.allSettled([
				supabase.from('profiles').select('*').eq('id',user.id).maybeSingle(),
				supabase.from('settings').select('*').eq('id',1).maybeSingle()
			]);
			if(profRes.status==='fulfilled' && profRes.value.data){
				const a=profRes.value.data as any; 
				authProfile.full_name=sanitizeName(a.name||a.full_name||authProfile.full_name); 
				authProfile.email=(a.email||authProfile.email).toLowerCase().trim().slice(0,100); 
				authProfile.phone=(a.phone||authProfile.phone).toString().replace(/\D/g,'').slice(0,15); 
				authProfile.avatar=a.avatar_url||authProfile.avatar; 
				topProfile={name:authProfile.full_name,email:authProfile.email,avatar:authProfile.avatar,phone:authProfile.phone};
			}
			profile={...profile,...authProfile};
			if(settingsRes.status==='fulfilled' && settingsRes.value.data){
				const data=settingsRes.value.data as any;
				company={...company,...(data.company??{})}; appearance={...appearance,...(data.appearance??{})}; notifications={...notifications,...(data.notifications??{})}; security={...security,...(data.security??{})}; aiSettings={...aiSettings,...(data.ai_settings??{})}; backup={...backup,...(data.backup??{})}; system={...system,...(data.system??{})}; emailSettings={...emailSettings,...(data.email_settings??{})}; apiKeys={...apiKeys,...(data.api_keys??{})}; factory={...factory,...(data.factory??{})}; storage={...storage,...(data.storage??{})}; if(data.profile) profile={...profile,...data.profile};
			}
			if(!ALLOWED_THEMES.has(appearance.theme)) appearance.theme='whatsapp';
			applyTheme(appearance.theme);
		}catch(err){ showMessage(err instanceof Error? err.message:'Failed to load','error'); } finally{ loading=false; }
	}
	async function saveAllSettings(){
		if(!currentUserId){ await goto('/login'); return; } const cleanName=sanitizeName(profile.full_name); if(cleanName.length<2){ showMessage('Name min 2 chars','error'); return; } saving=true;
		try{
			const {data:{user}}=await supabase.auth.getUser(); if(!user){ await goto('/login'); return; }
			const cleanEmail = profile.email.toLowerCase().trim().slice(0,100);
			const cleanPhone = profile.phone.toString().replace(/\D/g,'').slice(0,15);
			await supabase.from('profiles').upsert({id:user.id,name:cleanName,email:cleanEmail,phone:cleanPhone,avatar_url:profile.avatar,updated_at:new Date().toISOString()},{onConflict:'id'});
			await supabase.auth.updateUser({data:{full_name:cleanName,name:cleanName,avatar_url:profile.avatar}});
			topProfile={name:cleanName,email:cleanEmail,avatar:profile.avatar,phone:cleanPhone}; profile.full_name=cleanName; profile.email=cleanEmail; profile.phone=cleanPhone;
			await supabase.from('settings').upsert({id:1,profile:{...profile,full_name:cleanName},company,appearance,notifications,security,ai_settings:aiSettings,backup,system,email_settings:emailSettings,api_keys:apiKeys,factory,storage,updated_at:new Date().toISOString()},{onConflict:'id'});
			applyTheme(appearance.theme); showMessage('Saved ✓','success');
		}catch(err:any){ showMessage(err?.message||'Failed','error'); } finally{ saving=false; }
	}
	function exportSettings(){ const blob=new Blob([JSON.stringify({profile,company},null,2)],{type:'application/json'}); const url=URL.createObjectURL(blob); const a=document.createElement('a'); a.href=url; a.download='ems-settings.json'; a.click(); URL.revokeObjectURL(url); }
	async function changePassword(){ if(password.newPassword.length<8){ showMessage('Min 8 chars','error'); return; } if(password.newPassword!==password.confirmPassword){ showMessage('Not match','error'); return; } const {error}=await supabase.auth.updateUser({password:password.newPassword}); if(error){ showMessage(error.message,'error'); return; } showMessage('Password updated','success'); password={current:'',newPassword:'',confirmPassword:''}; }
	function applyTheme(val:string){ if(typeof document==='undefined') return; const raw=val||'whatsapp'; const safe=ALLOWED_THEMES.has(raw)? raw : 'whatsapp'; try{localStorage.setItem('ems_theme',safe); localStorage.setItem('app-theme',safe);}catch{} document.documentElement.setAttribute('data-theme',safe.toLowerCase()); document.documentElement.setAttribute('data-social-theme',safe.toLowerCase()); appearance.theme=safe; }
	function resizeTo128(file: File): Promise<Blob>{ return new Promise((resolve,reject)=>{ const img=new Image(); const url=URL.createObjectURL(file); img.onload=()=>{ const canvas=document.createElement('canvas'); canvas.width=128; canvas.height=128; const ctx=canvas.getContext('2d')!; const scale=Math.max(128/img.width,128/img.height); const w=img.width*scale,h=img.height*scale; ctx.fillStyle='#fff'; ctx.fillRect(0,0,128,128); ctx.drawImage(img,(128-w)/2,(128-h)/2,w,h); canvas.toBlob(b=>b?resolve(b):reject('blob'),'image/webp',0.8); URL.revokeObjectURL(url); }; img.onerror=()=>{ URL.revokeObjectURL(url); reject('load'); }; img.src=url; }); }
	async function uploadAvatar(event: Event){
		const input=event.target as HTMLInputElement; const file=input.files?.[0]; if(!file) return; if(file.size>5*1024*1024){ showMessage('Max 5MB','error'); return; }
		if(!file.type.startsWith('image/')){ showMessage('Only image','error'); return; }
		const preview=URL.createObjectURL(file); profile.avatar=preview; topProfile.avatar=preview; avatarUploading=true;
		try{ const blob=await resizeTo128(file); const fileName=`avatar-${currentUserId}-${Date.now()}.webp`; let publicUrl=''; for(const bucket of ['avatars','chat-avatars','public']){ try{ const {error}=await supabase.storage.from(bucket).upload(fileName,blob,{upsert:true,contentType:'image/webp'}); if(!error){ const {data}=supabase.storage.from(bucket).getPublicUrl(fileName); publicUrl=data.publicUrl; break; } }catch{} } if(publicUrl){ profile.avatar=publicUrl; topProfile.avatar=publicUrl; await supabase.from('profiles').update({avatar_url:publicUrl}).eq('id',currentUserId); await supabase.auth.updateUser({data:{avatar_url:publicUrl}}); showMessage('Photo updated ✓','success'); } }catch{ showMessage('Upload failed','error'); } finally{ avatarUploading=false; if(input) input.value=''; }
	}
	async function handleLogout(){ try{ supabase.auth.signOut({scope:'local'}).catch(()=>{}); localStorage.clear(); sessionStorage.clear(); }catch{} window.location.replace('/login'); }
	onMount(loadSettings);
</script>

<div class="page">
	{#if message}<div class="message {messageType}" role="alert">{message}</div>{/if}
	<div class="topbar">
		<div class="top-left">
			{#if topProfile.avatar || profile.avatar}<img src={topProfile.avatar || profile.avatar} class="top-avatar" alt="avatar" />{:else}<div class="top-avatar ph">{(topProfile.name || '?').charAt(0).toUpperCase()}</div>{/if}
			<div class="top-info"><b>{topProfile.name || profile.full_name}</b><small>{topProfile.email}</small></div>
		</div>
		<div style="display:flex; gap:8px;"><button class="secondary" onclick={()=>goto('/chat')}>← Chat</button><button class="danger" onclick={handleLogout}>Logout</button></div>
	</div>
	<div class="page-header">
		<div class="title-block"><h1>⚙ Settings</h1><p>12 sections - SWIPE UP/DOWN in list below</p></div>
		<div class="actions"><button class="secondary" onclick={exportSettings}>📤 Export</button><button class="primary" disabled={saving} onclick={saveAllSettings}>{saving?'...':'💾 Save'}</button></div>
	</div>

	{#if loading}<div class="loading">Loading...</div>
	{:else}
	<div class="layout">
		<div class="sidebar">
			<div class="hint">↕ Swipe here up/down - 12 items, scrollbar on right →</div>
			<div class="scroll-area" id="scrollArea">
				{#each tabs as tab (tab.id)}
					<div class="tab-wrap" id="tab-{tab.id}" class:active={activeTab===tab.id}>
						<button type="button" class="tab-btn" class:active={activeTab===tab.id} onclick={()=>selectTab(tab.id)} aria-label={tab.label}>
							<div class="tab-left"><span class="tab-label">{tab.label}</span><span class="tab-desc">{tab.desc}</span></div>
							<span class="arrow">{activeTab===tab.id? '⌄' : '›'}</span>
						</button>
						{#if activeTab===tab.id}
						<div class="mobile-detail" id="detail-{tab.id}">
							{#if tab.id==='profile'}
								<div class="card inner"><h2>👤 Profile</h2>
									<div class="avatar-upload">{#if profile.avatar}<img src={profile.avatar} class="avatar" alt="" />{:else}<div class="avatar placeholder">{(profile.full_name||'?').charAt(0).toUpperCase()}</div>{/if}
									<label class="primary sm" for="avatarFile" style="cursor:pointer;">📷 Photo<input id="avatarFile" type="file" accept="image/*" hidden onchange={uploadAvatar} /></label></div>
									<label for="fullName">Full Name *</label><input id="fullName" bind:value={profile.full_name} maxlength="80" autocomplete="name" />
									<label for="emailField">Email</label><input id="emailField" bind:value={profile.email} readonly autocomplete="email" />
									<button class="primary" style="width:100%;" onclick={saveAllSettings}>Save</button>
								</div>
							{:else if tab.id==='company'}<div class="card inner"><h2>🏭 Company</h2><label for="companyName">Company</label><input id="companyName" bind:value={company.company_name} maxlength="80" /><label for="plant">Plant</label><input id="plant" bind:value={company.plant} maxlength="50" /><label for="location">Location</label><input id="location" bind:value={company.location} maxlength="80" /></div>
							{:else if tab.id==='appearance'}<div class="card inner"><h2>🎨 Appearance</h2><label for="themeSelect">Theme</label><select id="themeSelect" bind:value={appearance.theme} onchange={(e)=>applyTheme((e.target as HTMLSelectElement).value)}>{#each themeOptions as th}<option value={th.id}>{th.label}</option>{/each}</select></div>
							{:else if tab.id==='notifications'}<div class="card inner"><h2>🔔 Notifications</h2><label class="toggle"><input type="checkbox" bind:checked={notifications.email} /> Email</label></div>
							{:else if tab.id==='security'}
								<div class="card inner"><h2>🔒 Security</h2>
									<form autocomplete="off" onsubmit={(e)=>{e.preventDefault(); changePassword();}}>
										<label for="newPass">New Password</label><input id="newPass" type="password" bind:value={password.newPassword} autocomplete="new-password" minlength="8" />
										<label for="confirmPass">Confirm Password</label><input id="confirmPass" type="password" bind:value={password.confirmPassword} autocomplete="new-password" minlength="8" />
										<button class="primary" type="submit" style="width:100%; margin-top:10px;">Update Password</button>
									</form>
								</div>
							{:else if tab.id==='ai'}<div class="card inner"><h2>🤖 AI - Models</h2><label for="provider">Provider</label><select id="provider" bind:value={aiSettings.provider}><option>OpenAI</option><option>Gemini</option></select><label for="model">Model</label><input id="model" bind:value={aiSettings.model} maxlength="50" /><label class="toggle"><input type="checkbox" bind:checked={aiSettings.autoSummary} /> Auto Summary</label></div>
							{:else if tab.id==='backup'}<div class="card inner"><h2>💾 Backup</h2><label class="toggle"><input type="checkbox" bind:checked={backup.autoBackup} /> Auto Backup</label><label for="backupTime">Time</label><input id="backupTime" bind:value={backup.backupTime} type="time" /></div>
							{:else if tab.id==='email'}<div class="card inner"><h2>📧 Email SMTP</h2><label for="smtpServer">Server</label><input id="smtpServer" bind:value={emailSettings.smtpServer} maxlength="100" /><label for="smtpPort">Port</label><input id="smtpPort" type="number" bind:value={emailSettings.smtpPort} min="1" max="65535" /></div>
							{:else if tab.id==='api'}
								<div class="card inner"><h2>🔑 API Keys</h2>
									<form autocomplete="off" onsubmit={(e)=>e.preventDefault()}>
										<label for="openaiKey">OpenAI</label><input id="openaiKey" type="password" bind:value={apiKeys.openAI} autocomplete="off" data-lpignore="true" data-1p-ignore="true" />
										<label for="geminiKey">Gemini</label><input id="geminiKey" type="password" bind:value={apiKeys.gemini} autocomplete="off" data-lpignore="true" data-1p-ignore="true" />
									</form>
								</div>
							{:else if tab.id==='system'}<div class="card inner"><h2>⚙️ System</h2><label for="pageSize">Page Size</label><input id="pageSize" type="number" bind:value={system.pageSize} min="5" max="100" /></div>
							{:else if tab.id==='factory'}<div class="card inner"><h2>🏭 Factory</h2><label for="factoryName">Factory Name</label><input id="factoryName" bind:value={factory.factoryName} maxlength="80" /><label for="factoryCity">City</label><input id="factoryCity" bind:value={factory.city} maxlength="50" /></div>
							{:else if tab.id==='storage'}<div class="card inner"><h2>🗂 Storage</h2><label for="storageProvider">Provider</label><input id="storageProvider" bind:value={storage.provider} maxlength="30" /><label for="bucket">Bucket</label><input id="bucket" bind:value={storage.bucket} maxlength="50" /></div>
							{/if}
						</div>
						{/if}
					</div>
				{/each}
				<div style="height:20px; flex-shrink:0;"></div>
			</div>
		</div>
		<div class="content desktop-only">
			<div class="card"><h2>{tabs.find(t=>t.id===activeTab)?.label} - Detail</h2><p>Active: {activeTab}. On mobile, tap the tab above to expand. Desktop right panel scrolls separately.</p><button class="primary" onclick={saveAllSettings}>Save All</button></div>
		</div>
	</div>
	{/if}
	<nav class="bottom-fixed"><button class:active={bottomTab==='chat'} onclick={()=>goBottom('chat')}><span class="b-icon">💬</span><small>Chat</small></button><button class:active={bottomTab==='report'} onclick={()=>goBottom('report')}><span class="b-icon">📋</span><small>Report</small></button><button class:active={bottomTab==='user'} onclick={()=>goBottom('user')}><span class="b-icon">👤</span><small>User</small></button></nav>
</div>

<style>
	:global(html){ height:100%; overflow-y:auto; }
	:global(body){ min-height:100%; overflow-y:auto; overflow-x:hidden; margin:0; -webkit-overflow-scrolling:touch; touch-action:pan-y; overscroll-behavior-y:auto; }
	.page{ width:100%; max-width:1400px; margin:0 auto; padding:12px 12px 80px 12px; display:flex; flex-direction:column; gap:12px; background:#0f172a; color:#e2e8f0; min-height:100dvh; box-sizing:border-box; }
	.message{ padding:12px; border-radius:10px; font-weight:700; position:sticky; top:0; z-index:40; }
	.message.success{ background:#ecfdf5; color:#065f46; }.message.error{ background:#fef2f2; color:#991b1b; }
	.topbar{ display:flex; justify-content:space-between; align-items:center; padding:12px; background:#1e293b; border:1px solid #334155; border-radius:12px; }
	.top-left{ display:flex; align-items:center; gap:10px; min-width:0; }
	.top-avatar{ width:44px; height:44px; border-radius:50%; object-fit:cover; border:2px solid #00a884; }
	.top-avatar.ph{ display:flex; align-items:center; justify-content:center; background:#334155; font-weight:800; }
	.top-info b{ font-size:14px; display:block; }.top-info small{ font-size:11px; color:#94a3b8; }
	.page-header{ display:flex; justify-content:space-between; align-items:center; gap:10px; background:#1e293b; border:1px solid #334155; padding:12px; border-radius:12px; flex-wrap:wrap; }
	.title-block h1{ margin:0; font-size:18px; }.title-block p{ margin:4px 0 0; font-size:11px; color:#00a884; font-weight:700; }
	.actions{ display:flex; gap:6px; }
	.layout{ display:grid; grid-template-columns:300px 1fr; gap:12px; align-items:start; }
	.sidebar{ background:#1e293b; border:1px solid #334155; border-radius:12px; padding:8px; display:flex; flex-direction:column; gap:0; height:calc(100dvh - 170px); overflow:hidden; position:sticky; top:8px; }
	.hint{ background:#0b1f1a; border:1px dashed #00a884; color:#00a884; font-size:10px; font-weight:800; padding:7px; border-radius:8px; text-align:center; flex-shrink:0; margin-bottom:6px; }
	.scroll-area{ flex:1; overflow-y:auto; overflow-x:hidden; -webkit-overflow-scrolling:touch; touch-action:pan-y; overscroll-behavior:contain; display:flex; flex-direction:column; gap:6px; padding-right:6px; scrollbar-width:thin; scrollbar-color:#00a884 #0f172a; }
	.scroll-area::-webkit-scrollbar{ width:6px; }
	.scroll-area::-webkit-scrollbar-thumb{ background:#00a884; border-radius:10px; }
	.scroll-area::-webkit-scrollbar-track{ background:#0f172a; border-radius:10px; }
	.content{ height:calc(100dvh - 170px); overflow-y:auto; }
	.tab-wrap{ background:#0f172a; border:1px solid #1e293b; border-radius:10px; overflow:hidden; flex-shrink:0; }
	.tab-wrap.active{ border-color:#00a884; background:#0b1f1a; }
	.tab-btn{ width:100%; padding:13px 11px; border:none; background:transparent; color:#e2e8f0; display:flex; justify-content:space-between; align-items:center; cursor:pointer; text-align:left; }
	.tab-btn.active{ background:#00a884; color:#fff; }
	.tab-left{ display:flex; flex-direction:column; }.tab-label{ font-weight:700; font-size:13px; }.tab-desc{ font-size:11px; opacity:0.65; }
	.mobile-detail{ display:none; }
	.card{ background:#fff7ed; color:#1e293b; padding:16px; border-radius:12px; border:1px solid #fed7aa; display:flex; flex-direction:column; gap:10px; }
	.card.inner{ border-radius:0 0 10px 10px; border-top:1px solid #fed7aa; margin:0; }
	.card label{ font-size:11px; font-weight:800; color:#78350f; text-transform:uppercase; }
	.card input,.card select{ width:100%; padding:12px; border:1px solid #e7c4b0; border-radius:10px; background:#3a241c; color:#ffedd5; font-size:14px; font-weight:600; box-sizing:border-box; }
	.toggle{ display:flex; align-items:center; gap:10px; font-size:13px; font-weight:700; }
	.avatar-upload{ display:flex; align-items:center; gap:12px; flex-wrap:wrap; }
	.avatar{ width:64px; height:64px; border-radius:50%; object-fit:cover; border:2px solid #00a884; }
	.avatar.placeholder{ display:flex; align-items:center; justify-content:center; background:#3a241c; color:#ffedd5; font-size:24px; font-weight:800; }
	.primary,.secondary,.danger{ padding:10px 14px; border:none; border-radius:10px; font-weight:800; cursor:pointer; font-size:13px; }
	.primary{ background:#00a884; color:#fff; }.primary.sm{ padding:7px 12px; font-size:12px; }.secondary{ background:#334155; color:#e2e8f0; }.danger{ background:#ef4444; color:#fff; }
	.loading{ padding:30px; text-align:center; color:#94a3b8; }
	.bottom-fixed{ position:fixed; bottom:0; left:0; right:0; height:68px; background:#202c33; border-top:1px solid #2a3942; display:flex; justify-content:space-around; align-items:center; z-index:50; padding-bottom:env(safe-area-inset-bottom); }
	.bottom-fixed button{ background:none; border:none; display:flex; flex-direction:column; align-items:center; gap:3px; color:#8696a0; cursor:pointer; flex:1; }
	.bottom-fixed button.active{ color:#00a884; }.b-icon{ font-size:20px; }.bottom-fixed small{ font-size:11px; font-weight:700; }

	@media (min-width:901px){.mobile-detail{ display:none!important; } }
	@media (max-width:900px){
		:global(html),:global(body){ height:auto!important; overflow-y:auto!important; }
		.page{ padding:10px 10px 90px 10px!important; background:#111b21!important; height:auto!important; min-height:100dvh!important; display:block!important; }
		.layout{ display:block!important; height:auto!important; }
		.sidebar{ position:relative!important; top:0!important; height:auto!important; min-height:400px!important; max-height:calc(100dvh - 160px)!important; background:#202c33!important; border-color:#2a3942!important; display:flex!important; overflow:hidden!important; }
		.scroll-area{ height:auto!important; flex:1!important; max-height:calc(100dvh - 200px)!important; overflow-y:auto!important; touch-action:pan-y!important; }
		.content{ display:none!important; }
		.mobile-detail{ display:block!important; }
	}
</style>