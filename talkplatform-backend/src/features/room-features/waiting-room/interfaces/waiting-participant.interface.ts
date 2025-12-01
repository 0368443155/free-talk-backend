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

// AdmissionStatus is exported from enums, not here

