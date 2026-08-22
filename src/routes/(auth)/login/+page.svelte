<script lang="ts">
	import { enhance } from '$app/forms'; // ADD THIS
	import Button from '$lib/components/ui/Button.svelte';
	import Card from '$lib/components/ui/Card.svelte';
	import Input from '$lib/components/ui/Input.svelte';

	export let form; // ADD THIS to receive server errors

	let email = '';
	let password = '';
	let emailError = '';
	let passwordError = '';

	function validate() {
		emailError = '';
		passwordError = '';
		let valid = true;

		if (!email.trim()) {
			emailError = 'Email is required.';
			valid = false;
		} else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
			emailError = 'Enter a valid email.';
			valid = false;
		}

		if (!password.trim()) {
			passwordError = 'Password is required.';
			valid = false;
		}
		return valid;
	}
</script>

<svelte:head>
	<title>Login</title>
</svelte:head>

<Card title="Sign In">

	<form
		method="POST"
		action="?/login"
		use:enhance // ADD THIS
		on:submit={(e) => {
			if (!validate()) {
				e.preventDefault();
			}
	}}
	>
	<!-- ADD THIS BLOCK -->
	{#if form?.error}
			<div class="server-error">{form.error}</div>
	{/if}

	<Input
			label="Email"
			type="email"
			name="email"
			bind:value={email}
			error={emailError}
			required
		/>

	<Input
			label="Password"
			type="password"
			name="password"
			bind:value={password}
			error={passwordError}
			required
		/>

		<div class="actions">
			<Button type="submit">
				Sign In
			</Button>
		</div>

		<div class="links">
			<a href="/forgot-password">Forgot Password?</a>
			<a href="/register">Create Account</a>
		</div>

	</form>

</Card>

<style>
	form { display: flex; flex-direction: column; gap: 18px; }
	.actions { margin-top: 8px; }
	.links { display: flex; justify-content: space-between; font-size: .9rem; }
	a { color: #2563eb; text-decoration: none; }
	a:hover { text-decoration: underline; }
	.server-error { 
		background: #fee2e2; 
		color: #dc2626; 
		padding: 12px; 
		border-radius: 8px; 
		font-size: 14px; 
		text-align: center;
	}
</style>