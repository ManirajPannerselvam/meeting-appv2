\# ============================================================

\# Temple Operations Reporting System

\# Document No. : 002

\# File Name    : 02\_folder\_structure.md

\# ============================================================



\## PURPOSE



Define the complete folder structure of the SvelteKit application.



\## DESCRIPTION



Provides a scalable, feature-based architecture for:



\- Dashboard

\- Reporting

\- Chat

\- Meeting Minutes

\- Administration

\- Offline Sync

\- Android (Tauri)



\## PROJECT STRUCTURE



project-root/



\### 1. Configuration



\- package.json

\- tsconfig.json

\- vite.config.ts

\- svelte.config.js

\- tailwind.config.ts

\- drizzle.config.ts (if used)

\- .env

\- .env.example



\### 2. Documentation



\- docs/



\### 3. Static Assets



\- static/



\### 4. Source



\- src/



\### 5. Components



\- src/lib/components/



\### 6. Layouts



\- src/lib/layouts/



\### 7. Routes



\- src/routes/



\### 8. Services



\- src/lib/services/



\### 9. Stores



\- src/lib/stores/



\### 10. Supabase



\- src/lib/supabase/



\### 11. Types



\- src/lib/types/



\### 12. Utilities



\- src/lib/utils/



\### 13. Constants



\- src/lib/constants/



\### 14. Hooks



\- src/hooks.server.ts

\- src/hooks.client.ts



\### 15. Offline



\- src/lib/offline/



\### 16. Compression



\- src/lib/compression/



\### 17. Chat



\- src/lib/chat/



\### 18. Reports



\- src/lib/reports/



\### 19. Meetings



\- src/lib/meetings/



\### 20. Dashboard



\- src/lib/dashboard/



\### 21. Admin



\- src/lib/admin/



\### 22. Notifications



\- src/lib/notifications/



\### 23. Authentication



\- src/lib/auth/



\### 24. PWA



\- src/service-worker.ts



\### 25. Android



\- src-tauri/



\### 26. Testing



\- tests/



\## NOTES



\- Feature-based architecture.

\- Mobile-first.

\- Offline-first.

\- Reusable components.

\- Production-ready.

