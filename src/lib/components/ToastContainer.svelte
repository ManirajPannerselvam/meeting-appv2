<script lang="ts">
	import { toast } from "$lib/stores/toast";
	import { fly } from "svelte/transition";
</script>

<div class="toast-container">
	{#each $toast as item (item.id)}
	<div
			class="toast"
			class:success={item.type==="success"}
			class:error={item.type==="error"}
			class:warning={item.type==="warning"}
			class:info={item.type==="info"}
			transition:fly={{ y: -20, duration: 200 }}
	>
			<span class="icon">
				{#if item.type === 'success'}✅
				{:else if item.type === 'error'}❌
				{:else if item.type === 'warning'}⚠️
				{:else}ℹ️{/if}
			</span>
			<span class="message">{item.message}</span>
			<button class="close" on:click={() => toast.remove(item.id)}>✕</button>
		</div>
	{/each}
</div>

<style>
.toast-container{
	position:fixed;
	top:20px;
	right:20px;
	display:flex;
	flex-direction:column;
	gap:10px;
	z-index:9999;
}

.toast{
	min-width:260px;
	padding:14px 18px;
	border-radius:8px;
	color:white;
	font-weight:600;
	box-shadow:0 6px 18px rgba(0,0,0,.2);
	display:flex;
	align-items:center;
	gap:10px;
}

.icon{ font-size:18px; }
.message{ flex:1; }
.close{
	background:none;
	border:none;
	color:white;
	font-size:18px;
	cursor:pointer;
	padding:0;
	line-height:1;
	opacity:0.8;
}
.close:hover{ opacity:1; }

.success{ background:#16a34a; }
.error{ background:#dc2626; }
.warning{ background:#d97706; }
.info{ background:#2563eb; }

@media(max-width:768px){
	.toast-container{
		left:12px;
		right:12px;
		top:12px;
	}
	.toast{
		min-width:unset;
		width:100%;
	}
</style>