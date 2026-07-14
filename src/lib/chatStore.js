import { openDB } from 'idb';

const dbPromise = openDB('erp-chat', 1, {
  upgrade(db) {
    db.createObjectStore('messages', { keyPath: 'id' });
    db.createObjectStore('chats', { keyPath: 'id' });
  }
});

// 1. Load only last 50 msgs per chat, DESC order
export async function getLast50(chatId) {
  const db = await dbPromise;
  const all = await db.getAll('messages');
  return all
   .filter(m => m.chatId === chatId)
   .sort((a,b) => b.timestamp - a.timestamp) // DESC: newest first
   .slice(0, 50)
   .reverse(); // Display: oldest of 50 → newest
}

// 2. On scroll top, load next 50 from cache only
export async function getOlder(chatId, beforeTimestamp) {
  const db = await dbPromise;
  const all = await db.getAll('messages');
  return all
   .filter(m => m.chatId === chatId && m.timestamp < beforeTimestamp)
   .sort((a,b) => b.timestamp - a.timestamp)
   .slice(0, 50)
   .reverse();
}

// 3. Save new msg: write to cache, server sync in background
export async function saveMessage(msg) {
  const db = await dbPromise;
  await db.put('messages', msg);
  // fetch('/api/send', {method: 'POST', body: JSON.stringify(msg)}); // background
}