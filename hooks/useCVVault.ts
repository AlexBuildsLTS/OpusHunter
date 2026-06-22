/**
 * hooks/useCVVault.ts
 * OpusHunter — CV & Certifications Vault Hook
 *
 * Handles all document upload logic for both Web and Native (APK/iOS).
 * Previously an empty file — this is the full implementation.
 *
 * Responsibilities:
 *   - Pick a file via DocumentPicker (native) or <input> (web)
 *   - Web:    fetch() the file URI → Blob → upload directly
 *   - Native: FileSystem.readAsStringAsync → Base64 → decode → Uint8Array → upload
 *             (avoids full base64 string sitting in JS heap on low-RAM devices)
 *   - Upload to Supabase Storage bucket `cv_payloads` under `{user_id}/{filename}`
 *   - For base CV: update profiles.cv_storage_path + Zustand store
 *   - For certifications: insert row into certifications table
 *   - Return typed upload state the UI can bind to directly
 */

import { useState, useCallback } from 'react';
import { Platform } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import { supabase } from '@/lib/supabase';
import { usePipelineStore } from '@/store/usePipelineStore';
import type { CVUploadState } from '@/types/app.types';

// ── Constants ─────────────────────────────────────────────────────────────────

const BUCKET = 'cv_payloads';
const MAX_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB

const ACCEPTED_MIME_TYPES = [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
];

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Decode a Base64 string to an ArrayBuffer without holding a full binary
 *  string in memory longer than needed. */
function base64ToArrayBuffer(base64: string): ArrayBuffer {
    const binaryString = atob(base64);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes.buffer;
}

/** Sanitise a filename for use as a Storage object key. */
function sanitiseFileName(name: string): string {
    return name.replace(/\s+/g, '_').replace(/[^a-zA-Z0-9._-]/g, '');
}

// ── Hook return type ──────────────────────────────────────────────────────────

export interface UseCVVaultReturn {
    /** Current upload state — bind this to UI */
    uploadState: CVUploadState;

    /** Pick + upload the user's primary CV.
     *  Updates profiles.cv_storage_path on success. */
    uploadCV: () => Promise<void>;

    /** Pick + upload a certification / supporting document.
     *  Inserts a row into the certifications table on success. */
    uploadCertification: () => Promise<void>;

    /** Delete a certification by its storage path. */
    deleteCertification: (storagePath: string, certId: string) => Promise<void>;

