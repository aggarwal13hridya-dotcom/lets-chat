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
import { db } from "./firebase"; 

/* ---------------- GlobalChat Component ---------------- */
export default function GlobalChat({ 
    user, 
    palette, 
    styles, 
    text, 
    setText, 
    messagesEndRef, 
    EMOJIS,
    selectedContact,
    onCloseChat,
    uploadImageAndSend,
    hoveredMessageId,
    activeMenuId,
    handleMouseEnter,
    handleMouseLeave,
    handleDotsClick,
    handleTouchStart,
    handleTouchEnd,
    deleteMessage,
    editMessage,
    toggleReaction,
    fmtTime
}) {
    const [messages, setMessages] = useState([]);
    const [emojiOpen, setEmojiOpen] = useState(false);
    const [listening, setListening] = useState(false);
    
    const globalChatRef = useRef(null);
    const recognitionRef = useRef(null);

    const nowTs = () => Date.now();

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

    async function sendTextMessage(body) {
        if (!user) return;
        const content = (body ?? text).trim(); 
        if (!content) return;

        const p = push(dbRef(db, `globalChat/messages`));
        await set(p, {
            sender: user.uid,
            name: user.displayName, 
            photo: user.photoURL || `https://api.dicebear.com/6.x/initials/svg?seed=${user.displayName}`,
            text: content,
            type: "text",
            timestamp: nowTs(),
            read: true, 
            delivered: true, 
        });
        setText("");
    }
    
    async function handleImageFile(e) {
        const file = e.target.files[0];
        e.target.value = null; 
        if (!file || !user || !uploadImageAndSend) return;
        const receiverId = selectedContact.id; 
        const chatPath = `globalChat/messages`;
        await uploadImageAndSend(file, user, receiverId, chatPath); 
    }

    function startVoiceToText() {
        const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SR) return alert("Speech Recognition is not supported by your browser. Please use Chrome.");
        if (recognitionRef.current) { recognitionRef.current.stop(); recognitionRef.current = null; setListening(false); return; }
        const rec = new SR();
        rec.lang = "en-US";
        rec.onstart = ()=>setListening(true);
        rec.onend = ()=>{ setListening(false); recognitionRef.current = null; };
        rec.onresult = (ev) => {
            const transcript = ev.results[0][0].transcript;
            sendTextMessage(transcript); 
        };
        recognitionRef.current = rec;
        rec.start();
    }

    return (
        <div style={styles.chatArea}>
            <div style={styles.chatHeader}>
                <div style={{ display:"flex", alignItems:"center", gap:12 }}>
                    {window.innerWidth < 820 && <button onClick={onCloseChat} style={styles.smallBtn}>←</button>}
                    <img src={selectedContact.photo} style={{ width:44, height:44, borderRadius:999 }} />
                    <div><div style={{ fontWeight:700 }}>{selectedContact.name}</div><div style={{ fontSize:12, color:palette.muted }}>Public Chat</div></div>
                </div>
                <div style={{ display:"flex", gap:8 }}><label>📎<input type="file" accept="image/*" onChange={handleImageFile} style={{display:"none"}}/></label></div>
            </div>

            <div style={styles.chatBody}>
                {messages.map(m => {
                    const isMine = m.sender === user.uid;
                    const showDots = hoveredMessageId === m.id && activeMenuId !== m.id;
                    const showMenu = activeMenuId === m.id;

                    return (
                        <div 
                            key={m.id} 
                            style={{...styles.messageRow, alignItems: isMine ? "flex-end" : "flex-start"}}
                            onMouseEnter={() => handleMouseEnter(m.id)}
                            onMouseLeave={handleMouseLeave}
                            onTouchStart={() => handleTouchStart(m.id)}
                            onTouchEnd={handleTouchEnd}
                        >
                            <div style={{ fontWeight: 700, fontSize: 12, color: isMine ? palette.accent : palette.muted, marginBottom: 4 }}>
                                {isMine ? "You" : m.name}
                            </div>

                            {/* Action Menu List (The Margin/Gap is set HERE) */}
                            {showMenu && (
                                <div style={{
                                    ...styles.actionMenu, 
                                    // *** MODIFIED FOR 8 PIXEL MARGIN ***
                                    [isMine?"right":"left"]: "calc(0% + 100px)", 
                                    top: 0
                                }}>
                                    {/* Delete is available for all own messages */}
                                    <div style={styles.menuItem} onClick={()=>deleteMessage(m)}>delete message 🗑️</div>

                                    {/* Edit is only available for own, non-deleted messages */}
                                    {isMine && !m.deleted && <div style={styles.menuItem} onClick={()=>editMessage(m)}>edit message ✎</div>}
                                    
                                    {/* React is available for all messages */}
                                    <div style={styles.menuItem} onClick={()=>toggleReaction(m, "👍")}>react message 👍</div>
                                </div>
                            )}

                            <div style={isMine ? styles.bubbleMine : styles.bubbleOther}>
                                {/* 3 Dots (Appears ON the message) */}
                                {showDots && (
                                    <div style={styles.threeDots} onClick={(e) => handleDotsClick(e, m.id)}>•••</div>
                                )}

                                {m.deleted ? <i style={{ opacity:0.7 }}>Message deleted</i> : 
                                <>
                                    {m.type === "image" && m.url && <img src={m.url} alt="" style={{ maxWidth:320, borderRadius:8, marginBottom: m.text ? 8 : 0 }} />}
                                    <div style={{ whiteSpace:"pre-wrap" }}>{m.text}{m.edited?" · (edited)":""}</div>
                                </>}
                                <div style={styles.metaSmall}><div>{fmtTime(m.timestamp)}</div></div>
                            </div>

                            {m.reactions && Object.keys(m.reactions).length > 0 && (
                                <div style={{ display:"flex", gap:6, marginTop:6 }}>
                                    {Object.entries(m.reactions).map(([emo, arr])=>(
                                        <div key={emo} style={{ background:palette.tile, padding:"4px 8px", borderRadius:12 }}>{emo} <small style={{ color:palette.muted }}>{arr.length}</small></div>
                                    ))}
                                </div>
                            )}
                        </div>
                    );
                })}
                <div ref={messagesEndRef} />
            </div>

            {emojiOpen && (
                <div style={styles.emojiBox}>
                    {EMOJIS.map(e=>(<button key={e} onClick={()=>{ setText(t=>t+e); setEmojiOpen(false); }} style={{ fontSize:18, background:"transparent", border:"none", cursor:"pointer" }}>{e}</button>))}
                </div>
            )}
            
            <div style={styles.footer}>
                <button onClick={()=>setEmojiOpen(o=>!o)} style={styles.smallBtn}>😊</button>
                <input placeholder="Type a message to the Global Chat" value={text} onChange={e => setText(e.target.value)} onKeyDown={(e)=>{ if(e.key==="Enter" && !e.shiftKey){ e.preventDefault(); sendTextMessage(); } }} style={styles.input} />
                <button onClick={startVoiceToText} style={{ ...styles.roundBtn, background:listening?"#c0392b":palette.accent }}>{listening?"⏹":"🎤"}</button>
                <button onClick={()=>sendTextMessage()} style={styles.roundBtn}>➤</button>
            </div>
        </div>
    );
}