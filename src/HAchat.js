// src/HAchat.js
import { ref as dbRef, push, set } from "firebase/database";
import { db } from "./firebase";

/* ---------------- Constants ---------------- */
const nowTs = () => Date.now();

// The Bot Identity Object
export const HA_USER = {
  id: "ha_bot",
  name: "HA Chat",
  photo: "https://api.dicebear.com/6.x/identicon/svg?seed=HAChat",
  isBot: true,
  online: true,
};

/* ---------------- The "Brain" (Reply Logic) ---------------- */
function getHaReply(text) {
  if (!text) return "I didn't catch that — please repeat.";
  const t = text.toLowerCase();
  
  if (/\b(hi|hello|hey)\b/.test(t)) return "Hey! What's up?";
  if (/\b(how are you|how r you)\b/.test(t)) return "I'm code — always ready to chat 🙂";
  if (/\b(date|today)\b/.test(t)) return `Today is ${new Date().toLocaleDateString()}.`;
  
  // Math logic
  const mathMatch = t.match(/(-?\d+)\s*([+\-x*\/])\s*(-?\d+)/);
  if (mathMatch) {
    const a = Number(mathMatch[1]);
    const op = mathMatch[2].replace("x", "*");
    const b = Number(mathMatch[3]);
    try {
      // eslint-disable-next-line no-eval
      const res = eval(`${a}${op}${b}`);
      return `Answer: ${res}`;
    } catch {
      return "Couldn't calculate that.";
    }
  }

  if (t.includes("color of the sky") || t.includes("colour of the sky")) return "Usually blue 🙂";
  if (t.length < 20) return "Nice! Tell me more.";
  return "Thanks — got it. Anything else?";
}

/* ---------------- The "Action" (Send Reply) ---------------- */
export async function replyAsHaBot(chatId, userMessageText) {
  // 1. Get the generated reply text
  const replyText = getHaReply(userMessageText);

  // 2. Simulate delay (typing effect)
  setTimeout(async () => {
    // 3. Push to Firebase
    const messagesRef = dbRef(db, `chats/${chatId}/messages`);
    const newMsgRef = push(messagesRef);
    
    await set(newMsgRef, {
      sender: HA_USER.id,
      name: HA_USER.name,
      text: replyText,
      type: "text",
      timestamp: nowTs(),
      delivered: true,
      read: true,
    });
  }, 700);
}