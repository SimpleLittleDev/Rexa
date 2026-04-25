export interface ChatMessage {
  userId: string;
  text: string;
  files?: Array<{ name: string; path: string }>;
  metadata?: Record<string, unknown>;
}

export type MessageHandler = (message: ChatMessage) => Promise<void> | void;

export interface ChatProvider {
  name: string;
  start(): Promise<void>;
  sendMessage(userId: string, message: string): Promise<void>;
  sendImage?(userId: string, image: { path: string; caption?: string }): Promise<void>;
  onMessage(handler: MessageHandler): void;
}
