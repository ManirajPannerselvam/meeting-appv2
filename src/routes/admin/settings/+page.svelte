```svelte
<script lang="ts">
    import { onMount } from "svelte";
    import { supabase } from "$lib/supabase/client";
    import { toast } from "svelte-sonner";

    let loading = true;
    let saving = false;
    let uploadingLogo = false;

    const SETTINGS_ID = 1;

    // ===== STATE =====

    let companyName = "";
    let companyCode = "";
    let companyAddress = "";
    let companyPhone = "";
    let companyEmail = "";
    let website = "";

    let plantName = "";
    let plantCode = "";
    let plantLocation = "";
    let timezone = "Asia/Kolkata";

    let theme = "Light";
    let primaryColor = "#2563eb";
    let logoUrl = "";

    let smtpHost = "";
    let smtpPort = "587";
    let smtpUser = "";
    let smtpPassword = "";
    let smtpSSL = true;

    let enableEmail = true;
    let enableSMS = false;
    let enablePush = true;

    let passwordExpiry = 90;
    let minPasswordLength = 8;
    let requireUppercase = true;
    let requireNumbers = true;
    let requireSpecial = true;
    let sessionTimeout = 30;

    let backupEnabled = true;
    let backupFrequency = "Daily";
    let backupRetention = 30;

    let logLogin = true;
    let logReport = true;
    let logUser = true;
    let logTemplate = true;

    // ===== DEFAULTS =====

    const defaultSettings = {
        companyName: "",
        companyCode: "",
        companyAddress: "",
        companyPhone: "",
        companyEmail: "",
        website: "",

        plantName: "",
        plantCode: "",
        plantLocation: "",
        timezone: "Asia/Kolkata",

        theme: "Light",
        primaryColor: "#2563eb",
        logoUrl: "",

        smtpHost: "",
        smtpPort: "587",
        smtpUser: "",
        smtpPassword: "",
        smtpSSL: true,

        enableEmail: true,
        enableSMS: false,
        enablePush: true,

        passwordExpiry: 90,
        minPasswordLength: 8,
        requireUppercase: true,
        requireNumbers: true,
        requireSpecial: true,
        sessionTimeout: 30,

        backupEnabled: true,
        backupFrequency: "Daily",
        backupRetention: 30,

        logLogin: true,
        logReport: true,
        logUser: true,
        logTemplate: true
    };

    // ===== LOAD =====

    async function loadSettings() {
        loading = true;

        try {
            const { data, error } = await supabase
                .from("system_settings")
                .select("*")
                .eq("id", SETTINGS_ID)
                .maybeSingle();

            if (error) throw error;

            if (data) {
                companyName = data.company_name ?? "";
                companyCode = data.company_code ?? "";
                companyAddress = data.company_address ?? "";
                companyPhone = data.company_phone ?? "";
                companyEmail = data.company_email ?? "";
                website = data.website ?? "";

                plantName = data.plant_name ?? "";
                plantCode = data.plant_code ?? "";
                plantLocation = data.plant_location ?? "";
                timezone = data.timezone ?? "Asia/Kolkata";

                theme = data.theme ?? "Light";
                primaryColor = data.primary_color ?? "#2563eb";
                logoUrl = data.logo_url ?? "";

                smtpHost = data.smtp_host ?? "";
                smtpPort = String(data.smtp_port ?? "587");
                smtpUser = data.smtp_user ?? "";
                smtpPassword = data.smtp_password ?? "";
                smtpSSL = data.smtp_ssl ?? true;

                enableEmail = data.enable_email ?? true;
                enableSMS = data.enable_sms ?? false;
                enablePush = data.enable_push ?? true;

                passwordExpiry = Number(data.password_expiry ?? 90);
                minPasswordLength = Number(data.min_password_length ?? 8);
                requireUppercase = data.require_uppercase ?? true;
                requireNumbers = data.require_numbers ?? true;
                requireSpecial = data.require_special ?? true;
                sessionTimeout = Number(data.session_timeout ?? 30);

                backupEnabled = data.backup_enabled ?? true;
                backupFrequency = data.backup_frequency ?? "Daily";
                backupRetention = Number(data.backup_retention ?? 30);

                logLogin = data.log_login ?? true;
                logReport = data.log_report ?? true;
                logUser = data.log_user ?? true;
                logTemplate = data.log_template ?? true;
            }
        } catch (err: any) {
            toast.error(err?.message ?? "Failed to load system settings.");
        } finally {
            loading = false;
        }
    }

    // ===== VALIDATION =====

    function validate(): boolean {
        if (!companyName.trim()) {
            toast.error("Company Name is required.");
            return false;
        }

        if (minPasswordLength < 6) {
            toast.error("Minimum password length must be at least 6.");
            return false;
        }

        if (passwordExpiry < 30) {
            toast.error("Password expiry should be at least 30 days.");
            return false;
        }

        if (sessionTimeout < 5) {
            toast.error("Session timeout must be at least 5 minutes.");
            return false;
        }

        if (backupRetention < 1) {
            toast.error("Backup retention must be at least 1 day.");
            return false;
        }

        if (smtpPort && (!/^\d+$/.test(String(smtpPort)) || Number(smtpPort) < 1 || Number(smtpPort) > 65535)) {
            toast.error("SMTP port must be between 1 and 65535.");
            return false;
        }

        if (companyEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(companyEmail)) {
            toast.error("Please enter a valid company email.");
            return false;
        }

        if (website && !/^https?:\/\/.+/i.test(website)) {
            toast.error("Website must start with http:// or https://.");
            return false;
        }

        return true;
    }

    // ===== SAVE =====

    async function saveSettings() {
        if (!validate()) return;

        saving = true;

        try {
            const payload = {
                id: SETTINGS_ID,

                company_name: companyName.trim(),
                company_code: companyCode.trim(),
                company_address: companyAddress.trim(),
                company_phone: companyPhone.trim(),
                company_email: companyEmail.trim(),
                website: website.trim(),

                plant_name: plantName.trim(),
                plant_code: plantCode.trim(),
                plant_location: plantLocation.trim(),
                timezone,

                theme,
                primary_color: primaryColor,
                logo_url: logoUrl,

                smtp_host: smtpHost.trim(),
                smtp_port: String(smtpPort).trim(),
                smtp_user: smtpUser.trim(),
                smtp_password: smtpPassword,
                smtp_ssl: smtpSSL,

                enable_email: enableEmail,
                enable_sms: enableSMS,
                enable_push: enablePush,

                password_expiry: Number(passwordExpiry),
                min_password_length: Number(minPasswordLength),
                require_uppercase: requireUppercase,
                require_numbers: requireNumbers,
                require_special: requireSpecial,
                session_timeout: Number(sessionTimeout),

                backup_enabled: backupEnabled,
                backup_frequency: backupFrequency,
                backup_retention: Number(backupRetention),

                log_login: logLogin,
                log_report: logReport,
                log_user: logUser,
                log_template: logTemplate,

                updated_at: new Date().toISOString()
            };

            const { error } = await supabase
                .from("system_settings")
                .upsert(payload, {
                    onConflict: "id"
                });

            if (error) throw error;

            toast.success("System settings saved successfully.");
        } catch (err: any) {
            toast.error(err?.message ?? "Failed to save system settings.");
        } finally {
            saving = false;
        }
    }

    // ===== RESET =====

    function resetFormToDefaults() {
        companyName = defaultSettings.companyName;
        companyCode = defaultSettings.companyCode;
        companyAddress = defaultSettings.companyAddress;
        companyPhone = defaultSettings.companyPhone;
        companyEmail = defaultSettings.companyEmail;
        website = defaultSettings.website;

        plantName = defaultSettings.plantName;
        plantCode = defaultSettings.plantCode;
        plantLocation = defaultSettings.plantLocation;
        timezone = defaultSettings.timezone;

        theme = defaultSettings.theme;
        primaryColor = defaultSettings.primaryColor;
        logoUrl = defaultSettings.logoUrl;

        smtpHost = defaultSettings.smtpHost;
        smtpPort = defaultSettings.smtpPort;
        smtpUser = defaultSettings.smtpUser;
        smtpPassword = defaultSettings.smtpPassword;
        smtpSSL = defaultSettings.smtpSSL;

        enableEmail = defaultSettings.enableEmail;
        enableSMS = defaultSettings.enableSMS;
        enablePush = defaultSettings.enablePush;

        passwordExpiry = defaultSettings.passwordExpiry;
        minPasswordLength = defaultSettings.minPasswordLength;
        requireUppercase = defaultSettings.requireUppercase;
        requireNumbers = defaultSettings.requireNumbers;
        requireSpecial = defaultSettings.requireSpecial;
        sessionTimeout = defaultSettings.sessionTimeout;

        backupEnabled = defaultSettings.backupEnabled;
        backupFrequency = defaultSettings.backupFrequency;
        backupRetention = defaultSettings.backupRetention;

        logLogin = defaultSettings.logLogin;
        logReport = defaultSettings.logReport;
        logUser = defaultSettings.logUser;
        logTemplate = defaultSettings.logTemplate;

        toast.info("Form reset to default values. Click Save Settings to persist them.");
    }

    async function resetSettings() {
        if (!confirm("Reset all system settings to default values?")) return;

        resetFormToDefaults();
        await saveSettings();
    }

    // ===== LOGO UPLOAD =====

    async function uploadLogo(event: Event) {
        const input = event.target as HTMLInputElement;
        const file = input.files?.[0];

        if (!file) return;

        if (!file.type.startsWith("image/")) {
            toast.error("Please select a valid image file.");
            input.value = "";
            return;
        }

        const maxSize = 2 * 1024 * 1024;

        if (file.size > maxSize) {
            toast.error("Logo must be smaller than 2 MB.");
            input.value = "";
            return;
        }

        uploadingLogo = true;

        try {
            const extension = file.name.split(".").pop()?.toLowerCase() || "png";
            const filename = `logo-${SETTINGS_ID}-${Date.now()}.${extension}`;

            const { error } = await supabase.storage
                .from("settings")
                .upload(filename, file, {
                    upsert: true,
                    contentType: file.type
                });

            if (error) throw error;

            const { data } = supabase.storage
                .from("settings")
                .getPublicUrl(filename);

            logoUrl = data.publicUrl;

            toast.success("Logo uploaded successfully.");
        } catch (err: any) {
            toast.error(err?.message ?? "Logo upload failed.");
        } finally {
            uploadingLogo = false;
            input.value = "";
        }
    }

    function removeLogo() {
        logoUrl = "";
        toast.info("Logo removed from the form. Save settings to persist the change.");
    }

    // ===== MAINTENANCE ACTIONS =====

    function backupNow() {
        toast.info(
            backupEnabled
                ? `Backup requested using ${backupFrequency.toLowerCase()} configuration.`
                : "Automatic backup is currently disabled."
        );
    }

    function restoreBackup() {
        toast.info("Restore workflow is not connected to a backend restore service yet.");
    }

    function optimizeDatabase() {
        toast.info("Database optimization requires a server-side maintenance function.");
    }

    function rebuildIndex() {
        toast.info("Index rebuild requires a server-side maintenance function.");
    }

    function clearCache() {
        toast.success("Client cache cleared.");

        if (typeof localStorage !== "undefined") {
            localStorage.clear();
        }
    }

    function archiveReports() {
        toast.info("Report archiving requires a server-side archive function.");
    }

    onMount(loadSettings);
</script>

<div class="page">
    <!-- HEADER -->
    <div class="page-header">
        <div class="header-content">
            <div>
                <h1>⚙️ System Settings</h1>
                <p>Enterprise Configuration</p>
            </div>
        </div>

        <button class="green save-button" on:click={saveSettings} disabled={saving || loading}>
            {saving ? "Saving..." : "💾 Save Settings"}
        </button>
    </div>

    {#if loading}
        <div class="loading-panel">
            {#each Array(6) as _}
                <div class="loading-row"></div>
            {/each}
        </div>
    {:else}

        <!-- SUMMARY -->
        <div class="card">
            <div class="section-header">
                <div>
                    <h2>📊 Configuration Summary</h2>
                    <p>Current system configuration overview.</p>
                </div>
            </div>

            <div class="summary-dashboard">
                <div class="summary-item">
                    <h3>{companyName || "-"}</h3>
                    <span>Company</span>
                </div>

                <div class="summary-item">
                    <h3>{plantName || "-"}</h3>
                    <span>Plant</span>
                </div>

                <div class="summary-item">
                    <h3>{theme}</h3>
                    <span>Theme</span>
                </div>

                <div class="summary-item">
                    <h3>{backupFrequency}</h3>
                    <span>Backup</span>
                </div>

                <div class="summary-item">
                    <h3>{enableEmail ? "ON" : "OFF"}</h3>
                    <span>Email</span>
                </div>

                <div class="summary-item">
                    <h3>{sessionTimeout} Min</h3>
                    <span>Session</span>
                </div>
            </div>
        </div>

        <!-- COMPANY -->
        <div class="card">
            <h2>🏢 Company Information</h2>

            <div class="grid">
                <div>
                    <label>Company Name</label>
                    <input bind:value={companyName} placeholder="Company name" />
                </div>

                <div>
                    <label>Company Code</label>
                    <input bind:value={companyCode} placeholder="Company code" />
                </div>

                <div>
                    <label>Phone</label>
                    <input bind:value={companyPhone} placeholder="Company phone" />
                </div>

                <div>
                    <label>Email</label>
                    <input
                        type="email"
                        bind:value={companyEmail}
                        placeholder="company@example.com"
                    />
                </div>

                <div class="full">
                    <label>Address</label>
                    <textarea
                        rows="3"
                        bind:value={companyAddress}
                        placeholder="Company address"
                    ></textarea>
                </div>

                <div class="full">
                    <label>Website</label>
                    <input
                        bind:value={website}
                        placeholder="https://example.com"
                    />
                </div>
            </div>
        </div>

        <!-- PLANT -->
        <div class="card">
            <h2>🏭 Plant Information</h2>

            <div class="grid">
                <div>
                    <label>Plant Name</label>
                    <input bind:value={plantName} placeholder="Plant name" />
                </div>

                <div>
                    <label>Plant Code</label>
                    <input bind:value={plantCode} placeholder="Plant code" />
                </div>

                <div>
                    <label>Location</label>
                    <input bind:value={plantLocation} placeholder="Plant location" />
                </div>

                <div>
                    <label>Timezone</label>

                    <select bind:value={timezone}>
                        <option value="Asia/Kolkata">Asia/Kolkata</option>
                        <option value="UTC">UTC</option>
                        <option value="Asia/Dubai">Asia/Dubai</option>
                        <option value="Europe/London">Europe/London</option>
                        <option value="America/New_York">America/New_York</option>
                    </select>
                </div>
            </div>
        </div>

        <!-- THEME -->
        <div class="card">
            <h2>🎨 Theme Settings</h2>

            <div class="grid">
                <div>
                    <label>Theme</label>

                    <select bind:value={theme}>
                        <option value="Light">Light</option>
                        <option value="Dark">Dark</option>
                        <option value="System">System</option>
                    </select>
                </div>

                <div>
                    <label>Primary Color</label>

                    <div class="color-control">
                        <input
                            class="color-input"
                            type="color"
                            bind:value={primaryColor}
                        />

                        <span>{primaryColor}</span>
                    </div>
                </div>

                <div class="full">
                    <label>Logo Upload</label>

                    <input
                        type="file"
                        accept="image/png,image/jpeg,image/webp,image/svg+xml"
                        on:change={uploadLogo}
                        disabled={uploadingLogo}
                    />

                    {#if uploadingLogo}
                        <small class="help-text">Uploading logo...</small>
                    {/if}
                </div>

                {#if logoUrl}
                    <div class="full logo-section">
                        <img src={logoUrl} alt="Company Logo" class="logo-preview" />

                        <button class="red remove-button" on:click={removeLogo}>
                            Remove Logo
                        </button>
                    </div>
                {/if}
            </div>
        </div>

        <!-- SMTP -->
        <div class="card">
            <div class="section-header">
                <div>
                    <h2>📧 SMTP Configuration</h2>
                    <p>Configure outbound email delivery.</p>
                </div>
            </div>

            <div class="grid">
                <div>
                    <label>SMTP Host</label>
                    <input bind:value={smtpHost} placeholder="smtp.example.com" />
                </div>

                <div>
                    <label>Port</label>
                    <input
                        type="number"
                        min="1"
                        max="65535"
                        bind:value={smtpPort}
                        placeholder="587"
                    />
                </div>

                <div>
                    <label>Username</label>
                    <input bind:value={smtpUser} placeholder="SMTP username" />
                </div>

                <div>
                    <label>Password</label>
                    <input
                        type="password"
                        bind:value={smtpPassword}
                        placeholder="SMTP password"
                        autocomplete="new-password"
                    />
                </div>

                <div class="checkbox-field">
                    <label>
                        <input type="checkbox" bind:checked={smtpSSL} />
                        <span>SSL Enabled</span>
                    </label>
                </div>
            </div>
        </div>

        <!-- NOTIFICATION -->
        <div class="card">
            <h2>🔔 Notification Settings</h2>

            <div class="toggle-list">
                <label class="toggle-row">
                    <input type="checkbox" bind:checked={enableEmail} />
                    <span>
                        <strong>Email Notifications</strong>
                        <small>Enable email notifications.</small>
                    </span>
                </label>

                <label class="toggle-row">
                    <input type="checkbox" bind:checked={enableSMS} />
                    <span>
                        <strong>SMS Notifications</strong>
                        <small>Enable SMS notifications.</small>
                    </span>
                </label>

                <label class="toggle-row">
                    <input type="checkbox" bind:checked={enablePush} />
                    <span>
                        <strong>Push Notifications</strong>
                        <small>Enable browser/mobile push notifications.</small>
                    </span>
                </label>
            </div>
        </div>

        <!-- SECURITY -->
        <div class="card">
            <h2>🔒 Security Settings</h2>

            <div class="grid">
                <div>
                    <label>Password Expiry (Days)</label>
                    <input
                        type="number"
                        min="30"
                        bind:value={passwordExpiry}
                    />
                </div>

                <div>
                    <label>Session Timeout (Minutes)</label>
                    <input
                        type="number"
                        min="5"
                        bind:value={sessionTimeout}
                    />
                </div>

                <div>
                    <label>Minimum Password Length</label>
                    <input
                        type="number"
                        min="6"
                        bind:value={minPasswordLength}
                    />
                </div>
            </div>
        </div>

        <!-- PASSWORD POLICY -->
        <div class="card">
            <h2>🔑 Password Policy</h2>

            <div class="toggle-list">
                <label class="toggle-row">
                    <input type="checkbox" bind:checked={requireUppercase} />
                    <span>
                        <strong>Require Uppercase Letter</strong>
                        <small>Passwords must contain an uppercase character.</small>
                    </span>
                </label>

                <label class="toggle-row">
                    <input type="checkbox" bind:checked={requireNumbers} />
                    <span>
                        <strong>Require Numeric Characters</strong>
                        <small>Passwords must contain a number.</small>
                    </span>
                </label>

                <label class="toggle-row">
                    <input type="checkbox" bind:checked={requireSpecial} />
                    <span>
                        <strong>Require Special Characters</strong>
                        <small>Passwords must contain a special character.</small>
                    </span>
                </label>
            </div>
        </div>

        <!-- SECURITY SUMMARY -->
        <div class="card">
            <h2>🛡 Security Summary</h2>

            <div class="summary-grid">
                <div class="summary-box">
                    <span>Password Expiry</span>
                    <strong>{passwordExpiry} Days</strong>
                </div>

                <div class="summary-box">
                    <span>Session Timeout</span>
                    <strong>{sessionTimeout} Minutes</strong>
                </div>

                <div class="summary-box">
                    <span>Password Length</span>
                    <strong>{minPasswordLength}</strong>
                </div>

                <div class="summary-box">
                    <span>Policy Rules</span>
                    <strong>
                        {(requireUppercase ? 1 : 0) +
                            (requireNumbers ? 1 : 0) +
                            (requireSpecial ? 1 : 0)}
                    </strong>
                </div>
            </div>
        </div>

        <!-- BACKUP -->
        <div class="card">
            <h2>💾 Backup Settings</h2>

            <div class="grid">
                <div class="checkbox-field">
                    <label>
                        <input type="checkbox" bind:checked={backupEnabled} />
                        <span>Enable Automatic Backup</span>
                    </label>
                </div>

                <div>
                    <label>Backup Frequency</label>

                    <select bind:value={backupFrequency}>
                        <option value="Hourly">Hourly</option>
                        <option value="Daily">Daily</option>
                        <option value="Weekly">Weekly</option>
                        <option value="Monthly">Monthly</option>
                    </select>
                </div>

                <div>
                    <label>Retention (Days)</label>

                    <input
                        type="number"
                        min="1"
                        bind:value={backupRetention}
                    />
                </div>
            </div>

            <div class="action-buttons">
                <button class="blue" on:click={backupNow}>
                    💾 Backup Now
                </button>

                <button class="orange" on:click={restoreBackup}>
                    ♻ Restore Backup
                </button>
            </div>
        </div>

        <!-- MAINTENANCE -->
        <div class="card">
            <h2>🗄 Database Maintenance</h2>

            <div class="maintenance-grid">
                <button class="green" on:click={optimizeDatabase}>
                    Optimize Database
                </button>

                <button class="blue" on:click={rebuildIndex}>
                    Rebuild Index
                </button>

                <button class="orange" on:click={clearCache}>
                    Clear Cache
                </button>

                <button class="red" on:click={archiveReports}>
                    Archive Reports
                </button>
            </div>
        </div>

        <!-- AUDIT -->
        <div class="card">
            <h2>📋 Audit Configuration</h2>

            <div class="toggle-list">
                <label class="toggle-row">
                    <input type="checkbox" bind:checked={logLogin} />
                    <span>
                        <strong>Log Login Activity</strong>
                        <small>Track authentication activity.</small>
                    </span>
                </label>

                <label class="toggle-row">
                    <input type="checkbox" bind:checked={logReport} />
                    <span>
                        <strong>Log Report Changes</strong>
                        <small>Track report modifications.</small>
                    </span>
                </label>

                <label class="toggle-row">
                    <input type="checkbox" bind:checked={logUser} />
                    <span>
                        <strong>Log User Administration</strong>
                        <small>Track user administration changes.</small>
                    </span>
                </label>

                <label class="toggle-row">
                    <input type="checkbox" bind:checked={logTemplate} />
                    <span>
                        <strong>Log Template Changes</strong>
                        <small>Track template configuration changes.</small>
                    </span>
                </label>
            </div>
        </div>

        <!-- SYSTEM INFO -->
        <div class="card">
            <h2>ℹ️ System Information</h2>

            <table class="info-table">
                <tbody>
                    <tr>
                        <td>Application</td>
                        <td>Temple Operations Reporting System</td>
                    </tr>

                    <tr>
                        <td>Version</td>
                        <td>Enterprise Edition 1.0</td>
                    </tr>

                    <tr>
                        <td>Framework</td>
                        <td>SvelteKit</td>
                    </tr>

                    <tr>
                        <td>Database</td>
                        <td>Supabase PostgreSQL</td>
                    </tr>

                    <tr>
                        <td>Timezone</td>
                        <td>{timezone}</td>
                    </tr>
                </tbody>
            </table>
        </div>

        <!-- RESET -->
        <div class="card danger-card">
            <h2>⚠️ Maintenance</h2>

            <p>
                Reset the form and persist the default enterprise configuration.
            </p>

            <button class="red" on:click={resetSettings} disabled={saving}>
                Reset to Default Settings
            </button>
        </div>

    {/if}

    <footer class="settings-footer">
        <span>Enterprise Temple Operations Reporting System</span>
        <span>Configuration Module</span>
    </footer>
</div>

<style>
    .page {
        padding: 24px;
        display: flex;
        flex-direction: column;
        gap: 24px;
        max-width: 1200px;
        margin: auto;
        color: #0f172a;
    }

    .page-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 20px;
        padding: 4px 0;
    }

    .page-header h1 {
        margin: 0;
        font-size: 30px;
        font-weight: 800;
        color: #0f172a;
    }

    .page-header p {
        margin: 6px 0 0;
        color: #64748b;
    }

    .header-content {
        min-width: 0;
    }

    .card {
        background: #ffffff;
        padding: 24px;
        border-radius: 14px;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
    }

    .card h2 {
        margin: 0 0 20px;
        font-size: 20px;
        color: #0f172a;
    }

    .section-header {
        display: flex;
        justify-content: space-between;
        gap: 20px;
    }

    .section-header p {
        margin: -10px 0 20px;
        color: #64748b;
        font-size: 13px;
    }

    .grid {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 18px;
    }

    .full {
        grid-column: 1 / -1;
    }

    label {
        display: block;
        font-weight: 600;
        margin-bottom: 6px;
        color: #334155;
    }

    input,
    select,
    textarea {
        width: 100%;
        box-sizing: border-box;
        padding: 10px 12px;
        border: 1px solid #d1d5db;
        border-radius: 8px;
        font-size: 14px;
        background: #ffffff;
        color: #0f172a;
        outline: none;
        transition:
            border-color 0.2s ease,
            box-shadow 0.2s ease;
    }

    input:focus,
    select:focus,
    textarea:focus {
        border-color: #2563eb;
        box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.12);
    }

    textarea {
        resize: vertical;
        min-height: 80px;
    }

    input[type="checkbox"] {
        width: 18px;
        height: 18px;
        padding: 0;
        cursor: pointer;
        accent-color: #2563eb;
        flex: 0 0 auto;
    }

    input[type="color"] {
        width: 52px;
        height: 42px;
        padding: 4px;
        cursor: pointer;
    }

    input[type="file"] {
        padding: 8px;
        background: #f8fafc;
    }

    button {
        cursor: pointer;
        transition:
            transform 0.15s ease,
            opacity 0.15s ease,
            box-shadow 0.15s ease;
    }

    button:hover:not(:disabled) {
        transform: translateY(-1px);
    }

    button:disabled {
        opacity: 0.55;
        cursor: not-allowed;
    }

    .green,
    .blue,
    .orange,
    .red {
        color: #ffffff;
        border: none;
        padding: 10px 18px;
        border-radius: 8px;
        font-weight: 600;
    }

    .green {
        background: #16a34a;
    }

    .blue {
        background: #2563eb;
    }

    .orange {
        background: #ea580c;
    }

    .red {
        background: #dc2626;
    }

    .save-button {
        min-width: 150px;
        white-space: nowrap;
    }

    .summary-dashboard {
        display: grid;
        grid-template-columns: repeat(3, minmax(0, 1fr));
        gap: 18px;
    }

    .summary-item {
        padding: 20px;
        background: #f8fafc;
        border: 1px solid #e5e7eb;
        border-radius: 12px;
        text-align: center;
    }

    .summary-item h3 {
        margin: 0;
        font-size: 22px;
        color: #2563eb;
        overflow-wrap: anywhere;
    }

    .summary-item span {
        display: block;
        margin-top: 8px;
        color: #64748b;
        font-size: 13px;
    }

    .color-control {
        min-height: 42px;
        display: flex;
        align-items: center;
        gap: 12px;
    }

    .color-control span {
        font-family: monospace;
        font-size: 13px;
        color: #475569;
        text-transform: uppercase;
    }

    .logo-section {
        display: flex;
        align-items: center;
        gap: 16px;
        flex-wrap: wrap;
    }

    .logo-preview {
        max-width: 260px;
        max-height: 100px;
        object-fit: contain;
        border: 1px solid #e5e7eb;
        border-radius: 8px;
        padding: 10px;
        background: #ffffff;
    }

    .remove-button {
        align-self: center;
    }

    .help-text {
        display: block;
        margin-top: 8px;
        color: #64748b;
    }

    .toggle-list {
        display: flex;
        flex-direction: column;
        gap: 14px;
        margin-top: 10px;
    }

    .toggle-row {
        display: flex;
        align-items: flex-start;
        gap: 12px;
        margin: 0;
        padding: 12px;
        border: 1px solid #e5e7eb;
        border-radius: 10px;
        background: #f8fafc;
    }

    .toggle-row span {
        display: flex;
        flex-direction: column;
        gap: 3px;
    }

    .toggle-row strong {
        color: #0f172a;
        font-size: 14px;
    }

    .toggle-row small {
        color: #64748b;
        font-weight: 400;
    }

    .checkbox-field {
        display: flex;
        align-items: center;
    }

    .checkbox-field label {
        display: flex;
        align-items: center;
        gap: 12px;
        margin: 0;
        cursor: pointer;
    }

    .summary-grid {
        display: grid;
        grid-template-columns: repeat(4, minmax(0, 1fr));
        gap: 16px;
        margin-top: 20px;
    }

    .summary-box {
        background: #f8fafc;
        border: 1px solid #e5e7eb;
        border-radius: 10px;
        padding: 18px;
        text-align: center;
    }

    .summary-box span {
        display: block;
        font-size: 13px;
        color: #64748b;
        margin-bottom: 6px;
    }

    .summary-box strong {
        font-size: 20px;
        color: #0f172a;
    }

    .action-buttons {
        display: flex;
        gap: 15px;
        margin-top: 20px;
        flex-wrap: wrap;
    }

    .maintenance-grid {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 18px;
        margin-top: 15px;
    }

    .maintenance-grid button {
        min-height: 48px;
    }

    .info-table {
        width: 100%;
        border-collapse: collapse;
    }

    .info-table td {
        padding: 12px;
        border-bottom: 1px solid #e5e7eb;
    }

    .info-table td:first-child {
        font-weight: 600;
        width: 220px;
        background: #f8fafc;
    }

    .danger-card {
        border: 1px solid #fecaca;
    }

    .danger-card p {
        color: #64748b;
        margin: -8px 0 16px;
    }

    .loading-panel {
        margin-top: 5px;
    }

    .loading-row {
        height: 52px;
        border-radius: 10px;
        background: #f1f5f9;
        margin-bottom: 12px;
        animation: pulse 1.4s infinite;
    }

    @keyframes pulse {
        0% {
            opacity: 0.45;
        }

        50% {
            opacity: 1;
        }

        100% {
            opacity: 0.45;
        }
    }

    .settings-footer {
        display: flex;
        justify-content: space-between;
        gap: 16px;
        padding: 25px 0;
        font-size: 13px;
        color: #64748b;
        border-top: 1px solid #e5e7eb;
        margin-top: 10px;
    }

    @media (max-width: 900px) {
        .summary-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
        }

        .summary-dashboard {
            grid-template-columns: repeat(2, minmax(0, 1fr));
        }
    }

    @media (max-width: 768px) {
        .page {
            padding: 16px;
            gap: 16px;
        }

        .page-header {
            flex-direction: column;
            align-items: stretch;
        }

        .save-button {
            width: 100%;
        }

        .grid {
            grid-template-columns: 1fr;
        }

        .full {
            grid-column: auto;
        }

        .maintenance-grid {
            grid-template-columns: 1fr;
        }

        .action-buttons {
            flex-direction: column;
        }

        .action-buttons button {
            width: 100%;
        }
    }

    @media (max-width: 600px) {
        .page {
            padding: 12px;
        }

        .card {
            padding: 18px;
            border-radius: 12px;
        }

        .page-header h1 {
            font-size: 24px;
        }

        .summary-grid,
        .summary-dashboard {
            grid-template-columns: 1fr;
        }

        .settings-footer {
            flex-direction: column;
            text-align: center;
        }

        .info-table td:first-child {
            width: 40%;
        }

        .logo-preview {
            max-width: 100%;
        }
    }
</style>
