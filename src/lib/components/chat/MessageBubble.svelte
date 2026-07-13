<script lang="ts">
    export let message: any;

    function formatTime(date: string) {
        if (!date) return "";

        return new Date(date).toLocaleTimeString("en-IN", {
            hour: "2-digit",
            minute: "2-digit",
            hour12: true
        });
    }
</script>
<div class="message" class:own={message.is_own}>

    <div class="bubble">

        {#if !message.is_own}
            <div class="sender">
                {message.users?.name ?? "Unknown"}
            </div>
        {/if}

        {#if message.type === "image"}

            <img
                src={message.content}
                alt="Image"
                class="image"
            />

        {:else if message.type === "file"}

            <div class="file">

                📄

                <span>{message.file_name ?? "Attachment"}</span>

            </div>

        {:else}

            <div class="text">

                {message.content}

            </div>

        {/if}

        <div class="footer">

            <span class="time">

                {formatTime(message.created_at)}

            </span>

            {#if message.is_own}

                <span class="ticks">

                    {#if message.read}

                        <span class="blue">✓✓</span>

                    {:else if message.delivered}

                        ✓✓

                    {:else if message.sending}

                        🕒

                    {:else}

                        ✓

                    {/if}

                </span>

            {/if}

        </div>

    </div>

</div>
<style>

.message{
    display:flex;
    margin:6px 12px;
}

.message.own{
    justify-content:flex-end;
}

.message:not(.own){
    justify-content:flex-start;
}

.bubble{
    max-width:70%;
    padding:8px 12px;
    border-radius:10px;
    background:#ffffff;
    box-shadow:0 1px 1px rgba(0,0,0,.15);
    word-break:break-word;
    position:relative;
}

.message.own .bubble{
    background:#d9fdd3;
}

.sender{
    font-size:12px;
    font-weight:600;
    color:#00a884;
    margin-bottom:4px;
}

.text{
    white-space:pre-wrap;
    font-size:14px;
    line-height:1.5;
    color:#111b21;
}

.image{
    max-width:280px;
    border-radius:8px;
    display:block;
}

.file{
    display:flex;
    align-items:center;
    gap:8px;
    padding:10px;
    border-radius:8px;
    background:#f5f6f6;
    font-size:14px;
}

.footer{
    display:flex;
    justify-content:flex-end;
    align-items:center;
    gap:4px;
    margin-top:4px;
}

.time{
    font-size:11px;
    color:#667781;
}

.ticks{
    font-size:12px;
    color:#667781;
    letter-spacing:-2px;
}

.blue{
    color:#53bdeb;
}

@media(max-width:768px){

.bubble{
    max-width:85%;
}

.image{
    max-width:220px;
}

}

</style>