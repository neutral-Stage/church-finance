# Document Handling Setup and Troubleshooting Guide

## Overview

The ledger entries system now supports document upload, preview, and download functionality. This guide covers the setup requirements and troubleshooting steps.

## Fixed Issues

### 1. Document Preview Not Showing in Edit Modals
**Problem:** When editing existing ledger entries with uploaded documents, the document previews were not displaying.

**Root Cause:** 
- Document data was being loaded correctly but not properly displayed in the UI
- State management issues with `existingDocument` vs `document` properties
- Missing error handling for image loading

**Solution:**
- Enhanced `DocumentDisplay` component with better state management
- Added proper error handling for image loading
- Improved console logging for debugging
- Added visual feedback for document interactions

### 2. Document View/Download Functionality
**Problem:** Users couldn't view or download existing uploaded documents.

**Solution:**
- Implemented `handleDocumentClick` function with support for both new and existing documents
- Added proper error handling with user feedback via toasts
- Enhanced document preview with hover states and visual cues
- Added support for both image viewing (in new tab) and file downloading

### 3. File Upload State Management
**Problem:** File uploads were not properly updating the UI state.

**Solution:**
- Improved `handleFileUpload` function with better state updates
- Added immediate user feedback via toast notifications
- Enhanced logging for better debugging
- Fixed state preservation between new and existing documents

## Required Supabase Setup

### 1. Storage Bucket Configuration

Create a storage bucket named `documents` in your Supabase dashboard with the following settings:

```sql
-- Storage bucket policies for 'documents' bucket
-- Run these in the Supabase SQL editor

-- Create the bucket (if not exists)
INSERT INTO storage.buckets (id, name, public)
VALUES ('documents', 'documents', false)
ON CONFLICT (id) DO NOTHING;

-- Policy: Allow authenticated users to upload files
CREATE POLICY "Allow authenticated users to upload files" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'documents' AND 
  auth.role() = 'authenticated'
);

-- Policy: Allow authenticated users to view files
CREATE POLICY "Allow authenticated users to view files" ON storage.objects
FOR SELECT USING (
  bucket_id = 'documents' AND 
  auth.role() = 'authenticated'
);

-- Policy: Allow authenticated users to update files
CREATE POLICY "Allow authenticated users to update files" ON storage.objects
FOR UPDATE WITH CHECK (
  bucket_id = 'documents' AND 
  auth.role() = 'authenticated'
);

-- Policy: Allow authenticated users to delete files
CREATE POLICY "Allow authenticated users to delete files" ON storage.objects
FOR DELETE USING (
  bucket_id = 'documents' AND 
  auth.role() = 'authenticated'
);
```

### 2. Database Schema

The following tables and columns are required:

- `bills` table with document columns:
  - `document_url` (TEXT) - Storage path to the document
  - `document_name` (TEXT) - Original filename
  - `document_size` (INTEGER) - File size in bytes
  - `document_type` (VARCHAR) - MIME type
  - `document_uploaded_at` (TIMESTAMP) - Upload timestamp

## Testing the Document Workflow

### 1. Upload Test
1. Create a new ledger entry
2. Add a bill
3. Upload a document (PDF, image, or Office document)
4. Verify the document appears with preview thumbnail
5. Save the ledger entry

### 2. Edit/Preview Test
1. Open an existing ledger entry with documents
2. Verify existing documents show with "Uploaded" status
3. Click on document to view/download
4. Verify images open in new tab
5. Verify other files download correctly

### 3. Replace Document Test
1. Open existing bill with document
2. Click "Replace" button (Upload icon)
3. Select new file
4. Verify old document is replaced with new one

### 4. Remove Document Test
1. Open existing bill with document
2. Click "Remove" button (X icon)
3. Verify document is removed from UI
4. Save and verify removal persists

## File Support

### Supported File Types
- PDF files (`application/pdf`)
- Images (`image/jpeg`, `image/png`, `image/gif`)
- Word documents (`application/msword`, `.docx`)
- Excel files (`application/vnd.ms-excel`, `.xlsx`)

### File Size Limits
- Maximum file size: 10MB per document
- Images are automatically previewed as thumbnails
- Other files show generic file icons

## Troubleshooting

### Common Issues

1. **Documents not uploading**
   - Check Supabase storage bucket exists
   - Verify storage policies are configured
   - Check file size limits
   - Verify file type is supported

2. **Documents not displaying in edit mode**
   - Check browser console for errors
   - Verify document URLs are valid in database
   - Check storage bucket permissions
   - Verify signed URL generation is working

3. **Download failures**
   - Check storage bucket access policies
   - Verify file exists in storage
   - Check network connectivity
   - Verify user authentication

### Debug Information

The application includes extensive console logging for debugging:
- Document loading operations
- File upload states
- Preview generation
- Error conditions

Enable browser developer tools to see detailed logs with prefixes:
- 🔄 File operations
- 📄 Document processing  
- ✅ Success operations
- ❌ Error conditions

## Component Structure

### Key Components
- `ComprehensiveLedgerDialog` - Main dialog with document handling
- `DocumentDisplay` - Document preview and interaction component
- `BillForm` - Individual bill with document support

### Key Functions
- `loadEntryData()` - Loads existing document data
- `handleFileUpload()` - Processes new file uploads
- `handleDocumentClick()` - Handles view/download actions
- `getDocumentUrl()` - Creates signed URLs for viewing
- `downloadDocument()` - Handles file downloads

## Future Enhancements

1. **Document Versioning** - Support for multiple versions of the same document
2. **Bulk Upload** - Upload multiple documents at once
3. **Document Categories** - Organize documents by type (invoice, receipt, etc.)
4. **OCR Integration** - Extract text from uploaded images and PDFs
5. **Document Search** - Search within document contents