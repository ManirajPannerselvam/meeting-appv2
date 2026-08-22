<script lang="ts">
	/**
	 * ============================================================
	 * Temple Operations Reporting System
	 * File        : src/lib/components/ui/Input.svelte
	 * Author      : Your Name
	 * Created     : YYYY-MM-DD
	 * ============================================================
	 * PURPOSE
	 *   Reusable input component.
	 *
	 * FEATURES
	 *   - Label
	 *   - Placeholder
	 *   - Error message
	 *   - Required
	 *   - Disabled
	 *   - Prefix / Suffix slots
	 * ============================================================
	 */

	export let label = '';
	export let value = '';
	export let type = 'text';
	export let name = '';
	export let placeholder = '';
	export let required = false;
	export let disabled = false;
	export let readonly = false;
	export let autocomplete = 'off';
	export let error = '';

	$: hasError = error.length > 0;
</script>

<div class="field">

	{#if label}
		<label>
			{label}

			{#if required}
				<span class="required">*</span>
			{/if}
		</label>
	{/if}

	<div class:error={hasError} class="input-wrapper">

		{#if $$slots.prefix}
			<div class="prefix">
				<slot name="prefix" />
			</div>
		{/if}

		<input
			bind:value
			{type}
			{name}
			{placeholder}
			{required}
			{disabled}
			{readonly}
			{autocomplete}
		/>

		{#if $$slots.suffix}
			<div class="suffix">
				<slot name="suffix" />
			</div>
		{/if}

	</div>

	{#if hasError}
		<p class="error">
			{error}
		</p>
	{/if}

</div>

<style>
	.field {
		display: flex;
		flex-direction: column;
		gap: 6px;
		width: 100%;
	}

	label {
		font-size: .95rem;
		font-weight: 600;
		color: #374151;
	}

	.required {
		color: #dc2626;
	}

	.input-wrapper {
		display: flex;
		align-items: center;
		border: 1px solid #d1d5db;
		border-radius: 8px;
		background: white;
		transition: .2s;
	}

	.input-wrapper:focus-within {
		border-color: #2563eb;
		box-shadow: 0 0 0 3px rgba(37,99,235,.15);
	}

	.input-wrapper.error {
		border-color: #dc2626;
	}

	input {
		flex: 1;
		border: none;
		outline: none;
		padding: 10px 12px;
		font-size: 1rem;
		background: transparent;
	}

	input:disabled {
		background: #f3f4f6;
		cursor: not-allowed;
	}

	.prefix,
	.suffix {
		display: flex;
		align-items: center;
		padding: 0 10px;
		color: #6b7280;
	}

	.error {
		margin: 0;
		font-size: .85rem;
		color: #dc2626;
	}
</style>