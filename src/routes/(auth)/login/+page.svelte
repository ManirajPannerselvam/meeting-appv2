<script lang="ts">
	import { enhance } from '$app/forms';
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import Button from '$lib/components/ui/Button.svelte';
	import Card from '$lib/components/ui/Card.svelte';
	import Input from '$lib/components/ui/Input.svelte';
	import { supabase } from '$lib/supabase/client';
	import { onMount } from 'svelte';

	let { data, form } = $props();

	let email = $state(form?.email || '');
	let password = $state('');
	let emailError = $state('');
	let passwordError = $state('');
	let loading = $state(false);
	let mode = $state<'password'|'magic'>('password');
	let magicSent = $state(false);

	onMount(async () => {
		try {
			const { data: { session } } = await supabase.auth.getSession();
			if (session) {
				const next = $page.url.searchParams.get('next') || '/chat';
				window.location.replace(next);
			}
		} catch {}
	});

	function validate() {
		emailError = ''; passwordError = '';
		let valid = true;
		if (!email.trim()) { emailError = 'Email is required.'; valid = false; }
		else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { emailError = 'Enter a valid email.'; valid = false; }
		if (mode === 'password' && !password.trim()) { passwordError = 'Password is required.'; valid = false; }
		if (mode === 'password' && password.trim().length > 0 && password.trim().length < 6) { passwordError = 'Min 6 chars.'; valid = false; }
		return valid;
	}

	async function closeLogin(){
		try {
			const { data: { session } } = await supabase.auth.getSession();
			if (session) {
				const next = $page.url.searchParams.get('next') || '/chat';
				await goto(next);
			}
		} catch {}
	}
</script>

<svelte:head><title>Login - Secure</title></svelte:head>

<div class="login-wrapper">
	<div class="card-box">
		<button class="close-btn" type="button" onclick={closeLogin} aria-label="Close">✕</button>
		<Card title={mode === 'password' ? 'Sign In' : 'Magic Link Login'}>
			
			<div class="mode-switch">
				<button type="button" class:active={mode==='password'} onclick={()=>{mode='password'; magicSent=false;}}>Password</button>
				<button type="button" class:active={mode==='magic'} onclick={()=>{mode='magic';}}>Magic Link</button>
			</div>

			{#if mode === 'password'}
			<form
				method="POST"
				action="?/login"
				use:enhance={() => {
					if(!validate()) return async () => { loading=false; };
					loading = true;
					return async ({ result }) => {
						loading = false;
						if (result.type === 'redirect') {
							window.location.href = result.location;
						}
					};
				}}
				onsubmit={(e) => { if (!validate()) e.preventDefault(); }}
			>
				{#if form?.error}<div class="server-error">{form.error}</div>{/if}
				{#if form?.message}<div class="server-success">{form.message}</div>{/if}
				<Input label="Email" type="email" name="email" bind:value={email} error={emailError} required />
				<Input label="Password" type="password" name="password" bind:value={password} error={passwordError} required />
				<div class="actions"><Button type="submit" disabled={loading}>{loading ? 'Signing in...' : 'Sign In'}</Button></div>
				<div class="links"><a href="/forgot-password">Forgot Password?</a><a href="/register">Create Account</a></div>
			</form>
			{:else}
			<form
				method="POST"
				action="?/magic"
				use:enhance={() => {
					if(!validate()) return async () => { loading=false; };
					loading = true;
					return async ({ result, update }: any) => {
						loading = false;
						await update();
						if (result.type === 'success' || result.data?.success) {
							magicSent = true;
						}
					};
				}}
				onsubmit={(e) => { if (!validate()) e.preventDefault(); }}
			>
				{#if form?.error}<div class="server-error">{form.error}</div>{/if}
				{#if form?.message}<div class="server-success">{form.message}</div>{/if}
				{#if magicSent}<div class="server-success">✅ Magic link sent to {email}. Check inbox and spam.</div>{/if}
				<Input label="Email" type="email" name="email" bind:value={email} error={emailError} required />
				<div class="actions"><Button type="submit" disabled={loading}>{loading ? 'Sending...' : 'Send Magic Link'}</Button></div>
				<div class="links"><a href="/forgot-password">Set Password?</a><button type="button" class="link-btn" onclick={()=>mode='password'}>Use Password Instead</button></div>
			</form>
			{/if}
		</Card>
	</div>
</div>

<style>
	.login-wrapper{ display:flex; justify-content:center; margin-top:60px; width:100%; padding: 0 16px; }
	.card-box{ position:relative; width:100%; max-width:420px; }
	form { display: flex; flex-direction: column; gap: 18px; }
	.actions { margin-top: 8px; }
	.links { display: flex; justify-content: space-between; font-size: .9rem; align-items: center; }
	a { color: #2563eb; text-decoration: none; }
	a:hover { text-decoration: underline; }
	.link-btn { background: none; border: none; color: #2563eb; cursor: pointer; font-size: .9rem; padding: 0; }
	.server-error { background: #fee2e2; color: #dc2626; padding: 12px; border-radius: 8px; font-size: 14px; text-align: center; border: 1px solid #fecaca; }
	.server-success { background: #dcfce7; color: #166534; padding: 12px; border-radius: 8px; font-size: 14px; text-align: center; border: 1px solid #bbf7d0; }
	.close-btn{
		position:absolute; top:-10px; right:-10px; width:34px; height:34px; border-radius:50%; border:1px solid #e5e7eb;
		background:#111827; color:#fff; font-size:16px; font-weight:700; cursor:pointer; display:flex; align-items:center; justify-content:center; z-index:10;
	}
	.mode-switch { display: flex; gap: 6px; background: #f1f5f9; padding: 4px; border-radius: 10px; margin-bottom: 18px; }
	.mode-switch button { flex: 1; border: none; background: transparent; padding: 8px; border-radius: 8px; font-weight: 600; font-size: 13px; cursor: pointer; color: #64748b; transition: 0.15s; }
	.mode-switch button.active { background: #fff; color: #0f172a; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
</style>