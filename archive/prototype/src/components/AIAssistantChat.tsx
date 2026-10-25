import React, { useState, useRef, useEffect } from 'react';
import { GoogleGenAI } from '@google/genai';
import { XIcon, SendIcon, BotIcon } from './Icons';
import { useAuth } from '../hooks/useAuth';

interface AIAssistantChatProps {
    isOpen: boolean;
    onClose: () => void;
}

interface Message {
    sender: 'user' | 'ai';
    text: string;
}

const AIAssistantChat: React.FC<AIAssistantChatProps> = ({ isOpen, onClose }) => {
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const { user } = useAuth();
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(scrollToBottom, [messages]);

    useEffect(() => {
        if (isOpen) {
            setMessages([
                { sender: 'ai', text: `مرحباً ${user?.fullName?.split(' ')[0]}! أنا مساعدك الذكي في منصة رفد. كيف يمكنني مساعدتك اليوم؟` }
            ]);
        }
    }, [isOpen, user]);
    
    const handleSend = async () => {
        if (input.trim() === '' || isLoading) return;

        const userMessage: Message = { sender: 'user', text: input };
        setMessages(prev => [...prev, userMessage]);
        setInput('');
        setIsLoading(true);

        try {
            // FIX: Initialize GoogleGenAI with apiKey from environment variable
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            
            // FIX: Use the recommended model 'gemini-2.5-flash'
            const response = await ai.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: `أنت مساعد ذكي في منصة تعليمية اسمها "رفد". المستخدم الحالي هو ${user?.fullName} وهو ${user?.role}. أجب على سؤاله باختصار وبشكل مفيد. السؤال هو: ${input}`,
            });

            // FIX: Access text directly from the response object
            const aiText = response.text;
            
            const aiMessage: Message = { sender: 'ai', text: aiText };
            setMessages(prev => [...prev, aiMessage]);
        } catch (error) {
            console.error('Error generating content:', error);
            const errorMessage: Message = { sender: 'ai', text: 'عذراً، حدث خطأ ما. يرجى المحاولة مرة أخرى.' };
            setMessages(prev => [...prev, errorMessage]);
        } finally {
            setIsLoading(false);
        }
    };

    const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            handleSend();
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed bottom-28 left-8 w-96 h-[32rem] bg-white rounded-xl shadow-2xl flex flex-col z-50 transition-all duration-300">
            {/* Header */}
            <div className="flex justify-between items-center p-4 border-b bg-primary-light text-white rounded-t-xl">
                <h3 className="font-bold text-lg">المساعد الذكي</h3>
                <button onClick={onClose} className="hover:bg-primary rounded-full p-1">
                    <XIcon className="w-5 h-5" />
                </button>
            </div>

            {/* Messages */}
            <div className="flex-grow p-4 overflow-y-auto">
                <div className="space-y-4">
                    {messages.map((msg, index) => (
                        <div key={index} className={`flex items-start gap-3 ${msg.sender === 'user' ? 'justify-end' : ''}`}>
                            {msg.sender === 'ai' && (
                                <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center flex-shrink-0">
                                    <BotIcon className="w-5 h-5 text-white" />
                                </div>
                            )}
                            <div
                                className={`max-w-xs p-3 rounded-2xl ${
                                    msg.sender === 'user'
                                        ? 'bg-primary text-white rounded-br-none'
                                        : 'bg-gray-200 text-gray-800 rounded-bl-none'
                                }`}
                                style={{ direction: 'rtl' }}
                            >
                                <p className="text-sm">{msg.text}</p>
                            </div>
                        </div>
                    ))}
                    {isLoading && (
                         <div className="flex items-start gap-3">
                            <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center flex-shrink-0">
                                <BotIcon className="w-5 h-5 text-white" />
                            </div>
                            <div className="max-w-xs p-3 rounded-2xl bg-gray-200 text-gray-800 rounded-bl-none">
                                <div className="flex items-center justify-center space-x-1">
                                    <div className="w-2 h-2 bg-gray-500 rounded-full animate-pulse-fast"></div>
                                    <div className="w-2 h-2 bg-gray-500 rounded-full animate-pulse-medium"></div>
                                    <div className="w-2 h-2 bg-gray-500 rounded-full animate-pulse-slow"></div>
                                </div>
                            </div>
                        </div>
                    )}
                    <div ref={messagesEndRef} />
                </div>
            </div>

            {/* Input */}
            <div className="p-4 border-t">
                <div className="relative">
                    <input
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyPress={handleKeyPress}
                        placeholder="اسأل أي شيء..."
                        className="w-full pl-10 pr-4 py-2 border rounded-full focus:outline-none focus:ring-2 focus:ring-primary"
                        style={{ direction: 'rtl' }}
                        disabled={isLoading}
                    />
                    <button
                        onClick={handleSend}
                        className="absolute left-1.5 top-1/2 -translate-y-1/2 w-8 h-8 bg-primary rounded-full flex items-center justify-center text-white hover:bg-primary-dark disabled:bg-gray-400"
                        disabled={isLoading || input.trim() === ''}
                    >
                        <SendIcon className="w-4 h-4" />
                    </button>
                </div>
            </div>
        </div>
    );
};

export default AIAssistantChat;