"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ArrowDown, Send, Loader2, Smile } from "lucide-react";
import { format, isToday, isYesterday } from "date-fns";
import { IMeetingChatMessage, MessageType } from "@/api/meeting.rest";

interface MeetingChatProps {
  messages: IMeetingChatMessage[];
  isOnline: boolean;
  currentUserId: string;
  onSendMessage: (message: string) => void;
  onSendReaction?: (emoji: string) => void;
}

// Popular emojis organized by categories
const EMOJI_CATEGORIES = {
  smileys: ['😀', '😃', '😄', '😁', '😆', '😅', '🤣', '😂', '🙂', '🙃', '😉', '😊', '😇', '🥰', '😍', '🤩', '😘', '😗', '😚', '😙', '😋', '😛', '😜', '🤪', '😝', '🤑', '🤗', '🤭', '🤫', '🤔', '😐', '😑', '😶', '😏', '😒', '🙄', '😬', '🤐', '😌', '😔', '😪', '🤤', '😴', '😷', '🤒', '🤕', '🤢', '🤮', '🤧', '🥵', '🥶', '😶‍🌫️', '😵', '😵‍💫', '🤯', '🤠', '🥳', '🥸', '😎', '🤓', '🧐', '😕', '😟', '🙁', '☹️', '😮', '😯', '😲', '😳', '🥺', '😦', '😧', '😨', '😰', '😥', '😢', '😭', '😱', '😖', '😣', '😞', '😓', '😩', '😫', '🥱', '😤', '😡', '😠', '🤬', '😈', '👿', '💀', '☠️', '💩', '🤡', '👹', '👺', '👻', '👽', '👾', '🤖', '😺', '😸', '😹', '😻', '😼', '😽', '🙀', '😿', '😾'],
  gestures: ['👋', '🤚', '🖐', '✋', '🖖', '👌', '🤌', '🤏', '✌️', '🤞', '🤟', '🤘', '🤙', '👈', '👉', '👆', '🖕', '👇', '☝️', '👍', '👎', '✊', '👊', '🤛', '🤜', '👏', '🙌', '👐', '🤲', '🤝', '🙏', '✍️', '💪', '🦾', '🦿', '🦵', '🦶', '👂', '🦻', '👃', '🧠', '🫀', '🫁', '🦷', '🦴', '👀', '👁️', '👅', '👄'],
  hearts: ['❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '🤎', '💔', '❣️', '💕', '💞', '💓', '💗', '💖', '💘', '💝', '💟', '☮️', '✝️', '☪️', '🕉', '☸️', '✡️', '🔯', '🕎', '☯️', '☦️', '🛐', '⛎', '♈', '♉', '♊', '♋', '♌', '♍', '♎', '♏', '♐', '♑', '♒', '♓', '🆔', '⚛️', '🉑', '☢️', '☣️'],
  objects: ['🔥', '💯', '✨', '⭐', '🌟', '💫', '💥', '💢', '💤', '💨', '👁️', '👀', '🧠', '🦷', '🦴', '💀', '👻', '👽', '🤖', '💩', '🎉', '🎊', '🎈', '🎁', '🎀', '🏆', '🥇', '🥈', '🥉', '⚽', '🏀', '🏈', '⚾', '🎾', '🏐', '🏉', '🎱', '🏓', '🏸', '🥅', '🏒', '🏑', '🏏', '⛳', '🏹', '🎣', '🥊', '🥋', '🎽', '🛹', '🛷', '⛸️', '🥌', '🎿', '⛷️', '🏂', '🏋️', '🤼', '🤸', '🤺', '⛹️', '🤾', '🏌️', '🏇', '🧘', '🏄', '🏊', '🤽', '🚣', '🧗', '🚵', '🚴', '🏆', '🥇', '🥈', '🥉'],
  symbols: ['👍', '👎', '👊', '✊', '🤛', '🤜', '🤞', '✌️', '🤟', '🤘', '👌', '🤌', '🤏', '👈', '👉', '👆', '🖕', '👇', '☝️', '👋', '🙏', '✍️', '💪', '🦾', '🦿', '🦵', '🦶', '👂', '🦻', '👃', '🧠', '🫀', '🫁', '🦷', '🦴', '👀', '👁️', '👅', '👄'],
};

const ALL_EMOJIS = Object.values(EMOJI_CATEGORIES).flat();

export function MeetingChat({ messages, isOnline, currentUserId, onSendMessage, onSendReaction }: MeetingChatProps) {
  const [newMessage, setNewMessage] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [showScrollButton, setShowScrollButton] = useState(false);
  const [isUserScrolling, setIsUserScrolling] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Format timestamp
  const formatMessageTime = (date: string | Date) => {
    const messageDate = new Date(date);
    
    if (isToday(messageDate)) {
      return format(messageDate, "HH:mm");
    } else if (isYesterday(messageDate)) {
      return `Yesterday ${format(messageDate, "HH:mm")}`;
    } else {
      return format(messageDate, "MMM d, HH:mm");
    }
  };

  // Smooth scroll to bottom
  const scrollToBottom = useCallback((smooth = true) => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ 
        behavior: smooth ? 'smooth' : 'auto',
        block: 'end'
      });
      setShowScrollButton(false);
      setIsUserScrolling(false);
    }
  }, []);

  // Handle scroll event
  const handleScroll = useCallback((event: Event) => {
    const target = event.target as HTMLElement;
    if (!target) return;

    const { scrollTop, scrollHeight, clientHeight } = target;
    const isAtBottom = scrollHeight - scrollTop - clientHeight < 100;

    if (!isAtBottom) {
      setShowScrollButton(true);
      setIsUserScrolling(true);
    } else {
      setShowScrollButton(false);
      setIsUserScrolling(false);
    }
  }, []);

  // Initial scroll
  useEffect(() => {
    scrollToBottom(false);
  }, [scrollToBottom]);

  // Attach scroll listener
  useEffect(() => {
    const scrollContainer = scrollAreaRef.current?.querySelector('[data-radix-scroll-area-viewport]');
    if (scrollContainer) {
      scrollContainer.addEventListener('scroll', handleScroll);
      return () => scrollContainer.removeEventListener('scroll', handleScroll);
    }
  }, [handleScroll]);

  // Auto scroll when messages change
  useEffect(() => {
    if (!isUserScrolling) {
      scrollToBottom(true);
    }
  }, [messages.length, isUserScrolling, scrollToBottom]);

  // Send message handler
  const handleSendMessage = useCallback(async () => {
    const trimmedMessage = newMessage.trim();
    
    if (!trimmedMessage || !isOnline || isSending) {
      return;
    }

    try {
      setIsSending(true);
      console.log('📤 Sending message:', trimmedMessage);
      
      onSendMessage(trimmedMessage);
      setNewMessage('');
      
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
      
      setTimeout(() => scrollToBottom(true), 150);
      
    } catch (error) {
      console.error('❌ Failed to send message:', error);
    } finally {
      setIsSending(false);
    }
  }, [newMessage, isOnline, isSending, onSendMessage, scrollToBottom]);

  // Handle Enter key
  const handleKeyPress = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  }, [handleSendMessage]);

  // Handle emoji selection
  const handleEmojiClick = (emoji: string) => {
    setNewMessage(prev => prev + emoji);
    setShowEmojiPicker(false);
    inputRef.current?.focus();
  };

  // Handle reaction sending
  const handleReactionClick = (emoji: string) => {
    if (onSendReaction) {
      onSendReaction(emoji);
    }
    setShowEmojiPicker(false);
  };

  // 🔥 FIX: Check if message is from current user - normalize both IDs
  const isOwnMessage = (message: IMeetingChatMessage) => {
    if (!message.sender || !currentUserId) return false;
    // Check both user_id and id to handle different message formats
    const messageSenderId = message.sender.user_id || (message.sender as any).id;
    const normalizedCurrentUserId = currentUserId;
    const isOwn = messageSenderId === normalizedCurrentUserId;
    return isOwn;
  };

  return (
    <div className="flex flex-col h-full bg-gray-800 relative">
      {/* Messages area */}
      <div className="flex-1 overflow-y-auto px-4 py-4">
        <div className="space-y-1 pb-4">
          {messages.length === 0 ? (
            <div className="text-center text-gray-400 py-8">
              <p className="text-sm">Meeting chat</p>
              <p className="text-xs mt-1">Messages will appear here</p>
            </div>
          ) : (
            messages.map((msg, index) => {
              const isOwn = isOwnMessage(msg);
              const prevMsg = messages[index - 1];
              const nextMsg = messages[index + 1];

              // 🔥 FIX: Group messages by sender with 5-minute window
              const prevSenderId = prevMsg?.sender?.user_id;// || prevMsg?.sender?.id;
              const currentSenderId = msg.sender?.user_id;// || msg.sender?.id;
              const nextSenderId = nextMsg?.sender?.user_id;// || nextMsg?.sender?.id;

              const isFirstInGroup = !prevMsg ||
                prevSenderId !== currentSenderId ||
                new Date(msg.created_at).getTime() - new Date(prevMsg.created_at).getTime() > 5 * 60 * 1000;

              const isLastInGroup = !nextMsg ||
                nextSenderId !== currentSenderId ||
                new Date(nextMsg.created_at).getTime() - new Date(msg.created_at).getTime() > 5 * 60 * 1000;

              if (msg.type === MessageType.SYSTEM) {
                return (
                  <div key={msg.id || index} className="flex justify-center py-2">
                    <Badge variant="secondary" className="text-xs text-white">
                      {msg.message}
                    </Badge>
                  </div>
                );
              }

              return (
                <div key={msg.id || index} className={`flex gap-3 ${isOwn ? 'flex-row-reverse' : 'flex-row'}`}>
                  {/* Avatar - only show for first message in group and not for own messages */}
                  <div className="flex-shrink-0 w-8">
                    {isFirstInGroup && !isOwn && (
                      <Avatar className="w-8 h-8">
                        <AvatarImage src={msg.sender?.avatar_url} />
                        <AvatarFallback className="text-xs bg-gray-600">
                          {msg.sender?.name?.[0] || '?'}
                        </AvatarFallback>
                      </Avatar>
                    )}
                  </div>

                  {/* Message container */}
                  <div className={`flex flex-col ${isOwn ? 'items-end' : 'items-start'} max-w-[70%]`}>
                    {/* Sender name - only show for first message in group and not for own messages */}
                    {isFirstInGroup && !isOwn && (
                      <span className="text-xs text-gray-400 mb-1 px-1">
                        {msg.sender?.name}
                      </span>
                    )}

                    {/* Message bubble */}
                    <div
                      className={`rounded-2xl px-4 py-2 break-words ${
                        isOwn
                          ? 'bg-blue-600 text-white rounded-br-md'
                          : 'bg-gray-700 text-gray-100 rounded-bl-md'
                      } ${!isFirstInGroup ? 'mt-1' : ''}`}
                    >
                      <p className="text-sm whitespace-pre-wrap leading-relaxed">{msg.message}</p>
                    </div>

                    {/* Timestamp - show for last message in group */}
                    {isLastInGroup && (
                      <span className="text-xs text-gray-500 mt-1 px-1">
                        {formatMessageTime(msg.created_at)}
                      </span>
                    )}
                  </div>
                </div>
              );
            })
          )}

          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Scroll to bottom button */}
      {showScrollButton && (
        <div className="absolute bottom-16 right-3 z-10">
          <Button
            size="sm"
            variant="secondary"
            className="rounded-full w-9 h-9 p-0 shadow-lg hover:shadow-xl transition-all duration-200 bg-gray-700 hover:bg-gray-600"
            onClick={() => scrollToBottom(true)}
          >
            <ArrowDown className="w-4 h-4" />
          </Button>
        </div>
      )}

      {/* Single input area - removed duplicate */}
      <div className="border-t border-gray-700 p-4">
        <div className="flex gap-2 items-end">
          {/* Emoji picker */}
          <Popover open={showEmojiPicker} onOpenChange={setShowEmojiPicker}>
            <PopoverTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg p-2"
                disabled={!isOnline}
              >
                <Smile className="w-5 h-5" />
              </Button>
            </PopoverTrigger>
            <PopoverContent side="top" className="w-80 p-2 bg-gray-800 border-gray-700">
              <div className="space-y-2">
                {/* Quick reactions */}
                <div>
                  <p className="text-xs font-medium text-gray-400 mb-2">Quick Reactions</p>
                  <div className="flex gap-1">
                    {['👍', '❤️', '😂', '😮', '😢', '🎉', '👏', '🔥'].map((emoji) => (
                      <Button
                        key={emoji}
                        variant="ghost"
                        size="sm"
                        className="w-8 h-8 p-0 text-lg hover:bg-gray-700"
                        onClick={() => handleReactionClick(emoji)}
                      >
                        {emoji}
                      </Button>
                    ))}
                  </div>
                </div>

                {/* All emojis for typing */}
                <div>
                  <p className="text-xs font-medium text-gray-400 mb-2">Add to Message</p>
                  <div className="grid grid-cols-8 gap-1 max-h-32 overflow-y-auto">
                    {ALL_EMOJIS.slice(0, 64).map((emoji, index) => (
                      <Button
                        key={index}
                        variant="ghost"
                        size="sm"
                        className="w-8 h-8 p-0 text-sm hover:bg-gray-700"
                        onClick={() => handleEmojiClick(emoji)}
                      >
                        {emoji}
                      </Button>
                    ))}
                  </div>
                </div>
              </div>
            </PopoverContent>
          </Popover>

          {/* Message input */}
          <div className="flex-1">
            <Input
              ref={inputRef}
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder={isOnline ? "Type a message..." : "Reconnecting..."}
              disabled={!isOnline || isSending}
              className="bg-gray-700 border-gray-600 text-white placeholder-gray-400 focus:border-blue-500 focus:ring-blue-500"
            />
          </div>

          {/* Send button */}
          <Button
            onClick={handleSendMessage}
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

        {/* Connection status */}
        {!isOnline && (
          <div className="mt-2 text-xs text-yellow-400 flex items-center gap-1">
            <Loader2 className="w-3 h-3 animate-spin" />
            Reconnecting to chat...
          </div>
        )}
      </div>

    </div>
  );
}