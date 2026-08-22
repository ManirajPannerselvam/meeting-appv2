import { supabase } from "$lib/supabase/client";
import { meetings } from "$lib/stores/meetings";
import { writeAuditLog } from "$lib/audit";
import { toast } from "$lib/stores/toast";

import type {
	Meeting,
	MeetingStatus
} from "$lib/types/meetings";

import type { User } from "@supabase/supabase-js";


type MeetingPayload =
	Omit<
		Meeting,
		"id" | "created_at" | "updated_at"
	> & {
		id?: string;
	};


type MeetingFilters = {
	status?: MeetingStatus;
	from?: string;
	to?: string;
};


class MeetingService {

	private loading = false;


	/* ==========================================================
	   LOADING
	========================================================== */

	isLoading(): boolean {
		return this.loading;
	}


	private setLoading(value: boolean): void {
		this.loading = value;
	}


	/* ==========================================================
	   ERROR HANDLING
	========================================================== */

	private handleError(
		error: unknown,
		message = "Meeting error"
	): never {

		console.error(message, error);

		const errorMessage =
			error instanceof Error
				? error.message
				: String(error);

		toast.error(errorMessage);

		throw error instanceof Error
			? error
			: new Error(errorMessage);
	}


	/* ==========================================================
	   STORE
	========================================================== */

	private updateMeetingStore(
		data: Meeting[]
	): void {

		meetings.set(data);

	}


	/* ==========================================================
	   LOAD ALL MEETINGS
	========================================================== */

	async loadMeetings(
		filters?: MeetingFilters
	): Promise<Meeting[]> {

		this.setLoading(true);

		try {

			let query = supabase
				.from("meetings")
				.select(`
					*,
					attendees:meeting_attendees(
						user_id,
						status
					)
				`)
				.order(
					"meeting_date",
					{ ascending: false }
				)
				.order(
					"start_time",
					{ ascending: true }
				);


			if (filters?.status) {

				query = query.eq(
					"status",
					filters.status
				);

			}


			if (filters?.from) {

				query = query.gte(
					"meeting_date",
					filters.from
				);

			}


			if (filters?.to) {

				query = query.lte(
					"meeting_date",
					filters.to
				);

			}


			const {
				data,
				error
			} = await query;


			if (error) {
				throw error;
			}


			const meetingData =
				(data ?? []) as Meeting[];


			this.updateMeetingStore(
				meetingData
			);


			return meetingData;

		}
		catch (error) {

			this.handleError(
				error,
				"Failed to load meetings"
			);

		}
		finally {

			this.setLoading(false);

		}

	}


	/* ==========================================================
	   GET SINGLE MEETING
	========================================================== */

	async getMeeting(
		id: string
	): Promise<Meeting | null> {

		try {

			const {
				data,
				error
			} = await supabase
				.from("meetings")
				.select(`
					*,
					attendees:meeting_attendees(
						user_id,
						status,
						user:users(
							full_name,
							email
						)
					)
				`)
				.eq("id", id)
				.maybeSingle();


			if (error) {
				throw error;
			}


			return data as Meeting | null;

		}
		catch (error) {

			this.handleError(
				error,
				"Failed to load meeting"
			);

		}

	}


	/* ==========================================================
	   MEETINGS BY DATE
	========================================================== */

	async loadMeetingsByDate(
		meetingDate: string
	): Promise<Meeting[]> {

		try {

			const {
				data,
				error
			} = await supabase
				.from("meetings")
				.select("*")
				.eq(
					"meeting_date",
					meetingDate
				)
				.order(
					"start_time",
					{ ascending: true }
				);


			if (error) {
				throw error;
			}


			return (
				data ?? []
			) as Meeting[];

		}
		catch (error) {

			this.handleError(
				error,
				"Failed to load meetings by date"
			);

		}

	}


	/* ==========================================================
	   CONFLICT CHECK
	========================================================== */

	private async checkConflict(
		payload: MeetingPayload
	): Promise<boolean> {

		try {

			const {
				data,
				error
			} = await supabase
				.from("meetings")
				.select(
					"id, title, start_time, end_time"
				)
				.eq(
					"location",
					payload.location
				)
				.eq(
					"meeting_date",
					payload.meeting_date
				)
				.neq(
					"status",
					"Cancelled"
				)
				.or(
					`start_time.lte.${payload.end_time},end_time.gte.${payload.start_time}`
				);


			if (error) {
				throw error;
			}


			const conflicts =
				(data ?? []).filter(
					(existing) => {

						if (
							payload.id &&
							existing.id === payload.id
						) {
							return false;
						}

						return true;

					}
				);


			return conflicts.length > 0;

		}
		catch (error) {

			this.handleError(
				error,
				"Failed to check meeting conflict"
			);

		}

	}


