// src/GlobalChat.js
import React, { useEffect, useRef, useState } from "react";
import { ref as dbRef, onValue, set, push, update, off, remove } from "firebase/database";
import { db } from "./firebase"; 

const GLOBAL_CHAT_PHOTO_URL = "https://thumbs.dreamstime.com/z/unity-group-illustration-white-86095637.jpg";
const nowTs = () => Date.now();

export default function GlobalChat({ 
    user, palette, styles, text, setText, messagesEndRef, EMOJIS, selectedContact, onCloseChat, uploadImageAndSend, hoveredMessageId, activeMenuId, handleMouseEnter, handleMouseLeave, handleDotsClick, handleTouchStart, handleTouchEnd, deleteMessage, editMessage, toggleReaction, fmtTime,
    friends = [] // Added friends prop to check existing connections
}) {
    const [messages, setMessages] = useState([]);
    const [emojiOpen, setEmojiOpen] = useState(false);
    const [listening, setListening] = useState(false);
    const [localDeletedIds, setLocalDeletedIds] = useState([]);
    const globalChatRef = useRef(null);
    const recognitionRef = useRef(null);

    useEffect(() => {
        if (!user || !selectedContact || selectedContact.id !== "GLOBAL_CHAT_ID") { setMessages([]); return; }
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
        return () => { if (globalChatRef.current) off(globalChatRef.current, 'value', handleValue); };
    }, [user, selectedContact, messagesEndRef]);

    async function sendTextMessage(body) {
        if (!user) return;
        const content = (body ?? text).trim(); 
        if (!content) return;

        const msgData = {
            sender: user.uid,
            name: user.displayName, 
            photo: user.photoURL || `https://api.dicebear.com/6.x/initials/svg?seed=${user.displayName}`,
            text: content,
            type: "text",
            timestamp: nowTs(),
            read: true, 
            delivered: true, 
        };

        await set(push(dbRef(db, `globalChat/messages`)), msgData);
        await set(push(dbRef(db, `favoritesChat/messages`)), msgData);
        setText("");
    }
    
    async function handleImageFile(e) {
        const file = e.target.files[0];
        e.target.value = null; 
        if (!file || !user || !uploadImageAndSend) return;
        await uploadImageAndSend(file, user, "GLOBAL_CHAT_ID", `globalChat/messages`); 
        await uploadImageAndSend(file, user, "FAVORITES_ID", `favoritesChat/messages`); 
    }

    function startVoiceToText() {
        const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SR) return alert("Speech Recognition not supported.");
        if (recognitionRef.current) { recognitionRef.current.stop(); recognitionRef.current = null; setListening(false); return; }
        const rec = new SR();
        rec.lang = "en-US";
        rec.onstart = ()=>setListening(true);
        rec.onend = ()=>{ setListening(false); recognitionRef.current = null; };
        rec.onresult = (ev) => sendTextMessage(ev.results[0][0].transcript);
        recognitionRef.current = rec;
        rec.start();
    }

    const handleInternalDelete = (msg) => {
        if (msg.sender === user.uid) deleteMessage(msg);
        else setLocalDeletedIds(prev => [...prev, msg.id]);
    };

    // New logic: Add sender to user's friend list
    async function makeFriend(msg) {
        if (!user || !msg.sender) return;
        const friendData = {
            id: msg.sender,
            name: msg.name,
            photo: msg.photo,
            addedAt: nowTs()
        };
        await set(dbRef(db, `users/${user.uid}/friends/${msg.sender}`), friendData);
        alert(`${msg.name} added to friends!`);
    }

    const chatPhoto = selectedContact.id === "GLOBAL_CHAT_ID" ? GLOBAL_CHAT_PHOTO_URL : selectedContact.photo;

    return (
        <div style={styles.chatArea}>
            <div style={styles.chatHeader}>
                <div style={{ display:"flex", alignItems:"center", gap:12 }}>
                    {window.innerWidth < 820 && <button onClick={onCloseChat} style={styles.smallBtn}>←</button>}
                    <img src={chatPhoto} style={{ width:44, height:44, borderRadius:999 }} alt="" />
                    <div>
                        <div style={{ fontWeight:700 }}>{selectedContact.name}</div>
                        <div style={{ fontSize:12, color:palette.muted }}>Public Chat</div>
                    </div>
                </div>
                <div style={{ display:"flex", gap:8 }}><label>📎<input type="file" accept="image/*" onChange={handleImageFile} style={{display:"none"}}/></label></div>
            </div>
            <div style={styles.chatBody}>
                {messages.filter(m => !localDeletedIds.includes(m.id)).map(m => {
                    const isMine = m.sender === user.uid;
                    const showDots = hoveredMessageId === m.id && activeMenuId !== m.id;
                    const showMenu = activeMenuId === m.id;
                    // Check if sender is already a friend
                    const isAlreadyFriend = friends.some(f => f.id === m.sender);

                    return (
                        <div key={m.id} style={{...styles.messageRow, alignItems: isMine ? "flex-end" : "flex-start"}} onMouseEnter={() => handleMouseEnter(m.id)} onMouseLeave={handleMouseLeave} onTouchStart={() => handleTouchStart(m.id)} onTouchEnd={handleTouchEnd}>
                            <div style={{ fontWeight: 700, fontSize: 12, color: isMine ? palette.accent : palette.muted, marginBottom: 4 }}>{isMine ? "You" : m.name}</div>
                            {showMenu && (
                                <div style={{ ...styles.actionMenu, [isMine?"right":"left"]: "calc(0% + 100px)", top: 0 }}>
                                    <div style={styles.menuItem} onClick={()=>handleInternalDelete(m)}>delete message 🗑️</div>
                                    {isMine && !m.deleted && <div style={styles.menuItem} onClick={()=>editMessage(m)}>edit message ✎</div>}
                                    {!isMine && <div style={styles.menuItem} onClick={()=>toggleReaction(m, "👍")}>react message 👍</div>}
                                    {/* New Option: Make Friend */}
                                    {!isMine && !isAlreadyFriend && (
                                        <div style={styles.menuItem} onClick={() => makeFriend(m)}>Make Friend 👤</div>
                                    )}
                                </div>
                            )}
                            <div style={isMine ? styles.bubbleMine : styles.bubbleOther}>
                                {showDots && <div style={styles.threeDots} onClick={(e) => handleDotsClick(e, m.id)}>•••</div>}
                                {m.deleted ? <i style={{ opacity:0.7 }}>Message deleted</i> : 
                                <>
                                    {m.type === "image" && m.url && <img src={m.url} alt="" style={{ maxWidth:320, borderRadius:8, marginBottom: m.text ? 8 : 0 }} />}
                                    <div style={{ whiteSpace:"pre-wrap" }}>{m.text}{m.edited?" · (edited)":""}</div>
                                </>}
                                <div style={styles.metaSmall}><div>{fmtTime(m.timestamp)}</div></div>
                            </div>
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
                <input placeholder="Type a message" value={text} onChange={e => setText(e.target.value)} onKeyDown={(e)=>{ if(e.key==="Enter" && !e.shiftKey){ e.preventDefault(); sendTextMessage(); } }} style={styles.input} />
                <button onClick={startVoiceToText} style={{ ...styles.roundBtn, background:listening?"#c0392b":palette.accent }}>{listening?"⏹":"🎤"}</button>
                <button onClick={()=>sendTextMessage()} style={styles.roundBtn}>➤</button>
            </div>
        </div>
    );
}