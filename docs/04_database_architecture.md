\# ============================================================

\# Temple Operations Reporting System

\# Document No. : 004

\# File Name    : 04\_database\_architecture.md

\# ============================================================



\## PURPOSE



Define the complete database architecture for the Temple

Operations Reporting System.



\## DESCRIPTION



The application uses two independent Supabase PostgreSQL

databases.



Database 1

\- Template Database



Database 2

\- Chat Database



Both databases use:



\- Supabase Auth

\- JWT Authentication

\- Row Level Security (RLS)

\- PostgreSQL

\- JSONB

\- Realtime

\- RPC Functions



\------------------------------------------------------------

DATABASE 1

Template Database

\------------------------------------------------------------



\### Purpose



Stores reporting data.



\### Tables



1\. templates



2\. daily\_reports



\### Supporting Objects



\- Indexes

\- RLS Policies

\- Triggers

\- RPC Functions

\- Views

\- Audit Logs

\- Seed Data



\### Primary Key



(report\_date,

&#x20;shift,

&#x20;template\_id,

&#x20;user\_id)



\### Storage Strategy



\- JSONB

\- Short Keys

\- GZIP Compression

\- TOAST Storage



\### Performance Target



Write < 30 ms



Read < 50 ms



100 Concurrent Users



\------------------------------------------------------------

DATABASE 2

Chat Database

\------------------------------------------------------------



\### Purpose



Stores messaging data.



\### Tables



1\. chat\_rooms



2\. chat\_messages



3\. chat\_attachments



4\. chat\_reactions



5\. chat\_read\_receipts



6\. chat\_presence



\### Supporting Objects



\- Indexes

\- RLS Policies

\- Triggers

\- RPC Functions

\- Views

\- Seed Data



\### Features



\- Direct Chat



\- Group Chat



\- Temple Chat



\- Attachments



\- Emoji Reactions



\- Read Receipts



\- Presence



\- Realtime



\------------------------------------------------------------

AUTHENTICATION

\------------------------------------------------------------



\- Email OTP



\- JWT



\- Supabase Auth



\- auth.uid()



\------------------------------------------------------------

SECURITY

\------------------------------------------------------------



\- Row Level Security



\- Least Privilege



\- Service Role



\- Audit Trail



\- Input Validation



\------------------------------------------------------------

PERFORMANCE

\------------------------------------------------------------



\- Composite Indexes



\- JSONB Indexes



\- GIN Indexes



\- RPC Functions



\- Compression



\- IndexedDB Cache



\------------------------------------------------------------

OFFLINE

\------------------------------------------------------------



\- IndexedDB



\- Queue



\- Background Sync



\- Conflict Resolution



\------------------------------------------------------------

SCALABILITY

\------------------------------------------------------------



Supports



\- 100 Temples



\- 255+ Users



\- 100 Stations



\- Unlimited Templates



\- Unlimited Report Fields



\- Millions of Reports



\------------------------------------------------------------

GOALS

\------------------------------------------------------------



✔ Mobile First



✔ Offline First



✔ Schema-less Reporting



✔ Production Ready



✔ Secure



✔ Fast



✔ Maintainable



✔ Future Proof



