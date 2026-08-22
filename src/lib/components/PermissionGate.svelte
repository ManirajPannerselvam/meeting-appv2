<script lang="ts">

	import { hasPermission } from "$lib/auth/rbac";

	let {

		role,

		permission,

		children

	} = $props();

</script>

{#if hasPermission(role, permission)}

	{@render children()}

{/if}
<PermissionGate

	role={currentUserRole}

	permission="finance"

>

	<button>

		Add Transaction

	</button>

</PermissionGate>