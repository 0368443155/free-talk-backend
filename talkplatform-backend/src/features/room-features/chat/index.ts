// Interfaces
export * from './interfaces';

// Enums
export * from './enums';

// DTOs - Export with explicit names to avoid conflicts
export { SendMessageDto } from './dto/send-message.dto';
export { EditMessageDto } from './dto/edit-message.dto';
export { DeleteMessageDto } from './dto/delete-message.dto';
export { ReactToMessageDto } from './dto/react-to-message.dto';

// Services
export * from './services/chat.service';
export * from './services/chat-moderation.service';
export * from './services/chat-history.service';

// Gateways
export * from './gateways/chat.gateway';

// Guards
export * from './guards';

// Module
export * from './chat.module';

