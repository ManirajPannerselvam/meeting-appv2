<script lang="ts">
	import { goto } from '$app/navigation';
	export let title = 'Temple Operations Reporting System';
	export let user: any = null;
	export let online = true;
	export let queueCount = 0;
	export let chatUnread = 0;

	let userMenuOpen = false;

	const navigation = [
		{ label: 'Dashboard', href: '/dashboard', icon: '🏠' },
		{ label: 'Reports', href: '/reports', icon: '📊' },
		{ label: 'Meeting List', href: '/meeting-list', icon: '📋' },
		{ label: 'Chat', href: '/chat', icon: '💬' }
	];

	function displayEmail(){
		return user?.email ?? user?.name ?? 'maniraj.panneerselvam@gmail.com';
	}
	function navigate(p:string){ userMenuOpen=false; goto(p); }
</script>

<header class="header">
	<div class="left">
		<span class="brand">📊 ORG</span>
		<nav>
			{#each navigation as n}
				<a href={n.href}>{n.icon} {n.label}</a>
			{/each}
		</nav>
	</div>
	<div class="right">
		<span class="online">● {online ? 'Online' : 'Offline'}</span>
		<div class="user-wrap">
			<button class="user-pill" on:click={()=> userMenuOpen=!userMenuOpen}>
				{displayEmail()} ▾
			</button>
			{#if userMenuOpen}
			<div class="dropdown">
				<div class="email">{displayEmail()}</div>
				<div class="line"></div>
				<button on:click={()=>navigate('/users')}>👥 Users</button>
				<button on:click={()=>navigate('/settings')}>⚙️ Settings</button>
				<button on:click={()=>navigate('/admin')}>🛡️ Admin</button>
				<button on:click={()=>navigate('/templates')}>📄 Templates</button>
			</div>
			{/if}
		</div>
	</div>
</header>

<style>
.header{
	display:flex; justify-content:space-between; align-items:center;
	background:#111827; color:white; padding:10px 18px;
}
.left{display:flex; align-items:center; gap:20px;}
.brand{color:#22c55e; font-weight:800; font-size:18px;}
nav{display:flex; gap:6px;}
nav a{color:#cbd5e1; text-decoration:none; padding:8px 12px; border-radius:8px; font-size:14px;}
nav a:hover{background:#1e293b; color:white;}
.right{display:flex; align-items:center; gap:14px;}
.online{color:#22c55e; font-size:12px; font-weight:600;}
.user-wrap{position:relative;}
.user-pill{border:1px solid #334155; background:#1e293b; color:white; padding:6px 12px; border-radius:20px; cursor:pointer; max-width:260px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;}
.dropdown{position:absolute; right:0; top:40px; width:240px; background:white; color:#0f172a; border:1px solid #e2e8f0; border-radius:12px; box-shadow:0 10px 20px rgba(0,0,0,.2); z-index:100; padding:8px; display:flex; flex-direction:column;}
.dropdown .email{font-size:12px; color:#64748b; padding:6px; overflow:hidden; text-overflow:ellipsis;}
.line{height:1px; background:#e2e8f0; margin:6px 0;}
.dropdown button{border:none; background:none; text-align:left; padding:10px; border-radius:8px; cursor:pointer;}
.dropdown button:hover{background:#f1f5f9;}
</style>