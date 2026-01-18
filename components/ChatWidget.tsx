
import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { User, fetchActiveUsers, sendMessage, subscribeToChat, subscribeToGlobalUnread, saveLastChatPartner, getUserProfile, deleteMessage, uploadVoiceMessage } from '../services/firebase';
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
    const [contextMenu, setContextMenu] = useState<{x: number, y: number, msgId: string} | null>(null);
    
    // Voice Recording State
    const [isRecording, setIsRecording] = useState(false);
    const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
    const [isUploadingVoice, setIsUploadingVoice] = useState(false);
    
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const textAreaRef = useRef<HTMLTextAreaElement>(null);
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const chunksRef = useRef<Blob[]>([]);

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

    // Auto-resize textarea
    useEffect(() => {
        if (textAreaRef.current) {
            textAreaRef.current.style.height = 'auto'; // Reset height
            const scrollHeight = textAreaRef.current.scrollHeight;
            textAreaRef.current.style.height = `${Math.min(scrollHeight, 100)}px`; // Cap at 100px
        }
    }, [inputText]);

    // Close context menu on click elsewhere
    useEffect(() => {
        const handleClickOutside = () => setContextMenu(null);
        window.addEventListener('click', handleClickOutside);
        return () => window.removeEventListener('click', handleClickOutside);
    }, []);

    const handleSend = async () => {
        if (!activeFriend) return;
        
        // Handle Voice Send
        if (recordedBlob) {
            setIsUploadingVoice(true);
            const chatId = user.uid < activeFriend.uid ? `${user.uid}_${activeFriend.uid}` : `${activeFriend.uid}_${user.uid}`;
            const url = await uploadVoiceMessage(recordedBlob, chatId);
            if (url) {
                await sendMessage(user.uid, activeFriend.uid, '', 'audio', url);
            }
            setRecordedBlob(null);
            setIsUploadingVoice(false);
            return;
        }

        // Handle Text Send
        if (!inputText.trim()) return;
        const text = inputText;
        setInputText(''); // Optimistic clear
        await sendMessage(user.uid, activeFriend.uid, text, 'text');
        // Force focus back to textarea
        if(textAreaRef.current) textAreaRef.current.focus();
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    const startRecording = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const recorder = new MediaRecorder(stream);
            mediaRecorderRef.current = recorder;
            chunksRef.current = [];

            recorder.ondataavailable = (e) => {
                chunksRef.current.push(e.data);
            };

            recorder.onstop = () => {
                const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
                setRecordedBlob(blob);
                chunksRef.current = [];
            };

            recorder.start();
            setIsRecording(true);
            setRecordedBlob(null); // Clear previous if any, though UI prevents this usually
        } catch (err) {
            console.error("Error accessing microphone:", err);
            alert("Could not access microphone.");
        }
    };

    const stopRecording = () => {
        if (mediaRecorderRef.current && isRecording) {
            mediaRecorderRef.current.stop();
            mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
            setIsRecording(false);
        }
    };

    const cancelRecording = () => {
        if (mediaRecorderRef.current) {
            mediaRecorderRef.current.stop();
            mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
        }
        setIsRecording(false);
        setRecordedBlob(null);
        chunksRef.current = [];
    };

    const handleMicClick = () => {
        if (isRecording) {
            stopRecording();
        } else {
            // If we have a recorded blob, clicking mic again doesn't do anything (waiting for send or trash)
            // But per WhatsApp UX, usually you cancel or send. 
            // The prompt says "After recording if you click on the microphone icon again it will stop recording"
            // So this handles the stop. 
            if (!recordedBlob) {
                startRecording();
            }
        }
    };

    const handleFriendSelect = async (friend: any) => {
        setActiveFriend(friend);
        setView('chat');
        setRecordedBlob(null); // Reset recording state on chat switch
        setIsRecording(false);
        await saveLastChatPartner(user.uid, friend.uid);
    };

    const toggleView = () => {
        if (view === 'chat') setView('friends');
        else {
            if (activeFriend) setView('chat');
            else setView('friends'); // Stay on friends if no one selected
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
                            <div className="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-2 relative">
                                {messages.map(msg => {
                                    const isMe = msg.senderId === user.uid;
                                    return (
                                        <div 
                                            key={msg.id} 
                                            className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}
                                            onContextMenu={(e) => handleContextMenu(e, msg.id)}
                                        >
                                            <div className={`max-w-[85%] p-2 text-[10px] break-words border whitespace-pre-wrap ${isMe ? 'bg-[#222] border-[#f4b400] text-white' : 'bg-[#111] border-[#555] text-[#ccc]'} hover:brightness-110 cursor-context-menu`}>
                                                {msg.audioURL ? (
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-xl">🎤</span>
                                                        <audio controls src={msg.audioURL} className="h-6 w-32 md:w-48" />
                                                    </div>
                                                ) : (
                                                    msg.text
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                                <div ref={messagesEndRef} />
                            </div>
                        )}
                        
                        {/* Input Bar */}
                        <div className="p-2 bg-[#161616] border-t border-[#333] flex gap-2 items-end relative">
                            {/* Text Input (Disabled or Hidden when recording/has recording) */}
                            {!recordedBlob ? (
                                <textarea
                                    ref={textAreaRef} 
                                    value={inputText}
                                    onChange={(e) => setInputText(e.target.value)}
                                    onKeyDown={handleKeyDown}
                                    placeholder={isRecording ? "Recording..." : (activeFriend ? "Type..." : "Select friend")}
                                    disabled={!activeFriend || isRecording}
                                    rows={1}
                                    className={`flex-1 bg-black border border-[#555] p-1 text-[10px] text-white outline-none focus:border-[#f4b400] resize-none overflow-hidden min-h-[24px] ${isRecording ? 'opacity-50' : ''}`}
                                />
                            ) : (
                                <div className="flex-1 flex items-center bg-[#222] border border-[#555] p-1 h-[26px] text-[10px] text-[#aaa]">
                                    🎤 Audio recorded. Ready to send.
                                    <button onClick={() => setRecordedBlob(null)} className="ml-auto text-red-500 hover:text-white px-2">Cancel</button>
                                </div>
                            )}

                            {/* Mic Button Wrapper */}
                            <div className="relative">
                                {/* Trash Can - Appears when recording */}
                                {isRecording && (
                                    <button 
                                        onClick={cancelRecording}
                                        className="absolute bottom-full left-0 mb-2 w-full flex justify-center animate-pop-in z-20"
                                    >
                                        <div className="bg-[#333] border border-white rounded-full p-1.5 hover:bg-red-900 transition-colors shadow-lg">
                                            🗑️
                                        </div>
                                    </button>
                                )}
                                
                                <button
                                    onClick={handleMicClick}
                                    disabled={!activeFriend}
                                    className={`h-full min-h-[26px] px-2 flex items-center justify-center border border-[#555] transition-all duration-200
                                        ${isRecording 
                                            ? 'bg-red-600 border-white text-white rounded-full w-[28px] h-[28px] animate-pulse' 
                                            : 'bg-[#333] hover:bg-[#555] text-white'
                                        }`}
                                    title={isRecording ? "Stop Recording" : "Record Voice Message"}
                                >
                                    {isRecording ? '' : '🎤'}
                                </button>
                            </div>

                            {/* Send Button */}
                            <button 
                                onClick={handleSend}
                                disabled={!activeFriend || (isRecording && !recordedBlob)}
                                className={`text-[10px] bg-[#333] px-2 py-1 h-full text-white border border-[#555] hover:bg-[#555] ${isUploadingVoice ? 'cursor-wait opacity-50' : ''}`}
                            >
                                {isUploadingVoice ? '...' : '>'}
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Context Menu - Rendered via Portal to avoid z-index/transform issues */}
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
