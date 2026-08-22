<script lang="ts">
	/**
	 * ============================================================
	 * Temple Operations Reporting System
	 * File        : src/lib/components/layout/Footer.svelte
	 * Author      : Your Name
	 * Created     : YYYY-MM-DD
	 * ============================================================
	 * PURPOSE
	 *   Reusable application footer.
	 *
	 * FEATURES
	 *   - Copyright
	 *   - Version
	 *   - Build information
	 *   - Custom slots
	 * ============================================================
	 */

	export let application = 'Temple Operations Reporting System';

	export let version = '1.0.0';

	export let build = '';

	export let year = new Date().getFullYear();
</script>

<footer class="footer">

	<div class="left">

		<p>
			© {year} {application}
		</p>

	</div>

	<div class="center">

		<slot />

	</div>

	<div class="right">

		<span class="version">
			v{version}
		</span>

		{#if build}
			<span class="build">
				Build {build}
			</span>
		{/if}

	</div>

</footer>

<style>
	.footer {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 16px;
		padding: 14px 20px;
		background: white;
		border-top: 1px solid #e5e7eb;
		font-size: .9rem;
		color: #6b7280;
	}

	.left,
	.center,
	.right {
		display: flex;
		align-items: center;
		gap: 12px;
	}

	.left p {
		margin: 0;
	}

	.version,
	.build {
		font-weight: 500;
	}

	@media (max-width: 768px) {
		.footer {
			flex-direction: column;
			text-align: center;
		}

		.left,
		.center,
		.right {
			justify-content: center;
			flex-wrap: wrap;
		}
	}
</style>