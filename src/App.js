// src/App.js
import React, { useEffect, useRef, useState } from "react";
import { auth, db, provider } from "./firebase";
import {
  signInWithPopup,
  onAuthStateChanged,
  signOut,
  updateProfile,
} from "firebase/auth";
import {
  ref,
  onValue,
  push,
  set as dbSet,
  off,
  update as dbUpdate,
} from "firebase/database";

/*
  WhatsApp-style single-file App.js
  - Contacts-first view
  - Click contact -> opens chat (contacts hidden)
  - Back button to go back to contacts
  - Firebase realtime messages (friends-to-friends)
  - Lightweight emoji picker (no external libs)
  - Voice-to-text for message input (Web Speech API)
  - Inline styles only (responsive)
*/

export default function App() {
  // Auth & user
  const [user, setUser] = useState(null);

  // Contacts and selection
  const [contacts, setContacts] = useState([]); // list of { id, name, photo, online, about }
  const [selectedContact, setSelectedContact] = useState(null);

  // Messages in current chat (array)
  const [messages, setMessages] = useState([]);
  const messagesRefHandle = useRef(null);

  // Composer
  const [text, setText] = useState("");
  const [showEmoji, setShowEmoji] = useState(false);
  const [listening, setListening] = useState(false);

  // UI state: showContacts true => show contacts screen; false => show chat screen
  const [showContacts, setShowContacts] = useState(true);

  // refs
  const messagesEndRef = useRef(null);
  const speechRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  // tiny emoji list (expand as you like)
  const EMOJIS = [
    "😀","😁","😂","🤣","😅","😊","😉","😍","😘","🤔",
    "🙃","😇","🤩","🤗","😎","😴","😢","😭","😡","👍",
    "👎","🙏","👏","🤝","🔥","✨","🎉","❤️","🧡","💚"
  ];

  // -------------------- AUTH --------------------
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      if (u) {
        setUser(u);
        subscribeContacts();
      } else {
        setUser(null);
        setContacts([]);
        setSelectedContact(null);
        cleanupMessagesListener();
      }
    });
    return () => unsub();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // sign in with popup (Google)
  async function handleSignIn() {
    try {
      await signInWithPopup(auth, provider);
    } catch (err) {
      console.error("Sign-in error", err);
      alert("Sign-in failed — check console.");
    }
  }

  async function handleSignOut() {
    try {
      // set offline status in DB
      if (user) {
        const uref = ref(db, `users/${user.uid}`);
        dbUpdate(uref, { online: false }).catch(() => {});
      }
      await signOut(auth);
      setUser(null);
      setShowContacts(true);
    } catch (err) {
      console.error("Sign-out error", err);
    }
  }

  // -------------------- CONTACTS --------------------
  // subscribe to /users node to build contacts list
  function subscribeContacts() {
    if (!user) return;
    const usersRef = ref(db, "users");
    onValue(usersRef, (snap) => {
      const data = snap.val() || {};
      // Transform to array and keep current user out
      const arr = Object.keys(data)
        .filter((k) => k !== user.uid)
        .map((k) => ({ id: k, ...data[k] }));
      setContacts(arr);
    });
    // also ensure current user exists in users node
    const myRef = ref(db, `users/${user.uid}`);
    dbSet(myRef, {
      uid: user.uid,
      displayName: user.displayName || "Anonymous",
      photoURL: user.photoURL || "",
      online: true,
      about: "Hey there — I'm using Let's Chat!",
      createdAt: Date.now(),
    }).catch((e) => console.warn("set user failed", e));
  }

  // -------------------- CHAT (messages) --------------------
  // compute chatId deterministic for two users
  function chatIdFor(u1, u2) {
    if (!u1 || !u2) return null;
    return u1 > u2 ? `${u1}_${u2}` : `${u2}_${u1}`;
  }

  // open chat with contact
  function openChat(contact) {
    if (!user || !contact) return;
    setSelectedContact(contact);
    setShowContacts(false);
    attachMessagesListener(contact);
  }

  // attach listener for messages for selected contact
  function attachMessagesListener(contact) {
    cleanupMessagesListener();
    const id = chatIdFor(user.uid, contact.id);
    const messagesRef = ref(db, `chats/${id}/messages`);
    messagesRefHandle.current = messagesRef;
    onValue(messagesRef, (snap) => {
      const raw = snap.val() || {};
      // raw is keyed by push ids — convert to sorted array
      const arr = Object.keys(raw)
        .map((k) => ({ id: k, ...raw[k] }))
        .sort((a, b) => (a.ts || 0) - (b.ts || 0));
      setMessages(arr);
      // scroll after UI update
      setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }), 120);
    });
  }

  // detach messages listener cleanly
  function cleanupMessagesListener() {
    if (messagesRefHandle.current) {
      try { off(messagesRefHandle.current); } catch {}
      messagesRefHandle.current = null;
    }
    setMessages([]);
  }

  // send message in common structure
  async function sendMessage() {
    if (!selectedContact || !text.trim() || !user) return;
    const id = chatIdFor(user.uid, selectedContact.id);
    const pushRef = push(ref(db, `chats/${id}/messages`));
    const payload = {
      from: user.uid,
      name: user.displayName || "Me",
      text: text.trim(),
      ts: Date.now(),
    };
    await setWithCatch(pushRef, payload);
    setText("");
    setShowEmoji(false);
    // optionally update "last message" summary for contacts
    const metaRef = ref(db, `chats/${id}/meta`);
    dbSet(metaRef, { lastMessage: payload.text, lastTs: payload.ts }).catch(()=>{});
  }

  // small helper to set and catch
  async function setWithCatch(refNode, value) {
    try { await dbSet(refNode, value); } catch (e) { console.error(e); }
  }

  // -------------------- TYPING (simple local + DB) --------------------
  function notifyTyping(isTyping) {
    if (!selectedContact || !user) return;
    const id = chatIdFor(user.uid, selectedContact.id);
    const typingRef = ref(db, `chats/${id}/typing/${user.uid}`);
    dbSet(typingRef, { typing: isTyping }).catch(()=>{});
    if (isTyping) {
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = setTimeout(() => {
        dbSet(typingRef, { typing: false }).catch(()=>{});
      }, 2000);
    }
  }

  // -------------------- VOICE-TO-TEXT --------------------
  async function startStopListening() {
    if (!("webkitSpeechRecognition" in window || "SpeechRecognition" in window)) {
      alert("Voice recognition not supported in this browser.");
      return;
    }
    const Speech = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!speechRef.current) {
      const rec = new Speech();
      rec.lang = "en-IN";
      rec.interimResults = false;
      rec.maxAlternatives = 1;

      rec.onstart = () => setListening(true);
      rec.onend = () => setListening(false);
      rec.onerror = (e) => {
        console.error("Speech error", e);
        setListening(false);
      };
      rec.onresult = (ev) => {
        const txt = ev.results[0][0].transcript || "";
        // append with a space
        setText((t) => (t ? t + " " + txt : txt));
      };
      speechRef.current = rec;
      rec.start();
    } else {
      // if active, stop; else start new instance
      try {
        const rec = speechRef.current;
        if (listening) {
          rec.stop();
          setListening(false);
          speechRef.current = null;
        } else {
          rec.start();
        }
      } catch (e) {
        console.warn(e);
        speechRef.current = null;
        setListening(false);
      }
    }
  }

  // -------------------- EMOJI PICKER (simple) --------------------
  function insertEmoji(e) {
    setText((t) => (t ? t + e : e));
    setShowEmoji(false);
  }

  // -------------------- BACK (close chat) --------------------
  function goBackToContacts() {
    setShowContacts(true);
    setSelectedContact(null);
    cleanupMessagesListener();
  }

  // -------------------- small cleanup on unload --------------------
  useEffect(() => {
    return () => {
      // stop speech if active
      try { speechRef.current?.stop(); } catch {}
      // mark offline
      if (user) {
        const uref = ref(db, `users/${user.uid}`);
        dbUpdate(uref, { online: false }).catch(() => {});
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // -------------------- UI STYLES (inline) --------------------
  const styles = {
    app: {
      height: "100vh",
      display: "flex",
      flexDirection: "column",
      fontFamily: "Segoe UI, Roboto, system-ui, sans-serif",
      background: "#0b141a",
      color: "#e6eef0",
    },
    header: {
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      padding: "10px 14px",
      background: "#075e54",
      color: "white",
      boxShadow: "0 1px 0 rgba(0,0,0,0.2)",
    },
    container: {
      display: "flex",
      flex: 1,
      minHeight: 0, // for children scrolling
    },
    sidebar: {
      width: 340,
      maxWidth: "42%",
      minWidth: 260,
      background: "#111b21",
      borderRight: "1px solid #223433",
      overflow: "auto",
    },
    main: {
      flex: 1,
      display: "flex",
      flexDirection: "column",
      background: "#0b141a",
    },
    contactItem: {
      display: "flex",
      gap: 12,
      padding: "12px 14px",
      alignItems: "center",
      borderBottom: "1px solid rgba(255,255,255,0.02)",
      cursor: "pointer",
      background: "transparent",
    },
    avatar: {
      width: 48,
      height: 48,
      borderRadius: "50%",
      objectFit: "cover",
      background: "#2d3b3b",
      display: "inline-block",
    },
    contactName: { fontSize: 16, fontWeight: 600, margin: 0 },
    contactMeta: { fontSize: 13, color: "#9fbfb1", marginTop: 4 },

    chatHeader: {
      display: "flex",
      alignItems: "center",
      gap: 12,
      padding: "12px 14px",
      borderBottom: "1px solid rgba(255,255,255,0.03)",
      background: "#0f2623",
    },
    chatBody: {
      flex: 1,
      padding: 16,
      overflow: "auto",
      backgroundImage: "url('https://i.imgur.com/6dJx4zf.png')",
      backgroundRepeat: "repeat",
      backgroundSize: "220px",
    },
    messageRow: {
      marginBottom: 10,
      display: "flex",
    },
    bubbleMe: {
      marginLeft: "auto",
      background: "#056162",
      color: "white",
      padding: "8px 12px",
      borderRadius: 12,
      maxWidth: "74%",
      wordBreak: "break-word",
    },
    bubbleThem: {
      marginRight: "auto",
      background: "#111b21",
      color: "#e6eef0",
      border: "1px solid rgba(255,255,255,0.03)",
      padding: "8px 12px",
      borderRadius: 12,
      maxWidth: "74%",
      wordBreak: "break-word",
    },
    composer: {
      display: "flex",
      gap: 8,
      padding: 10,
      alignItems: "center",
      borderTop: "1px solid rgba(255,255,255,0.03)",
      background: "#0f2623",
    },
    input: {
      flex: 1,
      padding: "10px 12px",
      borderRadius: 20,
      border: "none",
      outline: "none",
      background: "#122523",
      color: "#e6eef0",
      fontSize: 15,
    },
    iconBtn: {
      background: "transparent",
      border: "none",
      color: "#e6eef0",
      cursor: "pointer",
      fontSize: 18,
      padding: 8,
    },
    emojiBox: {
      position: "absolute",
      bottom: 70,
      right: 22,
      width: 260,
      background: "#0b141a",
      border: "1px solid rgba(255,255,255,0.04)",
      boxShadow: "0 6px 18px rgba(0,0,0,0.5)",
      padding: 8,
      borderRadius: 8,
      display: "grid",
      gridTemplateColumns: "repeat(8,1fr)",
      gap: 6,
    },
    smallNote: { fontSize: 13, color: "#9fbfb1" },
    loginWrap: {
      height: "100vh",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      background:
        "linear-gradient(180deg, rgba(4,95,84,1) 0%, rgba(7,94,84,1) 35%, rgba(3,54,52,1) 100%)",
      color: "white",
      flexDirection: "column",
    },
    logo: { width: 96, height: 96, borderRadius: 18, marginBottom: 12 },
    backBtn: {
      background: "transparent",
      border: "none",
      color: "#fff",
      fontSize: 20,
      cursor: "pointer",
      marginRight: 8,
    },

    // responsive tweaks
    '@mediaMobile': {
      sidebar: { width: "100%", minWidth: "100%" },
    },
  };

  // -------------------- RENDER --------------------

  // Not signed in -> show simple login card
  if (!user) {
    return (
      <div style={styles.loginWrap}>
        <div style={{ textAlign: "center" }}>
          <img
            alt="logo"
            src="https://i.imgur.com/3y2zKqz.png"
            style={styles.logo}
          />
          <h1 style={{ margin: 0, fontSize: 28 }}>Let's Chat</h1>
          <p style={{ marginTop: 8, color: "#bfeadf" }}>Fast local chat demo</p>
        </div>

        <div style={{ marginTop: 20 }}>
          <button
            onClick={handleSignIn}
            style={{
              padding: "12px 20px",
              borderRadius: 24,
              background: "#00a884",
              color: "white",
              border: "none",
              cursor: "pointer",
              fontSize: 16,
            }}
          >
            Sign in with Google
          </button>
        </div>
        <div style={{ marginTop: 18 }}>
          <small style={{ color: "#9fbfb1" }}>
            (Sign in required to chat with friends)
          </small>
        </div>
      </div>
    );
  }

  // If showContacts is true (contacts-first view)
  if (showContacts) {
    return (
      <div style={{ ...styles.app }}>
        <div style={styles.header}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <img
              src="https://i.imgur.com/3y2zKqz.png"
              alt="logo"
              style={{ width: 44, height: 44, borderRadius: 10 }}
            />
            <div>
              <div style={{ fontSize: 18, fontWeight: 700 }}>Let's Chat</div>
              <div style={{ fontSize: 12, color: "#bfeadf" }}>
                {user.displayName}
              </div>
            </div>
          </div>

          <div>
            <button
              onClick={handleSignOut}
              style={{
                ...styles.iconBtn,
                border: "1px solid rgba(255,255,255,0.06)",
                padding: "8px 12px",
                borderRadius: 18,
              }}
              title="Sign out"
            >
              Sign out
            </button>
          </div>
        </div>

        <div style={styles.container}>
          <div style={styles.sidebar}>
            <div style={{ padding: 12 }}>
              <div style={{ fontSize: 14, color: "#9fbfb1" }}>
                Your contacts
              </div>
            </div>

            {contacts.length === 0 ? (
              <div style={{ padding: 20, color: "#9fbfb1" }}>
                No other users found. Invite friends to sign in.
              </div>
            ) : (
              contacts.map((c) => (
                <div
                  key={c.id}
                  style={styles.contactItem}
                  onClick={() => openChat(c)}
                  title={`Chat with ${c.displayName || c.name || "Friend"}`}
                >
                  <img
                    src={c.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(c.displayName || "F")}`}
                    alt="avatar"
                    style={styles.avatar}
                  />
                  <div style={{ flex: 1 }}>
                    <div style={styles.contactName}>
                      {c.displayName || c.name || "Friend"}
                    </div>
                    <div style={styles.contactMeta}>
                      {c.online ? "Online" : "Offline"} • {c.about || ""}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          <div style={styles.main}>
            <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", color: "#9fbfb1" }}>
              <div style={{ maxWidth: 520, textAlign: "center" }}>
                <h2 style={{ marginTop: 0 }}>Welcome, {user.displayName}</h2>
                <p style={{ color: "#a9d3c7" }}>
                  Select a contact to start chatting. You can use voice-to-text, emojis, and real-time messages.
                </p>
                <div style={{ marginTop: 16 }}>
                  <button
                    onClick={() => setShowContacts(true)}
                    style={{
                      padding: "10px 16px",
                      background: "#00a884",
                      color: "white",
                      borderRadius: 18,
                      border: "none",
                      cursor: "pointer",
                    }}
                  >
                    Open contacts
                  </button>
                </div>
                <div style={{ marginTop: 18, color: "#7fbfb1", fontSize: 13 }}>
                  Tip: other users who signed in will appear in the contacts list.
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Chat view (selectedContact != null and showContacts === false)
  return (
    <div style={{ ...styles.app }}>
      <div style={styles.header}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <button onClick={goBackToContacts} style={styles.backBtn} aria-label="Back to contacts">
            ←
          </button>
          <img
            src={selectedContact.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(selectedContact.displayName || "F")}`}
            alt="avatar"
            style={{ width: 44, height: 44, borderRadius: 10 }}
          />
          <div>
            <div style={{ fontSize: 16, fontWeight: 700 }}>
              {selectedContact.displayName || selectedContact.name || "Friend"}
            </div>
            <div style={{ fontSize: 12, color: "#bfeadf" }}>
              {selectedContact.online ? "Online" : "Offline"}
            </div>
          </div>
        </div>

        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <button
            onClick={() => {}}
            style={{ ...styles.iconBtn }}
            title="Profile / info"
          >
            ℹ️
          </button>
          <button onClick={handleSignOut} style={styles.iconBtn} title="Sign out">
            ⎋
          </button>
        </div>
      </div>

      <div style={styles.container}>
        <div style={styles.sidebar}>
          {/* small contact preview list on left for wide screens */}
          <div style={{ padding: 12 }}>
            <div style={{ fontSize: 14, color: "#9fbfb1" }}>Contacts</div>
          </div>

          {contacts.map((c) => (
            <div
              key={c.id}
              style={{
                ...styles.contactItem,
                background: c.id === selectedContact.id ? "rgba(0,168,132,0.08)" : undefined,
              }}
              onClick={() => {
                // switch chat quickly
                if (c.id === selectedContact.id) return;
                cleanupMessagesListener();
                setSelectedContact(c);
                attachMessagesListener(c);
              }}
            >
              <img src={c.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(c.displayName || "F")}`} alt="avatar" style={styles.avatar} />
              <div style={{ flex: 1 }}>
                <div style={styles.contactName}>{c.displayName || c.name || "Friend"}</div>
                <div style={styles.contactMeta}>{c.online ? "Online" : "Offline"}</div>
              </div>
            </div>
          ))}
        </div>

        <div style={styles.main}>
          <div style={styles.chatHeader}>
            <div style={{ fontSize: 13, color: "#9fbfb1" }}>
              Chat with {selectedContact.displayName || selectedContact.name}
            </div>
            <div style={{ marginLeft: "auto", fontSize: 12, color: "#9fbfb1" }}>
              {messages.length === 0 ? "" : `${messages.length} messages`}
            </div>
          </div>

          <div style={styles.chatBody}>
            {messages.length === 0 && (
              <div style={{ textAlign: "center", marginTop: 40, color: "#9fbfb1" }}>
                No messages yet — say hi!
              </div>
            )}

            {messages.map((m) => (
              <div
                key={m.id}
                style={{
                  ...styles.messageRow,
                  justifyContent: m.from === user.uid ? "flex-end" : "flex-start",
                }}
              >
                <div style={m.from === user.uid ? styles.bubbleMe : styles.bubbleThem}>
                  <div style={{ fontSize: 13 }}>{m.text}</div>
                  <div style={{ marginTop: 6, fontSize: 11, color: "rgba(255,255,255,0.6)", textAlign: "right" }}>
                    {new Date(m.ts || m.timestamp || Date.now()).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </div>
                </div>
              </div>
            ))}

            <div ref={messagesEndRef} />
          </div>

          <div style={styles.composer}>
            <button
              onClick={() => setShowEmoji((s) => !s)}
              style={styles.iconBtn}
              title="Emoji"
            >
              😊
            </button>

            <div style={{ position: "relative", flex: 1 }}>
              <input
                value={text}
                onChange={(e) => {
                  setText(e.target.value);
                  notifyTyping(true);
                }}
                onBlur={() => notifyTyping(false)}
                placeholder="Type a message"
                style={styles.input}
                onKeyDown={(e) => {
                  if (e.key === "Enter") sendMessage();
                }}
              />

              {showEmoji && (
                <div style={styles.emojiBox}>
                  {EMOJIS.map((em) => (
                    <button
                      key={em}
                      onClick={() => insertEmoji(em)}
                      style={{
                        background: "transparent",
                        border: "none",
                        cursor: "pointer",
                        fontSize: 18,
                      }}
                      title={em}
                    >
                      {em}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <button
              onClick={startStopListening}
              style={{
                ...styles.iconBtn,
                background: listening ? "rgba(255,80,80,0.14)" : "transparent",
                borderRadius: 8,
              }}
              title="Voice to text"
            >
              🎤
            </button>

            <button
              onClick={sendMessage}
              style={{
                background: "#00a884",
                border: "none",
                color: "white",
                padding: "10px 14px",
                borderRadius: 20,
                cursor: "pointer",
              }}
              title="Send"
            >
              ➤
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