	/* ==========================================================
	   CREATE / UPDATE MEETING
	========================================================== */

	async saveMeeting(
		meeting: MeetingPayload,
		user: User | null
	): Promise<Meeting | null> {

		try {

			if (
				!meeting.title ||
				!meeting.meeting_date ||
				!meeting.start_time ||
				!meeting.end_time
			) {

				toast.error(
					"Meeting title, date and time are required"
				);

				return null;

			}


			const hasConflict =
				await this.checkConflict(
					meeting
				);


			if (hasConflict) {

				toast.warning(
					"Room is already booked for this time slot"
				);

				return null;

			}


			const isUpdate =
				Boolean(meeting.id);


			const action =
				isUpdate
					? "UPDATE"
					: "CREATE";


			const {
				data,
				error
			} = await supabase
				.from("meetings")
				.upsert({
					...meeting,
					updated_at:
						new Date().toISOString()
				})
				.select()
				.single();


			if (error) {
				throw error;
			}


			const savedMeeting =
				data as Meeting;


			await this.loadMeetings();


			await writeAuditLog(
				supabase,
				user,
				{
					action,
					module: "Meeting",
					record_id:
						savedMeeting.id,
					description:
						`${isUpdate
							? "Updated"
							: "Created"} meeting: ${savedMeeting.title}`,
					new_data:
						savedMeeting
				}
			);


			toast.success(
				isUpdate
					? "Meeting updated"
					: "Meeting created"
			);


			return savedMeeting;

		}
		catch (error) {

			this.handleError(
				error,
				"Failed to save meeting"
			);

		}

	}


	/* ==========================================================
	   UPDATE STATUS
	========================================================== */

	async updateMeetingStatus(
		id: string,
		status: MeetingStatus,
		user: User | null
	): Promise<void> {

		try {

			const {
				error
			} = await supabase
				.from("meetings")
				.update({
					status,
					updated_at:
						new Date().toISOString()
				})
				.eq("id", id);


			if (error) {
				throw error;
			}


			await this.loadMeetings();


			await writeAuditLog(
				supabase,
				user,
				{
					action: "UPDATE",
					module: "Meeting",
					record_id: id,
					description:
						`Meeting status changed to ${status}`
				}
			);


			toast.success(
				`Meeting ${status}`
			);

		}
		catch (error) {

			this.handleError(
				error,
				"Failed to update meeting status"
			);

		}

	}


	/* ==========================================================
	   CANCEL MEETING
	========================================================== */

	async deleteMeeting(
		id: string,
		user: User | null
	): Promise<void> {

		try {

			const {
				error
			} = await supabase
				.from("meetings")
				.update({
					status: "Cancelled",
					updated_at:
						new Date().toISOString()
				})
				.eq("id", id);


			if (error) {
				throw error;
			}


			await this.loadMeetings();


			await writeAuditLog(
				supabase,
				user,
				{
					action: "DELETE",
					module: "Meeting",
					record_id: id,
					description:
						"Meeting cancelled"
				}
			);


			toast.success(
				"Meeting cancelled"
			);

		}
		catch (error) {

			this.handleError(
				error,
				"Failed to cancel meeting"
			);

		}

	}


	/* ==========================================================
	   UPDATE ATTENDEES
	========================================================== */

	async updateAttendees(
		meetingId: string,
		userIds: string[],
		user: User | null
	): Promise<void> {

		try {

			const {
				error: deleteError
			} = await supabase
				.from("meeting_attendees")
				.delete()
				.eq(
					"meeting_id",
					meetingId
				);


			if (deleteError) {
				throw deleteError;
			}


			const attendees =
				userIds.map(
					(userId) => ({
						meeting_id:
							meetingId,
						user_id:
							userId
					})
				);


			if (attendees.length > 0) {

				const {
					error: insertError
				} = await supabase
					.from("meeting_attendees")
					.insert(attendees);


				if (insertError) {
					throw insertError;
				}

			}


			await this.loadMeetings();


			await writeAuditLog(
				supabase,
				user,
				{
					action: "UPDATE",
					module: "Meeting",
					record_id:
						meetingId,
					description:
						`Updated attendees: ${userIds.length} members`
				}
			);


			toast.success(
				"Attendees updated"
			);

		}
		catch (error) {

			this.handleError(
				error,
				"Failed to update attendees"
			);

		}

	}


	/* ==========================================================
	   REFRESH
	========================================================== */

	async refresh(): Promise<void> {

		await this.loadMeetings();

	}

}


/* ==========================================================
   EXPORT
========================================================== */

export const meetingService =
	new MeetingService();

export default meetingService;