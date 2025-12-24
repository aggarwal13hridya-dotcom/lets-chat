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
import { 
    ref as storageRef, 
    uploadBytes, 
    getDownloadURL 
} from "firebase/storage";
import { auth, db, storage, provider } from "./firebase";
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

// UPDATED GLOBAL CHAT PHOTO
const GLOBAL_CHAT_USER = {
    id: "GLOBAL_CHAT_ID",
    name: "Global Chat",
    photo: "https://thumbs.dreamstime.com/z/unity-group-illustration-white-86095637.jpg",
    isGlobal: true,
};

/* ---------------- App ---------------- */
export default function App() {
    // core state
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true); // NEW: Added to prevent Sign-In flash
    const [contactsAll, setContactsAll] = useState([]);
    
    // PERSISTENCE CHANGE: Initialize state directly from LocalStorage so it exists BEFORE the first render.
    const [friendsMap, setFriendsMap] = useState(() => {
        const localData = localStorage.getItem("persistent_friends_list");
        return localData ? JSON.parse(localData) : {};
    });

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
    
    // --- STATE FOR ACTIONS ---
    const [hoveredMessageId, setHoveredMessageId] = useState(null); 
    const [activeMenuId, setActiveMenuId] = useState(null); 

    // refs
    const messagesRefActive = useRef(null);
    const typingRefActive = useRef(null);
    const recognitionRef = useRef(null);
    const messagesEndRef = useRef(null);
    const typingTimerRef = useRef(null);
    const holdTimerRef = useRef(null); 

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

                // PERSISTENCE CHANGE: Keep LocalStorage and Firebase in sync
                const fRef = dbRef(db, `users/${u.uid}/friends`);
                onValue(fRef, (snap) => {
                    const data = snap.val() || {};
                    if (Object.keys(data).length > 0 || snap.exists()) {
                        setFriendsMap(data);
                        localStorage.setItem("persistent_friends_list", JSON.stringify(data));
                    }
                });

            } else {
                setUser(null);
                setContactsAll([]);
                setFriendsMap({});
                setSelectedContact(null);
            }
            setLoading(false); // NEW: Authentication check complete
        });

        return () => unsub();
    }, []); 

    // RESPONSIVE FIX
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

    // ---------------- Chat open ----------------
    function makeChatId(a,b) { if (!a||!b) return null; return a > b ? `${a}_${b}` : `${b}_${a}`; }

    function openChat(contact) {
        if (!user) return;
        if (messagesRefActive.current) off(messagesRefActive.current);
        if (typingRefActive.current) off(typingRefActive.current);
        
        setSelectedContact(contact);
        setMessages([]); 

        if (window.innerWidth < 820) setSidebarVisible(false);

        if (contact.isGlobal) {
            setTypingStatus("");
            setText(""); 
            return;
        }

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

    // ---------------- Action Logic ----------------

    function handleMouseEnter(msgId) {
        if (window.matchMedia("(pointer: fine)").matches) {
            setHoveredMessageId(msgId);
        }
    }

    function handleMouseLeave() {
        setHoveredMessageId(null);
        setActiveMenuId(null); 
    }

    function handleDotsClick(e, msgId) {
        e.stopPropagation();
        setActiveMenuId(msgId);
    }

    function handleTouchStart(msgId) {
        holdTimerRef.current = setTimeout(() => {
            setActiveMenuId(msgId);
            setHoveredMessageId(null); 
        }, 2000); 
    }

    function handleTouchEnd() {
        if (holdTimerRef.current) {
            clearTimeout(holdTimerRef.current);
            holdTimerRef.current = null;
        }
    }

    // ---------------- Friend functions ----------------
    async function addFriend(id) {
        if (!user) return;
        const newMap = { ...friendsMap, [id]: true };
        setFriendsMap(newMap);
        localStorage.setItem("persistent_friends_list", JSON.stringify(newMap));
        await set(dbRef(db, `users/${user.uid}/friends/${id}`), true);
        await set(dbRef(db, `users/${id}/friends/${user.uid}`), true);
    }

    async function removeFriend(id) {
        if (!window.confirm("Remove this friend?")) return;
        const newMap = { ...friendsMap };
        delete newMap[id];
        setFriendsMap(newMap);
        localStorage.setItem("persistent_friends_list", JSON.stringify(newMap));
        await remove(dbRef(db, `users/${user.uid}/friends/${id}`));
        await remove(dbRef(db, `users/${id}/friends/${user.uid}`));
    }

    // ---------------- Messaging ----------------
    async function sendTextMessage(body) {
        if (!user || !selectedContact || selectedContact.isGlobal) return;
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

        if (selectedContact.id === HA_USER.id) {
            replyAsHaBot(chatId, content);
        }
    }

    function updateTyping(status) {
        if (!user || !selectedContact || selectedContact.isGlobal) return;
        const id = makeChatId(user.uid, selectedContact.id);
        set(dbRef(db, `chats/${id}/typing/${user.uid}`), { typing: status, name: user.displayName });
    }

    function handleTypingChange(e) {
        setText(e.target.value);
        if (selectedContact && !selectedContact.isGlobal) {
            updateTyping(true);
            if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
            typingTimerRef.current = setTimeout(()=>updateTyping(false), 1000);
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

    async function uploadImageAndSend(file, u, receiverId, chatPath) {
        if (!u || !file) return;
        const isGlobal = receiverId === GLOBAL_CHAT_USER.id;
        const uploadFileName = `${u.uid}-${nowTs()}-${file.name}`;
        const storagePath = isGlobal 
            ? `global_chat_images/${uploadFileName}` 
            : `chat_images/${makeChatId(u.uid, receiverId)}/${uploadFileName}`;

        const sRef = storageRef(storage, storagePath);
        try {
            const snapshot = await uploadBytes(sRef, file);
            const url = await getDownloadURL(snapshot.ref);
            const p = push(dbRef(db, chatPath));
            await set(p, {
                sender: u.uid,
                name: u.displayName,
                photo: u.photoURL || `https://api.dicebear.com/6.x/initials/svg?seed=${u.displayName}`,
                text: file.name,
                type: "image",
                url: url,
                timestamp: nowTs(),
                delivered: !isGlobal ? false : true,
                read: true,
                edited: false, deleted: false, reactions: {}
            });
        } catch (error) {
            console.error("Image upload failed:", error);
        }
    }

    function handleImageFileDM(e) {
        const file = e.target.files?.[0];
        e.target.value = null; 
        if (!file || !user || !selectedContact) return;
        const receiverId = selectedContact.id;
        const chatId = makeChatId(user.uid, receiverId);
        const chatPath = `chats/${chatId}/messages`;
        uploadImageAndSend(file, user, receiverId, chatPath);
    }

    async function editMessage(msg) {
        const nt = window.prompt("Edit:", msg.text);
        if (nt == null) return;
        const id = selectedContact.isGlobal ? null : makeChatId(user.uid, selectedContact.id);
        const path = selectedContact.isGlobal ? `globalChat/messages/${msg.id}` : `chats/${id}/messages/${msg.id}`;
        await update(dbRef(db, path), { text:nt, edited:true });
        setActiveMenuId(null);
    }

    async function deleteMessage(msg) {
        if (!window.confirm("Delete for everyone?")) return;
        const id = selectedContact.isGlobal ? null : makeChatId(user.uid, selectedContact.id);
        const path = selectedContact.isGlobal ? `globalChat/messages/${msg.id}` : `chats/${id}/messages/${msg.id}`;
        await update(dbRef(db, path), { text:"Message deleted", deleted:true });
        setActiveMenuId(null);
    }

    async function toggleReaction(msg, emoji) {
        const id = selectedContact.isGlobal ? null : makeChatId(user.uid, selectedContact.id);
        const path = selectedContact.isGlobal ? `globalChat/messages/${msg.id}` : `chats/${id}/messages/${msg.id}`;
        const mRef = dbRef(db, path);
        const snap = await new Promise(res => onValue(mRef, s => res(s.val()), { onlyOnce:true }));
        const reactions = snap?.reactions || {};
        const arr = reactions[emoji] || [];
        const has = arr.includes(user.uid);
        const next = has ? arr.filter(x=>x!==user.uid) : [...arr, user.uid];
        const nextObj = { ...reactions, [emoji]: next.length ? next : undefined };
        await update(mRef, { reactions: nextObj });
        setActiveMenuId(null);
    }

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
        if (!selectedContact?.isGlobal) { 
            messagesEndRef.current?.scrollIntoView({ behavior:"smooth" }); 
        }
    }, [messages, selectedContact]);

    // ---------------- Styles ----------------
    const theme_palette = theme === "dark"
        ? { bg:"#0b141a", sidebar:"#202c33", panel:"#0f1a1b", tile:"#1f2c33", text:"#e9edef", muted:"#9fbfb1", accent:"#b2f391ff", readBlue:"#1877f2" }
        : { bg:"#f6f7f8", sidebar:"#ffffff", panel:"#ffffff", tile:"#e9eef0", text:"#081316", muted:"#607080", accent:"#D0F0C0", readBlue:"#1877f2" };

    const styles = {
        app: { display:"flex", height:"100vh", background:theme_palette.bg, color:theme_palette.text, fontFamily:"Segoe UI, Roboto, Arial", overflow:"hidden" },
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
            background: theme_palette.sidebar,
            borderRight: `1px solid ${theme_palette.tile}`
        },
        header: { padding:14, display:"flex", justifyContent:"space-between", alignItems:"center", borderBottom:`1px solid ${theme_palette.tile}`, background:theme_palette.sidebar },
        logoWrap: { display:"flex", alignItems:"center", gap:10 },
        logoImg: { width:44, height:44, borderRadius:10 },
        search: { margin:12, padding:"10px 14px", borderRadius:24, background:theme_palette.tile, color:theme_palette.text, border:"none", width:"calc(100% - 24px)", outline:"none" },
        contactsWrap: { overflowY:"auto", height:"calc(100vh - 220px)", paddingBottom:10 },
        sectionTitle: { padding: "10px 14px", color: theme_palette.muted, fontSize: 13, fontWeight: 700, background: "transparent" },
        contactRow: { display:"flex", gap:12, padding:"10px 12px", alignItems:"center", cursor:"pointer", borderBottom:`1px solid ${theme_palette.tile}` },
        chatArea: { flex: 1, display: sidebarVisible && window.innerWidth < 820 ? 'none' : 'flex', flexDirection: "column", background: theme_palette.panel, width: sidebarVisible && window.innerWidth < 820 ? '100%' : 'auto' },
        chatHeader: { display:"flex", alignItems:"center", gap:12, padding:12, borderBottom:`1px solid ${theme_palette.tile}`, background:theme_palette.panel },
        chatBody: { flex:1, padding:18, overflowY:"auto", backgroundColor: theme==="dark" ? "#071112" : "#e6e5dbff" },
        messageRow: { display:"flex", flexDirection:"column", marginBottom:12, maxWidth:"78%", position:"relative" }, 
        bubbleMine: { alignSelf:"flex-end", background:theme_palette.accent, color:"#000000ff", padding:"10px 14px", borderRadius:12, wordBreak:"break-word", position: "relative" },
        bubbleOther: { alignSelf:"flex-start", background:theme_palette.tile, color:theme_palette.text, padding:"10px 14px", borderRadius:12, wordBreak:"break-word", position: "relative" },
        metaSmall: { fontSize:11, color:theme_palette.muted, marginTop:6, display:"flex", justifyContent:"space-between" },
        footer: { padding:10, display:"flex", gap:8, alignItems:"center", borderTop:`1px solid ${theme_palette.tile}`, background:theme_palette.panel },
        input: { flex:1, padding:"10px 14px", borderRadius:22, border:"none", outline:"none", background:theme_palette.tile, color:theme_palette.text, fontSize:15 },
        roundBtn: { width:44, height:44, borderRadius:999, border:"none", background:theme_palette.accent, color:"#fff", cursor:"pointer" },
        smallBtn: { border:"none", background:"transparent", color:theme_palette.muted, cursor:"pointer", fontSize:18 },
        threeDots: { position: "absolute", top: 2, right: 4, width: 20, height: 20, borderRadius: "50%", background: "rgba(0,0,0,0.1)", color: theme_palette.text, fontSize: 14, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", zIndex: 15, lineHeight: 0 },
        actionMenu: { position: "absolute", top: 0, background: theme_palette.sidebar, borderRadius: 8, boxShadow: "0 2px 8px rgba(0,0,0,0.3)", zIndex: 20, overflow: "hidden", display: "flex", flexDirection: "column", minWidth: 160 },
        menuItem: { padding: "10px 14px", fontSize: 14, cursor: "pointer", color: theme_palette.text, borderBottom: `1px solid ${theme_palette.tile}`, display: "flex", justifyContent: "space-between" },
        emojiBox: { position:"absolute", bottom:78, right: sidebarVisible ? 340 : 20, background:theme_palette.panel, border:`1px solid ${theme_palette.tile}`, padding:8, borderRadius:8, display:"grid", gridTemplateColumns:"repeat(10, 1fr)", gap:6, zIndex:60, maxWidth:520, maxHeight:220, overflowY:"auto" }
    };

    const isFriend = id => !!friendsMap[id];

    // NEW: Authentication splash prevention logic
    if (loading) return null; 

    if (!user) {
        return (
            <div style={{ ...styles.app, alignItems:"center", justifyContent:"center" }}>
                <div style={{ textAlign:"center" }}>
                    <img src="https://cdn-icons-png.flaticon.com/512/733/733585.png" alt="logo" style={{ width:120, height:120, marginBottom:12, borderRadius:18 }} />
                    <h1 style={{ margin:6 }}>Let's Chat</h1>
                    <p style={{ color: theme_palette.muted }}>Sign in to chat</p>
                    <button onClick={()=>signInWithPopup(auth, provider)} style={{ padding:"10px 18px", borderRadius:12, background:theme_palette.accent, color:"#fff", border:"none", cursor:"pointer" }}>
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
            <div style={styles.sidebar}>
                <div style={styles.header}>
                    <div style={styles.logoWrap}>
                        <img src="https://cdn-icons-png.flaticon.com/512/733/733585.png" alt="logo" style={styles.logoImg} />
                        <div>
                            <div style={{ fontWeight:800 }}>{user.displayName}</div>
                            <div style={{ fontSize:12, color:theme_palette.muted }}>{user.email}</div>
                        </div>
                    </div>
                    <div style={{ display:"flex", gap:8 }}>
                        <button title="Toggle theme" onClick={()=>setTheme(p=>p==="light"?"dark":"light")} style={styles.smallBtn}>{theme==="dark"?"☀️":"🌙"}</button>
                        <button title="Sign out" onClick={()=>signOut(auth)} style={styles.smallBtn}>⏻</button>
                    </div>
                </div>

                <input placeholder="Search contacts" value={searchQuery} onChange={e=>setSearchQuery(e.target.value)} style={styles.search} />

                <div style={styles.contactsWrap}>
                    <div style={styles.sectionTitle}>Global Chat</div>
                    <div onClick={()=>openChat(GLOBAL_CHAT_USER)} style={{...styles.contactRow, background: selectedContact?.id === GLOBAL_CHAT_USER.id ? (theme==="dark"?"#121d20ff":"#eef6f3") : "transparent"}}>
                        <img src={GLOBAL_CHAT_USER.photo} style={{ width:46, height:46, borderRadius:999 }} alt="Global Chat" />
                        <div><div style={{ fontWeight:700 }}>{GLOBAL_CHAT_USER.name}</div><div style={{ fontSize:12, color:theme_palette.muted }}>Public Chat</div></div>
                    </div>

                    <div style={styles.sectionTitle}>HA Chat</div>
                    <div onClick={()=>openChat(HA_USER)} style={{...styles.contactRow, background: selectedContact?.id === HA_USER.id ? (theme==="dark"?"#121d20ff":"#eef6f3") : "transparent"}}>
                        <img src={HA_USER.photo} style={{ width:46, height:46, borderRadius:999 }} alt="HA" />
                        <div><div style={{ fontWeight:700 }}>{HA_USER.name}</div><div style={{ fontSize:12, color:theme_palette.muted }}>AI Assistant</div></div>
                    </div>

                    <div style={styles.sectionTitle}>Friends</div>
                    {friendsList.length === 0 && <div style={{ padding:"8px 14px", color:theme_palette.muted }}>No friends yet</div>}
                    {friendsList.filter(c => (c.name||"").toLowerCase().includes(searchQuery.toLowerCase())).map(contact => (
                        <div key={contact.id} style={{...styles.contactRow, background: selectedContact?.id === contact.id ? (theme==="dark"?"#132226":"#eef6f3") : "transparent"}} onClick={()=>openChat(contact)}>
                            <img src={contact.photo || `https://api.dicebear.com/6.x/initials/svg?seed=${contact.name}`} style={{ width:46, height:46, borderRadius:999 }} alt={contact.name} />
                            <div style={{ flex:1 }}><div style={{ fontWeight:700 }}>{contact.name}</div><div style={{ fontSize:12, color:theme_palette.muted }}>{contact.online ? "Online" : `Last seen ${timeAgo(lastSeenMap[contact.id])}`}</div></div>
                            <button title="Remove friend" onClick={e=>{e.stopPropagation(); removeFriend(contact.id);}} style={styles.smallBtn}>🗑</button>
                        </div>
                    ))}

                    <div style={styles.sectionTitle}>Users</div>
                    {usersList.filter(c => (c.name||"").toLowerCase().includes(searchQuery.toLowerCase())).map(contact => (
                        <div key={contact.id} style={styles.contactRow}>
                            <div style={{ display:"flex", flex:1, gap:12, cursor:"pointer" }} onClick={() => openChat(contact)}>
                                <img src={contact.photo || `https://api.dicebear.com/6.x/initials/svg?seed=${contact.name}`} style={{ width:46, height:46, borderRadius:999 }} alt={contact.name} />
                                <div><div style={{ fontWeight:700 }}>{contact.name}</div><div style={{ fontSize:12, color:theme_palette.muted }}>{contact.online ? "Online" : `Last seen ${timeAgo(lastSeenMap[contact.id])}`}</div></div>
                            </div>
                            <button title="Make Friend" onClick={async (e) => { e.stopPropagation(); await addFriend(contact.id); }} style={styles.smallBtn}>👥</button>
                        </div>
                    ))}
                </div>
            </div>

            {selectedContact ? (
                selectedContact.isGlobal ? (
                    <GlobalChat 
                        user={user} palette={theme_palette} styles={styles} text={text} setText={setText}
                        messagesEndRef={messagesEndRef} EMOJIS={EMOJIS} selectedContact={selectedContact}
                        onCloseChat={() => { setSelectedContact(null); if (window.innerWidth < 820) setSidebarVisible(true); }}
                        uploadImageAndSend={uploadImageAndSend} hoveredMessageId={hoveredMessageId}
                        activeMenuId={activeMenuId} handleMouseEnter={handleMouseEnter}
                        handleMouseLeave={handleMouseLeave} handleDotsClick={handleDotsClick}
                        handleTouchStart={handleTouchStart} handleTouchEnd={handleTouchEnd}
                        deleteMessage={deleteMessage} editMessage={editMessage}
                        toggleReaction={toggleReaction} fmtTime={fmtTime}
                    />
                ) : (
                    <div style={styles.chatArea}>
                        <div style={styles.chatHeader}>
                            <div style={{ display:"flex", alignItems:"center", gap:12 }}>
                                {window.innerWidth < 820 && <button onClick={()=>{setSelectedContact(null); setSidebarVisible(true);}} style={styles.smallBtn}>←</button>}
                                <img src={selectedContact.photo || `https://api.dicebear.com/6.x/initials/svg?seed=${selectedContact.name}`} style={{ width:44, height:44, borderRadius:999 }} alt={selectedContact.name} />
                                <div><div style={{ fontWeight:700 }}>{selectedContact.name}</div><div style={{ fontSize:12, color:theme_palette.muted }}>{selectedContact.id === HA_USER.id ? "AI Assistant" : (selectedContact.online ? "Online" : `Last seen ${timeAgo(lastSeenMap[selectedContact.id])}`)}</div></div>
                            </div>
                            <div style={{ display:"flex", gap:8 }}><label style={{cursor:"pointer"}}>📎<input type="file" accept="image/*" onChange={handleImageFileDM} style={{display:"none"}}/></label></div>
                        </div>

                        <div style={styles.chatBody}>
                            {messages.map(m => {
                                const isMine = m.sender === user.uid;
                                const showDots = hoveredMessageId === m.id && activeMenuId !== m.id;
                                const showMenu = activeMenuId === m.id;
                                return (
                                    <div key={m.id} style={{...styles.messageRow, alignItems: isMine ? "flex-end" : "flex-start"}} onMouseEnter={() => handleMouseEnter(m.id)} onMouseLeave={handleMouseLeave} onTouchStart={() => handleTouchStart(m.id)} onTouchEnd={handleTouchEnd}>
                                        {showMenu && (
                                            <div style={{ ...styles.actionMenu, [isMine?"right":"left"]: "calc(0% + 100px)", top: 0 }}>
                                                <div style={styles.menuItem} onClick={()=>deleteMessage(m)}>delete message 🗑️</div>
                                                {isMine && !m.deleted && <div style={styles.menuItem} onClick={()=>editMessage(m)}>edit message ✎</div>}
                                                <div style={styles.menuItem} onClick={()=>toggleReaction(m, "👍")}>react message 👍</div>
                                            </div>
                                        )}
                                        <div style={isMine ? styles.bubbleMine : styles.bubbleOther}>
                                            {showDots && <div style={styles.threeDots} onClick={(e) => handleDotsClick(e, m.id)}>•••</div>}
                                            {m.deleted ? <i style={{ opacity:0.7 }}>Message deleted</i> : 
                                            <>
                                                {m.type === "image" && m.url && <img src={m.url} alt="" style={{ maxWidth:320, borderRadius:8, marginBottom: m.text ? 8 : 0 }} />}
                                                <div style={{ whiteSpace:"pre-wrap" }}>{m.text}{m.edited?" · (edited)":""}</div>
                                            </>}
                                            <div style={styles.metaSmall}>
                                                <div>{fmtTime(m.timestamp)}{isMine && !m.deleted && (m.read?" ✓✓":" ✓")}</div>
                                            </div>
                                        </div>
                                        {m.reactions && Object.keys(m.reactions).length > 0 && (
                                            <div style={{ display:"flex", gap:6, marginTop:6 }}>
                                                {Object.entries(m.reactions).map(([emo, arr])=>(
                                                    <div key={emo} style={{ background:theme_palette.tile, padding:"4px 8px", borderRadius:12 }}>{emo} <small style={{ color:theme_palette.muted }}>{arr.length}</small></div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                            <div ref={messagesEndRef} />
                            {typingStatus && <div style={{ fontSize:13, color:theme_palette.muted, paddingLeft:10 }}>{typingStatus}</div>}
                        </div>

                        {emojiOpen && (
                            <div style={styles.emojiBox}>
                                {EMOJIS.map(e=>(<button key={e} onClick={()=>{ setText(t=>t+e); setEmojiOpen(false); }} style={{ fontSize:18, background:"transparent", border:"none", cursor:"pointer" }}>{e}</button>))}
                            </div>
                        )}
                        
                        <div style={styles.footer}>
                            <button onClick={()=>setEmojiOpen(o=>!o)} style={styles.smallBtn}>😊</button>
                            <input placeholder={`Type a message to ${selectedContact.name}`} value={text} onChange={handleTypingChange} onKeyDown={(e)=>{ if(e.key==="Enter" && !e.shiftKey){ e.preventDefault(); sendTextMessage(); } }} style={styles.input} />
                            <button onClick={startVoiceToText} style={{ ...styles.roundBtn, background:listening?"#c0392b":theme_palette.accent }}>{listening?"⏹":"🎤"}</button>
                            <button onClick={()=>sendTextMessage()} style={styles.roundBtn}>➤</button>
                        </div>
                    </div>
                )
            ) : (
                <div style={{ ...styles.chatArea, justifyContent:"center", alignItems:"center" }}>
                    <div style={{ textAlign:"center" }}>
                        <h2 style={{ color:theme_palette.muted }}>Select a Contact to begin messaging</h2>
                    </div>
                </div>
            )}
        </div>
    );
}