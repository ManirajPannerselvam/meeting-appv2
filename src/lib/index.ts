/**
 * ============================================================
 * Temple Operations Reporting System
 * File        : src/lib/index.ts
 * ============================================================
 * PURPOSE
 *   Central export file / Barrel.
 *
 * DESCRIPTION
 *   Provides a single import location for:
 *     - Services
 *     - Stores  
 *     - Offline Engine
 * ============================================================
 */

/* ===========================
 * Services
 * =========================== */

export { authService } from "./services/auth.service";
export { userService } from "./services/user.service";
export { reportService } from "./services/report.service";
export { templateService } from "./services/template.service";
export { chatService } from "./services/chat.service";
export { meetingService } from "./services/meeting.service";
export { financeService } from "./services/finance.service";
export { notificationService } from "./services/notification.service";

/* ===========================
 * Stores
 * =========================== */

export { authStore } from "./stores/auth";
export { userStore } from "./stores/user"; // FIXED: was usersStore
export { reportsStore } from "./stores/reports";
export { chatStore } from "./stores/chat";
export { financeStore } from "./stores/finance";
export { notificationStore } from "./stores/notification";

/* ===========================
 * Derived Stores - optional but useful
 * =========================== */
export * from "./stores/reports"; // for filteredReports, reportCount, templateCount
export * from "./stores/chat"; // for roomCount, messageCount, activeTypingUsers
export * from "./stores/finance"; // for incomeTransactions, expenseTransactions, currentBalance
export * from "./stores/notification"; // for unreadNotifications, readNotifications

/* ===========================
 * Offline Engine
 * =========================== */

export * from "./offline/indexeddb";
export * from "./offline/queue";
export * from "./offline/sync";

/* ===========================
 * Types - optional re-export
 * =========================== */
export type { ChatState } from "./stores/chat";
export type { FinanceState, FinanceSummary } from "./stores/finance";
export type { ReportsState } from "./stores/reports";
export type { NotificationState } from "./stores/notification";