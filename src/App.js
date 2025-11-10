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
  off,
} from "firebase/database";
import { auth, db, provider } from "./firebase";

/* ---------------------------
  Single-file WhatsApp-like chat app (no external libs)
  - Friend-to-friend chat (Firebase Realtime DB)
  - HA Chat bot (id: "ha_bot") replies to text & voice->text
  - Voice-to-text using browser SpeechRecognition (no audio files)
  - Emoji picker (native)
  - Image attach as base64 (stored in DB, no Firebase Storage required)
  - Message edit, delete (soft delete), reactions
  - Typing indicator, delivered/read marking
  - Inline responsive styles, logo + "Let's Chat" on login
---------------------------- */

const EMOJI_LIST = [
  "😀","😁","😂","🤣","😃","😄","😅","😆","😉","😊",
  "😇","🙂","🙃","😋","😎","😍","😘","🤔","🤨","😐",
  "😴","😪","😢","😭","😠","😡","🤯","🤗","🤝","👍",
  "👎","🙏","✨","🔥","💯","❤️","💙","💚","💛","🧡",
  "🎉","🎁","📷","🎧","🗺️"
];

const nowTs = () => Date.now();
const fmtTime = (ts) => new Date(ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

/* Simple HA reply rules */
function haReplyFor(text) {
  if (!text) return "I didn't catch that — can you repeat?";
  const t = text.toLowerCase();
  if (/\b(hi|hello|hey)\b/.test(t)) return "Hey! What's up?";
  if (/\b(how are you|how r you)\b/.test(t)) return "I'm just code but feeling great — you?";
  if (/\b(date|today)\b/.test(t)) return `Today is ${new Date().toLocaleDateString()}.`;
  // simple math detection like "what's 3 + 2" or "3+2"
  const mathMatch = t.match(/(-?\d+)\s*([+\-x*\/])\s*(-?\d+)/);
  if (mathMatch) {
    const a = Number(mathMatch[1]);
    let op = mathMatch[2].replace("x", "*");
    const b = Number(mathMatch[3]);
    try {
      // eslint-disable-next-line no-eval
      const res = eval(`${a}${op}${b}`);
      return `Answer: ${res}`;
    } catch (e) {
      return "I couldn't calculate that.";
    }
  }
  if (t.includes("color of the sky") || t.includes("colour of the sky")) return "Usually blue 🙂";
  if (t.length < 20) return "Nice! Tell me more.";
  return "Thanks — got it. Anything else?";
}

export default function App() {
  // auth + presence + UI state
  const [user, setUser] = useState(null);
  const [contacts, setContacts] = useState([]); // other users + HA bot
  const [selectedContact, setSelectedContact] = useState(null);
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const [typingStatus, setTypingStatus] = useState("");
  const [emojiOpen, setEmojiOpen] = useState(false);
  const [listening, setListening] = useState(false);
  const [sidebarVisible, setSidebarVisible] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [theme, setTheme] = useState("dark"); // can be toggled
  const [fileInputKey, setFileInputKey] = useState(Date.now()); // to reset file input after use

  const messagesRefActive = useRef(null);
  const typingRefActive = useRef(null);
  const messagesEndRef = useRef(null);
  const recognitionRef = useRef(null);

  // Authentication & load contacts
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (current) => {
      if (current) {
        setUser(current);

        // write presence
        const myRef = dbRef(db, `users/${current.uid}`);
        set(myRef, {
          name: current.displayName || "Unknown",
          photo: current.photoURL || "",
          email: current.email || "",
          online: true,
          lastSeen: nowTs(),
        });

        // subscribe contact list
        const usersRef = dbRef(db, "users");
        onValue(usersRef, (snap) => {
          const raw = snap.val() || {};
          const arr = Object.keys(raw).map((k) => ({ id: k, ...raw[k] }));
          // Ensure HA bot exists in UI (not persisted necessarily)
          const haBot = { id: "ha_bot", name: "HA Chat", photo: `https://api.dicebear.com/6.x/identicon/svg?seed=HAChat`, isBot: true, online: true };
          const merged = arr.some(a => a.id === "ha_bot") ? arr : [haBot, ...arr];
          const filtered = merged.filter((u) => u.id !== current.uid);
          setContacts(filtered);
        });
      } else {
        setUser(null);
        setContacts([]);
        setSelectedContact(null);
      }
    });
    return () => unsub();
  }, []);

  // Responsive sidebar auto-hide for small screens
  useEffect(() => {
    function onResize() {
      if (window.innerWidth < 800) setSidebarVisible(false);
      else setSidebarVisible(true);
    }
    onResize();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  // Scroll when messages change
  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  // Select a contact/chat and subscribe to messages + typing
  function openChat(contact) {
    if (!user) return;
    setSelectedContact(contact);
    if (window.innerWidth < 800) setSidebarVisible(false);

    // detach prior
    if (messagesRefActive.current) off(messagesRefActive.current);
    if (typingRefActive.current) off(typingRefActive.current);

    const chatId = makeChatId(user.uid, contact.id);
    const msgsRef = dbRef(db, `chats/${chatId}/messages`);
    messagesRefActive.current = msgsRef;
    onValue(msgsRef, (snap) => {
      const v = snap.val() || {};
      const arr = Object.entries(v).map(([k, val]) => ({ id: k, ...val }));
      arr.sort((a,b) => (a.timestamp||0) - (b.timestamp||0));
      setMessages(arr);

      // Mark delivered for others' messages (simple heuristic)
      arr.forEach(m => {
        if (m.sender !== user.uid && !m.delivered) {
          update(dbRef(db, `chats/${chatId}/messages/${m.id}`), { delivered: true }).catch(() => {});
        }
      });
    });

    // typing indicator path
    const tRef = dbRef(db, `chats/${chatId}/typing`);
    typingRefActive.current = tRef;
    onValue(tRef, (snap) => {
      const val = snap.val() || {};
      const keys = Object.keys(val).filter(k => k !== user.uid && val[k]?.typing);
      if (keys.length) {
        const name = val[keys[0]]?.name || "typing";
        setTypingStatus(`${name} is typing...`);
      } else setTypingStatus("");
    });
  }

  function makeChatId(a, b) {
    if (!a || !b) return null;
    return a > b ? `${a}_${b}` : `${b}_${a}`;
  }

  // Typing updater (avoid naming collision)
  function updateTypingStatus(status) {
    if (!selectedContact || !user) return;
    const id = makeChatId(user.uid, selectedContact.id);
    if (!id) return;
    const tRef = dbRef(db, `chats/${id}/typing/${user.uid}`);
    set(tRef, { typing: status, name: user.displayName });
  }

  // Send text message
  async function sendTextMessage(body) {
    if (!user || !selectedContact) return;
    const content = (body ?? text ?? "").trim();
    if (!content) return;
    const id = makeChatId(user.uid, selectedContact.id);
    const msgs = dbRef(db, `chats/${id}/messages`);
    const p = push(msgs);
    await set(p, {
      sender: user.uid,
      name: user.displayName,
      text: content,
      type: "text",
      timestamp: nowTs(),
      delivered: false,
      read: false,
      edited: false,
      deleted: false,
      reactions: {}
    });
    setText("");
    updateTypingStatus(false);

    // If chatting with HA bot, make a reply (write into same chat)
    if (selectedContact.id === "ha_bot") {
      const reply = haReplyFor(content);
      setTimeout(async () => {
        const r = push(msgs);
        await set(r, {
          sender: "ha_bot",
          name: "HA Chat",
          text: reply,
          type: "text",
          timestamp: nowTs(),
          delivered: true,
          read: true
        });
      }, 600);
    }
  }

  // Handle enter key
  function onMessageKeyDown(e) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendTextMessage();
    }
  }

  // Voice-to-text (SpeechRecognition)
  function startVoiceToText() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Voice recognition not supported in this browser (Chrome recommended).");
      return;
    }

    // If already active, stop
    if (recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch {}
      recognitionRef.current = null;
      setListening(false);
      return;
    }

    const rec = new SpeechRecognition();
    rec.lang = "en-US";
    rec.interimResults = false;
    rec.maxAlternatives = 1;
    rec.onstart = () => setListening(true);
    rec.onend = () => { setListening(false); recognitionRef.current = null; };
    rec.onerror = (e) => {
      console.error("SpeechRecognition error", e);
      setListening(false);
      recognitionRef.current = null;
    };
    rec.onresult = (ev) => {
      try {
        const transcript = ev.results[0][0].transcript;
        // Send transcript as message immediately (so voice->text becomes chat content)
        // Append if there is existing text
        const composed = text ? `${text} ${transcript}` : transcript;
        setText(composed);
        // auto-send
        sendTextMessage(composed);
        // Clear interim text after sending
        setText("");
      } catch (err) { console.error(err); }
    };
    recognitionRef.current = rec;
    rec.start();
  }

  // Attach an image and store as base64 data URL in DB (no Storage)
  function handleImageFile(e) {
    const file = e.target.files?.[0];
    if (!file || !selectedContact || !user) { e.target.value = ""; setFileInputKey(Date.now()); return; }
    const reader = new FileReader();
    reader.onload = async () => {
      const dataUrl = reader.result;
      const id = makeChatId(user.uid, selectedContact.id);
      const msgs = dbRef(db, `chats/${id}/messages`);
      const p = push(msgs);
      await set(p, {
        sender: user.uid,
        name: user.displayName,
        text: file.name,
        type: "image",
        url: dataUrl,
        timestamp: nowTs(),
        delivered: false,
        read: false,
        deleted: false,
        reactions: {}
      });
    };
    reader.readAsDataURL(file);
    e.target.value = "";
    setFileInputKey(Date.now());
  }

  // Edit / Delete message (soft delete)
  async function editMessage(msg) {
    if (!user || !selectedContact) return;
    if (msg.sender !== user.uid) return alert("You can only edit your own messages.");
    const newText = window.prompt("Edit message:", msg.text);
    if (newText == null) return;
    const id = makeChatId(user.uid, selectedContact.id);
    await update(dbRef(db, `chats/${id}/messages/${msg.id}`), { text: newText, edited: true });
  }
  async function deleteMessage(msg) {
    if (!user || !selectedContact) return;
    if (!window.confirm("Delete this message for everyone?")) return;
    const id = makeChatId(user.uid, selectedContact.id);
    await update(dbRef(db, `chats/${id}/messages/${msg.id}`), { text: "Message deleted", deleted: true });
  }

  // Reaction toggle
  async function toggleReaction(msg, emoji) {
    if (!user || !selectedContact) return;
    const id = makeChatId(user.uid, selectedContact.id);
    const mRef = dbRef(db, `chats/${id}/messages/${msg.id}`);
    // read current snapshot once
    const current = (await new Promise(res => onValue(mRef, snap => res(snap.val()), { onlyOnce: true }))) || {};
    const reactions = current.reactions || {};
    const arr = reactions[emoji] || [];
    const has = arr.includes(user.uid);
    const next = has ? arr.filter(x => x !== user.uid) : [...arr, user.uid];
    const nextReacts = { ...reactions, [emoji]: next.length ? next : undefined };
    await update(mRef, { reactions: nextReacts });
  }

  // Toggle theme
  function toggleTheme() {
    setTheme(t => (t === "dark" ? "light" : "dark"));
  }

  // Sign in/out functions exposed to UI
  async function handleSignIn() {
    try {
      await signInWithPopup(auth, provider);
    } catch (err) {
      console.error(err);
      alert("Sign-in failed. See console.");
    }
  }
  async function handleSignOut() {
    try {
      await signOut(auth);
      setUser(null);
    } catch (err) {
      console.error(err);
    }
  }

  // Build small inline style theme
  const palette = theme === "dark"
    ? { bg: "#0b141a", sidebar: "#202c33", panel: "#111b21", tile: "#2a3942", text: "#e9edef", muted: "#9fbfb1", accent: "#00a884" }
    : { bg: "#f6f7f8", sidebar: "#ffffff", panel: "#ffffff", tile: "#e9eef0", text: "#081316", muted: "#607080", accent: "#007a66" };

  const styles = {
    app: { display: "flex", height: "100vh", background: palette.bg, color: palette.text, fontFamily: "Segoe UI, Roboto, Arial", overflow: "hidden" },
    sidebar: { width: sidebarVisible ? 320 : 0, minWidth: sidebarVisible ? 260 : 0, background: palette.sidebar, borderRight: `1px solid ${palette.tile}`, transition: "width .2s ease", overflow: "hidden" },
    header: { padding: 14, display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: `1px solid ${palette.tile}` },
    logoWrap: { display: "flex", alignItems: "center", gap: 10 },
    logoImg: { width: 44, height: 44, borderRadius: 10 },
    search: { margin: 12, padding: "10px 14px", borderRadius: 24, background: palette.tile, color: palette.text, border: "none", width: "calc(100% - 24px)", outline: "none" },
    contactsWrap: { overflowY: "auto", height: "calc(100vh - 160px)", paddingBottom: 10 },
    contactRow: { display: "flex", gap: 12, padding: "10px 12px", alignItems: "center", cursor: "pointer", borderBottom: `1px solid ${palette.tile}`, transition: "background .12s" },
    contactName: { margin: 0, fontWeight: 600 },
    contactMeta: { fontSize: 12, color: palette.muted },
    chatArea: { flex: 1, display: "flex", flexDirection: "column", background: palette.panel },
    chatHeader: { display: "flex", alignItems: "center", gap: 12, padding: 12, borderBottom: `1px solid ${palette.tile}`, background: palette.panel },
    chatBody: { flex: 1, padding: 18, overflowY: "auto", backgroundImage: "url('https://i.imgur.com/6dJx4zf.png')", backgroundSize: "contain", backgroundRepeat: "repeat", backgroundBlendMode: "overlay", backgroundColor: palette.panel },
    messageRow: { display: "flex", flexDirection: "column", marginBottom: 12, maxWidth: "78%" },
    bubbleMine: { alignSelf: "flex-end", background: palette.accent, color: "#fff", padding: "10px 14px", borderRadius: 12, borderTopRightRadius: 4 },
    bubbleOther: { alignSelf: "flex-start", background: palette.tile, color: palette.text, padding: "10px 14px", borderRadius: 12, borderTopLeftRadius: 4 },
    metaSmall: { fontSize: 11, color: palette.muted, marginTop: 6, display: "flex", justifyContent: "space-between" },
    footer: { padding: 10, display: "flex", gap: 8, alignItems: "center", borderTop: `1px solid ${palette.tile}`, background: palette.panel },
    input: { flex: 1, padding: "10px 14px", borderRadius: 22, border: "none", outline: "none", background: palette.tile, color: palette.text, fontSize: 15 },
    roundBtn: { width: 44, height: 44, borderRadius: 999, border: "none", background: palette.accent, color: "#fff", cursor: "pointer" },
    smallBtn: { border: "none", background: "transparent", color: palette.muted, cursor: "pointer", fontSize: 18 },
    emojiBox: { position: "absolute", bottom: 80, right: sidebarVisible ? 340 : 20, background: palette.panel, border: `1px solid ${palette.tile}`, padding: 8, borderRadius: 8, display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 6, zIndex: 50 }
  };

  // When user logs out ensure we clear listeners
  useEffect(() => {
    return () => {
      if (messagesRefActive.current) off(messagesRefActive.current);
      if (typingRefActive.current) off(typingRefActive.current);
    };
  }, []);

  // Render login screen if not signed in
  if (!user) {
    return (
      <div style={{ ...styles.app, alignItems: "center", justifyContent: "center" }}>
        <div style={{ textAlign: "center" }}>
          <img src="https://cdn-icons-png.flaticon.com/512/733/733585.png" alt="logo" style={{ width: 120, height: 120, marginBottom: 12, borderRadius: 18 }} />
          <h1 style={{ margin: 6 }}>Let's Chat</h1>
          <p style={{ color: palette.muted }}>Sign in to start chatting with friends and HA Chat</p>
          <div style={{ marginTop: 12 }}>
            <button onClick={handleSignIn} style={{ padding: "10px 18px", borderRadius: 12, background: palette.accent, color: "#fff", border: "none", cursor: "pointer" }}>
              Sign in with Google
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Main app UI
  return (
    <div style={styles.app}>
      {/* Sidebar */}
      <div style={styles.sidebar}>
        <div style={styles.header}>
          <div style={styles.logoWrap}>
            <img src="https://cdn-icons-png.flaticon.com/512/733/733585.png" alt="logo" style={styles.logoImg} />
            <div>
              <div style={{ fontWeight: 800 }}>{user.displayName}</div>
              <div style={{ fontSize: 12, color: palette.muted }}>Online</div>
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <button title="Toggle theme" onClick={toggleTheme} style={styles.smallBtn}>{theme === "dark" ? "🌙" : "☀️"}</button>
            <button title="Sign out" onClick={handleSignOut} style={styles.smallBtn}>⎋</button>
          </div>
        </div>

        <input placeholder="Search contacts" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} style={styles.search} />

        <div style={styles.contactsWrap}>
          {contacts.filter(c => (c.name || "").toLowerCase().includes(searchQuery.toLowerCase())).map(contact => (
            <div key={contact.id} onClick={() => openChat(contact)} style={{ ...styles.contactRow, background: selectedContact?.id === contact.id ? palette.tile : "transparent" }}>
              <img src={contact.photo || `https://api.dicebear.com/6.x/initials/svg?seed=${contact.name||contact.id}`} alt="" style={{ width: 46, height: 46, borderRadius: 999, objectFit: "cover" }} />
              <div>
                <div style={styles.contactName}>{contact.name}{contact.isBot ? " · HA" : ""}</div>
                <div style={styles.contactMeta}>{contact.online ? "Online" : `Last seen ${contact.lastSeen ? new Date(contact.lastSeen).toLocaleString() : "unknown"}`}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Chat area */}
      <div style={styles.chatArea}>
        {selectedContact ? (
          <>
            <div style={styles.chatHeader}>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <button onClick={() => setSidebarVisible(v => !v)} style={styles.smallBtn}>☰</button>
                <img src={selectedContact.photo || `https://api.dicebear.com/6.x/initials/svg?seed=${selectedContact.name||selectedContact.id}`} alt="" style={{ width: 44, height: 44, borderRadius: 999 }} />
                <div>
                  <div style={{ fontWeight: 700 }}>{selectedContact.name}</div>
                  <div style={{ fontSize: 12, color: palette.muted }}>{typingStatus || (selectedContact.online ? "Online" : `Last seen ${selectedContact.lastSeen ? new Date(selectedContact.lastSeen).toLocaleString() : "unknown"}`)}</div>
                </div>
              </div>

              <div style={{ display: "flex", gap: 8 }}>
                <label style={styles.smallBtn} title="Attach image">
                  📎
                  <input key={fileInputKey} type="file" accept="image/*" onChange={handleImageFile} style={{ display: "none" }} />
                </label>
              </div>
            </div>

            <div style={styles.chatBody}>
              {messages.map(m => (
                <div key={m.id} style={{ ...styles.messageRow, alignItems: m.sender === user.uid ? "flex-end" : "flex-start" }}>
                  <div style={m.sender === user.uid ? styles.bubbleMine : styles.bubbleOther}>
                    {/* message content */}
                    {m.deleted ? (
                      <i style={{ opacity: 0.8 }}>Message deleted</i>
                    ) : (
                      <>
                        {m.type === "image" && m.url ? <img src={m.url} alt={m.text} style={{ maxWidth: 320, borderRadius: 8 }} /> : null}
                        {m.type === "text" && <div style={{ whiteSpace: "pre-wrap" }}>{m.text}{m.edited ? " · (edited)" : ""}</div>}
                      </>
                    )}

                    <div style={styles.metaSmall}>
                      <div style={{ fontSize: 11 }}>{fmtTime(m.timestamp)}</div>
                      <div style={{ fontSize: 12, color: palette.muted }}>{m.sender === user.uid ? (m.read ? "✓✓" : m.delivered ? "✓" : "…") : ""}</div>
                    </div>
                  </div>

                  {/* message actions */}
                  <div style={{ display: "flex", gap: 6, marginTop: 6 }}>
                    {m.sender === user.uid && !m.deleted && <button title="Edit" onClick={() => editMessage(m)} style={styles.smallBtn}>✎</button>}
                    {m.sender === user.uid && !m.deleted && <button title="Delete" onClick={() => deleteMessage(m)} style={styles.smallBtn}>🗑</button>}
                    <button title="React" onClick={() => toggleReaction(m, "👍")} style={styles.smallBtn}>👍</button>
                  </div>

                  {/* show reactions if any */}
                  {m.reactions && Object.keys(m.reactions).length > 0 && (
                    <div style={{ display: "flex", gap: 6, marginTop: 6 }}>
                      {Object.entries(m.reactions).map(([emo, arr]) => (
                        <div key={emo} style={{ background: palette.tile, padding: "4px 8px", borderRadius: 12 }}>
                          <span style={{ marginRight: 6 }}>{emo}</span><small style={{ color: palette.muted }}>{arr.length}</small>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}

              <div ref={messagesEndRef} />
            </div>

            <div style={styles.footer}>
              <button onClick={() => setEmojiOpen(o => !o)} style={styles.smallBtn}>😊</button>
              {emojiOpen && (
                <div style={styles.emojiBox}>
                  {EMOJI_LIST.map(e => <button key={e} onClick={() => { setText(t => t + e); setEmojiOpen(false); }} style={{ fontSize: 18, border: "none", background: "transparent", cursor: "pointer" }}>{e}</button>)}
                </div>
              )}

              <input placeholder="Type a message" value={text} onChange={(e) => { setText(e.target.value); updateTypingStatus(true); }} onKeyDown={onMessageKeyDown} style={styles.input} />
              <button title={listening ? "Stop listening" : "Voice to text"} onClick={startVoiceToText} style={styles.roundBtn}>{listening ? "⏹" : "🎤"}</button>
              <button title="Send" onClick={() => sendTextMessage()} style={styles.roundBtn}>➤</button>
            </div>
          </>
        ) : (
          <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", color: palette.muted }}>
            <div style={{ textAlign: "center" }}>
              <h2>Welcome — select a contact to start</h2>
              <p>HA Chat (AI) appears in contacts as "HA Chat". Use voice-to-text (🎤) to speak and send messages.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
