<script lang="ts">
	import { supabase } from '$lib/supabase/client';

	type UserRow = {
		employee_id: string;
		name: string;
		email: string;
		mobile: string;
		department: string;
		designation: string;
		role: string;
		shift: string;
		manager: string;
		status: string;
	};

	let input: HTMLInputElement;
	let fileName = '';
	let rows: UserRow[] = [];
	let errors: string[] = [];
	let message = '';
	let importing = false;
	let dragActive = false;

	function csv(text: string): string[][] {
		const out: string[][] = [];
		let row: string[] = [], value = '', quoted = false;

		for (let i = 0; i < text.length; i++) {
			const c = text[i], n = text[i + 1];

			if (c === '"' && quoted && n === '"') {
				value += '"'; i++; continue;
			}
			if (c === '"') { quoted = !quoted; continue; }

			if (c === ',' && !quoted) {
				row.push(value.trim()); value = ''; continue;
			}

			if ((c === '\n' || c === '\r') && !quoted) {
				if (c === '\r' && n === '\n') i++;
				row.push(value.trim()); value = '';
				if (row.some(Boolean)) out.push(row);
				row = [];
				continue;
			}
			value += c;
		}

		row.push(value.trim());
		if (row.some(Boolean)) out.push(row);
		return out;
	}

	function headerName(value: string) {
		return value.trim().toLowerCase().replace(/[\s-]+/g, '_');
	}

	async function readFile(file: File) {
		clearMessages();
		if (!file.name.toLowerCase().endsWith('.csv')) {
			errors = ['Please select a CSV file.'];
			return;
		}

		fileName = file.name;

		try {
			const data = csv(await file.text());
			if (data.length < 2) {
				errors = ['CSV must contain headers and at least one data row.'];
				rows = [];
				return;
			}

			const headers = data[0].map(headerName);
			const required = ['employee_id', 'name', 'email'];
			const missing = required.filter((h) => !headers.includes(h));

			if (missing.length) {
				errors = [`Missing required columns: ${missing.join(', ')}`];
				rows = [];
				return;
			}

			rows = data.slice(1).map((values) => {
				const record: Record<string, string> = {};
				headers.forEach((h, i) => (record[h] = values[i]?.trim() ?? ''));

				return {
					employee_id: record.employee_id,
					name: record.name,
					email: record.email,
					mobile: record.mobile ?? '',
					department: record.department ?? '',
					designation: record.designation ?? '',
					role: record.role || 'Employee',
					shift: record.shift ?? '',
					manager: record.manager ?? '',
					status: record.status || 'Active'
				};
			}).filter((row) => row.employee_id && row.name && row.email);

			message = `${rows.length} valid users ready to import.`;
		} catch (error) {
			console.error('[Users Import] Read failed:', error);
			errors = ['Unable to read this CSV file.'];
			rows = [];
		}
	}

	function clearMessages() {
		errors = [];
		message = '';
	}

	function clearImport() {
		fileName = '';
		rows = [];
		clearMessages();
		if (input) input.value = '';
	}

	async function importUsers() {
		if (!rows.length || importing) return;

		importing = true;
		clearMessages();

		try {
			const { error } = await supabase
				.from('users')
				.upsert(rows, { onConflict: 'employee_id' });

			if (error) throw error;

			message = `${rows.length} users imported successfully.`;
			window.dispatchEvent(new CustomEvent('users:updated'));
		} catch (error: any) {
			console.error('[Users Import] Import failed:', error);
			errors = [error?.message ?? 'User import failed.'];
		} finally {
			importing = false;
		}
	}

	function downloadTemplate() {
		const text =
			'employee_id,name,email,mobile,department,designation,role,shift,manager,status\n' +
			'EMP001,John Doe,john@example.com,+919876543210,Production,Production Engineer,Engineer,Shift A,Production Manager,Active\n';

		const url = URL.createObjectURL(new Blob([text], { type: 'text/csv' }));
		const a = document.createElement('a');
		a.href = url;
		a.download = 'users-import-template.csv';
		a.click();
		URL.revokeObjectURL(url);
	}

	function drop(event: DragEvent) {
		event.preventDefault();
		dragActive = false;
		const file = event.dataTransfer?.files?.[0];
		if (file) void readFile(file);
	}
</script>

<svelte:head>
	<title>Import Users</title>
</svelte:head>

