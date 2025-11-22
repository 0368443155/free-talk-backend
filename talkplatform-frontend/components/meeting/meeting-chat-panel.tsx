"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Smile, Send, Loader2 } from "lucide-react";
import { IMeetingChatMessage } from "@/api/meeting.rest";

interface MeetingChatPanelProps {
  messages: IMeetingChatMessage[];
  isOnline: boolean;
  currentUserId: string;
  onSendMessage: (message: string) => Promise<void>;
  onSendReaction?: (emoji: string) => void;
}

export function MeetingChatPanel({
  messages,
  isOnline,
  currentUserId,
  onSendMessage,
  onSendReaction,
}: MeetingChatPanelProps) {
  const [newMessage, setNewMessage] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const chatInputRef = useRef<HTMLInputElement>(null);

  // Emoji list
  const EMOJI_LIST = [
    '😀', '😃', '😄', '😁', '😆', '😅', '🤣', '😂', '🙂', '🙃', '😉', '😊', 
    '😇', '🥰', '😍', '🤩', '😘', '😗', '👍', '👎', '👏', '🙌', '👋', '✌️', 
    '🤞', '🤟', '🤘', '👌', '🤌', '🤏', '✨', '🎉', '❤️', '💯', '🔥'
  ];

  const handleChatInputSend = useCallback(async () => {
    const trimmedMessage = newMessage.trim();
    if (!trimmedMessage || !isOnline || isSending) return;

    try {
      setIsSending(true);
      await onSendMessage(trimmedMessage);
      setNewMessage('');
      setTimeout(() => {
        chatInputRef.current?.focus();
      }, 100);
    } catch (error) {
      console.error('Failed to send message:', error);
    } finally {
      setIsSending(false);
    }
  }, [newMessage, isOnline, isSending, onSendMessage]);

  const handleChatInputKeyPress = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleChatInputSend();
    }
  }, [handleChatInputSend]);

  const handleEmojiClick = useCallback((emoji: string) => {
    setNewMessage(prev => prev + emoji);
    setShowEmojiPicker(false);
    chatInputRef.current?.focus();
  }, []);

  return (
    <div className="flex-1 flex flex-col h-full min-h-0 relative">
      {/* Chat disconnected banner */}
      {!isOnline && (
        <div className="bg-gray-700 px-3 py-2 text-xs text-yellow-300 text-center flex-shrink-0">
          Chat disconnected. Messages will send when reconnected.
        </div>
      )}

      {/* Messages area - Use MeetingChat for display only */}
      <div className="flex-1 min-h-0 overflow-hidden">
        <ScrollArea className="h-full p-3">
          <div className="space-y-1">
            {messages.map((message, index) => {
              // Handle system messages (join/leave notifications)
              if (!message.sender) {
                return (
                  <div key={message.id} className="w-full">
                    <div className="flex items-center gap-2 my-3">
                      <div className="flex-1 border-t border-gray-600"></div>
                      <div className="text-xs text-gray-400 bg-gray-800 px-3 py-1 rounded-full">
                        <span className="font-semibold text-blue-400">[System]</span> {message.message}
                      </div>
                      <div className="flex-1 border-t border-gray-600"></div>
                    </div>
                  </div>
                );
              }
              
              const prevMessage = index > 0 ? messages[index - 1] : null;
              const showHeader = !prevMessage || prevMessage.sender?.user_id !== message.sender.user_id;
              const messageTime = new Date(message.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});

              return (
                <div key={message.id} className="w-full">
                  {/* User name and time header */}
                  {showHeader && (
                    <div className="flex items-baseline gap-2 mb-1 mt-3">
                      <span className="text-sm font-semibold text-blue-400">
                        [{message.sender?.name || 'Unknown User'}]
                      </span>
                      <span className="text-xs text-gray-400">
                        - {messageTime}
                      </span>
                    </div>
                  )}
                  
                  {/* Message content */}
                  <div className="text-sm text-gray-200 ml-2 mb-1 break-words">
                    {message.message}
                  </div>
                </div>
              );
            })}
            
            {messages.length === 0 && (
              <div className="text-center text-gray-400 text-sm py-8">
                Start the conversation!
              </div>
            )}
          </div>
        </ScrollArea>
      </div>

      {/* Input area - Fixed at bottom */}
      <div className="flex items-center gap-2 p-3 bg-gray-800 border-t border-gray-700 flex-shrink-0 z-20">
        <div className="flex-1 relative">
          <Input
            ref={chatInputRef}
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyDown={handleChatInputKeyPress}
            placeholder={isOnline ? "Send a message to everyone" : "Join meeting to chat"}
            disabled={!isOnline || isSending}
            className="pl-4 pr-12 bg-gray-700 border-gray-600 text-white placeholder-gray-400 focus:border-blue-500 focus:ring-blue-500"
          />
          
          {/* Emoji picker button */}
          <Popover open={showEmojiPicker} onOpenChange={setShowEmojiPicker}>
            <PopoverTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white hover:bg-gray-600 w-8 h-8 p-0"
                disabled={!isOnline}
              >
                <Smile className="w-4 h-4" />
              </Button>
            </PopoverTrigger>
            <PopoverContent side="top" className="w-80 p-2 bg-gray-800 border-gray-700">
              <div className="grid grid-cols-8 gap-1">
                {EMOJI_LIST.map((emoji) => (
                  <Button
                    key={emoji}
                    variant="ghost"
                    size="sm"
                    className="w-8 h-8 p-0 text-lg hover:bg-gray-700"
                    onClick={() => handleEmojiClick(emoji)}
                  >
                    {emoji}
                  </Button>
                ))}
              </div>
            </PopoverContent>
          </Popover>
        </div>

        {/* Send button */}
        <Button
          onClick={handleChatInputSend}
          disabled={!newMessage.trim() || !isOnline || isSending}
          size="sm"
          className="px-3 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600"
        >
          {isSending ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Send className="w-4 h-4" />
          )}
        </Button>
      </div>
    </div>
  );
}

