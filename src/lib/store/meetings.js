import { writable } from 'svelte/store';
import { supabase } from '$lib/supabase';

export const meetings = writable<any[]>([]);

export async function refreshMeetings() {
    const { data, error } = await supabase
        .from('meetings')
        .select('*')
        .order('meeting_date', { ascending: true })
        .order('start_time', { ascending: true });

    if (error) {
        console.error('Error loading meetings:', error);
        meetings.set([]);
        throw error;
    }
    
    meetings.set(data || []);
}

export async function addMeeting(meeting: any) {
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
        throw new Error('User not logged in. Please login first.');
    }

    const { data, error } = await supabase
        .from('meetings')
        .insert({
            title: meeting.title,
            type: meeting.type,
            department: meeting.department,
            priority: meeting.priority,
            meeting_date: meeting.date,
            start_time: meeting.start_time,
            end_time: meeting.end_time,
            location: meeting.location,
            organizer: meeting.organizer,
            participants: Array.isArray(meeting.participants) 
                ? meeting.participants 
                : meeting.participants?.split(',').map((p: string) => p.trim()).filter(Boolean) || [],
            agenda: meeting.agenda,
            meeting_objective: meeting.meetingObjective,
            reference_no: meeting.referenceNo,
            meeting_mode: meeting.meetingMode,
            meeting_link: meeting.meetingLink,
            reminder_minutes: parseInt(meeting.reminder) || 0,
            attachment: meeting.attachment,
            created_by: user.id,
            status: 'scheduled'
        })
        .select()
        .single();

    if (error) {
        console.error('Error creating meeting:', error);
        throw error;
    }

    meetings.update(current => [...current, data]);
    return data;
}

export async function updateMeeting(id: number, updates: any) {
    const { data, error } = await supabase
        .from('meetings')
        .update({
            title: updates.title,
            type: updates.type,
            department: updates.department,
            priority: updates.priority,
            meeting_date: updates.date,
            start_time: updates.start_time,
            end_time: updates.end_time,
            location: updates.location,
            organizer: updates.organizer,
            participants: Array.isArray(updates.participants) 
                ? updates.participants 
                : updates.participants?.split(',').map((p: string) => p.trim()).filter(Boolean) || [],
            agenda: updates.agenda,
            meeting_objective: updates.meetingObjective,
            reference_no: updates.referenceNo,
            meeting_mode: updates.meetingMode,
            meeting_link: updates.meetingLink,
            reminder_minutes: parseInt(updates.reminder) || 0,
            attachment: updates.attachment,
            updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select()
        .single();

    if (error) {
        console.error('Error updating meeting:', error);
        throw error;
    }

    meetings.update(current => 
        current.map(m => m.id === id ? data : m)
    );
    return data;
}

export async function removeMeeting(id: number) {
    console.log('Deleting meeting ID:', id);
    
    const { error } = await supabase
        .from('meetings')
        .delete()
        .eq('id', Number(id));

    if (error) {
        console.error('Error deleting meeting:', error);
        throw error;
    }

    meetings.update(current => current.filter(m => m.id !== Number(id)));
    console.log('Meeting deleted from store');
}

export async function completeMeeting(id: number) {
    const { data, error } = await supabase
        .from('meetings')
        .update({ 
            completed: true, 
            status: 'completed',
            completed_at: new Date().toISOString()
        })
        .eq('id', id)
        .select()
        .single();

    if (error) {
        console.error('Error completing meeting:', error);
        throw error;
    }

    meetings.update(current => 
        current.map(m => m.id === id ? data : m)
    );
    return data;
}

export async function getMeetingById(id: number) {
    const { data, error } = await supabase
        .from('meetings')
        .select('*')
        .eq('id', Number(id))
        .single();

    if (error) {
        console.error('Error fetching meeting:', error);
        return null;
    }

    return data;
}