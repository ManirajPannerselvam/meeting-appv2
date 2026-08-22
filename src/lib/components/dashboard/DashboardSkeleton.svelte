<script lang="ts">
</script>

<div class="skeleton-wrapper">
	<div class="skeleton-card ai"></div>
	<div class="top-cards">
	{#each Array(5) as _}
			<div class="skeleton-card"></div>
	{/each}
	</div>
	<div class="kpi-grid">
		{#each Array(6) as _}
			<div class="skeleton-kpi"></div>
		{/each}
	</div>
	<div class="middle-grid">
	<div class="skeleton-card tall"></div>
		<div class="skeleton-card tall"></div>
	</div>
</div>

<style>
.skeleton-wrapper{ display:flex; flex-direction:column; gap:24px; }
.skeleton-card{ height:160px; background:linear-gradient(90deg,#f1f5f9 25%,#e2e8f0 50%,#f1f5f9 75%); background-size:200% 100%; border-radius:16px; animation:shimmer 1.5s infinite; }
.skeleton-card.ai{ height:120px; }
.skeleton-card.tall{ height:300px; }
.skeleton-kpi{ height:120px; background:linear-gradient(90deg,#f1f5f9 25%,#e2e8f0 50%,#f1f5f9 75%); background-size:200% 100%; border-radius:18px; animation:shimmer 1.5s infinite; }
.top-cards{ display:grid; grid-template-columns:repeat(auto-fit,minmax(300px,1fr)); gap:20px; }
.kpi-grid{ display:grid; grid-template-columns:repeat(auto-fit,minmax(220px,1fr)); gap:20px; }
.middle-grid{ display:grid; grid-template-columns:1fr 1fr; gap:20px; }
@keyframes shimmer{ 0%{ background-position:200% 0; } 100%{ background-position:-200% 0; } }
@media(max-width:1200px){ .middle-grid{ grid-template-columns:1fr; } }
@media(max-width:768px){
	.top-cards{ grid-template-columns:1fr; }
	.kpi-grid{ grid-template-columns:1fr; }
}
</style>