// src/GlobalChat.js
import React, { useEffect, useRef, useState } from "react";
import {
    ref as dbRef,
    onValue,
    set,
    push,
    update,
    off,
} from "firebase/database";
import { db } from "./firebase"; // Assuming firebase.js exports db

/* ---------------- Helpers ---------------- */
const nowTs = () => Date.now();
const fmtTime = (ts) => (ts ? new Date(ts).toLocaleTimeString([], { hour:'2-digit', minute:'2-digit' }) : "");

/* ---------------- GlobalChat Component ---------------- */
// Props: user, palette, styles, text, setText, messagesEndRef, EMOJIS, selectedContact, onCloseChat
export default function GlobalChat({ 
    user, 
    palette, 
    styles, 
    text, 
    setText, 
    messagesEndRef, 
    EMOJIS,
    selectedContact,
    onCloseChat 
}) {
    const [messages, setMessages] = useState([]);
    const [emojiOpen, setEmojiOpen] = useState(false);
    // --- NEW VOICE STATE ---
    const [listening, setListening] = useState(false);
    
    const globalChatRef = useRef(null);
    // --- NEW VOICE REFS ---
    const recognitionRef = useRef(null);

    // --- Database Subscription (Unchanged) ---
    useEffect(() => {
        if (!user || !selectedContact || selectedContact.id !== "GLOBAL_CHAT_ID") {
             setMessages([]);
             return;
        }
        
        const chatRef = dbRef(db, `globalChat/messages`);
        globalChatRef.current = chatRef;

        const handleValue = (snap) => {
            const raw = snap.val() || {};
            const arr = Object.entries(raw).map(([id, v]) => ({ id, ...v }));
            arr.sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));
            setMessages(arr);
            setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }), 80);
        };

        onValue(chatRef, handleValue);

        return () => {
            if (globalChatRef.current) off(globalChatRef.current, 'value', handleValue);
        };
    }, [user, selectedContact]);

    // --- Messaging (MODIFIED to accept optional body for voice) ---
    async function sendTextMessage(body) {
        if (!user) return;
        const content = (body ?? text).trim(); // Use body if provided (from voice), otherwise use state text
        if (!content) return;

        const p = push(dbRef(db, `globalChat/messages`));
        await set(p, {
            sender: user.uid,
            name: user.displayName, 
            photo: user.photoURL || `https://api.dicebear.com/6.x/initials/svg?seed=${user.displayName}`,
            text: content,
            type: "text",
            timestamp: nowTs(),
        });
        setText("");
    }

    // --- Voice-to-Text Functionality (NEW) ---
    function startVoiceToText() {
        const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SR) return alert("Speech Recognition is not supported by your browser. Please use Chrome.");
        
        if (recognitionRef.current) { 
            recognitionRef.current.stop(); 
            recognitionRef.current = null; 
            setListening(false); 
            return; 
        }
        
        const rec = new SR();
        rec.lang = "en-US";
        rec.onstart = ()=>setListening(true);
        rec.onend = ()=>{ 
            setListening(false); 
            recognitionRef.current = null; 
        };
        rec.onresult = (ev) => {
            const transcript = ev.results[0][0].transcript;
            sendTextMessage(transcript); // Send the transcript directly
        };
        
        recognitionRef.current = rec;
        rec.start();
    }


    // --- Edit Message Functionality (Unchanged) ---
    async function editMessage(msg) {
        if (msg.sender !== user.uid) return;
        const nt = window.prompt("Edit:", msg.text);
        if (nt == null) return;
        const mRef = dbRef(db, `globalChat/messages/${msg.id}`);
        await update(mRef, { text: nt, edited: true });
    }

    // --- Delete Message Functionality (Unchanged) ---
    async function deleteMessage(msg) {
        if (msg.sender !== user.uid) return;
        if (!window.confirm("Delete this message for everyone in Global Chat?")) return;
        const mRef = dbRef(db, `globalChat/messages/${msg.id}`);
        await update(mRef, { text: "Message deleted", deleted: true });
    }

    // --- Reactions (Unchanged: only for others' messages) ---
    async function toggleReaction(msg, emoji) {
        if (!user || msg.sender === user.uid) return; 
        const mRef = dbRef(db, `globalChat/messages/${msg.id}`);
        
        const snap = await new Promise(res => onValue(mRef, s => res(s.val()), { onlyOnce:true }));
        const reactions = snap?.reactions || {};
        const arr = reactions[emoji] || [];
        
        const has = arr.includes(user.uid);
        const next = has ? arr.filter(x=>x!==user.uid) : [...arr, user.uid];
        
        const nextObj = { ...reactions, [emoji]: next.length ? next : undefined };
        
        await update(mRef, { reactions: nextObj });
    }

    // Custom styles for global chat sender name 
    const globalMsgNameStyle = {
        fontWeight: 700,
        fontSize: 12,
        color: palette.muted 
    };
    
    return (
        <div style={styles.chatArea}>
            {/* Header (Back button functionality is fixed using onCloseChat prop) */}
            <div style={styles.chatHeader}>
                <div style={{ display:"flex", alignItems:"center", gap:12 }}>
                    {window.innerWidth < 820 && selectedContact && (
                        <button
                            onClick={onCloseChat} 
                            style={styles.smallBtn}
                        >
                            ←
                        </button>
                    )}
                    <img src={selectedContact.photo} style={{ width:44, height:44, borderRadius:999 }} />
                    <div>
                        <div style={{ fontWeight:700 }}>{selectedContact.name}</div>
                        <div style={{ fontSize:12, color:palette.muted }}>Public Chat</div>
                    </div>
                </div>
            </div>

            {/* Body */}
            <div style={styles.chatBody}>
                {messages.map(m => {
                    const isMine = m.sender === user.uid;
                    const rowStyle = { 
                        ...styles.messageRow, 
                        alignItems: isMine ? "flex-end" : "flex-start",
                    };
                    const bubbleStyle = isMine ? styles.bubbleMine : styles.bubbleOther;
                    
                    return (
                        <div key={m.id} style={rowStyle}>
                            {/* Sender's Name */}
                            <div 
                                style={{
                                    ...globalMsgNameStyle, 
                                    color: isMine ? palette.accent : globalMsgNameStyle.color,
                                    alignSelf: isMine ? "flex-end" : "flex-start",
                                    marginBottom: 4,
                                }}
                            >
                                {isMine ? "You" : m.name}
                            </div>
                            
                            {/* Message Bubble */}
                            <div style={bubbleStyle}>
                                {m.deleted ? (
                                    <i style={{ opacity:0.7 }}>Message deleted</i>
                                ) : (
                                    <div style={{ whiteSpace:"pre-wrap" }}>
                                        {m.text}{m.edited?" · (edited)":""}
                                    </div>
                                )}
                                <div style={styles.metaSmall}>
                                    <div>{fmtTime(m.timestamp)}</div>
                                </div>
                            </div>
                            
                            <div 
                                style={{ 
                                    display:"flex", 
                                    gap:6, 
                                    marginTop:6, 
                                    alignSelf: isMine ? "flex-end" : "flex-start" 
                                }}
                            >
                                {/* --- EDIT/DELETE BUTTONS (FOR SENDER) --- */}
                                {isMine && !m.deleted && (
                                    <>
                                        <button onClick={()=>editMessage(m)} style={styles.smallBtn}>✎</button>
                                        <button onClick={()=>deleteMessage(m)} style={styles.smallBtn}>🗑</button>
                                    </>
                                )}
                                
                                {/* --- REACTION BUTTON (FOR OTHERS) --- */}
                                {!isMine && (
                                    <button onClick={()=>toggleReaction(m, "👍")} style={styles.smallBtn}>👍</button>
                                )}
                            </div>

                            {m.reactions && Object.keys(m.reactions).length > 0 && (
                                <div 
                                    style={{ 
                                        display:"flex", 
                                        gap:6, 
                                        marginTop:6, 
                                        alignSelf: isMine ? "flex-end" : "flex-start",
                                        marginLeft: isMine ? 0 : 10,
                                        marginRight: isMine ? 10 : 0,
                                    }}
                                >
                                    {Object.entries(m.reactions).map(([emo, arr])=>(
                                        <div key={emo} style={{ background:palette.tile, padding:"4px 8px", borderRadius:12 }}>
                                            {emo} <small style={{ color:palette.muted }}>{arr.length}</small>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    );
                })}
                <div ref={messagesEndRef} />
            </div>

            {/* Input Footer */}
            {emojiOpen && (
                <div style={styles.emojiBox}>
                    {EMOJIS.map(e=>(
                        <button key={e} onClick={()=>{ setText(t=>t+e); setEmojiOpen(false); }} style={{ fontSize:18, background:"transparent", border:"none", cursor:"pointer" }}>
                            {e}
                        </button>
                    ))}
                </div>
            )}
            
            <div style={styles.footer}>
                <button onClick={()=>setEmojiOpen(o=>!o)} style={styles.smallBtn}>😊</button>
                <input
                    placeholder="Type a message to the Global Chat"
                    value={text}
                    onChange={e => setText(e.target.value)}
                    onKeyDown={(e)=>{ if(e.key==="Enter" && !e.shiftKey){ e.preventDefault(); sendTextMessage(); } }}
                    style={styles.input}
                />
                {/* --- VOICE TO TEXT BUTTON (NEW/FIXED) --- */}
                <button 
                    onClick={startVoiceToText} 
                    style={{ ...styles.roundBtn, background:listening?"#c0392b":palette.accent }}
                >
                    {listening?"⏹":"🎤"}
                </button>
                <button onClick={()=>sendTextMessage()} style={styles.roundBtn}>➤</button>
            </div>
        </div>
    );
}