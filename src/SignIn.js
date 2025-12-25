// src/SignIn.js
import React from "react";
import { signInWithPopup } from "firebase/auth";
import { auth, provider } from "./firebase";

export default function SignIn({ 
    user, 
    showRestorePrompt, 
    handleRestoreData, 
    handleStartFresh, 
    theme_palette, 
    styles 
}) {
    // Logic for the Welcome/Login screen
    if (!user) {
        return (
            <div style={{ ...styles.app, alignItems: "center", justifyContent: "center" }}>
                <div style={{ textAlign: "center" }}>
                    <img 
                        src="https://cdn-icons-png.flaticon.com/512/733/733585.png" 
                        alt="logo" 
                        style={{ width: 120, height: 120, marginBottom: 12, borderRadius: 18 }} 
                    />
                    <h1 style={{ margin: 6 }}>Let's Chat</h1>
                    <p style={{ color: theme_palette.muted }}>Sign in to chat</p>
                    <button 
                        onClick={() => signInWithPopup(auth, provider)} 
                        style={{ padding: "10px 18px", borderRadius: 12, background: theme_palette.accent, color: "#fff", border: "none", cursor: "pointer" }}
                    >
                        Sign in with Google
                    </button>
                </div>
            </div>
        );
    }

    // Logic for the Restore Data prompt
    if (showRestorePrompt) {
        return (
            <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.85)", zIndex: 999, display: "flex", alignItems: "center", justifyContent: "center", color: theme_palette.text }}>
                <div style={{ background: theme_palette.sidebar, padding: 32, borderRadius: 16, textAlign: "center", maxWidth: 400, border: `1px solid ${theme_palette.tile}` }}>
                    <h2>Welcome Back!</h2>
                    <p style={{ color: theme_palette.muted, margin: "15px 0 24px" }}>You signed out previously. How would you like to start this session?</p>
                    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                        <button 
                            onClick={handleRestoreData} 
                            style={{ background: theme_palette.accent, border: "none", padding: 12, borderRadius: 8, cursor: "pointer", fontWeight: 600, color: "#000" }}
                        >
                            Continue Previous Account
                        </button>
                        <button 
                            onClick={handleStartFresh} 
                            style={{ background: "transparent", border: `1px solid ${theme_palette.muted}`, color: theme_palette.text, padding: 12, borderRadius: 8, cursor: "pointer" }}
                        >
                            Start Fresh (Wipe Past Data)
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return null;
}