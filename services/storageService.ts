/**
 * Storage service for handling Supabase storage operations
 */

import { supabase } from '../supabase';
import { generateUploadFilename, getFileExtension, getMimeType } from '../utils/imageUtils';
import { logger } from '../utils/logger';

export class StorageService {
  private static readonly BUCKET_NAME = 'user_uploads';

  /**
   * Upload an image to Supabase storage
   */
  static async uploadImage(
    uri: string,
    userId: string
  ): Promise<{ url: string | null; error: Error | null }> {
    try {
      // Prepare file details
      const fileExt = getFileExtension(uri);
      const fileName = generateUploadFilename(userId, fileExt);
      const mimeType = getMimeType(fileExt);

      // Fetch the file data
      const response = await fetch(uri);
      const arrayBuffer = await response.arrayBuffer();

      // Upload to Supabase
      const { error: uploadError } = await supabase.storage
        .from(this.BUCKET_NAME)
        .upload(fileName, arrayBuffer, {
          contentType: mimeType,
          upsert: true,
        });

      // Handle duplicate uploads gracefully
      if (uploadError && !uploadError.message.includes('duplicate')) {
        throw uploadError;
      }

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from(this.BUCKET_NAME)
        .getPublicUrl(fileName);

      return { url: publicUrl, error: null };
    } catch (error: any) {
      logger.error('StorageService.uploadImage failed', error);
      return { url: null, error };
    }
  }

  /**
   * Delete an image from Supabase storage
   */
  static async deleteImage(
    filePath: string
  ): Promise<{ error: Error | null }> {
    try {
      const { error: deleteError } = await supabase.storage
        .from(this.BUCKET_NAME)
        .remove([filePath]);

      if (deleteError) throw deleteError;

      return { error: null };
    } catch (error: any) {
      logger.error('StorageService.deleteImage failed', error);
      return { error };
    }
  }

  /**
   * Get public URL for a file
   */
  static getPublicUrl(filePath: string): string {
    const { data: { publicUrl } } = supabase.storage
      .from(this.BUCKET_NAME)
      .getPublicUrl(filePath);

    return publicUrl;
  }

  /**
   * List files for a user
   */
  static async listUserFiles(
    userId: string
  ): Promise<{ files: any[] | null; error: Error | null }> {
    try {
      const { data, error } = await supabase.storage
        .from(this.BUCKET_NAME)
        .list(userId);

      if (error) throw error;

      return { files: data || [], error: null };
    } catch (error: any) {
      logger.error('StorageService.listUserFiles failed', error);
      return { files: null, error };
    }
  }
}
