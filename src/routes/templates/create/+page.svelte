<script lang="ts">
	import { goto } from "$app/navigation";
	import TemplateDesigner from "$lib/components/templates/designer/TemplateDesigner.svelte";

	function handleSaved() {
		goto("/templates");
	}

	function handleClose() {
		goto("/templates");
	}
</script>

<svelte:head>
	<title>Create Template</title>
</svelte:head>

<div class="page">

	<div class="page-header">

		<div>

			<h1>➕ Create Template</h1>

			<p>
				Create reusable templates for production,
				quality, meetings, audits and reports.
			</p>

		</div>

	</div>

	<div class="designer">

		<TemplateDesigner
			on:saved={handleSaved}
			on:close={handleClose}
		/>

	</div>

</div>

<style>

.page{

	display:flex;

	flex-direction:column;

	gap:24px;

}

.page-header{

	display:flex;

	justify-content:space-between;

	align-items:center;

}

.page-header h1{

	margin:0;

	font-size:30px;

	color:#0f172a;

}

.page-header p{

	margin-top:6px;

	color:#64748b;

}

.designer{

	background:white;

	border-radius:16px;

	padding:20px;

	box-shadow:0 8px 24px rgba(0,0,0,.08);

}

@media(max-width:768px){

	.designer{

		padding:12px;

	}

}

</style>