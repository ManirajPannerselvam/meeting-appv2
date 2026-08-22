<script lang="ts">
	/**
	 * ============================================================
	 * Temple Operations Reporting System
	 * File        : src/routes/(auth)/forgot-password/+page.svelte
	 * ============================================================
	 * PURPOSE
	 *   Password reset request page.
	 * ============================================================
	 */

	import Button from '$lib/components/ui/Button.svelte';
	import Card from '$lib/components/ui/Card.svelte';
	import Input from '$lib/components/ui/Input.svelte';

	let email = '';
	let error = '';

	function validate() {
		error = '';

		if (!email.trim()) {
			error = 'Email is required.';
			return false;
		}

		return true;
	}
</script>

<svelte:head>
	<title>Forgot Password</title>
</svelte:head>

<Card title="Forgot Password">

	<p class="description">
		Enter your registered email address.
		We'll send you a password reset link.
	</p>

	<form
		method="POST"
		on:submit={(event) => {
			if (!validate()) {
				event.preventDefault();
			}
		}}
	>

		<Input
			label="Email"
			type="email"
			name="email"
			bind:value={email}
			required
		/>

		{#if error}
			<p class="error">{error}</p>
		{/if}

		<Button type="submit">
			Send Reset Link
		</Button>

		<div class="footer">
			<a href="/login">
				Back to Login
			</a>
		</div>

	</form>

</Card>

<style>
	.description {
		margin-bottom: 18px;
		color: #6b7280;
		font-size: .95rem;
	}

	form {
		display: flex;
		flex-direction: column;
		gap: 18px;
	}

	.error {
		color: #dc2626;
		font-size: .9rem;
	}

	.footer {
		text-align: center;
		margin-top: 8px;
	}

	a {
		color: #2563eb;
		text-decoration: none;
	}

	a:hover {
		text-decoration: underline;
	}
</style>