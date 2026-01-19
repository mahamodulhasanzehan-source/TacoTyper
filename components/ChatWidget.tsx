
import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { User, fetchActiveUsers, sendMessage, sendChannelMessage, subscribeToChat, subscribeToChannel, subscribeToGlobalUnread, saveLastChatPartner, getUserProfile, deleteMessage } from '../services/firebase';
import { COLORS } from '../constants';
import { RandomReveal } from './Visuals';

interface ChatWidgetProps {
    user: User;
    className?: string;
    mode?: 'private' | 'global';
    channelId?: string; // Required if mode is global
}

type ChatView = 'friends' | 'chat';

const ChatWidget: React.FC<ChatWidgetProps> = ({ user, className = '', mode = 'private', channelId }) => {
    const [view, setView] = useState<ChatView>('chat');
    const [friends, setFriends] = useState<any[]>([]);
    const [activeFriend, setActiveFriend] = useState<any | null>(null);
    const [messages, setMessages] = useState<any[]>([]);
    const [inputText, setInputText] = useState('');
    const [hasUnreadAlert, setHasUnreadAlert] = useState(false);
    const [contextMenu, setContextMenu] = useState<{x: number, y: number, msgId: string} | null>(null);
    
    // Fade Logic for Global Mode
    const [isFaded, setIsFaded] = useState(false);
    const lastActivityRef = useRef(Date.now());
    const fadeTimerRef = useRef<number | null>(null);

    const messagesEndRef = useRef<HTMLDivElement>(null);
    const textAreaRef = useRef<HTMLTextAreaElement>(null);

    // Initial Load
    useEffect(() => {
        if (mode === 'global') {
            setView('chat');
            return;
        }

        const init = async () => {
            const activeUsers = await fetchActiveUsers(user.uid);
            const myFriends = activeUsers.filter(u => u.isFriend);
            setFriends(myFriends);

            const profile = await getUserProfile(user.uid);
            if (profile?.lastChatPartner) {
                const lastPartner = activeUsers.find(u => u.uid === profile.lastChatPartner) 
                                 || { uid: profile.lastChatPartner, username: 'Unknown Chef' };
                setActiveFriend(lastPartner);
                setView('chat');
            } else {
                setView('friends');
            }
        };
        init();
    }, [user, mode]);

    // Fade Timer Logic (Only for Global Mode)
    useEffect(() => {
        if (mode !== 'global') return;

        const checkFade = () => {
            const now = Date.now();
            if (now - lastActivityRef.current > 7000) {
                setIsFaded(true);
            } else {
                setIsFaded(false);
            }
        };

        fadeTimerRef.current = window.setInterval(checkFade, 1000);
        return () => {
            if (fadeTimerRef.current) clearInterval(fadeTimerRef.current);
        };
    }, [mode]);

    const refreshActivity = () => {
        lastActivityRef.current = Date.now();
        setIsFaded(false);
    };

    // Subscriptions
    useEffect(() => {
        let unsubscribe = () => {};

        if (mode === 'global' && channelId) {
            unsubscribe = subscribeToChannel(channelId, (msgs) => {
                setMessages(msgs);
                refreshActivity(); // New message wakes up chat
                setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
            });
        } else if (mode === 'private' && activeFriend) {
            unsubscribe = subscribeToChat(user.uid, activeFriend.uid, (msgs) => {
                setMessages(msgs);
                setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
            });
        }
        
        return () => unsubscribe();
    }, [activeFriend, user.uid, mode, channelId]);

    // Global Unread (Private only)
    useEffect(() => {
        if (mode === 'global') return;
        const unsubscribe = subscribeToGlobalUnread(user.uid, activeFriend?.uid || null, (hasUnread) => {
            setHasUnreadAlert(hasUnread);
        });
        return () => unsubscribe();
    }, [user.uid, activeFriend, mode]);

    // Focus Logic for Fade wake-up
    const handleFocus = () => {
        refreshActivity();
    };

    const handleSend = async () => {
        refreshActivity();
        if (!inputText.trim()) return;
        const text = inputText;
        setInputText('');

        if (mode === 'global' && channelId) {
             const profile = await getUserProfile(user.uid);
             const name = profile?.username || user.displayName || 'Anon';
             await sendChannelMessage(user.uid, channelId, text, name);
        } else if (mode === 'private' && activeFriend) {
             await sendMessage(user.uid, activeFriend.uid, text);
        }

        if(textAreaRef.current) textAreaRef.current.focus();
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        refreshActivity();
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    // Auto-focus input when pressing Enter globally (handled by parent mostly, but we can try)
    useEffect(() => {
        const handleGlobalEnter = (e: KeyboardEvent) => {
            if (e.key === 'Enter' && mode === 'global' && document.activeElement !== textAreaRef.current) {
                textAreaRef.current?.focus();
                e.preventDefault();
            }
        };
        window.addEventListener('keydown', handleGlobalEnter);
        return () => window.removeEventListener('keydown', handleGlobalEnter);
    }, [mode]);

    const handleFriendSelect = async (friend: any) => {
        setActiveFriend(friend);
        setView('chat');
        await saveLastChatPartner(user.uid, friend.uid);
    };

    const toggleView = () => {
        if (mode === 'global') return;
        if (view === 'chat') setView('friends');
        else {
            if (activeFriend) setView('chat');
            else setView('friends');
        }
    };

    const handleContextMenu = (e: React.MouseEvent, msgId: string) => {
        e.preventDefault();
        setContextMenu({ x: e.clientX, y: e.clientY, msgId });
    };

    const handleDeleteMessage = async (msgId: string) => {
        await deleteMessage(msgId);
        setContextMenu(null);
    };

    // Styles for Transparent Mode
    const containerClass = mode === 'global' 
        ? `flex flex-col ${className} bg-transparent pointer-events-none` // Pointer events none on container to let clicks pass through empty space
        : `flex flex-col bg-[#0a0a0a] border-l-4 border-t-4 border-white ${className}`;

    const headerClass = mode === 'global'
        ? "hidden" // No header in global mode
        : "flex justify-between items-center bg-[#161616] p-2 border-b border-[#333]";

    const messageListClass = mode === 'global'
        ? `flex-1 overflow-y-auto custom-scrollbar p-2 space-y-2 relative transition-opacity duration-500 ${isFaded ? 'opacity-0' : 'opacity-100'} pointer-events-auto` // Re-enable pointer events for scrolling/copying
        : "flex-1 overflow-y-auto custom-scrollbar p-2 space-y-2 relative";

    const inputContainerClass = mode === 'global'
        ? "p-2 bg-transparent flex gap-2 items-end pointer-events-auto"
        : "p-2 bg-[#161616] border-t border-[#333] flex gap-2 items-end";

    const inputClass = mode === 'global'
        ? "flex-1 bg-black/50 border border-white/30 p-1 text-[10px] text-white outline-none focus:bg-black/80 focus:border-white resize-none overflow-hidden min-h-[24px] rounded"
        : "flex-1 bg-black border border-[#555] p-1 text-[10px] text-white outline-none focus:border-[#f4b400] resize-none overflow-hidden min-h-[24px]";

    return (
        <RandomReveal distance={mode === 'global' ? 0 : 500} className={containerClass}>
            {/* Header (Private Only) */}
            <div className={headerClass}>
                <div className="text-[10px] md:text-xs text-[#f4b400] font-bold truncate">
                    {view === 'friends' ? 'CHEF LIST' : (activeFriend ? activeFriend.username : 'SELECT CHEF')}
                </div>
                <button onClick={toggleView} className="relative text-lg hover:scale-110 transition-transform">
                    👤
                    {hasUnreadAlert && (
                        <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-600 rounded-full border border-white animate-pulse" />
                    )}
                </button>
            </div>

            {/* Content Area */}
            <div className={`flex-1 overflow-hidden relative ${mode === 'global' ? '' : 'bg-[#0a0a0a]'}`}>
                
                {/* Friends List View (Private Only) */}
                {view === 'friends' && mode === 'private' && (
                    <div className="absolute inset-0 overflow-y-auto custom-scrollbar p-2">
                        {friends.length === 0 ? (
                            <div className="text-center text-[8px] text-[#555] mt-4">
                                No friends added yet.<br/>Use Social Kitchen to add chefs!
                            </div>
                        ) : (
                            friends.map(friend => (
                                <div 
                                    key={friend.uid}
                                    onClick={() => handleFriendSelect(friend)}
                                    className={`p-2 mb-1 cursor-pointer border border-transparent hover:border-[#555] hover:bg-[#111] ${activeFriend?.uid === friend.uid ? 'bg-[#222] border-[#f4b400]' : ''}`}
                                >
                                    <div className="text-[10px] text-white">{friend.username}</div>
                                    <div className="text-[8px] text-[#57a863]">Online</div>
                                </div>
                            ))
                        )}
                    </div>
                )}

                {/* Chat View */}
                {view === 'chat' && (
                    <div className="flex flex-col h-full">
                        {mode === 'private' && !activeFriend ? (
                            <div className="flex-1 flex items-center justify-center text-[10px] text-[#555]">
                                Select a friend to chat.
                            </div>
                        ) : (
                            <div className={messageListClass}>
                                {messages.map(msg => {
                                    const isMe = msg.senderId === user.uid;
                                    // In global mode, we show names
                                    const showName = mode === 'global' && !isMe;
                                    
                                    return (
                                        <div 
                                            key={msg.id} 
                                            className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}
                                            onContextMenu={(e) => handleContextMenu(e, msg.id)}
                                        >
                                            {showName && (
                                                <span className="text-[8px] text-[#aaa] mb-px ml-1">{msg.senderName || 'Chef'}</span>
                                            )}
                                            <div className={`max-w-[90%] p-2 text-[10px] break-words whitespace-pre-wrap rounded-md
                                                ${mode === 'global' 
                                                    ? (isMe ? 'bg-[#f4b400] text-black font-bold' : 'bg-white text-black font-bold') 
                                                    : (isMe ? 'bg-[#222] border border-[#f4b400] text-white' : 'bg-[#111] border border-[#555] text-[#ccc]')
                                                } hover:brightness-110 cursor-context-menu`}
                                            >
                                                {msg.text}
                                            </div>
                                        </div>
                                    );
                                })}
                                <div ref={messagesEndRef} />
                            </div>
                        )}
                        
                        {/* Input Bar */}
                        <div className={inputContainerClass} onClick={refreshActivity}>
                            <textarea
                                ref={textAreaRef} 
                                value={inputText}
                                onChange={(e) => { setInputText(e.target.value); refreshActivity(); }}
                                onFocus={handleFocus}
                                onKeyDown={handleKeyDown}
                                placeholder={mode === 'global' ? "Press Enter to chat..." : (activeFriend ? "Type..." : "Select friend")}
                                disabled={mode === 'private' && !activeFriend}
                                rows={1}
                                className={inputClass}
                            />
                            <button 
                                onClick={handleSend}
                                disabled={mode === 'private' && !activeFriend}
                                className={`text-[10px] px-2 py-1 h-full border hover:brightness-110 rounded ${mode === 'global' ? 'bg-[#f4b400] text-black border-white' : 'bg-[#333] text-white border-[#555]'}`}
                            >
                                &gt;
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Context Menu */}
            {contextMenu && createPortal(
                <div 
                    style={{ top: contextMenu.y, left: contextMenu.x }}
                    className="fixed z-[9999] bg-[#111] border-2 border-white p-1 shadow-[0_0_10px_rgba(0,0,0,0.8)] min-w-[120px] animate-pop-in"
                    onClick={(e) => e.stopPropagation()} 
                >
                    <button 
                        onClick={() => handleDeleteMessage(contextMenu.msgId)}
                        className="text-red-500 text-xs hover:bg-[#222] hover:text-red-400 block w-full text-left px-2 py-1 font-bold"
                    >
                        Delete Message
                    </button>
                </div>,
                document.body
            )}
        </RandomReveal>
    );
};

export default ChatWidget;
