<script lang="ts">
	import { page } from "$app/state";
	import { goto } from "$app/navigation";
	import { onMount } from "svelte";

	const id = page.params.id;

	let loading = true;

	let template: any = null;

	onMount(async () => {

		// TODO:
		// const { data } =
		// await templateService.getTemplate(id);

		template = {

			id,

			name: "Daily Production Report",

			description:
				"Production Shift Report",

			department: "Production",

			category: "Daily",

			version: 4,

			fields: [

				{
					label: "Shift",
					field_type: "dropdown",
					required: true,
					options: ["A","B","C"]
				},

				{
					label: "Station",
					field_type: "text",
					required: true
				},

				{
					label: "Target Qty",
					field_type: "number",
					required: true
				},

				{
					label: "Actual Qty",
					field_type: "number",
					required: true
				},

				{
					label: "NG Qty",
					field_type: "number"
				},

				{
					label: "Remarks",
					field_type: "textarea"
				}

			]

		};

		loading = false;

	});

</script>

<svelte:head>

	<title>Template Preview</title>

</svelte:head>

{#if loading}

<div class="loading">

Loading Preview...

</div>

{:else}

<div class="page">

	<div class="toolbar">

		<div>

			<h1>{template.name}</h1>

			<p>{template.description}</p>

		</div>

		<div class="buttons">

			<button
				class="back"
				on:click={() => goto(`/templates/${id}`)}
			>
				← Back
			</button>

			<button
				class="print"
				on:click={() => window.print()}
			>
				Print
			</button>

		</div>

	</div>

	<div class="preview">

		<div class="header">

			<h2>{template.name}</h2>

			<div>

				Department :
				<b>{template.department}</b>

			</div>

			<div>

				Version :
				<b>{template.version}</b>

			</div>

		</div>

		<div class="form">

			{#each template.fields as field}

				<div class="field">

					<label>

						{field.label}

						{#if field.required}

						<span>*</span>

						{/if}

					</label>

					{#if field.field_type==="text"}

						<input
							type="text"
							placeholder={field.label}
							disabled
						/>

					{:else if field.field_type==="number"}

						<input
							type="number"
							disabled
						/>

					{:else if field.field_type==="textarea"}

						<textarea
							rows="4"
							disabled
						/>

					{:else if field.field_type==="dropdown"}

						<select disabled>

							<option>

								Select

							</option>

							{#each field.options as option}

							<option>

								{option}

							</option>

							{/each}

						</select>

					{/if}

				</div>

			{/each}

		</div>

	</div>

</div>

{/if}

<style>

.page{

	display:flex;

	flex-direction:column;

	gap:24px;

}

.toolbar{

	display:flex;

	justify-content:space-between;

	align-items:center;

	flex-wrap:wrap;

}

.buttons{

	display:flex;

	gap:10px;

}

.preview{

	background:white;

	border-radius:12px;

	padding:30px;

	box-shadow:0 2px 10px rgba(0,0,0,.08);

}

.header{

	border-bottom:1px solid #ddd;

	padding-bottom:20px;

	margin-bottom:25px;

}

.form{

	display:grid;

	grid-template-columns:repeat(auto-fit,minmax(320px,1fr));

	gap:20px;

}

.field{

	display:flex;

	flex-direction:column;

	gap:8px;

}

label{

	font-weight:600;

}

label span{

	color:red;

}

input,
textarea,
select{

	padding:12px;

	border:1px solid #ccc;

	border-radius:8px;

	background:#f8fafc;

}

button{

	border:none;

	padding:10px 20px;

	border-radius:8px;

	cursor:pointer;

	color:white;

}

.back{

	background:#64748b;

}

.print{

	background:#2563eb;

}

.loading{

	text-align:center;

	padding:80px;

	font-size:22px;

}

@media print{

	.toolbar{

		display:none;

	}

	.preview{

		box-shadow:none;

		border:none;

	}

	body{

		background:white;

	}

}

</style>