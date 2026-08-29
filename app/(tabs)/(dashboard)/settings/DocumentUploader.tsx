/**
 * components/vault/DocumentUploader.tsx
 * OpusHunter — Document Upload Modal (Refined).
 * Uploads CVs to 'resumes' bucket, Certifications to 'certifications' bucket.
 * Supports MULTIPLE certifications (infinite uploads). Triggers AI extraction for CVs.
 * Uses correct MIME types for PDF/DOCX/Images.
 */

import React, { useState } from "react";
import { View, StyleSheet } from "react-native";
import * as DocumentPicker from "expo-document-picker";
import { supabase } from "../../../../lib/supabase";
import { useAuthStore } from "../../../../stores/authStore";
import { useQueryClient } from "@tanstack/react-query";
import { Modal } from "../../../../components/ui/Modal";
import { Button } from "../../../../components/ui/Button";
import { Typography } from "../../../../components/ui/Typography";
import { LoadingOverlay } from "../../../../components/ui/LoadingOverlay";
import { colors } from "../../../../constants/theme";

interface DocumentUploaderProps {
  visible: boolean;
  type: "cv" | "cert";
  onClose: () => void;
}

export function DocumentUploader({
  visible,
  type,
  onClose,
}: DocumentUploaderProps) {
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handlePickAndUpload = async () => {
    if (!user) return;
    setError(null);
    setLoading(true);

    try {
      // 1. Pick document (single file per upload)
      const result = await DocumentPicker.getDocumentAsync({
        type:
          type === "cv"
            ? [
                "application/pdf",
                "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
              ]
            : ["application/pdf", "image/jpeg", "image/png", "image/webp"],
        copyToCacheDirectory: true,
        multiple: false, // Allow multiple adds via repeated uploads
      });

      if (result.canceled) {
        setLoading(false);
        return;
      }

      const asset = result.assets[0];
      const bucket = type === "cv" ? "resumes" : "certifications";
      const table = type === "cv" ? "resume_documents" : "certifications";
      const path = `${user.id}/${Date.now()}-${asset.name}`;

      // 2. Upload to Supabase Storage
      const fileResponse = await fetch(asset.uri);
      const fileBlob = await fileResponse.blob();

      const { error: uploadError } = await supabase.storage
        .from(bucket)
        .upload(path, fileBlob, {
          contentType: asset.mimeType,
          upsert: false,
        });

      if (uploadError) throw uploadError;

      // 3. Insert metadata row
      const baseInsert = {
        user_id: user.id,
        storage_path: path,
        file_name: asset.name,
        file_type: asset.mimeType,
        file_size_kb: Math.round((asset.size || 0) / 1024),
      };

      const { error: dbError } = await supabase
        .from(table)
        .insert(
          type === "cv"
            ? ({
                ...baseInsert,
                is_primary: false,
                extraction_status: "pending",
              } as any)
            : baseInsert,
        );

      if (dbError) throw dbError;

      // 4. Trigger AI Context Extraction if it's a CV
      if (type === "cv") {
        await supabase.functions.invoke("extract-context", {
          body: { userId: user.id, documentPath: path, bucket },
        });
      }

      // 5. Invalidate queries (refresh list)
      const queryKey = type === "cv" ? "resumes" : "certs";
      await queryClient.invalidateQueries({ queryKey: [queryKey, user.id] });

      onClose();
    } catch (err: any) {
      setError(err.message || "Upload failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <LoadingOverlay
        visible={loading}
        message={
          type === "cv"
            ? "Uploading CV & Extracting..."
            : "Uploading Certification..."
        }
      />
      <Modal
        visible={visible}
        onClose={onClose}
        title={type === "cv" ? "Upload CV" : "Add Certification"}
      >
        <View style={styles.container}>
          <Typography
            variant="bodySm"
            color="secondary"
            textAlign="center"
            style={styles.hint}
          >
            {type === "cv"
              ? "Supported: PDF, DOCX (Max 10 MB). The AI will extract your skills and achievements."
              : "Supported: PDF, PNG, JPG, WEBP (Max 20 MB). You can add multiple certifications."}
          </Typography>

          {error && (
            <View style={styles.errorBox}>
              <Typography variant="bodySm" color="error">
                {error}
              </Typography>
            </View>
          )}

          <Button
            onPress={handlePickAndUpload}
            loading={loading}
            style={styles.btn}
          >
            Select File
          </Button>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  container: { gap: 16 },
  hint: { marginBottom: 8 },
  errorBox: {
    backgroundColor: "rgba(248,113,113,0.1)",
    borderWidth: 1,
    borderColor: "rgba(248,113,113,0.3)",
    borderRadius: 8,
    padding: 12,
  },
  btn: { width: "100%" },
});
