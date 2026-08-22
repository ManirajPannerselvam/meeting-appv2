/**
 * ============================================================
 * Temple Operations Reporting System
 * File        : src/lib/services/storage.service.ts
 * Author      : Your Name
 * Created     : YYYY-MM-DD
 * ============================================================
 * PURPOSE
 *   Supabase Storage business logic.
 *
 * DESCRIPTION
 *   - Upload File
 *   - Download File
 *   - Get Public URL
 *   - Get Signed URL
 *   - Delete File
 *
 * USED BY
 *   Temple Chat
 *   Meeting Minutes
 *   Report Attachments
 *   User Profile Images
 * ============================================================
 */

import { supabase } from '$lib/supabase/client';

class StorageService {
	/**
	 * Upload file
	 */
	async upload(
		bucket: string,
		path: string,
		file: File
	) {
		const { data, error } = await supabase.storage
			.from(bucket)
			.upload(path, file, {
				upsert: true
			});

		if (error) throw error;

		return data;
	}

	/**
	 * Download file
	 */
	async download(
		bucket: string,
		path: string
	) {
		const { data, error } = await supabase.storage
			.from(bucket)
			.download(path);

		if (error) throw error;

		return data;
	}

	/**
	 * Get public URL
	 */
	getPublicUrl(
		bucket: string,
		path: string
	): string {
		const { data } = supabase.storage
			.from(bucket)
			.getPublicUrl(path);

		return data.publicUrl;
	}

	/**
	 * Create signed URL
	 */
	async createSignedUrl(
		bucket: string,
		path: string,
		expiresIn = 3600
	) {
		const { data, error } = await supabase.storage
			.from(bucket)
			.createSignedUrl(path, expiresIn);

		if (error) throw error;

		return data.signedUrl;
	}

	/**
	 * Delete file
	 */
	async delete(
		bucket: string,
		path: string
	) {
		const { error } = await supabase.storage
			.from(bucket)
			.remove([path]);

		if (error) throw error;
	}
}

export const storageService = new StorageService();

export default storageService;