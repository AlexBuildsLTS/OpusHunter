/**
 * types/emailLinking.types.ts
 * TypeScript interfaces for email account linking and OAuth flows
 */

export interface OAuthLinkingRequest {
  userId: string;
  provider: "google" | "outlook";
  authCode: string;
  redirectUri: string;
}

export interface OAuthLinkingResponse {
  success: boolean;
  email?: string;
  provider?: "google" | "outlook";
  scopes?: string[];
  message?: string;
  error?: string;
}

export interface ConnectedEmailAccount {
  id: string;
  user_id: string;
  provider: "google" | "outlook";
  email: string;
  refresh_token: string; // Encrypted in DB
  scopes: string[];
  is_primary_sender: boolean;
  connected_at: string;
  updated_at: string;
  revoked_at?: string;
}

export interface TokenRefreshResult {
  accessToken: string;
  expiresIn: number; // seconds
  scope: string;
  tokenType: "Bearer";
}

export interface EmailScopeValidation {
  hasGmailSend: boolean;
  hasMSMailSend: boolean;
  valid: boolean;
  scopes: string[];
}

export interface EmailSubmissionPayload {
  to: string;
  subject: string;
  body: string;
  attachments?: Array<{
    filename: string;
    content: string; // Base64
    contentType: string;
  }>;
}

export interface EmailSubmissionResult {
  success: boolean;
  method: "gmail_send" | "outlook_send" | "handoff";
  confirmationId?: string;
  messageId?: string;
  message: string;
  error?: string;
}

export interface GenericFormHandoffPayload {
  success: boolean;
  method: "generic_prepare_handoff";
  payload: {
    openUrl: string;
    prefilledData: {
      firstName: string;
      lastName: string;
      email: string;
      phone?: string;
    };
    readyToPaste: string; // Cover letter body
    resumeReady: {
      fileName: string;
      sizeKb: number;
      note: string;
    };
    steps: string[];
  };
}
