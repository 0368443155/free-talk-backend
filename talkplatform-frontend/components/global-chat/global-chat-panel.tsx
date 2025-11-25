"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Smile, Send, Loader2, Users, CheckCheck } from "lucide-react";
import { IGlobalChatMessage } from "@/api/global-chat.rest";
import { useGlobalChat } from "@/hooks/use-global-chat";
import { useUser } from "@/store/user-store";

interface GlobalChatPanelProps {
  className?: string;
}

export function GlobalChatPanel({ className }: GlobalChatPanelProps) {
  const { userInfo: user } = useUser();
  const {
    messages,
    isConnected,
    isSending,
    sendMessage,
    typingUsers,
    sendTyping,
  } = useGlobalChat({ enabled: true });

  const [newMessage, setNewMessage] = useState("");
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const chatInputRef = useRef<HTMLInputElement>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const shouldAutoScrollRef = useRef(true);
  const prevMessagesLengthRef = useRef(0);

  // Emoji list
  const EMOJI_LIST = [
    '😀', '😃', '😄', '😁', '😆', '😅', '🤣', '😂', '🙂', '🙃', '😉', '😊',
    '😇', '🥰', '😍', '🤩', '😘', '😗', '👍', '👎', '👏', '🙌', '👋', '✌️',
    '🤞', '🤟', '🤘', '👌', '🤌', '🤏', '✨', '🎉', '❤️', '💯', '🔥'
  ];

  // Get scroll container from ScrollArea
  const getScrollContainer = useCallback(() => {
    return scrollAreaRef.current?.querySelector('[data-radix-scroll-area-viewport]') as HTMLElement | null;
  }, []);

  // Check if user is near bottom of scroll area
  const checkIfNearBottom = useCallback(() => {
    const scrollContainer = getScrollContainer();
    if (!scrollContainer) return true;

    const { scrollTop, scrollHeight, clientHeight } = scrollContainer;
    const distanceFromBottom = scrollHeight - scrollTop - clientHeight;
    return distanceFromBottom < 100; // Within 100px of bottom
  }, [getScrollContainer]);

  // Scroll to bottom within chat area only (not the whole page)
  const scrollToBottom = useCallback((smooth = true) => {
    const scrollContainer = getScrollContainer();
    if (!scrollContainer) return;

    // Scroll within the chat container only, not the whole page
    scrollContainer.scrollTo({
      top: scrollContainer.scrollHeight,
      behavior: smooth ? 'smooth' : 'auto',
    });
  }, [getScrollContainer]);

  // Auto-scroll to bottom only when new messages arrive and user is near bottom
  useEffect(() => {
    const isNewMessage = messages.length > prevMessagesLengthRef.current;
    const wasEmpty = prevMessagesLengthRef.current === 0;
    prevMessagesLengthRef.current = messages.length;

    // Always scroll to bottom on initial load (when messages first appear)
    if (wasEmpty && messages.length > 0) {
      setTimeout(() => scrollToBottom(false), 100);
      return;
    }

    // For new messages, only scroll if user is near bottom
    if (isNewMessage && (shouldAutoScrollRef.current || checkIfNearBottom())) {
      setTimeout(() => scrollToBottom(true), 100);
    }
  }, [messages, checkIfNearBottom, scrollToBottom]);

  // Track scroll position to determine if we should auto-scroll
  useEffect(() => {
    const scrollContainer = getScrollContainer();
    if (!scrollContainer) return;

    const handleScroll = () => {
      shouldAutoScrollRef.current = checkIfNearBottom();
    };

    scrollContainer.addEventListener('scroll', handleScroll);
    return () => scrollContainer.removeEventListener('scroll', handleScroll);
  }, [getScrollContainer, checkIfNearBottom]);

  const handleChatInputSend = useCallback(async () => {
    if (!user) return;
    const trimmedMessage = newMessage.trim();
    if (!trimmedMessage || !isConnected || isSending) return;

    try {
      // Pass user info for optimistic update
      // IMPORTANT: Normalize user_id to match backend format
      const normalizedUserId = user.id || user.user_id || '';
      await sendMessage(trimmedMessage, {
        id: normalizedUserId,
        username: user.username || user.name,
        avatar_url: user.avatar_url,
      } as any); // Type assertion to allow user_id in hook
      setNewMessage('');
      setTimeout(() => {
        chatInputRef.current?.focus();
      }, 100);
    } catch (error) {
      console.error('Failed to send message:', error);
    }
  }, [newMessage, isConnected, isSending, sendMessage, user]);

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

  // Helper function to get user initials for avatar fallback
  const getUserInitials = (username: string) => {
    return username
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .substring(0, 2);
  };

  // Helper function to check if message is from current user
  const isMessageFromCurrentUser = (message: IGlobalChatMessage) => {
    if (!user) return false;

    const messageSenderId = message.sender?.user_id || (message.sender as any)?.id || message.sender_id;
    const currentUserId = user.id || user.user_id;

    // Debug log for first few messages
    if (messages.indexOf(message) < 3) {
      console.log('🔍 Message ownership check:', {
        messageId: message.id,
        messageSenderId,
        currentUserId,
        senderUsername: message.sender?.username,
        currentUsername: user.username,
        isMatch: messageSenderId === currentUserId
      });
    }

    return !!messageSenderId && !!currentUserId && messageSenderId === currentUserId;
  };

  return (
    <div className={`flex flex-col h-full min-h-0 ${className || ''}`}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 bg-gradient-to-r from-gray-800 to-gray-900 border-b border-gray-700 flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="relative">
            <Users className="w-6 h-6 text-blue-400" />
            {isConnected && (
              <span className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-gray-800 animate-pulse"></span>
            )}
          </div>
          <div>
            <h3 className="text-base font-bold text-white">Global Chat</h3>
            <p className="text-xs text-gray-400">
              {isConnected ? 'Connected' : 'Connecting...'}
            </p>
          </div>
        </div>
        {typingUsers.size > 0 && (
          <div className="text-xs text-blue-400 flex items-center gap-1 animate-pulse">
            <span className="inline-block w-1 h-1 bg-blue-400 rounded-full animate-bounce"></span>
            <span className="inline-block w-1 h-1 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></span>
            <span className="inline-block w-1 h-1 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></span>
            <span className="ml-1">{Array.from(typingUsers)[0]} typing...</span>
          </div>
        )}
      </div>

      {/* Chat disconnected banner */}
      {!isConnected && (
        <div className="bg-gradient-to-r from-yellow-900/40 to-orange-900/40 px-4 py-2 text-xs text-yellow-200 text-center flex-shrink-0 border-b border-yellow-700/50 backdrop-blur-sm">
          <span className="inline-flex items-center gap-2">
            <span className="w-2 h-2 bg-yellow-400 rounded-full animate-pulse"></span>
            Reconnecting to chat...
          </span>
        </div>
      )}

      {/* Messages area */}
      <div className="flex-1 min-h-0 overflow-hidden bg-gradient-to-b from-gray-900 to-gray-950">
        <ScrollArea ref={scrollAreaRef} className="h-full p-4 [&>[data-radix-scroll-area-scrollbar]]:opacity-100">
          <div className="space-y-4">
            {messages.map((message, index) => {
              // Handle system messages
              if (!message.sender) {
                return (
                  <div key={message.id} className="w-full">
                    <div className="flex items-center gap-3 my-4">
                      <div className="flex-1 border-t border-gray-700"></div>
                      <div className="text-xs text-gray-400 bg-gray-800/50 backdrop-blur-sm px-4 py-1.5 rounded-full border border-gray-700">
                        <span className="font-semibold text-blue-400">[System]</span> {message.message}
                      </div>
                      <div className="flex-1 border-t border-gray-700"></div>
                    </div>
                  </div>
                );
              }

              const prevMessage = index > 0 ? messages[index - 1] : null;
              const messageSenderId = message.sender?.user_id || (message.sender as any)?.id || message.sender_id;
              const prevMessageSenderId = prevMessage?.sender?.user_id || (prevMessage?.sender as any)?.id || prevMessage?.sender_id;
              const showHeader = !prevMessage || prevMessageSenderId !== messageSenderId;
              const messageTime = new Date(message.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
              const isOwnMessage = isMessageFromCurrentUser(message);
              const isOptimistic = message.id.startsWith('temp-');

              return (
                <div
                  key={message.id}
                  className={`w-full flex ${isOwnMessage ? 'justify-end' : 'justify-start'} animate-in fade-in slide-in-from-bottom-2 duration-300`}
                >
                  <div className={`flex gap-2 max-w-[85%] ${isOwnMessage ? 'flex-row-reverse' : 'flex-row'}`}>
                    {/* Avatar */}
                    {showHeader && (
                      <Avatar className="w-8 h-8 flex-shrink-0 ring-2 ring-gray-700">
                        <AvatarImage src={message.sender.avatar_url} alt={message.sender.username} />
                        <AvatarFallback className={`text-xs font-semibold ${isOwnMessage
                          ? 'bg-gradient-to-br from-blue-500 to-purple-600 text-white'
                          : 'bg-gradient-to-br from-gray-600 to-gray-700 text-gray-200'
                          }`}>
                          {getUserInitials(message.sender.username)}
                        </AvatarFallback>
                      </Avatar>
                    )}
                    {!showHeader && <div className="w-8"></div>}

                    {/* Message content */}
                    <div className={`flex flex-col ${isOwnMessage ? 'items-end' : 'items-start'}`}>
                      {/* User name and time header */}
                      {showHeader && (
                        <div className={`flex items-baseline gap-2 mb-1 px-1 ${isOwnMessage ? 'flex-row-reverse' : 'flex-row'}`}>
                          <span className={`text-sm font-semibold ${isOwnMessage ? 'text-blue-400' : 'text-gray-300'
                            }`}>
                            {isOwnMessage ? 'You' : message.sender.username}
                          </span>
                          <span className="text-xs text-gray-500">
                            {messageTime}
                          </span>
                        </div>
                      )}

                      {/* Message bubble */}
                      <div className={`group relative text-sm break-words px-4 py-2.5 rounded-2xl transition-all duration-200 ${isOwnMessage
                        ? 'bg-gradient-to-br from-blue-600 to-blue-700 text-white shadow-lg shadow-blue-900/30 hover:shadow-blue-900/50 rounded-tr-sm'
                        : 'bg-gray-800 text-gray-100 border border-gray-700 hover:border-gray-600 rounded-tl-sm'
                        } ${isOptimistic ? 'opacity-70' : 'opacity-100'}`}>
                        <p className="leading-relaxed">{message.message}</p>

                        {/* Delivery indicator for own messages */}
                        {isOwnMessage && (
                          <div className="absolute -bottom-1 -right-1 bg-gray-900 rounded-full p-0.5">
                            {isOptimistic ? (
                              <Loader2 className="w-3 h-3 text-blue-400 animate-spin" />
                            ) : (
                              <CheckCheck className="w-3 h-3 text-blue-400" />
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}

            {messages.length === 0 && (
              <div className="text-center text-gray-400 text-sm py-12 space-y-3">
                <div className="text-4xl">💬</div>
                <p className="font-medium">No messages yet</p>
                <p className="text-xs text-gray-500">Start the conversation! Say hello to everyone 👋</p>
              </div>
            )}
          </div>
        </ScrollArea>
      </div>

      {/* Input area - Fixed at bottom */}
      <div className="flex items-center gap-3 p-4 bg-gradient-to-r from-gray-800 to-gray-900 border-t border-gray-700 flex-shrink-0">
        <div className="flex-1 relative">
          <Input
            ref={chatInputRef}
            value={newMessage}
            onChange={(e) => {
              setNewMessage(e.target.value);
              // Send typing indicator when user types
              if (e.target.value.trim().length > 0) {
                sendTyping(true);
              } else {
                sendTyping(false);
              }
            }}
            onKeyDown={handleChatInputKeyPress}
            onBlur={() => sendTyping(false)}
            placeholder={isConnected ? "Type a message..." : "Connecting..."}
            disabled={!isConnected || isSending}
            className="pl-4 pr-12 py-5 bg-gray-900 border-gray-700 text-white placeholder-gray-500 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/50 rounded-xl transition-all"
            maxLength={1000}
          />

          {/* Emoji picker button */}
          <Popover open={showEmojiPicker} onOpenChange={setShowEmojiPicker}>
            <PopoverTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-blue-400 hover:bg-gray-800 w-9 h-9 p-0 rounded-lg transition-all"
                disabled={!isConnected}
              >
                <Smile className="w-5 h-5" />
              </Button>
            </PopoverTrigger>
            <PopoverContent side="top" className="w-80 p-3 bg-gray-900 border-gray-700 shadow-xl">
              <div className="grid grid-cols-8 gap-1">
                {EMOJI_LIST.map((emoji) => (
                  <Button
                    key={emoji}
                    variant="ghost"
                    size="sm"
                    className="w-9 h-9 p-0 text-xl hover:bg-gray-800 hover:scale-110 transition-all rounded-lg"
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
          disabled={!newMessage.trim() || !isConnected || isSending}
          size="sm"
          className="px-4 py-5 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 disabled:from-gray-700 disabled:to-gray-800 text-white rounded-xl shadow-lg shadow-blue-900/30 hover:shadow-blue-900/50 transition-all"
        >
          {isSending ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <Send className="w-5 h-5" />
          )}
        </Button>
      </div>
    </div>
  );
}

