<script lang="ts">
	import { onMount } from "svelte";

	type Category = {
		id: string;
		name: string;
		department: string;
		description: string;
		color: string;
		templateCount: number;
		status: "Active" | "Inactive";
	};

	let categories: Category[] = [];

	let loading = true;

	let showModal = false;

	let editing: Category | null = null;

	let form = {
		name: "",
		department: "",
		description: "",
		color: "#2563eb",
		status: "Active"
	};

	onMount(async () => {

		// TODO:
		// categories =
		// await templateService.getCategories();

		categories = [

			{
				id:"1",
				name:"Production",
				department:"Production",
				description:"Production Templates",
				color:"#2563eb",
				templateCount:42,
				status:"Active"
			},

			{
				id:"2",
				name:"Quality",
				department:"Quality",
				description:"Quality Documents",
				color:"#16a34a",
				templateCount:18,
				status:"Active"
			},

			{
				id:"3",
				name:"Maintenance",
				department:"Maintenance",
				description:"Machine Templates",
				color:"#ea580c",
				templateCount:11,
				status:"Active"
			}

		];

		loading = false;

	});

	function newCategory(){

		editing = null;

		form = {
			name:"",
			department:"",
			description:"",
			color:"#2563eb",
			status:"Active"
		};

		showModal = true;

	}

	function edit(item: Category){

		editing = item;

		form = {
			name:item.name,
			department:item.department,
			description:item.description,
			color:item.color,
			status:item.status
		};

		showModal = true;

	}

	function save(){

		// TODO:
		// templateService.saveCategory()

		showModal = false;

	}

	function remove(item: Category){

		if(confirm(`Delete ${item.name}?`)){

			// TODO:
			// templateService.deleteCategory()

		}

	}

</script>

<svelte:head>
	<title>Template Categories</title>
</svelte:head>

{#if loading}

<div class="loading">
Loading...
</div>

{:else}

<div class="page">

	<div class="header">

		<div>

			<h1>Template Categories</h1>

			<p>
				Manage reusable template categories.
			</p>

		</div>

		<button
			class="primary"
			on:click={newCategory}
		>
			+ New Category
		</button>

	</div>

	<div class="grid">

		{#each categories as category}

		<div class="card">

			<div
				class="color"
				style="background:{category.color}"
			></div>

			<h2>{category.name}</h2>

			<p>{category.description}</p>

			<div class="meta">

				<div>

					<b>Department</b>

					<p>{category.department}</p>

				</div>

				<div>

					<b>Templates</b>

					<p>{category.templateCount}</p>

				</div>

				<div>

					<b>Status</b>

					<p>{category.status}</p>

				</div>

			</div>

			<div class="actions">

				<button
					class="edit"
					on:click={() => edit(category)}
				>
					Edit
				</button>

				<button
					class="delete"
					on:click={() => remove(category)}
				>
					Delete
				</button>

			</div>

		</div>

		{/each}

	</div>

</div>

{/if}

{#if showModal}

<div class="overlay">

	<div class="modal">

		<h2>

			{editing ? "Edit" : "New"}

			Category

		</h2>

		<label>Name</label>

		<input bind:value={form.name}>

		<label>Department</label>

		<input bind:value={form.department}>

		<label>Description</label>

		<textarea
			rows="3"
			bind:value={form.description}
		/>

		<label>Color</label>

		<input
			type="color"
			bind:value={form.color}
		/>

		<label>Status</label>

		<select bind:value={form.status}>

			<option>Active</option>

			<option>Inactive</option>

		</select>

		<div class="footer">

			<button
				on:click={() => showModal=false}
			>
				Cancel
			</button>

			<button
				class="primary"
				on:click={save}
			>
				Save
			</button>

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

.header{
	display:flex;
	justify-content:space-between;
	align-items:center;
}

.grid{
	display:grid;
	grid-template-columns:repeat(auto-fit,minmax(320px,1fr));
	gap:20px;
}

.card{
	background:white;
	border-radius:12px;
	padding:20px;
	box-shadow:0 2px 8px rgba(0,0,0,.08);
}

.color{
	width:50px;
	height:8px;
	border-radius:8px;
	margin-bottom:16px;
}

.meta{
	display:grid;
	grid-template-columns:repeat(3,1fr);
	margin-top:20px;
}

.actions{
	display:flex;
	gap:10px;
	margin-top:20px;
}

button{
	border:none;
	padding:10px 18px;
	border-radius:8px;
	cursor:pointer;
}

.primary{
	background:#2563eb;
	color:white;
}

.edit{
	background:#16a34a;
	color:white;
}

.delete{
	background:#dc2626;
	color:white;
}

.overlay{
	position:fixed;
	inset:0;
	background:rgba(0,0,0,.45);
	display:flex;
	align-items:center;
	justify-content:center;
}

.modal{
	width:500px;
	background:white;
	padding:24px;
	border-radius:12px;
	display:flex;
	flex-direction:column;
	gap:12px;
}

.modal input,
.modal textarea,
.modal select{
	padding:10px;
	border:1px solid #ccc;
	border-radius:8px;
}

.footer{
	display:flex;
	justify-content:flex-end;
	gap:10px;
	margin-top:10px;
}

.loading{
	padding:80px;
	text-align:center;
	font-size:20px;
}

</style>