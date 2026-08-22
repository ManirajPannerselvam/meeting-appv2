
<script lang="ts">
	import {
		authService,
		userService,
		reportService,
		templateService,
		chatService,
		meetingService,
		financeService,
		notificationService
	} from "$lib/services";

	let results: string[] = [];

	function log(message: string) {
		results = [...results, message];
	}

	async function runTests() {
		results = [];

		log("Starting system tests...");

		try {
			await authService.restoreSession();
			log("✓ Authentication");
		} catch (e) {
			log("✗ Authentication");
		}

		try {
			await templateService.loadTemplates();
			log("✓ Templates");
		} catch {
			log("✗ Templates");
		}

		try {
			await reportService.loadReports();
			log("✓ Reports");
		} catch {
			log("✗ Reports");
		}

		try {
			await financeService.loadTransactions();
			log("✓ Finance");
		} catch {
			log("✗ Finance");
		}

		try {
			await chatService.loadRooms();
			log("✓ Chat");
		} catch {
			log("✗ Chat");
		}

		try {
			await meetingService.loadMeetings();
			log("✓ Meetings");
		} catch {
			log("✗ Meetings");
		}

		try {
			await notificationService.loadNotifications();
			log("✓ Notifications");
		} catch {
			log("✗ Notifications");
		}

		try {
			await userService.getUsers();
			log("✓ Users");
		} catch {
			log("✗ Users");
		}

		log("Testing completed.");
	}
</script>

<h1>System Test</h1>

<button on:click={runTests}>
	Run All Tests
</button>

{#each results as result}
	<div>{result}</div>
{/each}