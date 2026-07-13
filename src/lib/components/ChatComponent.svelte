<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { supabase } from '$lib/supabase';

  let messages: any[] = [];
  let newMessage = '';
  let selectedUserId = '';
  let currentUserId = '';
  let sending = false;
  let channel: any;

  onMount(() => {
    currentUserId = localStorage.getItem('userId') || '';
  });

  onDestroy(() => {
    if (channel) supabase.removeChannel(channel);
  });

  function getRoomId(userId1: string, userId2: string): string {
    const sorted = [userId1, userId2].sort();
    return `chat_${sorted[0]}_${sorted[1]}`;
  }

  function setupRealtime(otherUserId: string) {
    if (channel) supabase.removeChannel(channel);
    
    const roomId = getRoomId(currentUserId, otherUserId);
    
    channel = supabase
      .channel(`room_${roomId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `room_id=eq.${roomId}`
        },
        (payload) => {
          console.log('New message received:', payload.new);
          if (payload.new.sender_id !== currentUserId) {
            messages = [...messages, payload.new];
            scrollToBottom();
          }
        }
      )
      .subscribe((status) => {
        console.log('Realtime status:', status);
        if (status === 'SUBSCRIBED') {
          console.log('✅ Realtime connected');
        }
        if (status === 'CHANNEL_ERROR') {
          console.error('❌ Realtime connection failed');
        }
      });
  }

  async function loadMessages(otherUserId: string) {
    if (!otherUserId) return;
    
    selectedUserId = otherUserId;
    
    try {
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('room_id', getRoomId(currentUserId, otherUserId))
        .order('created_at', { ascending: true });

      if (error) throw error;
      
      messages = data || [];
      console.log('Loaded messages:', messages);
      scrollToBottom();
      setupRealtime(otherUserId);
      
    } catch (err) {
      console.error('loadMessages error:', err);
    }
  }

  async function sendMessage() {
    if (!newMessage.trim() || !selectedUserId) return;

    sending = true;
    const token = localStorage.getItem('token');
    const messageText = newMessage.trim();

    const tempMsg = {
      id: 'temp_' + Date.now(),
      content: messageText,
      sender_id: currentUserId,
      receiver_id: selectedUserId,
      room_id: getRoomId(currentUserId, selectedUserId),
      created_at: new Date().toISOString()
    };
    messages = [...messages, tempMsg];
    newMessage = '';
    scrollToBottom();

    try {
      const res = await fetch('/api/messages/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          receiverId: selectedUserId,
          message: messageText
        })
      });

      const data = await res.json();
      console.log('Send response:', data);

      if (data.success) {
        messages = messages.map(m =>
          m.id === tempMsg.id ? data.data : m
        );
      } else {
        messages = messages.filter(m => m.id !== tempMsg.id);
        alert(data.error || 'Failed to send');
      }
    } catch (err) {
      console.error('Send error:', err);
      messages = messages.filter(m => m.id !== tempMsg.id);
      alert('Failed to send message');
    } finally {
      sending = false;
    }
  }

  function scrollToBottom() {
    setTimeout(() => {
      const chatBox = document.querySelector('.chat-messages');
      if (chatBox) chatBox.scrollTop = chatBox.scrollHeight;
    }, 100);
  }

  function formatTime(timestamp: string) {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  }

  export { loadMessages };
</script>

<div class="chat-container">
  <div class="chat-messages">
    {#if messages.length === 0}
      <div class="empty-state">No messages yet. Start a conversation!</div>
    {:else}
      {#each messages as msg (msg.id)}
        <div class="message {msg.sender_id === currentUserId ? 'sent' : 'received'}">
          <div class="message-content">
            <p>{msg.content}</p>
            <span class="time">{formatTime(msg.created_at)}</span>
          </div>
        </div>
      {/each}
    {/if}
  </div>

  <div class="chat-input">
    <input
      type="text"
      bind:value={newMessage}
      placeholder="Type a message..."
      on:keydown={(e) => e.key === 'Enter' && sendMessage()}
      disabled={sending || !selectedUserId}
    />
    <button on:click={sendMessage} disabled={sending || !newMessage.trim() || !selectedUserId}>
      {sending ? 'Sending...' : 'Send'}
    </button>
  </div>
</div>

<style>
.chat-container {
  display: flex;
  flex-direction: column;
  height: 100vh;
}

.chat-messages {
  flex: 1;
  overflow-y: auto;
  padding: 20px;
  background: #efeae2;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.empty-state {
  text-align: center;
  color: #667781;
  margin-top: 40px;
}

.message {
  display: flex;
}

.message.sent {
  justify-content: flex-end;
}

.message.received {
  justify-content: flex-start;
}

.message-content {
  max-width: 70%;
  padding: 8px 12px;
  border-radius: 8px;
  background: white;
  box-shadow: 0 1px 2px rgba(0,0,0,0.1);
}

.message.sent .message-content {
  background: #d9fdd3;
}

.message-content p {
  margin: 0 0 4px 0;
  word-wrap: break-word;
  color: #111b21;
  font-size: 14px;
}

.time {
  font-size: 11px;
  color: #667781;
  float: right;
  clear: both;
}

.chat-input {
  display: flex;
  padding: 12px;
  background: #f0f2f5;
  gap: 8px;
}

.chat-input input {
  flex: 1;
  padding: 12px;
  border: none;
  border-radius: 8px;
  font-size: 15px;
  outline: none;
}

.chat-input button {
  padding: 12px 24px;
  background: #00a884;
  color: white;
  border: none;
  border-radius: 8px;
  font-weight: 600;
  cursor: pointer;
}

.chat-input button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
</style>