<div class="page">
	<header>
		<div>
			<span class="eyebrow">User Management</span>
			<h1>Import Users</h1>
			<p>Bulk-create or update employees from a CSV file.</p>
		</div>

		<button class="template" type="button" onclick={downloadTemplate}>
			⬇ CSV Template
		</button>
	</header>

	<section class="card">
		<div
			class="drop-zone"
			class:active={dragActive}
			role="button"
			tabindex="0"
			ondragover={(e) => { e.preventDefault(); dragActive = true; }}
			ondragleave={() => (dragActive = false)}
			ondrop={drop}
			onclick={() => input?.click()}
			onkeydown={(e) => {
				if (e.key === 'Enter' || e.key === ' ') input?.click();
			}}
		>
			<div class="icon">📥</div>
			<h2>Upload CSV</h2>
			<p>Drag and drop here or click to browse.</p>
			<small>Required: employee_id, name, email</small>
			<input bind:this={input} type="file" accept=".csv,text/csv"
				class="hidden" onchange={(e) => {
					const file = (e.currentTarget as HTMLInputElement).files?.[0];
					if (file) void readFile(file);
				}} />
		</div>

		{#if fileName}
			<div class="file">
				<span>📄 {fileName}</span>
				<button type="button" onclick={clearImport}>Clear</button>
			</div>
		{/if}
	</section>

	{#if errors.length}
		<section class="alert error">
			<strong>Import error</strong>
			<ul>{#each errors as error}<li>{error}</li>{/each}</ul>
		</section>
	{/if}

	{#if message}
		<section class="alert success">✓ {message}</section>
	{/if}

	{#if rows.length}
		<section class="card">
			<div class="section-head">
				<div>
					<h2>Import Preview</h2>
					<p>{rows.length} valid records.</p>
				</div>

				<div class="actions">
					<button class="secondary" type="button" onclick={clearImport}>Clear</button>
					<button class="primary" type="button" disabled={importing} onclick={importUsers}>
						{importing ? 'Importing...' : `Import ${rows.length} Users`}
					</button>
				</div>
			</div>

			<div class="table-wrap">
				<table>
					<thead>
						<tr>
							<th>Employee ID</th><th>Name</th><th>Email</th>
							<th>Department</th><th>Designation</th><th>Role</th>
							<th>Shift</th><th>Status</th>
						</tr>
					</thead>
					<tbody>
						{#each rows as row}
							<tr>
								<td>{row.employee_id}</td><td>{row.name}</td><td>{row.email}</td>
								<td>{row.department || '—'}</td>
								<td>{row.designation || '—'}</td>
								<td>{row.role}</td><td>{row.shift || '—'}</td>
								<td><span class:inactive={row.status.toLowerCase() !== 'active'} class="status">{row.status}</span></td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		</section>
	{/if}
</div>

<style>
	.page { max-width:1500px; margin:auto; display:flex; flex-direction:column; gap:20px; }
	header { display:flex; justify-content:space-between; align-items:end; gap:16px; flex-wrap:wrap; }
	.eyebrow { color:#2563eb; font-size:13px; font-weight:700; text-transform:uppercase; letter-spacing:.08em; }
	h1 { margin:4px 0; color:#0f172a; font-size:clamp(1.7rem,4vw,2.25rem); }
	h2 { margin:0 0 6px; color:#0f172a; }
	p { margin:0; color:#64748b; }
	button { font:inherit; cursor:pointer; border:0; border-radius:9px; padding:10px 14px; font-weight:600; }
	button:disabled { opacity:.6; cursor:not-allowed; }
	.template { background:#0f172a; color:white; }
	.card { background:white; border:1px solid #e2e8f0; border-radius:16px; padding:20px; box-shadow:0 4px 14px rgba(15,23,42,.06); }
	.drop-zone { min-height:250px; border:2px dashed #cbd5e1; border-radius:14px; display:flex; flex-direction:column; align-items:center; justify-content:center; text-align:center; padding:20px; cursor:pointer; }
	.drop-zone.active,.drop-zone:hover,.drop-zone:focus-visible { border-color:#2563eb; background:#eff6ff; outline:none; }
	.icon { font-size:42px; }
	.drop-zone p { margin:5px 0 8px; }
	small { color:#94a3b8; }
	.hidden { display:none; }
	.file { display:flex; justify-content:space-between; margin-top:14px; padding:12px; background:#f8fafc; border-radius:9px; }
	.file button,.secondary { background:#e2e8f0; color:#334155; }
	.alert { padding:14px 16px; border-radius:12px; }
	.error { background:#fef2f2; border:1px solid #fecaca; color:#991b1b; }
	.error ul { margin:6px 0 0; }
	.success { background:#f0fdf4; border:1px solid #bbf7d0; color:#166534; }
	.section-head { display:flex; justify-content:space-between; align-items:center; gap:16px; margin-bottom:16px; }
	.actions { display:flex; gap:8px; }
	.primary { background:#2563eb; color:white; }
	.table-wrap { overflow:auto; border:1px solid #e2e8f0; border-radius:10px; }
	table { width:100%; min-width:900px; border-collapse:collapse; }
	th,td { padding:12px 14px; text-align:left; border-bottom:1px solid #e2e8f0; white-space:nowrap; }
	th { background:#f8fafc; color:#475569; font-size:12px; }
	td { color:#334155; font-size:14px; }
	.status { padding:4px 9px; border-radius:999px; background:#dcfce7; color:#166534; font-size:12px; font-weight:700; }
	.status.inactive { background:#f1f5f9; color:#64748b; }
	@media(max-width:700px) {
		.page { gap:14px; }
		.card { padding:14px; border-radius:12px; }
		header,.section-head { align-items:stretch; flex-direction:column; }
		.template,.actions button { width:100%; }
		.actions { width:100%; }
		.actions button { flex:1; }
	}
</style>
