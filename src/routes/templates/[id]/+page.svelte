<script lang="ts">
	import { page } from "$app/state";
	import { goto } from "$app/navigation";
	import { onMount } from "svelte";
	import { supabase } from "$lib/supabase/client";
	import { toast } from "svelte-sonner";

	interface TemplateField {
		label: string;
		type: string;
		required?: boolean;
		key?: string;
		description?: string;
	}

	interface Template {
		id: string;
		name: string;
		template_code: string;
		description: string;
		department: string;
		category: string;
		type: string;
		status: string;
		version: number;
		created_by: string;
		created_at: string;
		updated_at: string;
		last_used: string;
		total_usage: number;
		fields: TemplateField[];
		ai_enabled: boolean;
		reference_template: string;
	}

	const id = page.params.id;

	let loading = true;
	let errorMessage = "";

	let template: Template = {
		id: "",
		name: "",
		template_code: "",
		description: "",
		department: "",
		category: "",
		type: "",
		status: "",
		version: 1,
		created_by: "",
		created_at: "",
		updated_at: "",
		last_used: "",
		total_usage: 0,
		fields: [],
		ai_enabled: false,
		reference_template: ""
	};

	// ===== HELPERS =====

	function formatDate(value: string | null | undefined): string {
		if (!value) return "-";

		const date = new Date(value);

		if (Number.isNaN(date.getTime())) {
			return value;
		}

		return date.toLocaleDateString("en-IN", {
			day: "2-digit",
			month: "short",
			year: "numeric"
		});
	}

	function formatDateTime(value: string | null | undefined): string {
		if (!value) return "-";

		const date = new Date(value);

		if (Number.isNaN(date.getTime())) {
			return value;
		}

		return date.toLocaleString("en-IN", {
			day: "2-digit",
			month: "short",
			year: "numeric",
			hour: "2-digit",
			minute: "2-digit"
		});
	}

	function normalizeFields(value: unknown): TemplateField[] {
		if (!Array.isArray(value)) {
			return [];
		}

		return value
			.map((field) => {
				if (typeof field === "string") {
					return {
						label: field,
						type: "Text"
					};
				}

				if (field && typeof field === "object") {
					const item = field as Record<string, unknown>;

					return {
						label: String(
							item.label ??
								item.name ??
								item.field_name ??
								item.key ??
								"Unnamed Field"
						),
						type: String(
							item.type ??
								item.field_type ??
								item.data_type ??
								"Text"
						),
						required:
							typeof item.required === "boolean"
								? item.required
								: undefined,
						key:
							item.key !== undefined
								? String(item.key)
								: undefined,
						description:
							item.description !== undefined
								? String(item.description)
								: undefined
					};
				}

				return null;
			})
			.filter((field): field is TemplateField => field !== null);
	}

	function normalizeTemplate(data: Record<string, unknown>): Template {
		return {
			id: String(data.id ?? data.template_id ?? id ?? ""),
			name: String(
				data.name ??
					data.template_name ??
					"Unnamed Template"
			),
			template_code: String(
				data.template_code ??
					data.code ??
					""
			),
			description: String(
				data.description ??
					data.template_description ??
					""
			),
			department: String(data.department ?? ""),
			category: String(data.category ?? ""),
			type: String(
				data.type ??
					data.template_type ??
					""
			),
			status: String(data.status ?? ""),
			version: Number(data.version ?? 1),
			created_by: String(
				data.created_by_name ??
					data.created_by ??
					""
			),
			created_at: String(data.created_at ?? ""),
			updated_at: String(data.updated_at ?? ""),
			last_used: String(
				data.last_used ??
					data.last_used_at ??
					""
			),
			total_usage: Number(
				data.total_usage ??
					data.usage_count ??
					0
			),
			fields: normalizeFields(
				data.fields ??
					data.template_fields ??
					data.form_fields ??
					[]
			),
			ai_enabled: Boolean(
				data.ai_enabled ??
					data.enable_ai ??
					false
			),
			reference_template: String(
				data.reference_template ??
					data.reference_template_id ??
					""
			)
		};
	}

	// ===== LOAD TEMPLATE =====

	async function loadTemplate() {
		if (!id) {
			errorMessage = "Template ID is missing.";
			loading = false;
			return;
		}

		loading = true;
		errorMessage = "";

		try {
			const { data, error } = await supabase
				.from("templates")
				.select("*")
				.eq("id", id)
				.maybeSingle();

			if (error) {
				throw error;
			}

			if (!data) {
				errorMessage = "Template not found.";
				template = {
					id: "",
					name: "",
					template_code: "",
					description: "",
					department: "",
					category: "",
					type: "",
					status: "",
					version: 1,
					created_by: "",
					created_at: "",
					updated_at: "",
					last_used: "",
					total_usage: 0,
					fields: [],
					ai_enabled: false,
					reference_template: ""
				};
				return;
			}

			template = normalizeTemplate(
				data as Record<string, unknown>
			);
		} catch (err) {
			console.error("Failed to load template:", err);

			errorMessage =
				err instanceof Error
					? err.message
					: "Failed to load template.";

			toast.error(errorMessage);
		} finally {
			loading = false;
		}
	}

	// ===== NAVIGATION =====

	function openPreview() {
		if (!id) return;

		goto(`/templates/${id}/preview`);
	}

	function openEdit() {
		if (!id) return;

		goto(`/templates/${id}/edit`);
	}

	function openVersions() {
		if (!id) return;

		goto(`/templates/${id}/versions`);
	}

	function goBack() {
		goto("/templates");
	}

	onMount(loadTemplate);
