<script lang="ts">
	let {
		open = false,
		title = "",
		size = "md",
		close,
		children
	} = $props();

	function handleBackdrop(event: MouseEvent) {
		if (event.target === event.currentTarget) {
			close?.();
		}
	}
</script>

{#if open}

<div

	class="modal-overlay"

	on:click={handleBackdrop}

>

	<div

		class="modal"

		class:sm={size==="sm"}

		class:md={size==="md"}

		class:lg={size==="lg"}

	>

		<div class="modal-header">

			<h2>{title}</h2>

			<button

				class="close"

				on:click={() => close?.()}

			>

				✕

			</button>

		</div>

		<div class="modal-body">

			{@render children()}

		</div>

	</div>

</div>

{/if}

<style>

.modal-overlay{

	position:fixed;

	inset:0;

	background:rgba(0,0,0,.45);

	display:flex;

	align-items:center;

	justify-content:center;

	z-index:5000;

	padding:20px;

}

.modal{

	background:white;

	border-radius:12px;

	box-shadow:0 20px 60px rgba(0,0,0,.25);

	max-height:90vh;

	overflow:auto;

	width:100%;

}

.sm{

	max-width:420px;

}

.md{

	max-width:700px;

}

.lg{

	max-width:1100px;

}

.modal-header{

	display:flex;

	align-items:center;

	justify-content:space-between;

	padding:18px 22px;

	border-bottom:1px solid #e5e7eb;

}

.modal-header h2{

	margin:0;

	font-size:20px;

}

.modal-body{

	padding:22px;

}

.close{

	border:none;

	background:none;

	font-size:22px;

	cursor:pointer;

}

@media(max-width:768px){

.modal{

		max-width:100%;

		border-radius:10px;

	}

}

</style>