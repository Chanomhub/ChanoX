// src/components/Chat.tsx
import React, { useState, useEffect } from 'react';
import { listen } from '@tauri-apps/api/event';
import CryptoJS from 'crypto-js';
import {invoke} from "@tauri-apps/api/core"; // เพิ่มライブラリ crypto-js

interface Message {
    id: number;
    content: string;
    sender: string;
    timestamp: string;
}

// กำหนดคีย์สำหรับการเข้ารหัส (ควรเก็บไว้ในที่ปลอดภัยใน production)
const ENCRYPTION_KEY = 'your-secret-key-32bytes-long!!!';

const Chat: React.FC = () => {
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState('');
    const [username, ] = useState('User_' + Math.random().toString(36).substr(2, 5));

    // เข้ารหัสข้อความก่อนส่ง
    const encryptMessage = (message: string): string => {
        return CryptoJS.AES.encrypt(message, ENCRYPTION_KEY).toString();
    };

    // ถอดรหัสข้อความที่รับมา
    const decryptMessage = (encrypted: string): string => {
        const bytes = CryptoJS.AES.decrypt(encrypted, ENCRYPTION_KEY);
        return bytes.toString(CryptoJS.enc.Utf8);
    };

    // ฟังก์ชันเรียก Rust backend
    const sendMessageToRust = async (encryptedContent: string) => {
        try {
            await invoke('send_message', {
                content: encryptedContent,
                sender: username,
                timestamp: new Date().toISOString()
            });
        } catch (error) {
            console.error('Error sending message:', error);
        }
    };

    // ตั้งค่าการรับข้อความจาก Rust
    useEffect(() => {
        const setupListener = async () => {
            const unlisten = await listen('new-message', (event) => {
                const payload = event.payload as Message;
                // ถอดรหัสข้อความที่ได้รับ
                const decryptedContent = decryptMessage(payload.content);
                setMessages((prev) => [...prev, {
                    ...payload,
                    content: decryptedContent
                }]);
            });

            return unlisten;
        };

        setupListener();

        // Cleanup listener when component unmounts
        return () => {
            setupListener().then(unlisten => unlisten());
        };
    }, []);

    const handleSend = () => {
        if (input.trim()) {
            const encryptedMessage = encryptMessage(input);
            sendMessageToRust(encryptedMessage);
            setInput('');
        }
    };

    return (
        <div className="chat-container" style={{ padding: '20px', maxWidth: '600px', margin: '0 auto' }}>
            <h2>Secure Chat</h2>

            {/* แสดงข้อความ */}
            <div
                className="messages"
                style={{
                    height: '400px',
                    overflowY: 'auto',
                    border: '1px solid #ccc',
                    padding: '10px',
                    marginBottom: '20px'
                }}
            >
                {messages.map((msg) => (
                    <div key={msg.id} style={{ marginBottom: '10px' }}>
                        <strong>{msg.sender}</strong> <small>{msg.timestamp}</small>
                        <p>{msg.content}</p>
                    </div>
                ))}
            </div>

            {/* อินพุตข้อความ */}
            <div className="input-area" style={{ display: 'flex', gap: '10px' }}>
                <input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleSend()}
                    placeholder="พิมพ์ข้อความ..."
                    style={{ flex: 1, padding: '5px' }}
                />
                <button
                    onClick={handleSend}
                    style={{ padding: '5px 15px' }}
                >
                    ส่ง
                </button>
            </div>

            {/* แสดง username ปัจจุบัน */}
            <p style={{ marginTop: '10px' }}>คุณกำลังแชทในชื่อ: {username}</p>
        </div>
    );
};

export default Chat;