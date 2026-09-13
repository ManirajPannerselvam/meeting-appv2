<script lang="ts">
	import { enhance } from '$app/forms';
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import Button from '$lib/components/ui/Button.svelte';
	import Card from '$lib/components/ui/Card.svelte';
	import Input from '$lib/components/ui/Input.svelte';
	import { supabase } from '$lib/supabase/client';
	import { onMount } from 'svelte';

	export let form;

	let email = '';
	let password = '';
	let emailError = '';
	let passwordError = '';
	let loading = false;

	onMount(async () => {
		const { data: { session } } = await supabase.auth.getSession();
		if (session) {
			const next = $page.url.searchParams.get('next') || '/chat';
			window.location.href = next;
		}
	});

	function validate() {
		emailError = ''; passwordError = '';
		let valid = true;
		if (!email.trim()) { emailError = 'Email is required.'; valid = false; }
		else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { emailError = 'Enter a valid email.'; valid = false; }
		if (!password.trim()) { passwordError = 'Password is required.'; valid = false; }
		return valid;
	}

	async function closeLogin(){
		const { data: { session } } = await supabase.auth.getSession();
		if (session) {
			const next = $page.url.searchParams.get('next') || '/chat';
			await goto(next);
		}
		// if not logged in, do nothing - secure
	}
</script>

<svelte:head><title>Login</title></svelte:head>

<div class="login-wrapper">
	<div class="card-box">
		<button class="close-btn" type="button" onclick={closeLogin} aria-label="Close">✕</button>
		<Card title="Sign In">
			<form
				method="POST"
				action="?/login"
				use:enhance={() => {
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
				<Input label="Email" type="email" name="email" bind:value={email} error={emailError} required />
				<Input label="Password" type="password" name="password" bind:value={password} error={passwordError} required />
				<div class="actions"><Button type="submit" disabled={loading}>{loading ? 'Signing in...' : 'Sign In'}</Button></div>
				<div class="links"><a href="/forgot-password">Forgot Password?</a><a href="/register">Create Account</a></div>
			</form>
		</Card>
	</div>
</div>

<style>
	.login-wrapper{ display:flex; justify-content:center; margin-top:60px; width:100%; }
	.card-box{ position:relative; width:100%; max-width:420px; }
	form { display: flex; flex-direction: column; gap: 18px; }
	.actions { margin-top: 8px; }
	.links { display: flex; justify-content: space-between; font-size: .9rem; }
	a { color: #2563eb; text-decoration: none; }
	a:hover { text-decoration: underline; }
	.server-error { background: #fee2e2; color: #dc2626; padding: 12px; border-radius: 8px; font-size: 14px; text-align: center; }
	.close-btn{
		position:absolute; top:-10px; right:-10px; width:34px; height:34px; border-radius:50%; border:1px solid #e5e7eb;
		background:#111827; color:#fff; font-size:16px; font-weight:700; cursor:pointer; display:flex; align-items:center; justify-content:center; z-index:10;
	}
</style>
