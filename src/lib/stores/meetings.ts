import { writable } from "svelte/store";
import { browser } from "$app/environment";

import {
  getMeetings,
  addMeeting as dbAddMeeting,
  updateMeeting,
  deleteMeeting
} from "$lib/services/database";

export const meetings = writable<any[]>([]);

/* ==========================
   LOAD ALL MEETINGS
========================== */

export async function refreshMeetings() {
  if (!browser) return [];

  try {
    const data = await getMeetings();

    meetings.set(data);

    return data;
  } catch (err) {
    console.error("refreshMeetings()", err);
    meetings.set([]);
    return [];
  }
}

/* ==========================
   ADD
========================== */

export async function addMeeting(data: any) {

  const ok = await dbAddMeeting(data);

  if (ok) {
    await refreshMeetings();
  }

  return ok;
}

/* ==========================
   UPDATE
========================== */

export async function editMeeting(id: number, data: any) {

  const ok = await updateMeeting(id, data);

  if (ok) {
    await refreshMeetings();
  }

  return ok;
}

/* ==========================
   DELETE
========================== */

export async function removeMeeting(id: number) {

  const ok = await deleteMeeting(id);

  if (ok) {
    await refreshMeetings();
  }

  return ok;
}

/* ==========================
   GET BY ID
========================== */

export async function getMeetingById(id: number) {
  if (!browser) return null;

  try {
    const all = await getMeetings();
    return all.find((m: any) => Number(m.id) === Number(id)) || null;
  } catch (err) {
    console.error("getMeetingById()", err);
    return null;
  }
}

/* ==========================
   AUTO REFRESH
========================== */

if (browser) {

  window.addEventListener("meetings:updated", async () => {
    await refreshMeetings();
  });

  refreshMeetings();

}

export default {
  meetings,
  refreshMeetings,
  addMeeting,
  editMeeting,
  removeMeeting,
  getMeetingById
};