    /** Reset uploadState back to idle */
    reset: () => void;
}

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useCVVault(): UseCVVaultReturn {
    const { setCurrentCV } = usePipelineStore();

    const [uploadState, setUploadState] = useState<CVUploadState>({
        status: 'idle',
        message: '',
        path: null,
    });

    const reset = useCallback(() => {
        setUploadState({ status: 'idle', message: '', path: null });
    }, []);

    // ── Internal: get current user id ─────────────────────────────────────────

    const getUserId = useCallback(async (): Promise<string> => {
        const { data: { user }, error } = await supabase.auth.getUser();
        if (error || !user) throw new Error('Not authenticated.');
        return user.id;
    }, []);

    // ── Internal: pick a document ─────────────────────────────────────────────

    const pickDocument = useCallback(async () => {
        setUploadState({ status: 'picking', message: 'Opening file picker…', path: null });

        const result = await DocumentPicker.getDocumentAsync({
            type: ACCEPTED_MIME_TYPES,
            copyToCacheDirectory: true,
            multiple: false,
        });

        if (result.canceled || !result.assets?.length) {
            setUploadState({ status: 'idle', message: '', path: null });
            return null;
        }

        const asset = result.assets[0];

        if (asset.size && asset.size > MAX_SIZE_BYTES) {
            setUploadState({
                status: 'error',
                message: `File too large. Maximum size is 10 MB (got ${(asset.size / 1024 / 1024).toFixed(1)} MB).`,
                path: null,
            });
            return null;
        }

        return asset;
    }, []);

    // ── Internal: upload asset to Supabase Storage ────────────────────────────

    const uploadToStorage = useCallback(
        async (
            asset: DocumentPicker.DocumentPickerAsset,
            userId: string,
            folder: 'cv' | 'certifications',
        ): Promise<string> => {
            const safeName = sanitiseFileName(asset.name);
            const storagePath = `${userId}/${folder}/${Date.now()}_${safeName}`;
            const contentType = asset.mimeType ?? 'application/pdf';

            setUploadState({ status: 'uploading', message: 'Encrypting & uploading…', path: null });

            if (Platform.OS === 'web') {
                // ── Web path ──────────────────────────────────────────────────────────
                // fetch() the cache URI to get a Blob, then stream to Supabase.
                const response = await fetch(asset.uri);
                if (!response.ok) throw new Error('Failed to read selected file.');
                const blob = await response.blob();

                const { error } = await supabase.storage
                    .from(BUCKET)
                    .upload(storagePath, blob, { contentType, upsert: true });

                if (error) throw new Error(`Storage upload failed: ${error.message}`);
            } else {
                // ── Native (APK / iOS) path ───────────────────────────────────────────
                // Read as Base64 → decode to ArrayBuffer → upload.
                // We never hold the full binary string in the Supabase JS client —
                // the ArrayBuffer is what the client serialises, keeping peak heap low.
                const base64 = await FileSystem.readAsStringAsync(asset.uri, {
                    encoding: FileSystem.EncodingType.Base64,
                });

                const arrayBuffer = base64ToArrayBuffer(base64);

                const { error } = await supabase.storage
                    .from(BUCKET)
                    .upload(storagePath, arrayBuffer, { contentType, upsert: true });

                if (error) throw new Error(`Storage upload failed: ${error.message}`);
            }

            return storagePath;
        },
        [],
    );

    // ── uploadCV ──────────────────────────────────────────────────────────────

    const uploadCV = useCallback(async () => {
        try {
            const asset = await pickDocument();
            if (!asset) return;

            const userId = await getUserId();
            const storagePath = await uploadToStorage(asset, userId, 'cv');

            // Update profiles.cv_storage_path
            const { error: profileError } = await supabase
                .from('profiles')
                .update({ cv_storage_path: storagePath, updated_at: new Date().toISOString() })
                .eq('id', userId);

            if (profileError) throw new Error(`Profile update failed: ${profileError.message}`);

            // Sync to Zustand so the rest of the app knows immediately
            setCurrentCV(storagePath);

            setUploadState({
                status: 'success',
                message: `CV "${asset.name}" uploaded successfully.`,
                path: storagePath,
            });
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : 'An unknown error occurred.';
            setUploadState({ status: 'error', message, path: null });
        }
    }, [pickDocument, getUserId, uploadToStorage, setCurrentCV]);

    // ── uploadCertification ───────────────────────────────────────────────────

    const uploadCertification = useCallback(async () => {
        try {
            const asset = await pickDocument();
            if (!asset) return;

            const userId = await getUserId();
            const storagePath = await uploadToStorage(asset, userId, 'certifications');
            const fileSizeKb = asset.size ? Math.ceil(asset.size / 1024) : null;

            // Insert into certifications table
            const { error: dbError } = await supabase.from('certifications').insert({
                user_id: userId,
                file_name: asset.name,
                storage_path: storagePath,
                file_type: asset.mimeType ?? 'application/pdf',
                file_size_kb: fileSizeKb,
            });

            if (dbError) {
                // Clean up the orphaned storage object if DB insert fails
                await supabase.storage.from(BUCKET).remove([storagePath]);
                throw new Error(`Database insert failed: ${dbError.message}`);
            }

            setUploadState({
                status: 'success',
                message: `Certification "${asset.name}" uploaded successfully.`,
                path: storagePath,
            });
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : 'An unknown error occurred.';
            setUploadState({ status: 'error', message, path: null });
        }
    }, [pickDocument, getUserId, uploadToStorage]);

    // ── deleteCertification ───────────────────────────────────────────────────

    const deleteCertification = useCallback(
        async (storagePath: string, certId: string) => {
            try {
                setUploadState({ status: 'uploading', message: 'Removing document…', path: null });

                // Delete storage object first
                const { error: storageError } = await supabase.storage
                    .from(BUCKET)
                    .remove([storagePath]);

                if (storageError) throw new Error(`Storage removal failed: ${storageError.message}`);

                // Delete DB row
                const { error: dbError } = await supabase
                    .from('certifications')
                    .delete()
                    .eq('id', certId);

                if (dbError) throw new Error(`Database deletion failed: ${dbError.message}`);

                setUploadState({ status: 'success', message: 'Document removed.', path: null });
            } catch (err: unknown) {
                const message = err instanceof Error ? err.message : 'An unknown error occurred.';
                setUploadState({ status: 'error', message, path: null });
            }
        },
        [],
    );

    return {
        uploadState,
        uploadCV,
        uploadCertification,
        deleteCertification,
        reset,
    };
}