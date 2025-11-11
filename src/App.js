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
  off,
} from "firebase/database";
import { auth, db, provider } from "./firebase";

// Emoji list (20 fun emojis)
const EMOJIS = [
  "😀", "😁", "😂", "🤣", "😊", "😍", "😘", "🤔", "😅", "😉",
  "😎", "🤩", "😢", "😭", "😡", "👍", "🙏", "❤️", "🔥", "🎉"
];

const now = () => Date.now();
const fmtTime = (ts) => new Date(ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

function haReplyFor(text) {
  const t = text.toLowerCase();
  if (/\b(hi|hello|hey)\b/.test(t)) return "Hey there 👋 How are you?";
  if (/\b(how are you|how r you)\b/.test(t)) return "I'm awesome! You?";
  if (/\b(date|today)\b/.test(t)) return `Today is ${new Date().toLocaleDateString()}.`;
  const math = t.match(/(-?\d+)\s*([+\-*\/x])\s*(-?\d+)/);
  if (math) {
    const [_, a, opRaw, b] = math;
    const op = opRaw.replace("x", "*");
    try { return `Answer: ${eval(`${a}${op}${b}`)}`; } catch { return "Can't calculate that 😅"; }
  }
  if (t.includes("bye")) return "Bye! Talk to you soon 👋";
  return "Nice! Tell me more 😊";
}

export default function App() {
  const [user, setUser] = useState(null);
  const [contacts, setContacts] = useState([]);
  const [selectedContact, setSelectedContact] = useState(null);
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const [theme, setTheme] = useState("dark");
  const [sidebarVisible, setSidebarVisible] = useState(true);
  const [listening, setListening] = useState(false);
  const [emojiOpen, setEmojiOpen] = useState(false);
  const messagesEndRef = useRef(null);
  const messagesRefActive = useRef(null);
  const recognitionRef = useRef(null);

  // AUTH + USERS
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (current) => {
      if (current) {
        setUser(current);
        const uRef = dbRef(db, `users/${current.uid}`);
        set(uRef, {
          name: current.displayName || "",
          photo: current.photoURL || "",
          email: current.email || "",
          online: true,
          lastSeen: now(),
        });
        const usersRef = dbRef(db, "users");
        onValue(usersRef, (snap) => {
          const raw = snap.val() || {};
          const arr = Object.keys(raw).map((k) => ({ id: k, ...raw[k] }));
          const haBot = { id: "ha_bot", name: "HA Chat", photo: "/bot.png", isBot: true };
          const filtered = arr.filter(
            (x) => x.id !== current.uid && x.name && x.name !== "Unknown"
          );
          const merged = [haBot, ...filtered];
          setContacts(merged);
        });
      } else setUser(null);
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    if (window.innerWidth < 820) setSidebarVisible(false);
  }, []);

  const makeChatId = (a, b) => (a > b ? `${a}_${b}` : `${b}_${a}`);

  function openChat(contact) {
    setSelectedContact(contact);
    if (window.innerWidth < 820) setSidebarVisible(false);
    if (messagesRefActive.current) off(messagesRefActive.current);

    const chatId = makeChatId(user.uid, contact.id);
    const msgsRef = dbRef(db, `chats/${chatId}/messages`);
    messagesRefActive.current = msgsRef;

    onValue(msgsRef, (snap) => {
      const val = snap.val() || {};
      const arr = Object.entries(val).map(([k, v]) => ({ id: k, ...v }));
      arr.sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));
      setMessages(arr);
      setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
    });
  }

  async function sendTextMessage(body) {
    const content = (body ?? text).trim();
    if (!content) return;
    const chatId = makeChatId(user.uid, selectedContact.id);
    const msgsRef = dbRef(db, `chats/${chatId}/messages`);
    const msgRef = push(msgsRef);
    await set(msgRef, {
      sender: user.uid,
      name: user.displayName,
      text: content,
      timestamp: now(),
    });
    setText("");
    if (selectedContact.id === "ha_bot") {
      const reply = haReplyFor(content);
      const botMsg = push(msgsRef);
      await set(botMsg, {
        sender: "ha_bot",
        name: "HA Chat",
        text: reply,
        timestamp: now(),
      });
    }
  }

  const startVoice = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) return alert("Voice recognition not supported.");
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      setListening(false);
      recognitionRef.current = null;
      return;
    }
    const rec = new SpeechRecognition();
    rec.lang = "en-US";
    rec.onstart = () => setListening(true);
    rec.onend = () => { setListening(false); recognitionRef.current = null; };
    rec.onresult = (e) => {
      const transcript = e.results[0][0].transcript;
      sendTextMessage(transcript);
    };
    recognitionRef.current = rec;
    rec.start();
  };

  const palette = theme === "dark"
    ? {
        bg: "linear-gradient(180deg, #0b141a 0%, #111b21 100%)",
        panel: "#111b21",
        tile: "#1f2c33",
        text: "#e9edef",
        accent: "#00a884",
        muted: "#9fbfb1",
      }
    : {
        bg: "#f6f7f8",
        panel: "#fff",
        tile: "#e9eef0",
        text: "#081316",
        accent: "#007a66",
        muted: "#607080",
      };

  const styles = {
    app: { display: "flex", height: "100vh", background: palette.bg, color: palette.text, fontFamily: "Segoe UI, Roboto" },
    sidebar: { width: sidebarVisible ? 320 : 0, transition: "width .3s", background: palette.tile, overflow: "hidden", display: "flex", flexDirection: "column" },
    chat: { flex: 1, display: "flex", flexDirection: "column", background: palette.panel },
    msgArea: { flex: 1, overflowY: "auto", padding: "18px 16px" },
    bubbleMine: { alignSelf: "flex-end", background: palette.accent, color: "#fff", padding: "10px 14px", borderRadius: 14, marginBottom: 12 },
    bubbleOther: { alignSelf: "flex-start", background: palette.tile, color: palette.text, padding: "10px 14px", borderRadius: 14, marginBottom: 12 },
  };

  if (!user) {
    return (
      <div style={{ ...styles.app, justifyContent: "center", alignItems: "center" }}>
        <button onClick={() => signInWithPopup(auth, provider)} style={{ background: "#00a884", color: "#fff", padding: "12px 24px", border: "none", borderRadius: 8 }}>
          Sign in with Google
        </button>
      </div>
    );
  }

  return (
    <div style={styles.app}>
      {/* Sidebar */}
      <div style={styles.sidebar}>
        <div style={{ padding: 16, borderBottom: `1px solid ${palette.panel}`, display: "flex", justifyContent: "space-between" }}>
          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <img src={user.photoURL || `https://api.dicebear.com/6.x/initials/svg?seed=${user.displayName}`} alt="me" style={{ width: 44, height: 44, borderRadius: "50%" }} />
            <div>
              <strong>{user.displayName}</strong>
              <div style={{ fontSize: 12, color: palette.muted }}>{user.email}</div>
            </div>
          </div>
          <button onClick={() => setTheme(t => (t === "dark" ? "light" : "dark"))} style={{ background: "none", border: "none", color: palette.text, cursor: "pointer" }}>
            {theme === "dark" ? "☀️" : "🌙"}
          </button>
        </div>
        <div style={{ overflowY: "auto", flex: 1 }}>
          {contacts.map(c => (
            <div key={c.id} onClick={() => openChat(c)} style={{
              display: "flex", gap: 12, padding: "10px 14px", cursor: "pointer",
              background: selectedContact?.id === c.id ? palette.panel : "transparent",
              borderBottom: `1px solid ${palette.panel}`
            }}>
              <img src={c.photo || `https://api.dicebear.com/6.x/initials/svg?seed=${c.name}`} alt="pic" style={{ width: 48, height: 48, borderRadius: "50%" }} />
              <div>
                <div style={{ fontWeight: 700 }}>{c.name}</div>
                <div style={{ fontSize: 12, color: palette.muted }}>{c.isBot ? "AI Assistant" : "Tap to chat"}</div>
              </div>
            </div>
          ))}
        </div>
        <button onClick={() => signOut(auth)} style={{ background: palette.accent, border: "none", color: "#fff", padding: 10 }}>Sign Out</button>
      </div>

      {/* Chat Area */}
      <div style={styles.chat}>
        {selectedContact ? (
          <>
            <div style={{ padding: 14, borderBottom: `1px solid ${palette.tile}`, display: "flex", alignItems: "center", gap: 12 }}>
              <button onClick={() => setSelectedContact(null)} style={{ background: "none", border: "none", color: palette.text }}>←</button>
              <img src={selectedContact.photo || `https://api.dicebear.com/6.x/initials/svg?seed=${selectedContact.name}`} alt="pic" style={{ width: 44, height: 44, borderRadius: "50%" }} />
              <div>
                <strong>{selectedContact.name}</strong>
                <div style={{ fontSize: 12, color: palette.muted }}>{selectedContact.isBot ? "Online" : "Active"}</div>
              </div>
            </div>

            <div style={styles.msgArea}>
              {messages.map((m) => (
                <div key={m.id} style={m.sender === user.uid ? styles.bubbleMine : styles.bubbleOther}>
                  {m.text}
                  <div style={{ fontSize: 11, opacity: 0.8, marginTop: 6, textAlign: "right" }}>{fmtTime(m.timestamp)}</div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>

            <div style={{ display: "flex", flexDirection: "column", borderTop: `1px solid ${palette.tile}`, background: palette.panel }}>
              {emojiOpen && (
                <div style={{
                  display: "flex",
                  flexWrap: "wrap",
                  gap: "6px",
                  padding: "10px 12px",
                  borderBottom: `1px solid ${palette.tile}`,
                  background: palette.tile,
                }}>
                  {EMOJIS.map((em) => (
                    <span
                      key={em}
                      onClick={() => { setText(text + em); setEmojiOpen(false); }}
                      style={{ fontSize: 22, cursor: "pointer" }}
                    >
                      {em}
                    </span>
                  ))}
                </div>
              )}

              <div style={{ display: "flex", padding: 10 }}>
                <button onClick={() => setEmojiOpen(!emojiOpen)} style={{ background: "none", border: "none", fontSize: 22, cursor: "pointer", color: palette.text }}>😊</button>
                <input
                  style={{ flex: 1, borderRadius: 20, border: "none", padding: "10px 14px", background: palette.tile, color: palette.text, marginLeft: 8 }}
                  placeholder="Type a message"
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && sendTextMessage()}
                />
                <button onClick={startVoice} style={{ background: palette.accent, color: "#fff", border: "none", borderRadius: "50%", width: 44, height: 44, marginLeft: 8 }}>
                  {listening ? "⏹" : "🎤"}
                </button>
                <button onClick={() => sendTextMessage()} style={{ background: palette.accent, color: "#fff", border: "none", borderRadius: "50%", width: 44, height: 44, marginLeft: 8 }}>
                  ➤
                </button>
              </div>
            </div>
          </>
        ) : (
          <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", color: palette.muted }}>
            <div style={{ textAlign: "center" }}>
              <h2>Welcome 👋</h2>
              <p>Select a contact to start chatting</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
