/**
 * Waiting participant interface
 */
export interface WaitingParticipant {
  userId: string;
  username: string;
  email: string;
  joinedAt: Date;
  socketId?: string;
}

/**
 * Admission status enum
 */
export enum AdmissionStatus {
  PENDING = 'pending',
  ADMITTED = 'admitted',
  DENIED = 'denied',
}

