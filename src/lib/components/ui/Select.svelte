<script lang="ts">
	/**
	 * ============================================================
	 * Temple Operations Reporting System
	 * File        : src/lib/components/ui/Select.svelte
	 * Author      : Your Name
	 * Created     : YYYY-MM-DD
	 * ============================================================
	 * PURPOSE
	 *   Reusable select component.
	 *
	 * FEATURES
	 *   - Label
	 *   - Placeholder
	 *   - Required
	 *   - Disabled
	 *   - Error message
	 *   - Generic options
	 * ============================================================
	 */

	export interface SelectOption {
		value: string;
		label: string;
		disabled?: boolean;
	}

	export let label = '';
	export let value = '';
	export let options: SelectOption[] = [];
	export let placeholder = 'Select...';
	export let required = false;
	export let disabled = false;
	export let error = '';
	export let name = '';

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

	<select
		bind:value
		{name}
		{required}
		{disabled}
		class:error={hasError}
	>

		<option value="" disabled>
			{placeholder}
		</option>

		{#each options as option}

			<option
				value={option.value}
				disabled={option.disabled}
			>
				{option.label}
			</option>

		{/each}

	</select>

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

	select {
		padding: 10px 12px;
		border-radius: 8px;
		border: 1px solid #d1d5db;
		background: white;
		font-size: 1rem;
		outline: none;
		transition: .2s;
	}

	select:focus {
		border-color: #2563eb;
		box-shadow: 0 0 0 3px rgba(37,99,235,.15);
	}

	select.error {
		border-color: #dc2626;
	}

	select:disabled {
		background: #f3f4f6;
		cursor: not-allowed;
	}

	.error {
		margin: 0;
		font-size: .85rem;
		color: #dc2626;
	}
</style>