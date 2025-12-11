// src/App.js 
import React, { useEffect, useRef, useState } from "react";
import {
    signInWithPopup,
    onAuthStateChanged,
    signOut,
} from "firebase/auth";
import {
    ref as dbRef,
    onValue,
    set,
    push,
    update,
    remove,
    off,
} from "firebase/database";
import { auth, db, provider } from "./firebase";
import { HA_USER, replyAsHaBot } from "./HAchat"; 
import GlobalChat from "./GlobalChat";

/* ---------------- Helpers & Constants ---------------- */
const EMOJIS = [
    "😀","😁","😂","🤣","😃","😄","😅","😆","😉","😊",
    "😇","🙂","🙃","😋","😎","😍","😘","🤗","🤔","🤨",
    "😐","😑","😶","😴","😪","😢","😭","😠","😡","🤯",
    "🤝","👍","👎","🙏","✨","🔥","💯","❤️","💙","💚",
    "💛","🧡","🎉","🎁","📷","🎧","🗺️","☀️","🌙","⭐"
];

const nowTs = () => Date.now();
const fmtTime = (ts) => (ts ? new Date(ts).toLocaleTimeString([], { hour:'2-digit', minute:'2-digit' }) : "");
function timeAgo(ts) {
    if (!ts) return "unknown";
    const s = Math.floor((Date.now()-ts)/1000);
    if (s < 5) return "just now";
    if (s < 60) return `${s}s ago`;
    const m = Math.floor(s/60);
    if (m < 60) return `${m}m ago`;
    const h = Math.floor(m/60);
    if (h < 24) return `${h}h ago`;
    const d = Math.floor(h/24);
    if (d < 7) return `${d}d ago`;
    return new Date(ts).toLocaleDateString();
}

const GLOBAL_CHAT_USER = {
    id: "GLOBAL_CHAT_ID",
    name: "Global Chat",
    photo: "https://cdn-icons-png.flaticon.com/512/3592/3592548.png",
    isGlobal: true,
};

