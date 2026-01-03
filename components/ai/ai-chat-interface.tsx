'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
    MessageSquare,
    X,
    Send,
    Loader2,
    Sparkles,
    ChevronDown,
    ChevronUp,
    Mic,
    MicOff,
    TrendingUp,
    Search,
    PlusCircle
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { VoiceInput } from './voice-input';

interface Message {
    id: string;
    role: 'user' | 'assistant';
    content: string;
    timestamp: Date;
    isLoading?: boolean;
}

interface AIChatInterfaceProps {
    churchId: string;
}

export function AIChatInterface({ churchId }: AIChatInterfaceProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [isMinimized, setIsMinimized] = useState(false);
    const [messages, setMessages] = useState<Message[]>([
        {
            id: '1',
            role: 'assistant',
            content: "Hello! I'm your AI assistant for church finance management. How can I help you today? You can ask me about fund balances, transactions, offerings, bills, or even add new records.",
            timestamp: new Date(),
        },
    ]);
    const [inputValue, setInputValue] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isVoiceMode, setIsVoiceMode] = useState(false);
    const scrollAreaRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    // Auto-scroll to bottom when messages change
    useEffect(() => {
        if (scrollAreaRef.current) {
            scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight;
        }
    }, [messages]);

    // Focus input when chat opens
    useEffect(() => {
        if (isOpen && !isMinimized && inputRef.current) {
            inputRef.current.focus();
        }
    }, [isOpen, isMinimized]);

    const sendMessage = useCallback(async (content: string) => {
        if (!content.trim() || isLoading) return;

        // Add user message
        const userMessage: Message = {
            id: Date.now().toString(),
            role: 'user',
            content: content.trim(),
            timestamp: new Date(),
        };

        // Add loading message
        const loadingMessage: Message = {
            id: (Date.now() + 1).toString(),
            role: 'assistant',
            content: '',
            timestamp: new Date(),
            isLoading: true,
        };

        setMessages(prev => [...prev, userMessage, loadingMessage]);
        setInputValue('');
        setIsLoading(true);

        try {
            const response = await fetch('/api/ai/chat', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    message: content,
                    churchId,
                    conversationHistory: messages.slice(-10).map(m => ({
                        role: m.role,
                        content: m.content,
                    })),
                }),
            });

            const data = await response.json();

            // Replace loading message with actual response
            setMessages(prev =>
                prev.map(m =>
                    m.isLoading
                        ? {
                            ...m,
                            content: data.response || data.error || 'Sorry, I encountered an error.',
                            isLoading: false,
                        }
                        : m
                )
            );
        } catch (error) {
            console.error('Chat error:', error);
            setMessages(prev =>
                prev.map(m =>
                    m.isLoading
                        ? {
                            ...m,
                            content: 'Sorry, I encountered an error. Please try again.',
                            isLoading: false,
                        }
                        : m
                )
            );
        } finally {
            setIsLoading(false);
        }
    }, [churchId, isLoading, messages]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        sendMessage(inputValue);
    };

    const handleVoiceTranscript = (transcript: string) => {
        sendMessage(transcript);
    };

    const quickActions = [
        { label: 'Insights', icon: TrendingUp, prompt: 'Give me a financial summary for this month' },
        { label: 'Search', icon: Search, prompt: 'Search for ' },
        { label: 'Add', icon: PlusCircle, prompt: 'I want to add a new ' },
    ];

    if (!isOpen) {
        return (
            <Button
                onClick={() => setIsOpen(true)}
                className="fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-lg bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 z-50"
                size="icon"
            >
                <Sparkles className="h-6 w-6 text-white" />
            </Button>
        );
    }

    return (
        <div
            className={cn(
                "fixed bottom-6 right-6 z-50 flex flex-col bg-background border rounded-2xl shadow-2xl transition-all duration-300",
                isMinimized ? "w-80 h-14" : "w-96 h-[600px] max-h-[80vh]"
            )}
        >
            {/* Header */}
            <div
                className="flex items-center justify-between px-4 py-3 border-b bg-gradient-to-r from-indigo-600 to-purple-600 rounded-t-2xl cursor-pointer"
                onClick={() => setIsMinimized(!isMinimized)}
            >
                <div className="flex items-center gap-2 text-white">
                    <Sparkles className="h-5 w-5" />
                    <span className="font-semibold">AI Assistant</span>
                </div>
                <div className="flex items-center gap-1">
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-white hover:bg-white/20"
                        onClick={(e) => {
                            e.stopPropagation();
                            setIsMinimized(!isMinimized);
                        }}
                    >
                        {isMinimized ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    </Button>
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-white hover:bg-white/20"
                        onClick={(e) => {
                            e.stopPropagation();
                            setIsOpen(false);
                        }}
                    >
                        <X className="h-4 w-4" />
                    </Button>
                </div>
            </div>

            {!isMinimized && (
                <>
                    {/* Messages */}
                    <ScrollArea className="flex-1 p-4" ref={scrollAreaRef}>
                        <div className="space-y-4">
                            {messages.map((message) => (
                                <div
                                    key={message.id}
                                    className={cn(
                                        "flex",
                                        message.role === 'user' ? "justify-end" : "justify-start"
                                    )}
                                >
                                    <div
                                        className={cn(
                                            "max-w-[85%] rounded-2xl px-4 py-2",
                                            message.role === 'user'
                                                ? "bg-gradient-to-r from-indigo-600 to-purple-600 text-white"
                                                : "bg-muted"
                                        )}
                                    >
                                        {message.isLoading ? (
                                            <div className="flex items-center gap-2">
                                                <Loader2 className="h-4 w-4 animate-spin" />
                                                <span className="text-sm">Thinking...</span>
                                            </div>
                                        ) : (
                                            <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </ScrollArea>

                    {/* Quick Actions */}
                    <div className="px-4 py-2 border-t flex gap-2 overflow-x-auto">
                        {quickActions.map((action) => (
                            <Button
                                key={action.label}
                                variant="outline"
                                size="sm"
                                className="flex-shrink-0 gap-1 text-xs"
                                onClick={() => {
                                    if (action.prompt.endsWith(' ')) {
                                        setInputValue(action.prompt);
                                        inputRef.current?.focus();
                                    } else {
                                        sendMessage(action.prompt);
                                    }
                                }}
                            >
                                <action.icon className="h-3 w-3" />
                                {action.label}
                            </Button>
                        ))}
                    </div>

                    {/* Input */}
                    <div className="p-4 border-t">
                        <form onSubmit={handleSubmit} className="flex gap-2">
                            <div className="flex-1 relative">
                                <Input
                                    ref={inputRef}
                                    value={inputValue}
                                    onChange={(e) => setInputValue(e.target.value)}
                                    placeholder={isVoiceMode ? "Listening..." : "Ask me anything..."}
                                    disabled={isLoading || isVoiceMode}
                                    className="pr-10"
                                />
                                <VoiceInput
                                    isActive={isVoiceMode}
                                    onToggle={() => setIsVoiceMode(!isVoiceMode)}
                                    onTranscript={handleVoiceTranscript}
                                    className="absolute right-2 top-1/2 -translate-y-1/2"
                                />
                            </div>
                            <Button
                                type="submit"
                                size="icon"
                                disabled={!inputValue.trim() || isLoading}
                                className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700"
                            >
                                {isLoading ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                    <Send className="h-4 w-4" />
                                )}
                            </Button>
                        </form>
                    </div>
                </>
            )}
        </div>
    );
}
