
import React, { useState, useEffect, useRef } from 'react';
import { User, fetchActiveUsers, sendMessage, subscribeToChat, subscribeToGlobalUnread, saveLastChatPartner, getUserProfile } from '../services/firebase';
import { COLORS } from '../constants';
import { RandomReveal } from './Visuals';

interface ChatWidgetProps {
    user: User;
    className?: string;
}

type ChatView = 'friends' | 'chat';

const ChatWidget: React.FC<ChatWidgetProps> = ({ user, className = '' }) => {
    const [view, setView] = useState<ChatView>('chat');
    const [friends, setFriends] = useState<any[]>([]);
    const [activeFriend, setActiveFriend] = useState<any | null>(null);
    const [messages, setMessages] = useState<any[]>([]);
    const [inputText, setInputText] = useState('');
    const [hasUnreadAlert, setHasUnreadAlert] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    // Initial Load: Get Friends & Last Partner
    useEffect(() => {
        const init = async () => {
            // 1. Get friend list (active users)
            const activeUsers = await fetchActiveUsers(user.uid);
            // Filter to only show actual friends (for the "Friends" view)
            const myFriends = activeUsers.filter(u => u.isFriend);
            setFriends(myFriends);

            // 2. Get last chat partner from profile
            const profile = await getUserProfile(user.uid);
            if (profile?.lastChatPartner) {
                const lastPartner = activeUsers.find(u => u.uid === profile.lastChatPartner) 
                                 || { uid: profile.lastChatPartner, username: 'Unknown Chef' }; // Fallback
                setActiveFriend(lastPartner);
                setView('chat');
            } else {
                setView('friends');
            }
        };
        init();
    }, [user]);

    // Subscribe to Chat Messages
    useEffect(() => {
        if (!activeFriend) return;
        const unsubscribe = subscribeToChat(user.uid, activeFriend.uid, (msgs) => {
            setMessages(msgs);
            setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
        });
        return () => unsubscribe();
    }, [activeFriend, user.uid]);

    // Subscribe to Global Unread Alert
    useEffect(() => {
        const unsubscribe = subscribeToGlobalUnread(user.uid, activeFriend?.uid || null, (hasUnread) => {
            setHasUnreadAlert(hasUnread);
        });
        return () => unsubscribe();
    }, [user.uid, activeFriend]);

    const handleSend = async () => {
        if (!inputText.trim() || !activeFriend) return;
        const text = inputText;
        setInputText('');
        await sendMessage(user.uid, activeFriend.uid, text);
    };

    const handleFriendSelect = async (friend: any) => {
        setActiveFriend(friend);
        setView('chat');
        await saveLastChatPartner(user.uid, friend.uid);
    };

    const toggleView = () => {
        if (view === 'chat') setView('friends');
        else {
            if (activeFriend) setView('chat');
            else setView('friends'); // Stay on friends if no one selected
        }
    };

    return (
        <RandomReveal distance={500} className={`flex flex-col bg-[#0a0a0a] border-l-4 border-t-4 border-white ${className}`}>
            {/* Header */}
            <div className="flex justify-between items-center bg-[#161616] p-2 border-b border-[#333]">
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
            <div className="flex-1 overflow-hidden relative">
                
                {/* Friends List View */}
                {view === 'friends' && (
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
                        {!activeFriend ? (
                            <div className="flex-1 flex items-center justify-center text-[10px] text-[#555]">
                                Select a friend to chat.
                            </div>
                        ) : (
                            <div className="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-2">
                                {messages.map(msg => {
                                    const isMe = msg.senderId === user.uid;
                                    return (
                                        <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                                            <div className={`max-w-[85%] p-2 text-[10px] break-words border ${isMe ? 'bg-[#222] border-[#f4b400] text-white' : 'bg-[#111] border-[#555] text-[#ccc]'}`}>
                                                {msg.text}
                                            </div>
                                        </div>
                                    );
                                })}
                                <div ref={messagesEndRef} />
                            </div>
                        )}
                        
                        {/* Input Bar */}
                        <div className="p-2 bg-[#161616] border-t border-[#333] flex gap-2">
                            <input 
                                type="text"
                                value={inputText}
                                onChange={(e) => setInputText(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                                placeholder={activeFriend ? "Type..." : "Select friend"}
                                disabled={!activeFriend}
                                className="flex-1 bg-black border border-[#555] p-1 text-[10px] text-white outline-none focus:border-[#f4b400]"
                            />
                            <button 
                                onClick={handleSend}
                                disabled={!activeFriend}
                                className="text-[10px] bg-[#333] px-2 text-white border border-[#555] hover:bg-[#555]"
                            >
                                &gt;
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </RandomReveal>
    );
};

export default ChatWidget;
