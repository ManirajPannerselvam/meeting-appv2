\# ============================================================

\# Temple Operations Reporting System

\# Document No. : 005

\# File Name    : 05\_authentication.md

\# ============================================================



\## PURPOSE



Define the authentication and authorization architecture

for the Temple Operations Reporting System.



\## DESCRIPTION



Authentication is handled entirely by Supabase Auth.



Authorization is enforced using PostgreSQL Row Level

Security (RLS).



No custom authentication server is required.



\------------------------------------------------------------

AUTHENTICATION FLOW

\------------------------------------------------------------



User



↓



Email OTP



↓



Supabase Auth



↓



JWT Token



↓



SvelteKit



↓



Supabase Database



\------------------------------------------------------------

AUTHENTICATION PROVIDER

\------------------------------------------------------------



\- Supabase Auth



\- Email OTP



\- JWT



\- Refresh Token



\- Secure Session



\------------------------------------------------------------

LOGIN FLOW

\------------------------------------------------------------



1\. User enters email



2\. OTP sent



3\. OTP verified



4\. Session created



5\. JWT issued



6\. Redirect Dashboard



\------------------------------------------------------------

SESSION MANAGEMENT

\------------------------------------------------------------



\- Auto Refresh



\- Secure Cookies



\- Session Restore



\- Logout



\- Token Rotation



\------------------------------------------------------------

USER ROLES

\------------------------------------------------------------



Administrator



Temple Admin



Editor



Viewer



\------------------------------------------------------------

PERMISSIONS

\------------------------------------------------------------



Administrator



\- Full Access



Temple Admin



\- Temple Management



Editor



\- Reports

\- Chat

\- Meetings



Viewer



\- Read Only



\------------------------------------------------------------

AUTHORIZATION

\------------------------------------------------------------



Uses



auth.uid()



JWT Claims



RLS Policies



\------------------------------------------------------------

SECURITY

\------------------------------------------------------------



\- Email Verification



\- JWT Validation



\- RLS



\- HTTPS Only



\- Secure Cookies



\- CSRF Protection



\- XSS Protection



\- SQL Injection Prevention



\------------------------------------------------------------

DATABASE ACCESS

\------------------------------------------------------------



Templates Database



↓



RLS



↓



auth.uid()



↓



Allowed Rows



Chat Database



↓



RLS



↓



auth.uid()



↓



Allowed Rows



\------------------------------------------------------------

OFFLINE LOGIN

\------------------------------------------------------------



\- Cached Session



\- IndexedDB



\- Auto Sync



\- Background Refresh



\------------------------------------------------------------

AUDIT

\------------------------------------------------------------



Log



\- Login



\- Logout



\- Failed Login



\- Password Reset



\- Role Change



\- Critical Operations



\------------------------------------------------------------

GOALS

\------------------------------------------------------------



✔ Passwordless Login



✔ Secure JWT



✔ Role Based Access



✔ RLS Protected



✔ Offline Ready



✔ Production Ready



✔ Mobile Friendly



✔ Future Proof

