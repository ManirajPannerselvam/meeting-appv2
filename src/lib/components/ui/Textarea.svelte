<script lang="ts">
	/**
	 * ============================================================
	 * Temple Operations Reporting System
	 * File        : src/lib/components/ui/Textarea.svelte
	 * Author      : Your Name
	 * Created     : YYYY-MM-DD
	 * ============================================================
	 * PURPOSE
	 *   Reusable textarea component.
	 *
	 * FEATURES
	 *   - Label
	 *   - Placeholder
	 *   - Required
	 *   - Disabled
	 *   - Readonly
	 *   - Error message
	 *   - Character counter
	 *   - Auto resize
	 * ============================================================
	 */

	export let label = '';
	export let value = '';
	export let name = '';
	export let placeholder = '';
	export let rows = 4;
	export let required = false;
	export let disabled = false;
	export let readonly = false;
	export let maxlength = 0;
	export let error = '';
	export let autoResize = true;

	let textarea: HTMLTextAreaElement;

	$: hasError = error.length > 0;

	$: if (autoResize && textarea) {
		textarea.style.height = 'auto';
		textarea.style.height = `${textarea.scrollHeight}px`;
	}
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

	<textarea
		bind:this={textarea}
		bind:value
		{name}
		{rows}
		{placeholder}
		{required}
		{disabled}
		{readonly}
		{maxlength}
		class:error={hasError}
	></textarea>

	<div class="footer">

		{#if hasError}
			<p class="error">
				{error}
			</p>
		{/if}

		{#if maxlength > 0}
			<span class="counter">
				{value.length}/{maxlength}
			</span>
		{/if}

	</div>

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

	textarea {
		width: 100%;
		min-height: 100px;
		padding: 10px 12px;
		border: 1px solid #d1d5db;
		border-radius: 8px;
		font-size: 1rem;
		font-family: inherit;
		resize: vertical;
		outline: none;
		box-sizing: border-box;
		transition: .2s;
	}

	textarea:focus {
		border-color: #2563eb;
		box-shadow: 0 0 0 3px rgba(37,99,235,.15);
	}

	textarea.error {
		border-color: #dc2626;
	}

	textarea:disabled {
		background: #f3f4f6;
		cursor: not-allowed;
	}

	.footer {
		display: flex;
		justify-content: space-between;
		align-items: center;
		min-height: 20px;
	}

	.error {
		margin: 0;
		color: #dc2626;
		font-size: .85rem;
	}

	.counter {
		margin-left: auto;
		font-size: .8rem;
		color: #6b7280;
	}
</style>