/**
 * Uploads Module - R2 File Upload and Management
 * 
 * This module handles:
 * 1. Uploading files to R2 bucket
 * 2. Generating signed URLs for secure file access
 * 3. Deleting files from R2
 * 4. File validation (type and size)
 * 
 * Supports images and documents up to 10MB for feedback attachments.
 */

// Supported file types and their MIME types
const ALLOWED_FILE_TYPES = {
  // Images
  'image/jpeg': ['.jpg', '.jpeg'],
  'image/png': ['.png'],
  'image/gif': ['.gif'],
  'image/webp': ['.webp'],
  // Documents
  'application/pdf': ['.pdf'],
  'application/msword': ['.doc'],
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx']
};

// Maximum file size: 10MB
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB in bytes

/**
 * Validate file type and size
 * 
 * @param {Object} file - File object with name, type, data
 * @returns {Object} - {valid: boolean, error?: string}
 */
function validateFile(file) {
  // Check if file exists
  if (!file || !file.name || !file.type || !file.data) {
    return { valid: false, error: 'Invalid file object' };
  }

  // Check file type
  const allowedExtensions = Object.values(ALLOWED_FILE_TYPES).flat();
  const fileExtension = '.' + file.name.split('.').pop().toLowerCase();
  
  if (!allowedExtensions.includes(fileExtension)) {
    return { 
      valid: false, 
      error: `File type not allowed. Supported types: ${allowedExtensions.join(', ')}` 
    };
  }

  // Verify MIME type matches extension
  const mimeType = file.type.toLowerCase();
  const expectedExtensions = ALLOWED_FILE_TYPES[mimeType];
  
  if (!expectedExtensions || !expectedExtensions.includes(fileExtension)) {
    return { 
      valid: false, 
      error: 'File extension does not match MIME type' 
    };
  }

  // Check file size
  const fileSize = file.data.byteLength || file.data.size || 0;
  
  if (fileSize > MAX_FILE_SIZE) {
    const sizeMB = (fileSize / (1024 * 1024)).toFixed(2);
    return { 
      valid: false, 
      error: `File too large (${sizeMB}MB). Maximum size is 10MB` 
    };
  }

  if (fileSize === 0) {
    return { valid: false, error: 'File is empty' };
  }

  return { valid: true };
}

/**
 * Upload a file to R2 bucket
 * 
 * Generates a unique key, validates the file, and uploads it to R2 with metadata.
 * 
 * @param {Object} file - File object with {name, type, data}
 * @param {number} feedbackId - ID of the feedback this file is attached to
 * @param {Object} env - Worker environment with BUCKET binding
 * @returns {Promise<string>} - The R2 object key
 */
export async function uploadFile(file, feedbackId, env) {
  try {
    console.log(`📤 Uploading file "${file.name}" for feedback ${feedbackId}...`);

    // Validate file
    const validation = validateFile(file);
    if (!validation.valid) {
      throw new Error(validation.error);
    }

    // Generate unique key
    const timestamp = Date.now();
    const sanitizedFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
    const key = `feedback-${feedbackId}-${timestamp}-${sanitizedFileName}`;

    console.log(`🔑 Generated key: ${key}`);

    // Prepare metadata
    const metadata = {
      contentType: file.type,
      feedbackId: feedbackId.toString(),
      uploadedAt: new Date().toISOString(),
      originalName: file.name,
      size: (file.data.byteLength || file.data.size || 0).toString()
    };

    // Upload to R2
    await env.BUCKET.put(key, file.data, {
      httpMetadata: {
        contentType: file.type
      },
      customMetadata: metadata
    });

    console.log(`✅ Successfully uploaded file: ${key}`);
    return key;

  } catch (error) {
    console.error('❌ Error uploading file:', error);
    throw new Error(`File upload failed: ${error.message}`);
  }
}

/**
 * Generate a signed URL for accessing a file
 * 
 * Creates a temporary public URL that expires after 1 hour.
 * This allows secure file access without making the bucket public.
 * 
 * Note: R2 doesn't natively support signed URLs like S3. This function
 * returns a direct R2 URL. For production, you may want to implement
 * a proxy endpoint or use R2 custom domains with signed URLs.
 * 
 * @param {string} key - R2 object key
 * @param {Object} env - Worker environment with BUCKET binding
 * @returns {Promise<string>} - Public URL to access the file
 */
export async function getFileUrl(key, env) {
  try {
    console.log(`🔗 Generating URL for file: ${key}`);

    // Check if file exists
    const object = await env.BUCKET.head(key);
    
    if (!object) {
      throw new Error('File not found');
    }

    // For R2, we'll return a URL that can be accessed through the Worker
    // In production, you'd typically use a custom domain or proxy endpoint
    const url = `/api/files/${encodeURIComponent(key)}`;

    console.log(`✅ Generated URL: ${url}`);
    return url;

  } catch (error) {
    console.error('❌ Error generating file URL:', error);
    throw new Error(`Failed to generate file URL: ${error.message}`);
  }
}

/**
 * Delete a file from R2 bucket
 * 
 * Permanently removes the file from storage.
 * 
 * @param {string} key - R2 object key to delete
 * @param {Object} env - Worker environment with BUCKET binding
 * @returns {Promise<Object>} - {success: boolean, key: string}
 */
export async function deleteFile(key, env) {
  try {
    console.log(`🗑️ Deleting file: ${key}`);

    // Delete from R2
    await env.BUCKET.delete(key);

    console.log(`✅ Successfully deleted file: ${key}`);
    return { success: true, key };

  } catch (error) {
    console.error('❌ Error deleting file:', error);
    throw new Error(`File deletion failed: ${error.message}`);
  }
}

/**
 * Get file metadata without downloading the file
 * 
 * @param {string} key - R2 object key
 * @param {Object} env - Worker environment with BUCKET binding
 * @returns {Promise<Object>} - File metadata
 */
export async function getFileMetadata(key, env) {
  try {
    const object = await env.BUCKET.head(key);
    
    if (!object) {
      throw new Error('File not found');
    }

    return {
      key,
      size: object.size,
      uploadedAt: object.uploaded,
      contentType: object.httpMetadata?.contentType,
      customMetadata: object.customMetadata
    };

  } catch (error) {
    console.error('❌ Error getting file metadata:', error);
    throw new Error(`Failed to get file metadata: ${error.message}`);
  }
}

/**
 * Download file from R2
 * 
 * Retrieves the actual file data for serving to users.
 * 
 * @param {string} key - R2 object key
 * @param {Object} env - Worker environment with BUCKET binding
 * @returns {Promise<Object>} - {data: ReadableStream, contentType: string}
 */
export async function downloadFile(key, env) {
  try {
    console.log(`⬇️ Downloading file: ${key}`);

    const object = await env.BUCKET.get(key);
    
    if (!object) {
      throw new Error('File not found');
    }

    return {
      data: object.body,
      contentType: object.httpMetadata?.contentType || 'application/octet-stream',
      size: object.size,
      metadata: object.customMetadata
    };

  } catch (error) {
    console.error('❌ Error downloading file:', error);
    throw new Error(`File download failed: ${error.message}`);
  }
}
