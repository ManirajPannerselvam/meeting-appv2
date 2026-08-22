/**
 * ============================================================
 * Temple Operations Reporting System
 * File        : src/lib/types/meeting.ts
 * ============================================================
 * PURPOSE
 *   Meeting module shared types.
 *
 * DATABASE
 *   Tables: meetings, meeting_attendees
 * ============================================================
 */

import type { UUID, ISODate, ISOTimestamp } from './database';

export type MeetingStatus = 
  | 'Scheduled'
  | 'InProgress'
  | 'Completed'
  | 'Cancelled'
  | 'Postponed';

export type AttendeeStatus = 
  | 'Invited'
  | 'Accepted'
  | 'Declined'
  | 'Tentative';

export interface MeetingAttendee {
  meeting_id: UUID;
  user_id: UUID;
  status: AttendeeStatus;
  user?: {
    full_name: string;
    email: string;
  };
}

export interface Meeting {
  id: UUID;
  title: string;
  description: string | null;
  meeting_date: ISODate;
  start_time: string; // HH:MM:SS
  end_time: string;   // HH:MM:SS
  location: string;
  meeting_type: 'General' | 'Committee' | 'Trustee' | 'Festival' | 'Other';
  status: MeetingStatus;
  agenda: string | null;
  minutes: string | null;
  created_by: UUID;
  created_at: ISOTimestamp;
  updated_at: ISOTimestamp;
  attendees?: MeetingAttendee[];
}