/* ---------------- App ---------------- */
export default function App() {
    // core state
    const [user, setUser] = useState(null);
    const [contactsAll, setContactsAll] = useState([]);
    const [friendsMap, setFriendsMap] = useState({});
    const [selectedContact, setSelectedContact] = useState(null);
    const [messages, setMessages] = useState([]);
    const [text, setText] = useState("");
    const [emojiOpen, setEmojiOpen] = useState(false);
    const [listening, setListening] = useState(false);
    const [theme, setTheme] = useState("light");
    const [sidebarVisible, setSidebarVisible] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    const [typingStatus, setTypingStatus] = useState("");
    const [lastSeenMap, setLastSeenMap] = useState({});

    // refs
    const messagesRefActive = useRef(null);
    const typingRefActive = useRef(null);
    const recognitionRef = useRef(null);
    const messagesEndRef = useRef(null);
    const typingTimerRef = useRef(null);

    // ---------------- Auth & initial subscriptions ----------------
    useEffect(() => {
        const unsub = onAuthStateChanged(auth, (u) => {
            if (u) {
                setUser(u);
                const myRef = dbRef(db, `users/${u.uid}`);
                set(myRef, { name: u.displayName || "", photo: u.photoURL || "", email: u.email || "", online: true, lastSeen: nowTs() }).catch(()=>{});

                const usersRef = dbRef(db, "users");
                onValue(usersRef, (snap) => {
                    const raw = snap.val() || {};
                    const arr = Object.keys(raw)
                        .filter(k => k && k !== u.uid)
                        .map(k => ({ id: k, ...raw[k] }));
                    
                    const merged = [GLOBAL_CHAT_USER, HA_USER, ...arr]; 
                    setContactsAll(merged);

                    const map = {};
                    Object.keys(raw).forEach(k => { if (raw[k] && raw[k].lastSeen) map[k] = raw[k].lastSeen; });
                    setLastSeenMap(map);
                });

                onValue(dbRef(db, `users/${u.uid}/friends`), snap => setFriendsMap(snap.val() || {}));
                
                onValue(dbRef(db, `users/${u.uid}/friendsShadow`), snap => {
                    const shadow = snap.val() || {};
                    setFriendsMap(prev => ({ ...shadow, ...prev }));
                });

            } else {
                setUser(null);
                setContactsAll([]);
                setFriendsMap({});
                setSelectedContact(null);
            }
        });

        return () => unsub();
    }, []); 

    // RESPONSIVE FIX #1: Auto-toggle sidebar visibility based on screen size and selected chat
    useEffect(() => {
        function onResize() {
            if (window.innerWidth < 820) {
                setSidebarVisible(!selectedContact);
            } else {
                setSidebarVisible(true);
            }
        }
        window.addEventListener("resize", onResize);
        onResize(); 
        return () => window.removeEventListener("resize", onResize);
    }, [selectedContact]);

    // ---------------- Chat open / subscribe ----------------
    function makeChatId(a,b) { if (!a||!b) return null; return a > b ? `${a}_${b}` : `${b}_${a}`; }

    function openChat(contact) {
        if (!user) return;
        
        // Cleanup old listeners when switching contacts
        if (messagesRefActive.current) off(messagesRefActive.current);
        if (typingRefActive.current) off(typingRefActive.current);
        
        setSelectedContact(contact);
        setMessages([]); // Clear messages when switching chat

        if (window.innerWidth < 820) setSidebarVisible(false);

        // If it's the Global Chat, the subscription/messaging is handled internally by GlobalChat.js
        if (contact.isGlobal) {
            setTypingStatus("");
            setText(""); // Also clear text input
            return;
        }


        // --- DM / HA Chat Logic ---
        const chatId = makeChatId(user.uid, contact.id);
        const msgsRef = dbRef(db, `chats/${chatId}/messages`);
        messagesRefActive.current = msgsRef;
        onValue(msgsRef, (snap) => {
            const raw = snap.val() || {};
            const arr = Object.entries(raw).map(([id, v]) => ({ id, ...v }));
            arr.sort((a,b) => (a.timestamp||0)-(b.timestamp||0));
            setMessages(arr);
            arr.forEach(m => {
                if (m.sender !== user.uid && !m.delivered) update(dbRef(db, `chats/${chatId}/messages/${m.id}`), { delivered: true }).catch(()=>{});
                if (m.sender !== user.uid && !m.read) update(dbRef(db, `chats/${chatId}/messages/${m.id}`), { read: true }).catch(()=>{});
            });
            setTimeout(()=>messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }), 80);
        });

        const tRef = dbRef(db, `chats/${chatId}/typing`);
        typingRefActive.current = tRef;
        onValue(tRef, (snap) => {
            const val = snap.val() || {};
            const other = Object.keys(val).filter(k => k !== user.uid && val[k]?.typing);
            if (other.length) setTypingStatus(`${val[other[0]]?.name || "typing"} is typing...`);
            else setTypingStatus("");
        });
    }

    // ---------------- Friend functions ----------------
    async function addFriend(id) {
        if (!user) return;
        await set(dbRef(db, `users/${user.uid}/friends/${id}`), true);
        await set(dbRef(db, `users/${id}/friends/${user.uid}`), true);
        await set(dbRef(db, `users/${user.uid}/friendsShadow/${id}`), true);
        await set(dbRef(db, `users/${id}/friendsShadow/${user.uid}`), true);
    }

    async function removeFriend(id) {
        if (!window.confirm("Remove this friend?")) return;
        await remove(dbRef(db, `users/${user.uid}/friends/${id}`));
        await remove(dbRef(db, `users/${id}/friends/${user.uid}`));
        await remove(dbRef(db, `users/${user.uid}/friendsShadow/${id}`));
        await remove(dbRef(db, `users/${id}/friendsShadow/${user.uid}`));
    }

    // ---------------- Messaging (DM/HA only) ----------------
    async function sendTextMessage(body) {
        if (!user || !selectedContact || selectedContact.isGlobal) return; // Blocked for Global Chat
        const content = (body ?? text).trim();
        if (!content) return;
        const chatId = makeChatId(user.uid, selectedContact.id);
        const p = push(dbRef(db, `chats/${chatId}/messages`));
        await set(p, {
            sender: user.uid,
            name: user.displayName,
            text: content,
            type: "text",
            timestamp: nowTs(),
            delivered:false, read:false, edited:false, deleted:false, reactions:{}
        });
        setText("");
        updateTyping(false);

        // --- HA CHAT LOGIC MOVED HERE ---
        if (selectedContact.id === HA_USER.id) {
            replyAsHaBot(chatId, content);
        }
    }

    function updateTyping(status) {
        if (!user || !selectedContact || selectedContact.isGlobal) return; // Blocked for Global Chat
        const id = makeChatId(user.uid, selectedContact.id);
        set(dbRef(db, `chats/${id}/typing/${user.uid}`), { typing: status, name: user.displayName });
    }

    function handleTypingChange(e) {
        setText(e.target.value);
        if (selectedContact && !selectedContact.isGlobal) { // Only update typing for DMs
            updateTyping(true);
            if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
            typingTimerRef.current = setTimeout(()=>updateTyping(false), 1000);
        } else {
             // For Global Chat, we still update the text state but skip typing status updates
             setText(e.target.value);
        }
    }

    function startVoiceToText() {
        if (selectedContact?.isGlobal) return alert("Voice-to-Text disabled for Global Chat.");
        const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SR) return alert("Use Chrome");
        if (recognitionRef.current) { recognitionRef.current.stop(); recognitionRef.current=null; setListening(false); return; }
        const rec = new SR();
        rec.lang = "en-US";
        rec.onstart = ()=>setListening(true);
        rec.onend = ()=>{ setListening(false); recognitionRef.current=null; };
        rec.onresult = (ev) => {
            const t = ev.results[0][0].transcript;
            sendTextMessage(t);
        };
        recognitionRef.current = rec;
        rec.start();
    }

    function handleImageFile(e) {
        if (selectedContact?.isGlobal) { e.target.value = ""; return alert("Image sending disabled for Global Chat."); }
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = async () => {
            const chatId = makeChatId(user.uid, selectedContact.id);
            const p = push(dbRef(db, `chats/${chatId}/messages`));
            await set(p, {
                sender:user.uid,
                name:user.displayName,
                text:file.name,
                type:"image",
                url:reader.result,
                timestamp:nowTs(),
                delivered:false, read:false
            });
        };
        reader.readAsDataURL(file);
        e.target.value = "";
    }

    async function editMessage(msg) {
        if (selectedContact?.isGlobal || msg.sender !== user.uid) return;
        const nt = window.prompt("Edit:", msg.text);
        if (nt == null) return;
        const id = makeChatId(user.uid, selectedContact.id);
        await update(dbRef(db, `chats/${id}/messages/${msg.id}`), { text:nt, edited:true });
    }

    async function deleteMessage(msg) {
        if (selectedContact?.isGlobal) return;
        if (!window.confirm("Delete for everyone?")) return;
        const id = makeChatId(user.uid, selectedContact.id);
        await update(dbRef(db, `chats/${id}/messages/${msg.id}`), { text:"Message deleted", deleted:true });
    }

    async function toggleReaction(msg, emoji) {
        if (selectedContact?.isGlobal) return; 
        const chatId = makeChatId(user.uid, selectedContact.id);
        const mRef = dbRef(db, `chats/${chatId}/messages/${msg.id}`);
        const snap = await new Promise(res => onValue(mRef, s => res(s.val()), { onlyOnce:true }));
        const reactions = snap?.reactions || {};
        const arr = reactions[emoji] || [];
        const has = arr.includes(user.uid);
        const next = has ? arr.filter(x=>x!==user.uid) : [...arr, user.uid];
        const nextObj = { ...reactions, [emoji]: next.length ? next : undefined };
        await update(mRef, { reactions: nextObj });
    }

    // Cleanup
    useEffect(()=>{
        return () => {
            if (messagesRefActive.current) off(messagesRefActive.current);
            if (typingRefActive.current) off(typingRefActive.current);
        };
    }, []);

    useEffect(()=>{
        if (!user) return;
        const uRef = dbRef(db, `users/${user.uid}`);
        const onUnload = () => update(uRef, { online:false, lastSeen:nowTs() });
        window.addEventListener("beforeunload", onUnload);
        return () => window.removeEventListener("beforeunload", onUnload);
    }, [user]);

    useEffect(()=>{ 
        // Only scroll for DMs, as GlobalChat handles its own scroll logic after data update
        if (!selectedContact?.isGlobal) { 
            messagesEndRef.current?.scrollIntoView({ behavior:"smooth" }); 
        }
    }, [messages, selectedContact]);

    // ---------------- Styles ----------------
    const palette = theme === "dark"
        ? { bg:"#0b141a", sidebar:"#202c33", panel:"#0f1a1b", tile:"#1f2c33", text:"#e9edef", muted:"#9fbfb1", accent:"#b2f391ff", readBlue:"#1877f2" }
        : { bg:"#f6f7f8", sidebar:"#ffffff", panel:"#ffffff", tile:"#e9eef0", text:"#081316", muted:"#607080", accent:"#D0F0C0", readBlue:"#1877f2" };

    const styles = {
        app: { display:"flex", height:"100vh", background:palette.bg, color:palette.text, fontFamily:"Segoe UI, Roboto, Arial", overflow:"hidden" },
        sidebar: {
            width: sidebarVisible ? (window.innerWidth < 820 ? '100%' : 320) : 0,
        minWidth: sidebarVisible ? (window.innerWidth < 820 ? '100%' : 260) : 0,
        transition: "width .22s",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        position: window.innerWidth < 820 ? 'absolute' : 'relative',
        zIndex: window.innerWidth < 820 ? 50 : 1,
        height: "100vh",
        background: palette.sidebar,
        borderRight: `1px solid ${palette.tile}`
        },
        header: { padding:14, display:"flex", justifyContent:"space-between", alignItems:"center", borderBottom:`1px solid ${palette.tile}`, background:palette.sidebar },
        logoWrap: { display:"flex", alignItems:"center", gap:10 },
        logoImg: { width:44, height:44, borderRadius:10 },
        search: { margin:12, padding:"10px 14px", borderRadius:24, background:palette.tile, color:palette.text, border:"none", width:"calc(100% - 24px)", outline:"none" },
        contactsWrap: { overflowY:"auto", height:"calc(100vh - 220px)", paddingBottom:10 },
        sectionTitle: { padding: "10px 14px", color: palette.muted, fontSize: 13, fontWeight: 700, background: "transparent" },
        contactRow: { display:"flex", gap:12, padding:"10px 12px", alignItems:"center", cursor:"pointer", borderBottom:`1px solid ${palette.tile}` },
        chatArea: { flex: 1,
        display: sidebarVisible && window.innerWidth < 820 ? 'none' : 'flex',
        flexDirection: "column",
        background: palette.panel,
        width: sidebarVisible && window.innerWidth < 820 ? '100%' : 'auto' },
        chatHeader: { display:"flex", alignItems:"center", gap:12, padding:12, borderBottom:`1px solid ${palette.tile}`, background:palette.panel },
        chatBody: { flex:1, padding:18, overflowY:"auto", backgroundColor: theme==="dark" ? "#071112" : "#e6e5dbff" },
        
        messageRow: { display:"flex", flexDirection:"column", marginBottom:12, maxWidth:"78%" },
        bubbleMine: { 
            alignSelf:"flex-end", 
            background:palette.accent, 
            color:"#000000ff", 
            padding:"10px 14px", 
            borderRadius:12, 
            wordBreak:"break-word" 
        },
        bubbleOther: { 
            alignSelf:"flex-start", 
            background:palette.tile, 
            color:palette.text, 
            padding:"10px 14px", 
            borderRadius:12, 
            wordBreak:"break-word" 
        },
        
        metaSmall: { fontSize:11, color:palette.muted, marginTop:6, display:"flex", justifyContent:"space-between" },
        footer: { padding:10, display:"flex", gap:8, alignItems:"center", borderTop:`1px solid ${palette.tile}`, background:palette.panel },
        input: { flex:1, padding:"10px 14px", borderRadius:22, border:"none", outline:"none", background:palette.tile, color:palette.text, fontSize:15 },
        roundBtn: { width:44, height:44, borderRadius:999, border:"none", background:palette.accent, color:"#fff", cursor:"pointer" },
        smallBtn: { border:"none", background:"transparent", color:palette.muted, cursor:"pointer", fontSize:18 },
        emojiBox: { position:"absolute", bottom:78, right: sidebarVisible ? 340 : 20, background:palette.panel, border:`1px solid ${palette.tile}`, padding:8, borderRadius:8, display:"grid", gridTemplateColumns:"repeat(10, 1fr)", gap:6, zIndex:60, maxWidth:520, maxHeight:220, overflowY:"auto" }
    };

    const isFriend = id => !!friendsMap[id];

    if (!user) {
        return (
            <div style={{ ...styles.app, alignItems:"center", justifyContent:"center" }}>
                <div style={{ textAlign:"center" }}>
                    <img src="https://cdn-icons-png.flaticon.com/512/733/733585.png" alt="logo" style={{ width:120, height:120, marginBottom:12, borderRadius:18 }} />
                    <h1 style={{ margin:6 }}>Let's Chat</h1>
                    <p style={{ color: palette.muted }}>Sign in to chat</p>
                    <button onClick={()=>signInWithPopup(auth, provider)} style={{ padding:"10px 18px", borderRadius:12, background:palette.accent, color:"#fff", border:"none", cursor:"pointer" }}>
                        Sign in with Google
                    </button>
                </div>
            </div>
        );
    }

    const usersWithoutSelf = contactsAll.filter(c => c.id !== user.uid && c.id !== HA_USER.id && c.id !== GLOBAL_CHAT_USER.id);
    const friendsList = usersWithoutSelf.filter(u => isFriend(u.id));
    const usersList = usersWithoutSelf.filter(u => !isFriend(u.id));

    return (
        <div style={styles.app}>
            {/* Sidebar (Contacts List) */}
            <div style={styles.sidebar}>
                <div style={styles.header}>
                    <div style={styles.logoWrap}>
                        <img src="https://cdn-icons-png.flaticon.com/512/733/733585.png" alt="logo" style={styles.logoImg} />
                        <div>
                            <div style={{ fontWeight:800 }}>{user.displayName}</div>
                            <div style={{ fontSize:12, color:palette.muted }}>{user.email}</div>
                        </div>
                    </div>

                    <div style={{ display:"flex", gap:8 }}>
                        <button title="Toggle theme" onClick={()=>setTheme(p=>p==="light"?"dark":"light")} style={styles.smallBtn}>{theme==="dark"?"☀️":"🌙"}</button>
                        <button title="Sign out" onClick={()=>signOut(auth)} style={styles.smallBtn}>⎋</button>
                    </div>
                </div>

                <input placeholder="Search contacts" value={searchQuery} onChange={e=>setSearchQuery(e.target.value)} style={styles.search} />

                <div style={styles.contactsWrap}>
                    
                    {/* --- GLOBAL CHAT PINNED --- */}
                    <div style={styles.sectionTitle}>Global</div>
                    <div
                        onClick={()=>openChat(GLOBAL_CHAT_USER)}
                        style={{
                            ...styles.contactRow,
                            background: selectedContact?.id === GLOBAL_CHAT_USER.id ? (theme==="dark"?"#121d20ff":"#eef6f3") : "transparent"
                        }}
                    >
                        <img src={GLOBAL_CHAT_USER.photo} style={{ width:46, height:46, borderRadius:999 }} />
                        <div>
                            <div style={{ fontWeight:700 }}>{GLOBAL_CHAT_USER.name}</div>
                            <div style={{ fontSize:12, color:palette.muted }}>Public Chat</div>
                        </div>
                    </div>
                    {/* --- END GLOBAL CHAT PINNED --- */}


                    <div style={styles.sectionTitle}>HA Chat</div>
                    <div
                        onClick={()=>openChat(HA_USER)}
                        style={{
                            ...styles.contactRow,
                            background: selectedContact?.id === HA_USER.id ? (theme==="dark"?"#121d20ff":"#eef6f3") : "transparent"
                        }}
                    >
                        <img src={HA_USER.photo} style={{ width:46, height:46, borderRadius:999 }} />
                        <div>
                            <div style={{ fontWeight:700 }}>{HA_USER.name}</div>
                            <div style={{ fontSize:12, color:palette.muted }}>AI Assistant</div>
                        </div>
                    </div>

                    <div style={styles.sectionTitle}>Friends</div>
                    {friendsList.length === 0 && (
                        <div style={{ padding:"8px 14px", color:palette.muted }}>No friends yet</div>
                    )}

                    {friendsList
                        .filter(c => (c.name||"").toLowerCase().includes(searchQuery.toLowerCase()))
                        .map(contact => (
                        <div
                            key={contact.id}
                            style={{
                                ...styles.contactRow,
                                background: selectedContact?.id === contact.id ? (theme==="dark"?"#132226":"#eef6f3") : "transparent"
                            }}
                            onClick={()=>openChat(contact)}
                        >
                            <img src={contact.photo || `https://api.dicebear.com/6.x/initials/svg?seed=${contact.name}`} style={{ width:46, height:46, borderRadius:999 }} />
                            <div style={{ flex:1 }}>
                                <div style={{ fontWeight:700 }}>{contact.name}</div>
                                <div style={{ fontSize:12, color:palette.muted }}>
                                    {contact.online ? "Online" : `Last seen ${timeAgo(lastSeenMap[contact.id])}`}
                                </div>
                            </div>
                            <button title="Remove friend" onClick={e=>{e.stopPropagation(); removeFriend(contact.id);}} style={styles.smallBtn}>🗑</button>
                        </div>
                    ))}

                    <div style={styles.sectionTitle}>Users</div>
                    {usersList
                        .filter(c => (c.name||"").toLowerCase().includes(searchQuery.toLowerCase()))
                        .map(contact => {
                            return (
                                <div key={contact.id} style={styles.contactRow}>
                                    <div
                                        style={{ display:"flex", flex:1, gap:12, cursor:"pointer" }}
                                        onClick={async ()=>{
                                            if (!isFriend(contact.id)) {
                                                await addFriend(contact.id);
                                            }
                                            openChat(contact);
                                        }}
                                    >
                                        <img src={contact.photo || `https://api.dicebear.com/6.x/initials/svg?seed=${contact.name}`} style={{ width:46, height:46, borderRadius:999 }} />
                                        <div>
                                            <div style={{ fontWeight:700 }}>{contact.name}</div>
                                            <div style={{ fontSize:12, color:palette.muted }}>
                                                {contact.online ? "Online" : `Last seen ${timeAgo(lastSeenMap[contact.id])}`}
                                            </div>
                                        </div>
                                    </div>
                                    <button title="Make Friend" onClick={async () => { await addFriend(contact.id); openChat(contact); }} style={styles.smallBtn}>➕</button>
                                </div>
                            );
                        })}
                </div>
            </div>

            {/* Chat Area */}
            {selectedContact ? (
                selectedContact.isGlobal ? (
                    // --- Render Global Chat Component ---
                    <GlobalChat 
                        user={user} 
                        palette={palette} 
                        styles={styles} 
                        text={text}
                        setText={setText}
                        messagesEndRef={messagesEndRef}
                        EMOJIS={EMOJIS}
                        selectedContact={selectedContact}
                        // --- FIX: Pass the function to close the chat and show sidebar ---
                        onCloseChat={() => {
                            setSelectedContact(null);
                            if (window.innerWidth < 820) setSidebarVisible(true);
                        }}
                    />
                ) : (
                // --- Standard DM/HA Chat Content ---
                    <div style={styles.chatArea}>
                        <div style={styles.chatHeader}>
                            <div style={{ display:"flex", alignItems:"center", gap:12 }}>
                                {window.innerWidth < 820 && (
                                    <button
                                        onClick={()=>{
                                            setSelectedContact(null);
                                            setSidebarVisible(true);
                                        }}
                                        style={styles.smallBtn}
                                    >
                                        ←
                                    </button>
                                )}

                                <img src={selectedContact.photo || `https://api.dicebear.com/6.x/initials/svg?seed=${selectedContact.name}`} style={{ width:44, height:44, borderRadius:999 }} />
                                <div>
                                    <div style={{ fontWeight:700 }}>{selectedContact.name}</div>
                                    <div style={{ fontSize:12, color:palette.muted }}>
                                        {typingStatus ||
                                            (selectedContact.online ? "Online" : `Last seen ${timeAgo(lastSeenMap[selectedContact.id])}`)}
                                    </div>
                                </div>
                            </div>

                            <div style={{ display:"flex", gap:8 }}>
                                <label>📎<input type="file" accept="image/*" onChange={handleImageFile} style={{display:"none"}}/></label>
                            </div>
                        </div>

                        <div style={styles.chatBody}>
                            {messages.map(m => (
                                <div key={m.id} style={{ ...styles.messageRow, alignItems:m.sender===user.uid?"flex-end":"flex-start" }}>
                                    <div style={m.sender === user.uid ? styles.bubbleMine : styles.bubbleOther}>
                                        {m.deleted ? (
                                            <i style={{ opacity:0.7 }}>Message deleted</i>
                                        ) : (
                                            <>
                                                {m.type === "image" && m.url && (
                                                    <img src={m.url} alt="" style={{ maxWidth:320, borderRadius:8 }} />
                                                )}
                                                <div style={{ whiteSpace:"pre-wrap" }}>
                                                    {m.text}{m.edited?" · (edited)":""}
                                                </div>
                                            </>
                                        )}

                                        <div style={styles.metaSmall}>
                                            <div>{fmtTime(m.timestamp)}</div>
                                            <div style={{ color:m.read?palette.readBlue:palette.muted }}>
                                                {m.sender===user.uid ? (m.read?"✔✔":(m.delivered?"✔":"…")) : ""}
                                            </div>
                                        </div>
                                    </div>

                                    <div style={{ display:"flex", gap:6, marginTop:6 }}>
                                        {m.sender === user.uid && !m.deleted && (
                                            <>
                                                <button onClick={()=>editMessage(m)} style={styles.smallBtn}>✎</button>
                                                <button onClick={()=>deleteMessage(m)} style={styles.smallBtn}>🗑</button>
                                            </>
                                        )}
                                        <button onClick={()=>toggleReaction(m, "👍")} style={styles.smallBtn}>👍</button>
                                    </div>

                                    {m.reactions && Object.keys(m.reactions).length > 0 && (
                                        <div style={{ display:"flex", gap:6, marginTop:6 }}>
                                            {Object.entries(m.reactions).map(([emo, arr])=>(
                                                <div key={emo} style={{ background:palette.tile, padding:"4px 8px", borderRadius:12 }}>
                                                    {emo} <small style={{ color:palette.muted }}>{arr.length}</small>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            ))}

                            <div ref={messagesEndRef} />
                        </div>

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
                                placeholder="Type a message"
                                value={text}
                                onChange={handleTypingChange}
                                onKeyDown={(e)=>{ if(e.key==="Enter" && !e.shiftKey){ e.preventDefault(); sendTextMessage(); } }}
                                style={styles.input}
                            />
                            <button onClick={startVoiceToText} style={{ ...styles.roundBtn, background:listening?"#c0392b":palette.accent }}>
                                {listening?"⏹":"🎤"}
                            </button>
                            <button onClick={()=>sendTextMessage()} style={styles.roundBtn}>➤</button>
                        </div>
                    </div>
                )
            ) : (
                <div style={{ flex:1, display:"flex", alignItems:"center", justifyContent:"center", color:palette.muted }}>
                    <div style={{ textAlign:"center", maxWidth:520 }}>
                        <h2>Welcome — select a contact</h2>
                        <p>Global Chat and HA Chat are pinned at the top.</p>
                    </div>
                </div>
            )}
        </div>
    );
}