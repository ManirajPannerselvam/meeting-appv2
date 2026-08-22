```svelte
<script lang="ts">
	import {
		onMount,
		onDestroy,
		createEventDispatcher
	} from "svelte";

	import TemplateDesigner from "$lib/components/templates/designer/TemplateDesigner.svelte";
	import UseTemplateModal from "$lib/components/UseTemplateModal.svelte";
	import {
		getTemplates,
		saveTemplate,
		deleteTemplate
	} from "$lib/db/database";

	const dispatch = createEventDispatcher();

	type TemplateField = {
		id?: string;
		label?: string;
		field_name?: string;
		field_type?: string;
		options?: string | string[];
		placeholder?: string;
		required?: boolean;
		display_order?: number;
		[key: string]: unknown;
	};

	type Template = {
		id: string;
		name: string;
		template_code?: string;
		description?: string;
		department?: string;
		chart?: string;
		chart_x?: string;
		chart_y?: string;
		fields: TemplateField[];
		data?: {
			fields: TemplateField[];
			department?: string;
			reference_template?: unknown;
		};
	};

	type TemplateRow = {
		id: string | number;
		name: string;
		template_code?: string;
		description?: string;
		department?: string;
		chart?: string;
		chart_x?: string;
		chart_y?: string;
		fields?: TemplateField[] | string | null;
		[key: string]: unknown;
	};

	let templates: Template[] = [];

	let searchQuery = "";
	let debouncedSearch = "";

	let showList = true;
	let showCreateModal = false;
	let showUseModal = false;
	let showDeleteModal = false;

	let loading = true;
	let saving = false;
	let isDeleting = false;

	let error = "";

	let selectedTemplate: Template | null = null;
	let templateToDelete: Template | null = null;
	let editingTemplate: Template | null = null;

	let searchTimeout: ReturnType<typeof setTimeout> | undefined;

	// =====================================================
	// LIFECYCLE
	// =====================================================

	onMount(() => {
		void loadTemplates();

		return () => {
			if (searchTimeout) {
				clearTimeout(searchTimeout);
			}
		};
	});

	onDestroy(() => {
		if (searchTimeout) {
			clearTimeout(searchTimeout);
		}
	});

	// =====================================================
	// SEARCH
	// =====================================================

	$: {
		if (searchTimeout) {
			clearTimeout(searchTimeout);
		}

		searchTimeout = setTimeout(() => {
			debouncedSearch = searchQuery.trim();
		}, 250);
	}

	// =====================================================
	// SAFE VALUE HELPERS
	// =====================================================

	function textValue(value: unknown): string {
		if (typeof value === "string") {
			return value.trim();
		}

		if (value == null) {
			return "";
		}

		return String(value).trim();
	}

	function createFieldId(): string {
		try {
			return crypto.randomUUID();
		} catch {
			return `${Date.now()}-${Math.random()
				.toString(36)
				.slice(2)}`;
		}
	}

	function parseFields(value: unknown): TemplateField[] {
		if (Array.isArray(value)) {
			return value as TemplateField[];
		}

		if (typeof value === "string") {
			try {
				const parsed = JSON.parse(value);

				return Array.isArray(parsed)
					? (parsed as TemplateField[])
					: [];
			} catch {
				return [];
			}
		}

		return [];
	}

	function parseData(template: Template): {
		fields: TemplateField[];
		department?: string;
		reference_template?: unknown;
	} {
		return {
			fields: parseFields(template.fields),
			department: template.department,
			reference_template: template.data?.reference_template
		};
	}

	// =====================================================
	// DEFAULT REQUIRED FIELDS
	// =====================================================

	function ensureDefaultFields(
		data: {
			fields?: TemplateField[];
			department?: string;
			reference_template?: unknown;
		}
	) {
		const newData = structuredClone(data);

		if (!Array.isArray(newData.fields)) {
			newData.fields = [];
		}

		const hasShift = newData.fields.some(
			(field) =>
				textValue(field.field_name).toLowerCase() ===
				"shift"
		);

		const hasStation = newData.fields.some(
			(field) =>
				textValue(field.field_name).toLowerCase() ===
				"station"
		);

		if (!hasShift) {
			newData.fields.unshift({
				id: createFieldId(),
				label: "Shift",
				field_name: "shift",
				field_type: "dropdown",
				options: JSON.stringify(["A", "B", "C"]),
				required: true,
				display_order: 0
			});
		}

		if (!hasStation) {
			newData.fields.unshift({
				id: createFieldId(),
				label: "Station",
				field_name: "station",
				field_type: "text",
				placeholder: "Line 1",
				required: true,
				display_order: 1
			});
		}

		newData.fields = newData.fields.map(
			(field, index) => ({
				...field,
				display_order: index
			})
		);

		return newData;
	}

	// =====================================================
	// TEMPLATE VIEW DATA
	// =====================================================

	function templateFieldCount(
		template: Template
	): number {
		return ensureDefaultFields(
			parseData(template)
		).fields.length;
	}

	function templateSearchText(
		template: Template
	): string {
		return [
			template.name,
			template.template_code,
			template.department,
			template.description
		]
			.map(textValue)
			.filter(Boolean)
			.join(" ")
			.toLowerCase();
	}

	$: searchText =
		debouncedSearch.toLowerCase();

	$: filtered = templates.filter(
		(template) =>
			!searchText ||
			templateSearchText(template).includes(
				searchText
			)
	);

	// =====================================================
	// LOAD TEMPLATES
	// =====================================================

	async function loadTemplates() {
		loading = true;
		error = "";

		try {
			const rows = await getTemplates();

			const safeRows = Array.isArray(rows)
				? (rows as TemplateRow[])
				: [];

			templates = safeRows.map(
				(row): Template => ({
					id: String(row.id),
					name:
						textValue(row.name) ||
						"Untitled Template",
					template_code:
						textValue(
							row.template_code
						) || undefined,
					description:
						textValue(
							row.description
						) || undefined,
					department:
						textValue(
							row.department
						) || undefined,
					chart:
						textValue(row.chart) ||
						undefined,
					chart_x:
						textValue(
							row.chart_x
						) || undefined,
					chart_y:
						textValue(
							row.chart_y
						) || undefined,
					fields: parseFields(
						row.fields
					)
				})
			);
		} catch (err) {
			console.error(
				"[Templates] Load failed:",
				err
			);

			error =
				err instanceof Error
					? err.message
					: "Failed to load templates.";

			templates = [];
		} finally {
			loading = false;
		}
	}

	// =====================================================
	// CREATE / EDIT
	// =====================================================

	function openCreate() {
		error = "";
		editingTemplate = null;
		showCreateModal = true;
	}

	function editTemplate(
		template: Template
	) {
		error = "";
		editingTemplate = template;
		showCreateModal = true;
	}

	function closeCreateModal() {
		if (saving) {
			return;
		}

		editingTemplate = null;
		showCreateModal = false;
	}

	// =====================================================
	// SAVE
	// =====================================================

	async function handleTemplateSaved(
		event: CustomEvent
	) {
		if (saving) {
			return;
		}

		saving = true;
		error = "";

		try {
			const data = event.detail;

			const ok = await saveTemplate(data);

			if (!ok) {
				throw new Error(
					"Failed to save template."
				);
			}

			showCreateModal = false;
			editingTemplate = null;

			await loadTemplates();
		} catch (err) {
			console.error(
				"[Templates] Save failed:",
				err
			);

			error =
				err instanceof Error
					? err.message
					: "Failed to save template.";
		} finally {
			saving = false;
		}
	}

	// =====================================================
	// USE TEMPLATE
	// =====================================================

	function openUse(
		template: Template
	) {
		error = "";

		const parsedData =
			ensureDefaultFields(
				parseData(template)
			);

		selectedTemplate = {
			...template,
			data: parsedData,
			fields: parsedData.fields
		};

		showUseModal = true;
	}

	function closeUseModal() {
		selectedTemplate = null;
		showUseModal = false;
	}

	async function handleSubmit(
		event: CustomEvent
	) {
		try {
			console.log(
				"[Templates] Report received:",
				event.detail
			);

			showUseModal = false;
			selectedTemplate = null;

			dispatch(
				"submit",
				event.detail
			);
		} catch (err) {
			console.error(
				"[Templates] Submit failed:",
				err
			);

			error =
				err instanceof Error
					? err.message
					: "Failed to submit report.";
		}
	}

	// =====================================================
	// DELETE
	// =====================================================

	function openDelete(
		template: Template
	) {
		error = "";
		templateToDelete = template;
		showDeleteModal = true;
	}

	function closeDeleteModal() {
		if (isDeleting) {
			return;
		}

		templateToDelete = null;
		showDeleteModal = false;
	}

	async function doDelete() {
		if (!templateToDelete || isDeleting) {
			return;
		}

		isDeleting = true;
		error = "";

		try {
			const templateId =
				templateToDelete.id;

			const ok =
				await deleteTemplate(
					templateId
				);

			if (!ok) {
				throw new Error(
					"Delete failed."
				);
			}

			showDeleteModal = false;
			templateToDelete = null;

			await loadTemplates();
		} catch (err) {
			console.error(
				"[Templates] Delete failed:",
				err
			);

			error =
				err instanceof Error
					? err.message
					: "Failed to delete template.";
		} finally {
			isDeleting = false;
		}
	}

	// =====================================================
	// RESET SEARCH
	// =====================================================

	function resetSearch() {
		searchQuery = "";
		debouncedSearch = "";
	}

	// =====================================================
	// KEYBOARD / ACCESSIBILITY
	// =====================================================

	function handleKeydown(
		event: KeyboardEvent
	) {
		if (event.key !== "Escape") {
			return;
		}

		if (showDeleteModal) {
			closeDeleteModal();
			return;
		}

		if (showUseModal) {
			closeUseModal();
			return;
		}

		if (showCreateModal) {
			closeCreateModal();
		}
	}
</script>

<svelte:window on:keydown={handleKeydown} />

<svelte:head>
	<title>Templates | Temple Operations</title>

	<meta
		name="description"
		content="Create, edit, use and manage operational reporting templates."
	/>
</svelte:head>

<!-- =====================================================
     TEMPLATE LIST
     ===================================================== -->

{#if showList}
	<div class="page">
		<div class="header">
			<div class="header-copy">
				<div class="eyebrow">
					Temple Operations
				</div>

				<h1>
					📋 Templates
				</h1>

				<p>
					Create and manage reusable
					operational reporting templates.
				</p>
			</div>

			<button
				type="button"
				class="primary"
				on:click={openCreate}
				disabled={loading}
			>
				<span aria-hidden="true">＋</span>
				New Template
			</button>
		</div>

		<!-- =================================================
		     ERROR
		     ================================================= -->

		{#if error}
			<div
				class="error"
				role="alert"
			>
				<div class="error-icon">
					!
				</div>

				<div class="error-content">
					<strong>
						Template operation failed
					</strong>

					<span>{error}</span>
				</div>

				<button
					type="button"
					class="error-retry"
					on:click={() =>
						void loadTemplates()
					}
					disabled={loading}
				>
					Try Again
				</button>
			</div>
		{/if}

		<!-- =================================================
		     SEARCH / FILTER BAR
		     ================================================= -->

		<div class="toolbar">
			<div class="search-box">
				<span
					class="search-icon"
					aria-hidden="true"
				>
					⌕
				</span>

				<input
					bind:value={searchQuery}
					placeholder="Search name, code, department..."
					aria-label="Search templates"
				/>

				{#if searchQuery}
					<button
						type="button"
						class="clear-search"
						on:click={resetSearch}
						aria-label="Clear template search"
					>
						×
					</button>
				{/if}
			</div>

			<button
				type="button"
				class="secondary"
				on:click={() =>
					void loadTemplates()
				}
				disabled={loading}
			>
				{loading
					? "Loading..."
					: "↻ Refresh"}
			</button>
		</div>

		<!-- =================================================
		     SUMMARY
		     ================================================= -->

		<div class="summary">
			<div class="summary-card">
				<div class="summary-icon blue-icon">
					📋
				</div>

				<div>
					<span>
						Total Templates
					</span>

					<strong>
						{templates.length.toLocaleString()}
					</strong>
				</div>
			</div>

			<div class="summary-card">
				<div class="summary-icon green-icon">
					✓
				</div>

				<div>
					<span>
						Matching Templates
					</span>

					<strong>
						{filtered.length.toLocaleString()}
					</strong>
				</div>
			</div>

			<div class="summary-card">
				<div class="summary-icon purple-icon">
					⚙
				</div>

				<div>
					<span>
						Departments
					</span>

					<strong>
						{new Set(
							templates
								.map(
									(template) =>
										textValue(
											template.department
										)
								)
								.filter(Boolean)
						).size}
					</strong>
				</div>
			</div>
		</div>

		<!-- =================================================
		     TEMPLATE LIST CARD
		     ================================================= -->

		<div class="list-card">
			<div class="list-header">
				<div>
					<h2>
						Available Templates
					</h2>

					<span>
						{filtered.length.toLocaleString()}
						of
						{templates.length.toLocaleString()}
						templates
					</span>
				</div>

				{#if searchText}
					<span class="search-status">
						Searching for
						<strong>
							"{debouncedSearch}"
						</strong>
					</span>
				{/if}
			</div>

			<div class="list">
				{#if loading}
					<div class="loading">
						<div class="spinner"></div>

						<strong>
							Loading templates...
						</strong>

						<span>
							Reading templates from the
							local database.
						</span>
					</div>
				{:else if filtered.length === 0}
					<div class="empty">
						<div class="empty-icon">
							{templates.length === 0
								? "📋"
								: "🔎"}
						</div>

						<strong>
							{templates.length === 0
								? "No templates yet"
								: "No templates found"}
						</strong>

						<span>
							{templates.length === 0
								? "Create your first reporting template to get started."
								: "Try a different search term."}
						</span>

						{#if templates.length === 0}
							<button
								type="button"
								class="primary empty-action"
								on:click={openCreate}
							>
								＋ Create Template
							</button>
						{:else}
							<button
								type="button"
								class="secondary empty-action"
								on:click={resetSearch}
							>
								Clear Search
							</button>
						{/if}
					</div>
				{:else}
					{#each filtered as template (template.id)}
						{@const fieldCount =
							templateFieldCount(
								template
							)}

						<div class="template-card">
							<div class="template-main">
								<div class="template-icon">
									📄
								</div>

								<div class="template-info">
									<div class="template-title">
										<strong>
											{template.name}
										</strong>

										{#if template.template_code}
											<span class="code">
												{template.template_code}
											</span>
										{/if}
									</div>

									<div class="template-meta">
										<span>
											⚙
											{fieldCount}
											{fieldCount === 1
												? "field"
												: "fields"}
										</span>

										<span class="meta-separator">
											•
										</span>

										<span>
											🏢
											{template.department ||
												"General"}
										</span>
									</div>

									{#if template.description}
										<p class="description">
											{template.description}
										</p>
									{/if}
								</div>
							</div>

							<div class="actions">
								<button
									type="button"
									class="action edit"
									on:click={() =>
										editTemplate(
											template
										)}
									aria-label={`Edit ${template.name}`}
								>
									<span
										aria-hidden="true"
									>
										✎
									</span>
									Edit
								</button>

								<button
									type="button"
									class="action use"
									on:click={() =>
										openUse(
											template
										)}
									aria-label={`Use ${template.name}`}
								>
									<span
										aria-hidden="true"
									>
										▶
									</span>
									Use
								</button>

								<button
									type="button"
									class="action delete"
									on:click={() =>
										openDelete(
											template
										)}
									aria-label={`Delete ${template.name}`}
								>
									<span
										aria-hidden="true"
									>
										⌫
									</span>
									Delete
								</button>
							</div>
						</div>
					{/each}
				{/if}
			</div>
		</div>
	</div>
{/if}

<!-- =====================================================
     CREATE / EDIT MODAL
     ===================================================== -->

{#if showCreateModal}
	<div
		class="overlay"
		role="presentation"
		on:click={(event) => {
			if (
				event.target ===
				event.currentTarget
			) {
				closeCreateModal();
			}
		}}
	>
		<div
			class="modal designer-modal"
			role="dialog"
			aria-modal="true"
			aria-label={
				editingTemplate
					? "Edit template"
					: "Create template"
			}
			on:click|stopPropagation
		>
			<div class="modal-header">
				<div>
					<span class="modal-eyebrow">
						Template Designer
					</span>

					<h2>
						{editingTemplate
							? "Edit Template"
							: "Create Template"}
					</h2>
				</div>

				<button
					type="button"
					class="close-button"
					on:click={closeCreateModal}
					disabled={saving}
					aria-label="Close template designer"
				>
					×
				</button>
			</div>

			<div class="designer-content">
				<TemplateDesigner
					templates={templates}
					template={editingTemplate}
					on:saved={handleTemplateSaved}
					on:close={closeCreateModal}
				/>
			</div>

			{#if saving}
				<div class="saving-overlay">
					<div class="saving-box">
						<div class="spinner"></div>
						<strong>
							Saving template...
						</strong>
					</div>
				</div>
			{/if}
		</div>
	</div>
{/if}

<!-- =====================================================
     USE TEMPLATE MODAL
     ===================================================== -->

{#if showUseModal && selectedTemplate}
	<div
		class="overlay use-overlay"
		role="presentation"
		on:click={(event) => {
			if (
				event.target ===
				event.currentTarget
			) {
				closeUseModal();
			}
		}}
	>
		<div
			role="dialog"
			aria-modal="true"
			aria-label={`Use ${selectedTemplate.name}`}
			on:click|stopPropagation
		>
			<UseTemplateModal
				template={selectedTemplate}
				show={showUseModal}
				on:close={closeUseModal}
				on:submit={handleSubmit}
			/>
		</div>
	</div>
{/if}

<!-- =====================================================
     DELETE CONFIRMATION
     ===================================================== -->

{#if showDeleteModal && templateToDelete}
	<div
		class="overlay"
		role="presentation"
		on:click={(event) => {
			if (
				event.target ===
				event.currentTarget
			) {
				closeDeleteModal();
			}
		}}
	>
		<div
			class="confirm"
			role="dialog"
			aria-modal="true"
			aria-labelledby="delete-title"
			on:click|stopPropagation
		>
			<div class="confirm-icon">
				⌫
			</div>

			<h3 id="delete-title">
				Delete template?
			</h3>

			<p>
				You are about to delete
				<strong>
					"{templateToDelete.name}"
				</strong>.
				This action cannot be undone.
			</p>

			<div class="confirm-actions">
				<button
					type="button"
					class="cancel-button"
					on:click={closeDeleteModal}
					disabled={isDeleting}
				>
					Cancel
				</button>

				<button
					type="button"
					class="delete-confirm"
					on:click={() =>
						void doDelete()}
					disabled={isDeleting}
				>
					{isDeleting
						? "Deleting..."
						: "Delete Template"}
				</button>
			</div>
		</div>
	</div>
{/if}

<style>
	:global(body) {
		margin: 0;
		background: #f8fafc;
		color: #0f172a;
		font-family:
			Inter,
			system-ui,
			-apple-system,
			BlinkMacSystemFont,
			"Segoe UI",
			sans-serif;
	}

	:global(*) {
		box-sizing: border-box;
	}

	button,
	input {
		font: inherit;
	}

	button {
		-webkit-tap-highlight-color: transparent;
	}

	.page {
		width: 100%;
		max-width: 1500px;
		margin: 0 auto;
		padding: 28px;
	}

	.header {
		display: flex;
		align-items: flex-start;
		justify-content: space-between;
		gap: 24px;
		margin-bottom: 24px;
	}

	.header-copy {
		min-width: 0;
	}

	.eyebrow,
	.modal-eyebrow {
		font-size: 11px;
		font-weight: 800;
		letter-spacing: 0.1em;
		text-transform: uppercase;
		color: #64748b;
	}

	h1 {
		margin: 6px 0 0;
		font-size: clamp(
			26px,
			3vw,
			36px
		);
		line-height: 1.15;
	}

	.header p {
		margin: 9px 0 0;
		color: #64748b;
		font-size: 14px;
	}

	.primary,
	.secondary,
	.action,
	.error-retry,
	.cancel-button,
	.delete-confirm {
		border: 0;
		border-radius: 10px;
		font-weight: 700;
		cursor: pointer;
		transition:
			transform 0.15s ease,
			background 0.15s ease,
			opacity 0.15s ease;
	}

	.primary {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		gap: 7px;
		padding: 11px 16px;
		background: #2563eb;
		color: white;
		white-space: nowrap;
	}

	.primary:hover:not(:disabled) {
		background: #1d4ed8;
		transform: translateY(-1px);
	}

	.secondary {
		padding: 11px 15px;
		background: white;
		color: #334155;
		border: 1px solid #dbe2ea;
	}

	.secondary:hover:not(:disabled) {
		background: #f8fafc;
		transform: translateY(-1px);
	}

	button:disabled {
		cursor: not-allowed;
		opacity: 0.5;
	}

	/* =====================================================
	   ERROR
	   ===================================================== */

	.error {
		display: flex;
		align-items: center;
		gap: 12px;
		margin-bottom: 20px;
		padding: 13px 15px;
		border: 1px solid #fecaca;
		border-radius: 12px;
		background: #fef2f2;
		color: #991b1b;
	}

	.error-icon {
		width: 28px;
		height: 28px;
		display: grid;
		place-items: center;
		flex: 0 0 28px;
		border-radius: 50%;
		background: #fee2e2;
		color: #dc2626;
		font-weight: 900;
	}

	.error-content {
		display: flex;
		flex-direction: column;
		gap: 2px;
		min-width: 0;
	}

	.error-content span {
		font-size: 13px;
		overflow-wrap: anywhere;
	}

	.error-retry {
		margin-left: auto;
		padding: 9px 13px;
		background: #dc2626;
		color: white;
		white-space: nowrap;
	}

	/* =====================================================
	   TOOLBAR
	   ===================================================== */

	.toolbar {
		display: flex;
		align-items: center;
		gap: 10px;
		margin-bottom: 18px;
	}

	.search-box {
		display: flex;
		align-items: center;
		gap: 8px;
		flex: 1;
		min-width: 260px;
		height: 44px;
		padding: 0 12px;
		background: white;
		border: 1px solid #dbe2ea;
		border-radius: 10px;
		transition:
			border-color 0.15s ease,
			box-shadow 0.15s ease;
	}

	.search-box:focus-within {
		border-color: #93c5fd;
		box-shadow:
			0 0 0 3px
			rgba(
				37,
				99,
				235,
				0.1
			);
	}

	.search-icon {
		color: #64748b;
		font-size: 22px;
		line-height: 1;
	}

	.search-box input {
		width: 100%;
		min-width: 0;
		border: 0;
		outline: 0;
		background: transparent;
		color: #0f172a;
		font-size: 14px;
	}

	.search-box input::placeholder {
		color: #94a3b8;
	}

	.clear-search {
		width: 26px;
		height: 26px;
		display: grid;
		place-items: center;
		border: 0;
		border-radius: 50%;
		background: #e2e8f0;
		color: #475569;
		cursor: pointer;
		font-size: 18px;
		line-height: 1;
	}

	/* =====================================================
	   SUMMARY
	   ===================================================== */

	.summary {
		display: grid;
		grid-template-columns:
			repeat(
				3,
				minmax(0, 1fr)
			);
		gap: 14px;
		margin-bottom: 20px;
	}

	.summary-card {
		display: flex;
		align-items: center;
		gap: 12px;
		padding: 16px;
		background: white;
		border: 1px solid #e2e8f0;
		border-radius: 14px;
		box-shadow:
			0 2px 8px
			rgba(
				15,
				23,
				42,
				0.035
			);
	}

	.summary-card > div:last-child {
		min-width: 0;
	}

	.summary-card span {
		display: block;
		margin-bottom: 4px;
		color: #64748b;
		font-size: 12px;
		font-weight: 600;
	}

	.summary-card strong {
		display: block;
		font-size: 23px;
		line-height: 1.1;
	}

	.summary-icon {
		width: 42px;
		height: 42px;
		display: grid;
		place-items: center;
		flex: 0 0 42px;
		border-radius: 11px;
		font-size: 19px;
	}

	.blue-icon {
		background: #eff6ff;
		color: #2563eb;
	}

	.green-icon {
		background: #f0fdf4;
		color: #16a34a;
	}

	.purple-icon {
		background: #faf5ff;
		color: #9333ea;
	}

	/* =====================================================
	   LIST CARD
	   ===================================================== */

	.list-card {
		overflow: hidden;
		background: white;
		border: 1px solid #e2e8f0;
		border-radius: 16px;
		box-shadow:
			0 3px 12px
			rgba(
				15,
				23,
				42,
				0.045
			);
	}

	.list-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 14px;
		padding: 18px 20px;
		border-bottom: 1px solid #e2e8f0;
	}

	.list-header h2 {
		margin: 0 0 4px;
		font-size: 18px;
	}

	.list-header > div > span {
		color: #64748b;
		font-size: 13px;
	}

	.search-status {
		color: #64748b;
		font-size: 12px;
	}

	.search-status strong {
		color: #334155;
	}

	.list {
		padding: 12px;
	}

	.template-card {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 18px;
		padding: 14px;
		border: 1px solid transparent;
		border-radius: 12px;
		transition:
			background 0.15s ease,
			border-color 0.15s ease;
	}

	.template-card + .template-card {
		border-top: 1px solid #eef2f7;
		border-radius: 0;
	}

	.template-card:hover {
		background: #f8fafc;
		border-color: #e2e8f0;
		border-radius: 12px;
	}

	.template-main {
		display: flex;
		align-items: center;
		gap: 13px;
		min-width: 0;
		flex: 1;
	}

	.template-icon {
		width: 42px;
		height: 42px;
		display: grid;
		place-items: center;
		flex: 0 0 42px;
		border-radius: 10px;
		background: #eff6ff;
		font-size: 20px;
	}

	.template-info {
		min-width: 0;
	}

	.template-title {
		display: flex;
		align-items: center;
		gap: 7px;
		flex-wrap: wrap;
	}

	.template-title strong {
		color: #0f172a;
		font-size: 14px;
	}

	.code {
		padding: 3px 7px;
		border-radius: 6px;
		background: #f1f5f9;
		color: #475569;
		font-size: 10px;
		font-weight: 800;
		letter-spacing: 0.03em;
	}

	.template-meta {
		display: flex;
		align-items: center;
		gap: 6px;
		margin-top: 5px;
		color: #64748b;
		font-size: 12px;
	}

	.meta-separator {
		color: #cbd5e1;
	}

	.description {
		margin: 5px 0 0;
		color: #94a3b8;
		font-size: 12px;
		line-height: 1.4;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
		max-width: 650px;
	}

	.actions {
		display: flex;
		align-items: center;
		gap: 7px;
		flex: 0 0 auto;
	}

	.action {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		gap: 5px;
		padding: 8px 11px;
		font-size: 12px;
	}

	.action.edit {
		background: #eff6ff;
		color: #1d4ed8;
	}

	.action.edit:hover:not(:disabled) {
		background: #dbeafe;
	}

	.action.use {
		background: #f0fdf4;
		color: #15803d;
	}

	.action.use:hover:not(:disabled) {
		background: #dcfce7;
	}

	.action.delete {
		background: #fef2f2;
		color: #dc2626;
	}

	.action.delete:hover:not(:disabled) {
		background: #fee2e2;
	}

	/* =====================================================
	   EMPTY / LOADING
	   ===================================================== */

	.empty,
	.loading {
		min-height: 300px;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 8px;
		padding: 30px;
		text-align: center;
	}

	.empty-icon {
		margin-bottom: 5px;
		font-size: 36px;
	}

	.empty strong,
	.loading strong {
		color: #334155;
		font-size: 15px;
	}

	.empty span,
	.loading span {
		color: #94a3b8;
		font-size: 13px;
	}

	.empty-action {
		margin-top: 9px;
	}

	.spinner {
		width: 30px;
		height: 30px;
		margin-bottom: 5px;
		border: 3px solid #dbeafe;
		border-top-color: #2563eb;
		border-radius: 50%;
		animation: spin 0.8s linear infinite;
	}

	@keyframes spin {
		to {
			transform: rotate(360deg);
		}
	}

	/* =====================================================
	   MODALS
	   ===================================================== */

	.overlay {
		position: fixed;
		inset: 0;
		z-index: 9999;
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 20px;
		background:
			rgba(
				15,
				23,
				42,
				0.68
			);
		backdrop-filter: blur(3px);
	}

	.use-overlay {
		z-index: 10000;
	}

	.modal {
		position: relative;
		width: min(
			100%,
			1050px
		);
		max-height: 94vh;
		overflow: hidden;
		background: white;
		border-radius: 18px;
		box-shadow:
			0 25px 70px
			rgba(
				15,
				23,
				42,
				0.25
			);
	}

	.designer-modal {
		display: flex;
		flex-direction: column;
	}

	.modal-header {
		display: flex;
		align-items: flex-start;
		justify-content: space-between;
		gap: 15px;
		padding: 18px 20px;
		border-bottom: 1px solid #e2e8f0;
	}

	.modal-header h2 {
		margin: 4px 0 0;
		font-size: 19px;
	}

	.close-button {
		width: 34px;
		height: 34px;
		display: grid;
		place-items: center;
		border: 0;
		border-radius: 9px;
		background: #f1f5f9;
		color: #475569;
		cursor: pointer;
		font-size: 24px;
		line-height: 1;
	}

	.close-button:hover:not(:disabled) {
		background: #e2e8f0;
	}

	.designer-content {
		max-height: calc(94vh - 75px);
		overflow: auto;
		padding: 0;
	}

	.saving-overlay {
		position: absolute;
		inset: 0;
		z-index: 10;
		display: grid;
		place-items: center;
		background:
			rgba(
				255,
				255,
				255,
				0.72
			);
		backdrop-filter: blur(2px);
	}

	.saving-box {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 10px;
		padding: 22px 28px;
		background: white;
		border: 1px solid #e2e8f0;
		border-radius: 14px;
		box-shadow:
			0 15px 40px
			rgba(
				15,
				23,
				42,
				0.12
			);
		color: #334155;
	}

	/* =====================================================
	   DELETE CONFIRMATION
	   ===================================================== */

	.confirm {
		width: min(
			100%,
			420px
		);
		padding: 26px;
		background: white;
		border-radius: 16px;
		box-shadow:
			0 25px 70px
			rgba(
				15,
				23,
				42,
				0.25
			);
	}

	.confirm-icon {
		width: 46px;
		height: 46px;
		display: grid;
		place-items: center;
		margin-bottom: 14px;
		border-radius: 12px;
		background: #fef2f2;
		color: #dc2626;
		font-size: 22px;
	}

	.confirm h3 {
		margin: 0;
		font-size: 19px;
	}

	.confirm p {
		margin: 9px 0 0;
		color: #64748b;
		font-size: 14px;
		line-height: 1.5;
	}

	.confirm p strong {
		color: #334155;
	}

	.confirm-actions {
		display: flex;
		justify-content: flex-end;
		gap: 9px;
		margin-top: 22px;
	}

	.cancel-button,
	.delete-confirm {
		padding: 10px 14px;
	}

	.cancel-button {
		background: #f1f5f9;
		color: #334155;
	}

	.cancel-button:hover:not(:disabled) {
		background: #e2e8f0;
	}

	.delete-confirm {
		background: #dc2626;
		color: white;
	}

	.delete-confirm:hover:not(:disabled) {
		background: #b91c1c;
	}

	/* =====================================================
	   MOBILE
	   ===================================================== */

	@media (max-width: 900px) {
		.page {
			padding: 20px;
		}

		.summary {
			grid-template-columns:
				repeat(
					2,
					minmax(0, 1fr)
				);
		}

		.template-card {
			align-items: flex-start;
			flex-direction: column;
		}

		.actions {
			width: 100%;
		}

		.action {
			flex: 1;
		}
	}

	@media (max-width: 650px) {
		.page {
			padding: 15px;
		}

		.header {
			flex-direction: column;
			gap: 14px;
		}

		.header .primary {
			width: 100%;
		}

		.toolbar {
			align-items: stretch;
			flex-direction: column;
		}

		.search-box {
			width: 100%;
			min-width: 0;
		}

		.toolbar .secondary {
			width: 100%;
		}

		.summary {
			grid-template-columns: 1fr;
		}

		.summary-card {
			padding: 14px;
		}

		.list-header {
			align-items: flex-start;
			flex-direction: column;
			padding: 15px;
		}

		.search-status {
			align-self: flex-start;
		}

		.list {
			padding: 7px;
		}

		.template-card {
			padding: 13px 10px;
		}

		.template-main {
			align-items: flex-start;
		}

		.template-icon {
			width: 38px;
			height: 38px;
			flex-basis: 38px;
			font-size: 18px;
		}

		.description {
			max-width: 100%;
		}

		.actions {
			display: grid;
			grid-template-columns:
				repeat(
					3,
					minmax(0, 1fr)
				);
		}

		.action {
			padding: 9px 5px;
			font-size: 11px;
		}

		.overlay {
			align-items: stretch;
			padding: 0;
		}

		.modal {
			width: 100%;
			max-height: 100vh;
			height: 100vh;
			border-radius: 0;
		}

		.designer-content {
			max-height: calc(100vh - 75px);
		}

		.confirm {
			width: calc(
				100% - 30px
			);
			padding: 21px;
		}

		.confirm-actions {
			display: grid;
			grid-template-columns:
				1fr 1fr;
		}

		.confirm-actions button {
			width: 100%;
		}
	}

	@media (max-width: 400px) {
		.page {
			padding: 12px;
		}

		h1 {
			font-size: 25px;
		}

		.template-title strong {
			font-size: 13px;
		}

		.template-meta {
			font-size: 11px;
		}

		.action span {
			display: none;
		}
	}
</style>
```
