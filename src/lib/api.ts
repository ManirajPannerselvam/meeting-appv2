import { supabase } from './supabase'

// SMS OTP - உங்க existing routes
export async function sendOTP(mobile: string) {
  const res = await fetch('/api/send-otp', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ mobile })
  })
  return res.json()
}

export async function verifyOTP(mobile: string, otp: string) {
  const res = await fetch('/api/verify-otp', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ mobile, otp })
  })
  return res.json()
}

// Messages - Supabase
export async function getMessages(roomId: string) {
  const { data, error } = await supabase
.from('messages')
.select('*, users(name, mobile)')
.eq('room_id', roomId)
.order('created_at', { ascending: true })

  if (error) throw error
  return data
}

export async function sendMessage(roomId: string, userId: string, content: string) {
  const { data, error } = await supabase
.from('messages')
.insert([{
      room_id: roomId,
      user_id: userId,
      content: content
    }])
.select('*, users(name, mobile)')

  if (error) throw error
  return data[0]
}

// Realtime subscription
export function subscribeToMessages(roomId: string, callback: (msg: any) => void) {
  return supabase
.channel(`room:${roomId}`)
.on('postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `room_id=eq.${roomId}`
      },
      (payload) => {
        callback(payload.new)
      }
    )
.subscribe()
}

// Users
export async function getOrCreateUser(mobile: string, name: string) {
  let { data: user } = await supabase
.from('users')
.select('*')
.eq('mobile', mobile)
.single()

  if (!user) {
    const { data, error } = await supabase
  .from('users')
  .insert([{ mobile, name }])
  .select()
  .single()

    if (error) throw error
    user = data
  }

  return user
}