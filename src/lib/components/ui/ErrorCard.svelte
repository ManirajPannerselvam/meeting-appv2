<script lang="ts">
	import { createEventDispatcher } from "svelte";

	export let title = "Something went wrong";
	export let message = "An unexpected error occurred.";
	export let retryText = "Retry";
	export let showRetry = true;

	const dispatch = createEventDispatcher();
</script>

<div class="error-card">
	<div class="icon">⚠️</div>
	<h2>{title}</h2>
	<p>{message}</p>

	{#if showRetry}
		<button on:click={() => dispatch("retry")}>
			{retryText}
	</button>
	{/if}
</div>

<style>
.error-card{
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
	gap: 16px;
	padding: 40px 24px;
	background: white;
	border-radius: 16px;
	box-shadow: 0 8px 24px rgba(0,0,0,.08);
	text-align: center;
	margin: 20px 0;
	border: 1px solid #fee2e2;
}
.icon{ font-size: 48px; }
h2{ margin: 0; font-size: 20px; color: #dc2626; }
p{ margin: 0; color: #64748b; max-width: 500px; }
button{
	background: #2563eb;
	color: white;
	border: none;
	padding: 10px 20px;
	border-radius: 10px;
	font-weight: 600;
	cursor: pointer;
	transition: .2s;
}
button:hover{ background: #1d4ed8; transform: translateY(-2px); }
</style>