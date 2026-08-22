<script lang="ts">
	/**
	 * ============================================================
	 * Temple Operations Reporting System
	 * File        : src/routes/(auth)/reset-password/+page.svelte
	 * ============================================================
	 * PURPOSE
	 *   Reset user password.
	 *
	 * RESPONSIBILITIES
	 *   - Enter new password
	 *   - Confirm password
	 *   - Client-side validation
	 *   - Submit to server action
	 * ============================================================
	 */

	import Button from '$lib/components/ui/Button.svelte';
	import Card from '$lib/components/ui/Card.svelte';
	import Input from '$lib/components/ui/Input.svelte';

	let password = '';
	let confirmPassword = '';

	let error = '';

	function validate() {
		error = '';

		if (!password) {
			error = 'Password is required.';
			return false;
		}

		if (password.length < 8) {
			error = 'Password must be at least 8 characters.';
			return false;
		}

		if (password !== confirmPassword) {
			error = 'Passwords do not match.';
			return false;
		}

		return true;
	}
</script>

<svelte:head>
	<title>Reset Password</title>
</svelte:head>

<Card title="Reset Password">

	<p class="description">
		Choose a new password for your account.
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
			label="New Password"
			type="password"
			name="password"
			bind:value={password}
			required
		/>

		<Input
			label="Confirm Password"
			type="password"
			name="confirmPassword"
			bind:value={confirmPassword}
			required
		/>

		{#if error}
			<p class="error">{error}</p>
		{/if}

		<Button type="submit">
			Update Password
		</Button>

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
</style>