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
    styles,
    db,
    dbRef,
    set
}) {

    const login = async () => {
        try {
            const res = await signInWithPopup(auth, provider);
            const u = res.user;
            // Create user entry if it doesn't exist, but don't overwrite name/photo if already there
            const userRef = dbRef(db, `users/${u.uid}`);
            // Note: We don't set 'hasProfile' here. App.js will detect its absence and show the setup.
            await set(userRef, {
                email: u.email,
                online: true,
                lastSeen: Date.now(),
                // Initial fallbacks
                name: u.displayName || "New User",
                photo: u.photoURL || ""
            });
        } catch (e) {
            console.error(e);
        }
    };

    const containerStyle = {
        ...styles.app,
        justifyContent: "center",
        alignItems: "center",
        flexDirection: "column",
        gap: 20
    };

    const cardStyle = {
        background: theme_palette.sidebar,
        padding: 40,
        borderRadius: 20,
        textAlign: "center",
        boxShadow: "0 10px 30px rgba(0,0,0,0.1)"
    };

    if (showRestorePrompt) {
        return (
            <div style={containerStyle}>
                <div style={cardStyle}>
                    <h2 style={{ color: theme_palette.text }}>Welcome Back!</h2>
                    <p style={{ color: theme_palette.muted, marginBottom: 30 }}>
                        Would you like to restore your previous chats or start fresh?
                    </p>
                    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                        <button 
                            onClick={handleRestoreData} 
                            style={{ ...styles.roundBtn, width: "100%", borderRadius: 10 }}
                        >
                            Restore My Chats
                        </button>
                        <button 
                            onClick={handleStartFresh} 
                            style={{ 
                                background: "transparent", 
                                border: `1px solid ${theme_palette.tile}`, 
                                color: theme_palette.text,
                                padding: 12,
                                borderRadius: 10,
                                cursor: "pointer"
                            }}
                        >
                            Start Fresh
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div style={containerStyle}>
            <img src="https://cdn-icons-png.flaticon.com/512/733/733585.png" style={{ width: 100, height: 100 }} alt="logo" />
            <div style={cardStyle}>
                <h1 style={{ color: theme_palette.text, margin: "0 0 10px 0" }}>ChatApp</h1>
                <p style={{ color: theme_palette.muted, marginBottom: 30 }}>Sign in to connect with friends</p>
                <button 
                    onClick={login} 
                    style={{ 
                        ...styles.roundBtn, 
                        width: "100%", 
                        borderRadius: 10,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: 10
                    }}
                >
                    <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" width="20" alt="google" />
                    Sign in with Google
                </button>
            </div>
        </div>
    );
}