</script>

<svelte:head>
	<title>
		{template.name
			? `${template.name} - Template Details`
			: "Template Details"}
	</title>

	<meta
		name="description"
		content="View template configuration, fields, usage and AI settings."
	/>
</svelte:head>

{#if loading}
	<div class="page">
		<div class="loading-card">
			<div class="spinner"></div>
			<h2>Loading Template...</h2>
			<p>Please wait while the template details are loaded.</p>
		</div>
	</div>
{:else if errorMessage}
	<div class="page">
		<div class="error-card">
			<div class="error-icon">⚠️</div>

			<h2>Unable to Load Template</h2>

			<p>{errorMessage}</p>

			<div class="error-actions">
				<button class="secondary-button" onclick={goBack}>
					← Back to Templates
				</button>

				<button class="primary-button" onclick={loadTemplate}>
					Retry
				</button>
			</div>
		</div>
	</div>
{:else}
	<div class="page">
		<!-- HEADER -->
		<div class="header">
			<div class="header-left">
				<button
					class="back-button"
					type="button"
					onclick={goBack}
					aria-label="Back to templates"
				>
					←
				</button>

				<div>
					<div class="eyebrow">Template Management</div>

					<h1>{template.name}</h1>

					{#if template.description}
						<p>{template.description}</p>
					{:else}
						<p>No description provided.</p>
					{/if}
				</div>
			</div>

			<div class="actions">
				<button
					class="preview"
					type="button"
					onclick={openPreview}
				>
					👁 Preview
				</button>

				<button
					class="edit"
					type="button"
					onclick={openEdit}
				>
					✏️ Edit
				</button>

				<button
					class="version"
					type="button"
					onclick={openVersions}
				>
					🕒 Versions
				</button>
			</div>
		</div>

		<!-- STATUS -->
		<div class="status-bar">
			<div class="status-left">
				<span
					class="status-badge"
					class:published={template.status.toLowerCase() === "published"}
					class:draft={template.status.toLowerCase() === "draft"}
					class:archived={template.status.toLowerCase() === "archived"}
				>
					{template.status || "Unknown"}
				</span>

				{#if template.template_code}
					<span class="template-code">
						{template.template_code}
					</span>
				{/if}
			</div>

			<div class="updated-info">
				Last updated:
				<strong>{formatDateTime(template.updated_at)}</strong>
			</div>
		</div>

		<!-- STATS -->
		<div class="stats">
			<div class="stat-card">
				<div class="stat-icon purple">V</div>

				<div>
					<h3>Version</h3>
					<p>{template.version}</p>
				</div>
			</div>

			<div class="stat-card">
				<div class="stat-icon blue">✓</div>

				<div>
					<h3>Status</h3>
					<p>{template.status || "-"}</p>
				</div>
			</div>

			<div class="stat-card">
				<div class="stat-icon green">↗</div>

				<div>
					<h3>Total Usage</h3>
					<p>{template.total_usage.toLocaleString()}</p>
				</div>
			</div>

			<div class="stat-card">
				<div class="stat-icon orange">◷</div>

				<div>
					<h3>Last Used</h3>
					<p>
						{template.last_used
							? formatDateTime(template.last_used)
							: "Not available"}
					</p>
				</div>
			</div>
		</div>

		<!-- MAIN GRID -->
		<div class="grid">
			<!-- GENERAL INFORMATION -->
			<div class="card">
				<div class="card-header">
					<div>
						<div class="section-icon">📋</div>

						<div>
							<h2>General Information</h2>
							<p>Template configuration and ownership</p>
						</div>
					</div>
				</div>

				<div class="information-list">
					<div class="information-row">
						<span>Template Code</span>

						<strong>
							{template.template_code || "-"}
						</strong>
					</div>

					<div class="information-row">
						<span>Department</span>

						<strong>
							{template.department || "-"}
						</strong>
					</div>

					<div class="information-row">
						<span>Category</span>

						<strong>
							{template.category || "-"}
						</strong>
					</div>

					<div class="information-row">
						<span>Type</span>

						<strong>
							{template.type || "-"}
						</strong>
					</div>

					<div class="information-row">
						<span>Created By</span>

						<strong>
							{template.created_by || "-"}
						</strong>
					</div>

					<div class="information-row">
						<span>Created</span>

						<strong>
							{formatDate(template.created_at)}
						</strong>
					</div>

					<div class="information-row">
						<span>Updated</span>

						<strong>
							{formatDate(template.updated_at)}
						</strong>
					</div>

					<div class="information-row">
						<span>Reference Template</span>

						<strong>
							{template.reference_template || "-"}
						</strong>
					</div>
				</div>
			</div>

			<!-- TEMPLATE FIELDS -->
			<div class="card">
				<div class="card-header">
					<div>
						<div class="section-icon">🧩</div>

						<div>
							<h2>Template Fields</h2>

							<p>
								{template.fields.length}
								{template.fields.length === 1
									? "field"
									: "fields"} configured
							</p>
						</div>
					</div>
				</div>

				{#if template.fields.length === 0}
					<div class="empty-state">
						<div>📭</div>

						<strong>No fields configured</strong>

						<span>
							This template does not contain any configured
							fields.
						</span>
					</div>
				{:else}
					<div class="fields-table-wrapper">
						<table class="fields-table">
							<thead>
								<tr>
									<th>Field</th>
									<th>Type</th>
									<th>Required</th>
								</tr>
							</thead>

							<tbody>
								{#each template.fields as field}
									<tr>
										<td>
											<div class="field-name">
												<strong>
													{field.label}
												</strong>

												{#if field.description}
													<small>
														{field.description}
													</small>
												{/if}
											</div>
										</td>

										<td>
											<span class="field-type">
												{field.type}
											</span>
										</td>

										<td>
											{#if field.required === true}
												<span class="required">
													Required
												</span>
											{:else}
												<span class="optional">
													Optional
												</span>
											{/if}
										</td>
									</tr>
								{/each}
							</tbody>
						</table>
					</div>
				{/if}
			</div>

			<!-- AI CONFIGURATION -->
			<div class="card ai-card">
				<div class="card-header">
					<div>
						<div class="section-icon ai">🤖</div>

						<div>
							<h2>AI Configuration</h2>
							<p>Intelligent template capabilities</p>
						</div>
					</div>

					<span
						class="ai-status"
						class:enabled={template.ai_enabled}
					>
						{template.ai_enabled ? "Enabled" : "Disabled"}
					</span>
				</div>

				<div class="ai-main">
					<div class="ai-state">
						<div class="ai-state-icon">
							{template.ai_enabled ? "✨" : "○"}
						</div>

						<div>
							<strong>
								AI Features
							</strong>

							<p>
								{template.ai_enabled
									? "AI capabilities are enabled for this template."
									: "AI capabilities are currently disabled."}
							</p>
						</div>
					</div>
				</div>

				<div class="ai-features">
					<div
						class="ai-feature"
						class:active={template.ai_enabled}
					>
						<span>✓</span>
						<div>
							<strong>AI Summary</strong>
							<small>
								Generate intelligent report summaries
							</small>
						</div>
					</div>

					<div
						class="ai-feature"
						class:active={template.ai_enabled}
					>
						<span>✓</span>
						<div>
							<strong>AI Recommendation</strong>
							<small>
								Provide operational recommendations
							</small>
						</div>
					</div>

					<div
						class="ai-feature"
						class:active={template.ai_enabled}
					>
						<span>✓</span>
						<div>
							<strong>AI Validation</strong>
							<small>
								Identify abnormal or invalid entries
							</small>
						</div>
					</div>

					<div
						class="ai-feature"
						class:active={template.ai_enabled}
					>
						<span>✓</span>
						<div>
							<strong>AI Auto Fill</strong>
							<small>
								Assist users with intelligent data entry
							</small>
						</div>
					</div>
				</div>
			</div>

			<!-- TEMPLATE OVERVIEW -->
			<div class="card overview-card">
				<div class="card-header">
					<div>
						<div class="section-icon">📊</div>

						<div>
							<h2>Template Overview</h2>
							<p>Current template usage information</p>
						</div>
					</div>
				</div>

				<div class="overview-grid">
					<div class="overview-item">
						<span>Department</span>

						<strong>
							{template.department || "-"}
						</strong>
					</div>

					<div class="overview-item">
						<span>Category</span>

						<strong>
							{template.category || "-"}
						</strong>
					</div>

					<div class="overview-item">
						<span>Template Type</span>

						<strong>
							{template.type || "-"}
						</strong>
					</div>

					<div class="overview-item">
						<span>Field Count</span>

						<strong>
							{template.fields.length}
						</strong>
					</div>
				</div>
			</div>
		</div>

		<!-- FOOTER ACTIONS -->
		<div class="bottom-actions">
			<button
				class="secondary-button"
				type="button"
				onclick={goBack}
			>
				← Back to Templates
			</button>

			<div>
				<button
					class="preview"
					type="button"
					onclick={openPreview}
				>
					👁 Preview Template
				</button>

				<button
					class="edit"
					type="button"
					onclick={openEdit}
				>
					✏️ Edit Template
				</button>
			</div>
		</div>

		<footer class="template-footer">
			<span>Temple Operations Reporting System</span>
			<span>Template Management</span>
		</footer>
	</div>
{/if}

<style>
	:global(body) {
		margin: 0;
		background: #f1f5f9;
		font-family:
			Inter,
			ui-sans-serif,
			system-ui,
			-apple-system,
			BlinkMacSystemFont,
			"Segoe UI",
			sans-serif;
		color: #0f172a;
	}

	:global(*) {
		box-sizing: border-box;
	}

	.page {
		width: 100%;
		max-width: 1400px;
		margin: 0 auto;
		padding: 24px;
		display: flex;
		flex-direction: column;
		gap: 22px;
	}

	/* HEADER */

	.header {
		display: flex;
		justify-content: space-between;
		align-items: flex-start;
		gap: 20px;
		flex-wrap: wrap;
	}

	.header-left {
		display: flex;
		align-items: flex-start;
		gap: 16px;
		min-width: 0;
	}

	.back-button {
		width: 42px;
		height: 42px;
		border: 1px solid #dbe3ed;
		background: white;
		color: #334155;
		border-radius: 10px;
		cursor: pointer;
		font-size: 20px;
		flex-shrink: 0;
	}

	.back-button:hover {
		background: #f8fafc;
	}

	.eyebrow {
		color: #2563eb;
		font-size: 12px;
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 0.08em;
		margin-bottom: 6px;
	}

	.header h1 {
		margin: 0;
		font-size: clamp(24px, 4vw, 34px);
		line-height: 1.15;
		color: #0f172a;
	}

	.header p {
		margin: 8px 0 0;
		color: #64748b;
		font-size: 14px;
	}

	.actions {
		display: flex;
		gap: 10px;
		flex-wrap: wrap;
	}

	button {
		font-family: inherit;
	}

	.actions button,
	.bottom-actions button {
		border: none;
		padding: 10px 16px;
		border-radius: 9px;
		cursor: pointer;
		color: white;
		font-weight: 600;
		transition:
			transform 0.15s ease,
			opacity 0.15s ease;
	}

	.actions button:hover,
	.bottom-actions button:hover {
		transform: translateY(-1px);
	}

	.preview {
		background: #16a34a;
	}

	.edit {
		background: #2563eb;
	}

	.version {
		background: #7c3aed;
	}

	/* STATUS BAR */

	.status-bar {
		background: white;
		border: 1px solid #e2e8f0;
		border-radius: 12px;
		padding: 14px 18px;
		display: flex;
		justify-content: space-between;
		align-items: center;
		gap: 14px;
		flex-wrap: wrap;
	}

	.status-left {
		display: flex;
		align-items: center;
		gap: 10px;
		flex-wrap: wrap;
	}

	.status-badge {
		padding: 6px 12px;
		border-radius: 999px;
		background: #e2e8f0;
		color: #475569;
		font-size: 12px;
		font-weight: 700;
	}

	.status-badge.published {
		background: #dcfce7;
		color: #166534;
	}

	.status-badge.draft {
		background: #fef3c7;
		color: #92400e;
	}

	.status-badge.archived {
		background: #fee2e2;
		color: #991b1b;
	}

	.template-code {
		padding: 6px 10px;
		border-radius: 7px;
		background: #eff6ff;
		color: #1d4ed8;
		font-size: 12px;
		font-weight: 700;
		font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
	}

	.updated-info {
		color: #64748b;
		font-size: 12px;
	}

	.updated-info strong {
		color: #334155;
	}

	/* STATS */

	.stats {
		display: grid;
		grid-template-columns: repeat(4, minmax(0, 1fr));
		gap: 16px;
	}

	.stat-card {
		background: white;
		border: 1px solid #e2e8f0;
		border-radius: 12px;
		padding: 18px;
		display: flex;
		align-items: center;
		gap: 14px;
		box-shadow: 0 2px 8px rgba(15, 23, 42, 0.04);
	}

	.stat-icon {
		width: 44px;
		height: 44px;
		display: grid;
		place-items: center;
		border-radius: 11px;
		font-weight: 800;
		flex-shrink: 0;
	}

	.stat-icon.purple {
		background: #ede9fe;
		color: #7c3aed;
	}

	.stat-icon.blue {
		background: #dbeafe;
		color: #2563eb;
	}

	.stat-icon.green {
		background: #dcfce7;
		color: #16a34a;
	}

	.stat-icon.orange {
		background: #ffedd5;
		color: #ea580c;
	}

	.stat-card h3 {
		margin: 0 0 5px;
		font-size: 12px;
		font-weight: 600;
		color: #64748b;
	}

	.stat-card p {
		margin: 0;
		font-size: 20px;
		font-weight: 800;
		color: #0f172a;
	}

	/* GRID */

	.grid {
		display: grid;
		grid-template-columns: repeat(2, minmax(0, 1fr));
		gap: 20px;
	}

	.card {
		background: white;
		border: 1px solid #e2e8f0;
		border-radius: 14px;
		padding: 22px;
		box-shadow: 0 2px 10px rgba(15, 23, 42, 0.05);
		min-width: 0;
	}

	.card-header {
		display: flex;
		justify-content: space-between;
		align-items: flex-start;
		gap: 14px;
		margin-bottom: 20px;
	}

	.card-header > div:first-child {
		display: flex;
		align-items: flex-start;
		gap: 12px;
	}

	.section-icon {
		width: 38px;
		height: 38px;
		display: grid;
		place-items: center;
		background: #eff6ff;
		border-radius: 9px;
		flex-shrink: 0;
	}

	.section-icon.ai {
		background: #f3e8ff;
	}

	.card h2 {
		margin: 0;
		font-size: 18px;
		color: #0f172a;
	}

	.card-header p {
		margin: 4px 0 0;
		color: #64748b;
		font-size: 12px;
	}

	/* INFORMATION */

	.information-list {
		border-top: 1px solid #e2e8f0;
	}

	.information-row {
		display: flex;
		justify-content: space-between;
		align-items: center;
		gap: 16px;
		padding: 13px 0;
		border-bottom: 1px solid #e2e8f0;
	}

	.information-row span {
		color: #64748b;
		font-size: 13px;
	}

	.information-row strong {
		color: #1e293b;
		font-size: 13px;
		text-align: right;
		word-break: break-word;
	}

	/* FIELDS */

	.fields-table-wrapper {
		width: 100%;
		overflow-x: auto;
	}

	.fields-table {
		width: 100%;
		border-collapse: collapse;
		min-width: 480px;
	}

	.fields-table th {
		background: #f8fafc;
		color: #64748b;
		font-size: 11px;
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 0.04em;
		padding: 11px;
		text-align: left;
	}

	.fields-table td {
		padding: 12px 11px;
		border-bottom: 1px solid #e2e8f0;
		vertical-align: top;
	}

	.field-name {
		display: flex;
		flex-direction: column;
		gap: 3px;
	}

	.field-name strong {
		font-size: 13px;
		color: #1e293b;
	}

	.field-name small {
		color: #94a3b8;
		font-size: 11px;
	}

	.field-type {
		display: inline-flex;
		padding: 4px 8px;
		border-radius: 6px;
		background: #f1f5f9;
		color: #475569;
		font-size: 11px;
		font-weight: 600;
	}

	.required,
	.optional {
		font-size: 11px;
		font-weight: 700;
	}

	.required {
		color: #dc2626;
	}

	.optional {
		color: #64748b;
	}

	/* EMPTY */

	.empty-state {
		padding: 35px 20px;
		background: #f8fafc;
		border-radius: 10px;
		display: flex;
		flex-direction: column;
		align-items: center;
		text-align: center;
		gap: 7px;
		color: #64748b;
	}

	.empty-state div {
		font-size: 30px;
		margin-bottom: 5px;
	}

	.empty-state strong {
		color: #334155;
	}

	.empty-state span {
		font-size: 12px;
	}

	/* AI */

	.ai-status {
		padding: 6px 10px;
		border-radius: 999px;
		background: #f1f5f9;
		color: #64748b;
		font-size: 11px;
		font-weight: 700;
	}

	.ai-status.enabled {
		background: #dcfce7;
		color: #166534;
	}

	.ai-main {
		background: #faf5ff;
		border: 1px solid #e9d5ff;
		border-radius: 10px;
		padding: 15px;
	}

	.ai-state {
		display: flex;
		align-items: center;
		gap: 12px;
	}

	.ai-state-icon {
		width: 38px;
		height: 38px;
		display: grid;
		place-items: center;
		background: white;
		border-radius: 9px;
		font-size: 18px;
	}

	.ai-state strong {
		font-size: 14px;
	}

	.ai-state p {
		margin: 3px 0 0;
		color: #64748b;
		font-size: 12px;
	}

	.ai-features {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 10px;
		margin-top: 14px;
	}

	.ai-feature {
		display: flex;
		align-items: flex-start;
		gap: 10px;
		padding: 12px;
		background: #f8fafc;
		border: 1px solid #e2e8f0;
		border-radius: 9px;
		opacity: 0.65;
	}

	.ai-feature.active {
		opacity: 1;
		background: #f8fafc;
	}

	.ai-feature > span {
		width: 23px;
		height: 23px;
		display: grid;
		place-items: center;
		border-radius: 50%;
		background: #e2e8f0;
		color: #64748b;
		font-size: 11px;
		font-weight: 800;
		flex-shrink: 0;
	}

	.ai-feature.active > span {
		background: #dcfce7;
		color: #16a34a;
	}

	.ai-feature strong {
		display: block;
		font-size: 12px;
		color: #334155;
	}

	.ai-feature small {
		display: block;
		margin-top: 3px;
		color: #94a3b8;
		font-size: 10px;
		line-height: 1.4;
	}

	/* OVERVIEW */

	.overview-card {
		grid-column: 1 / -1;
	}

	.overview-grid {
		display: grid;
		grid-template-columns: repeat(4, 1fr);
		gap: 14px;
	}

	.overview-item {
		padding: 16px;
		background: #f8fafc;
		border-radius: 10px;
	}

	.overview-item span {
		display: block;
		color: #64748b;
		font-size: 11px;
		margin-bottom: 6px;
	}

	.overview-item strong {
		font-size: 15px;
		color: #0f172a;
		word-break: break-word;
	}

	/* BOTTOM */

	.bottom-actions {
		display: flex;
		justify-content: space-between;
		align-items: center;
		gap: 15px;
		flex-wrap: wrap;
	}

	.bottom-actions > div {
		display: flex;
		gap: 10px;
		flex-wrap: wrap;
	}

	.secondary-button {
		background: white;
		color: #334155;
		border: 1px solid #cbd5e1;
		padding: 10px 16px;
		border-radius: 9px;
		cursor: pointer;
		font-weight: 600;
	}

	.template-footer {
		display: flex;
		justify-content: space-between;
		gap: 15px;
		padding: 20px 0 5px;
		border-top: 1px solid #dbe3ed;
		color: #64748b;
		font-size: 12px;
	}

	/* LOADING */

	.loading-card {
		min-height: 400px;
		display: flex;
		flex-direction: column;
		justify-content: center;
		align-items: center;
		text-align: center;
		background: white;
		border: 1px solid #e2e8f0;
		border-radius: 14px;
		padding: 40px;
	}

	.loading-card h2 {
		margin: 18px 0 6px;
		font-size: 20px;
	}

	.loading-card p {
		margin: 0;
		color: #64748b;
		font-size: 13px;
	}

	.spinner {
		width: 42px;
		height: 42px;
		border: 4px solid #dbeafe;
		border-top-color: #2563eb;
		border-radius: 50%;
		animation: spin 0.8s linear infinite;
	}

	@keyframes spin {
		to {
			transform: rotate(360deg);
		}
	}

	/* ERROR */

	.error-card {
		min-height: 400px;
		display: flex;
		flex-direction: column;
		justify-content: center;
		align-items: center;
		text-align: center;
		background: white;
		border: 1px solid #fecaca;
		border-radius: 14px;
		padding: 40px;
	}

	.error-icon {
		font-size: 42px;
		margin-bottom: 10px;
	}

	.error-card h2 {
		margin: 0 0 8px;
	}

	.error-card p {
		max-width: 600px;
		margin: 0;
		color: #64748b;
		font-size: 13px;
	}

	.error-actions {
		display: flex;
		gap: 10px;
		margin-top: 22px;
		flex-wrap: wrap;
		justify-content: center;
	}

	.primary-button {
		background: #2563eb;
		color: white;
		border: none;
		padding: 10px 18px;
		border-radius: 9px;
		cursor: pointer;
		font-weight: 600;
	}

	/* TABLET */

	@media (max-width: 1100px) {
		.stats {
			grid-template-columns: repeat(2, minmax(0, 1fr));
		}

		.overview-grid {
			grid-template-columns: repeat(2, 1fr);
		}
	}

	/* MOBILE */

	@media (max-width: 850px) {
		.page {
			padding: 16px;
			gap: 16px;
		}

		.grid {
			grid-template-columns: 1fr;
		}

		.overview-card {
			grid-column: auto;
		}

		.ai-features {
			grid-template-columns: 1fr;
		}
	}

	@media (max-width: 600px) {
		.page {
			padding: 12px;
		}

		.header {
			flex-direction: column;
		}

		.header-left {
			width: 100%;
		}

		.header-left > div:last-child {
			min-width: 0;
		}

		.header h1 {
			font-size: 23px;
		}

		.actions {
			width: 100%;
		}

		.actions button {
			flex: 1;
			min-width: 0;
			padding: 10px 8px;
			font-size: 12px;
		}

		.stats {
			grid-template-columns: 1fr;
		}

		.stat-card {
			padding: 15px;
		}

		.card {
			padding: 16px;
			border-radius: 12px;
		}

		.information-row {
			align-items: flex-start;
			flex-direction: column;
			gap: 4px;
		}

		.information-row strong {
			text-align: left;
		}

		.overview-grid {
			grid-template-columns: 1fr;
		}

		.bottom-actions {
			flex-direction: column;
			align-items: stretch;
		}

		.bottom-actions > div {
			flex-direction: column;
		}

		.bottom-actions button {
			width: 100%;
		}

		.template-footer {
			flex-direction: column;
			text-align: center;
		}

		.status-bar {
			align-items: flex-start;
			flex-direction: column;
		}
	}
</style>