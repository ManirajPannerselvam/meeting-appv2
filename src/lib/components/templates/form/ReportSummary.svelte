<script lang="ts">

    export let template: any;

    export let values: Record<string, any> = {};

</script>

<div class="report-card">

    <div class="header">

        <div>

            <h2>

                📊 {template?.name}

            </h2>

            <small>

                {template?.department}

                •

                {template?.version}

            </small>

        </div>

    </div>

    <div class="body">

        {#each Object.entries(values) as [key,value]}

            <div class="row">

                <div class="label">

                    {key}

                </div>

                <div class="value">

                    {value}

                </div>

            </div>

        {/each}

    </div>

    <div class="footer">

        <div>

            Generated

        </div>

        <div>

            {new Date().toLocaleString()}

        </div>

    </div>

</div>

<style>

.report-card{

    background:white;

    border-radius:16px;

    overflow:hidden;

    border:1px solid #e2e8f0;

}

.header{

    background:#2563eb;

    color:white;

    padding:18px 24px;

}

.header h2{

    margin:0;

    font-size:24px;

}

.header small{

    opacity:.85;

}

.body{

    padding:20px;

}

.row{

    display:grid;

    grid-template-columns:180px 1fr;

    padding:10px 0;

    border-bottom:1px solid #edf2f7;

}

.label{

    font-weight:600;

    color:#475569;

}

.value{

    color:#111827;

}

.footer{

    display:flex;

    justify-content:space-between;

    background:#f8fafc;

    padding:14px 20px;

    font-size:13px;

    color:#64748b;

}

</style>