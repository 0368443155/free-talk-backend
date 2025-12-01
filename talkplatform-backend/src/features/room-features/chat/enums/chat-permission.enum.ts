/**
 * Chat permission enum
 */
export enum ChatPermission {
  /** Can send messages */
  SEND = 'send',
  
  /** Can edit own messages */
  EDIT = 'edit',
  
  /** Can delete own messages */
  DELETE = 'delete',
  
  /** Can moderate chat */
  MODERATE = 'moderate',
  
  /** Can send private messages */
  PRIVATE = 'private',
  
  /** Can share files */
  FILE_SHARE = 'file_share',
}

