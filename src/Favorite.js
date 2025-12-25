// src/Favorite.js
import React, { useEffect, useRef, useState } from "react";
import { ref as dbRef, onValue, off } from "firebase/database";
import { db } from "./firebase"; 

export default function Favorite({ 
    user, 
    palette, 
    styles, 
    text, 
    setText, 
    messagesEndRef, 
    EMOJIS,
    selectedContact,
    onCloseChat,
    friendsMap, 
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
    fmtTime,
    sendTextMessage,
    handleImageFile,
    startVoiceToText,
    listening,
    emojiOpen,
    setEmojiOpen
}) {
    const [messages, setMessages] = useState([]);
    const [localDeletedIds, setLocalDeletedIds] = useState([]);
    const favoriteRef = useRef(null);

    useEffect(() => {
        if (!user || !selectedContact || selectedContact.id !== "FAVORITES_ID") {
             setMessages([]);
             return;
        }
        
        const chatRef = dbRef(db, `favoritesChat/messages`);
        favoriteRef.current = chatRef;

        const handleValue = (snap) => {
            const raw = snap.val() || {};
            const arr = Object.entries(raw).map(([id, v]) => ({ id, ...v }));
            arr.sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));
            setMessages(arr);
            setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }), 80);
        };

        onValue(chatRef, handleValue);
        return () => { if (favoriteRef.current) off(favoriteRef.current, 'value', handleValue); };
    }, [user, selectedContact, messagesEndRef]);

    const handleInternalDelete = (msg) => {
        if (msg.sender === user.uid) deleteMessage(msg);
        else setLocalDeletedIds(prev => [...prev, msg.id]);
    };

    return (
        <div style={styles.chatArea}>
            <div style={styles.chatHeader}>
                <div style={{ display:"flex", alignItems:"center", gap:12 }}>
                    {window.innerWidth < 820 && <button onClick={onCloseChat} style={styles.smallBtn}>←</button>}
                    <img src={selectedContact.photo} style={{ width:44, height:44, borderRadius:999 }} alt="Favorites" />
                    <div>
                        <div style={{ fontWeight:700 }}>{selectedContact.name}</div>
                        <div style={{ fontSize:12, color:palette.muted }}>Friends Only Feed</div>
                    </div>
                </div>
            </div>

            <div style={styles.chatBody}>
                {messages
                  .filter(m => !localDeletedIds.includes(m.id))
                  .filter(m => m.sender === user.uid || !!friendsMap[m.sender])
                  .map(m => {
                    const isMine = m.sender === user.uid;
                    const showDots = hoveredMessageId === m.id && activeMenuId !== m.id;
                    const showMenu = activeMenuId === m.id;

                    return (
                        <div key={m.id} style={{...styles.messageRow, alignItems: isMine ? "flex-end" : "flex-start"}} onMouseEnter={() => handleMouseEnter(m.id)} onMouseLeave={handleMouseLeave} onTouchStart={() => handleTouchStart(m.id)} onTouchEnd={handleTouchEnd}>
                            <div style={{ fontWeight: 700, fontSize: 12, color: isMine ? palette.accent : palette.muted, marginBottom: 4 }}>{isMine ? "You" : m.name}</div>
                            {showMenu && (
                                <div style={{ ...styles.actionMenu, [isMine?"right":"left"]: "calc(0% + 100px)", top: 0 }}>
                                    <div style={styles.menuItem} onClick={()=>handleInternalDelete(m)}>delete message 🗑️</div>
                                    {isMine && !m.deleted && <div style={styles.menuItem} onClick={()=>editMessage(m)}>edit message ✎</div>}
                                    {!isMine && <div style={styles.menuItem} onClick={()=>toggleReaction(m, "👍")}>react message 👍</div>}
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
                <input placeholder="Post to Favorites" value={text} onChange={e => setText(e.target.value)} onKeyDown={(e)=>{ if(e.key==="Enter" && !e.shiftKey){ e.preventDefault(); sendTextMessage(); } }} style={styles.input} />
                <button onClick={startVoiceToText} style={{ ...styles.roundBtn, background:listening?"#c0392b":palette.accent }}>{listening?"⏹":"🎤"}</button>
                <button onClick={()=>sendTextMessage()} style={styles.roundBtn}>➤</button>
            </div>
        </div>
    );
}