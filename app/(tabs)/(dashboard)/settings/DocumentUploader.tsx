/**
 * components/vault/DocumentUploader.tsx
 * OpusHunter — Document Upload Modal (Refined).
 * Uploads CVs to 'resumes' bucket, Certifications to 'certifications' bucket.
 * Supports MULTIPLE certifications (infinite uploads). Triggers AI extraction for CVs.
 * Uses correct MIME types for PDF/DOCX/Images.
 */

import React, { useState } from "react";
import { View, Text, StyleSheet } from "react-native";
import * as DocumentPicker from "expo-document-picker";
import { supabase } from "../../../../lib/supabase";
import { useAuthStore } from "../../../../stores/authStore";
import { useQueryClient } from "@tanstack/react-query";
import { Modal } from "../../../../components/ui/Modal";
import { Button } from "../../../../components/ui/Button";
import { Typography } from "../../../../components/ui/Typography";
import { LoadingOverlay } from "../../../../components/ui/LoadingOverlay";
import { colors } from "../../../../constants/theme";

/** Props for the DocumentUploader modal component. */
interface DocumentUploaderProps {
  visible: boolean;
  type: "cv" | "certification";
  onClose: () => void;
}

export default function DocumentUploaderScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Document Uploader</Text>
      <Text style={styles.subtitle}>
        Upload resumes and certifications to your vault.
      </Text>
    </View>
  );
}

export function DocumentUploader({
  visible,
  type,
  onClose,
}: DocumentUploaderProps) {
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const [loading, setLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handlePickAndUpload = async () => {
    if (!user) return;
    setError(null);
    setStatusMessage(null);
    setLoading(true);

    try {
      // 1. Pick documents (supports multiple files at once)
      const result = await DocumentPicker.getDocumentAsync({
        type:
          type === "cv"
            ? [
                "application/pdf",
                "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
              ]
            : ["application/pdf", "image/jpeg", "image/png", "image/webp"],
        copyToCacheDirectory: true,
        multiple: true,
      });

      if (result.canceled || !result.assets || result.assets.length === 0) {
        setLoading(false);
        return;
      }

      const totalFiles = result.assets.length;
      const bucket = type === "cv" ? "resumes" : "certifications";
      const table = type === "cv" ? "resume_documents" : "certifications";
      const uploadedCVPaths: string[] = [];
      const uploadedCertificationPaths: string[] = [];

      for (let i = 0; i < totalFiles; i++) {
        const asset = result.assets[i];
        const maxBytes = type === "cv" ? 10 * 1024 * 1024 : 20 * 1024 * 1024;
        if (asset.size && asset.size > maxBytes) {
          throw new Error(
            `${asset.name} is larger than the ${type === "cv" ? "10 MB CV" : "20 MB certification"} limit.`,
          );
        }
        setStatusMessage(`Uploading ${i + 1} of ${totalFiles}: ${asset.name}`);

        const sanitizedName = asset.name.replace(/[^a-zA-Z0-9._-]/g, "_");
        const path = `${user.id}/${Date.now()}-${i}-${sanitizedName}`;

        // 2. Upload to Supabase Storage
        const fileResponse = await fetch(asset.uri);
        const fileBlob = await fileResponse.blob();

        const { error: uploadError } = await supabase.storage
          .from(bucket)
          .upload(path, fileBlob, {
            contentType: asset.mimeType || "application/octet-stream",
            upsert: false,
          });

        if (uploadError) throw uploadError;

        // 3. Insert metadata row
        const baseInsert = {
          user_id: user.id,
          storage_path: path,
          file_name: asset.name,
          file_type: asset.mimeType || "application/octet-stream",
          file_size_kb: Math.round((asset.size || 0) / 1024),
        };

        const { error: dbError } = await supabase.from(table).insert(
          type === "cv"
            ? ({
                ...baseInsert,
                is_primary: false,
                extraction_status: "pending",
              } as any)
            : baseInsert,
        );

        if (dbError) throw dbError;

        if (type === "cv") {
          uploadedCVPaths.push(path);
        } else {
          uploadedCertificationPaths.push(path);
        }
      }

      // 4. Trigger AI Context Extraction if it's a CV
      if (type === "cv" && uploadedCVPaths.length > 0) {
        for (let i = 0; i < uploadedCVPaths.length; i++) {
          setStatusMessage(
            `Extracting CV ${i + 1} of ${uploadedCVPaths.length}: verified skills, experience, and education...`,
          );
          const { error: extractionError } = await supabase.functions.invoke(
            "extract-context",
            {
              body: {
                userId: user.id,
                documentPath: uploadedCVPaths[i],
                bucket,
              },
            },
          );
          if (extractionError) throw extractionError;
        }
      } else if (uploadedCertificationPaths.length > 0) {
        for (const documentPath of uploadedCertificationPaths) {
          setStatusMessage("Extracting certification details with AI...");
          const { error: extractionError } = await supabase.functions.invoke(
            "extract-context",
            {
              body: {
                userId: user.id,
                documentPath,
                bucket,
              },
            },
          );
          if (extractionError) throw extractionError;
        }
      }

      // 5. Invalidate queries (refresh list)
      const queryKey = type === "cv" ? "resume-documents" : "certifications";
      await queryClient.invalidateQueries({
        queryKey: [queryKey, user.id],
      });

      onClose();
    } catch (err: any) {
      setError(err.message || "Upload failed");
    } finally {
      setLoading(false);
      setStatusMessage(null);
    }
  };

  return (
    <>
      <LoadingOverlay
        visible={loading}
        message={
          statusMessage ||
          (type === "cv"
            ? "Uploading CV & Extracting..."
            : "Uploading Certification...")
        }
      />
      <Modal
        visible={visible}
        onClose={onClose}
        title={type === "cv" ? "Upload CV(s)" : "Add Certification(s)"}
      >
        <View style={styles.container}>
          <Typography
            variant="bodySm"
            color="secondary"
            textAlign="center"
            style={styles.hint}
          >
            {type === "cv"
              ? "Supported: PDF, DOCX (Max 10 MB). Select one or multiple resumes to store in your vault."
              : "Supported: PDF, PNG, JPG, WEBP (Max 20 MB). Select single or multiple certificates to upload."}
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
            {type === "cv" ? "Select CV(s)" : "Select Certificate(s)"}
          </Button>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  container: { gap: 16 },
  title: {
    fontSize: 22,
    fontWeight: "700",
    color: colors.text.primary,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: colors.text.secondary,
    lineHeight: 20,
  },
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
