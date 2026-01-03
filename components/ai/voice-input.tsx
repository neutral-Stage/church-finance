'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Mic, MicOff, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface VoiceInputProps {
    isActive: boolean;
    onToggle: () => void;
    onTranscript: (transcript: string) => void;
    className?: string;
}

// Define types for Web Speech API
interface SpeechRecognitionErrorEvent extends Event {
    error: string;
}

interface SpeechRecognitionResultItem {
    transcript: string;
}

interface SpeechRecognitionResult {
    isFinal: boolean;
    0: SpeechRecognitionResultItem;
    length: number;
}

interface SpeechRecognitionResultList {
    length: number;
    item(index: number): SpeechRecognitionResult;
    [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionEventCustom extends Event {
    resultIndex: number;
    results: SpeechRecognitionResultList;
}

interface SpeechRecognitionInstance extends EventTarget {
    continuous: boolean;
    interimResults: boolean;
    lang: string;
    onresult: ((event: SpeechRecognitionEventCustom) => void) | null;
    onerror: ((event: SpeechRecognitionErrorEvent) => void) | null;
    onend: (() => void) | null;
    start(): void;
    stop(): void;
    abort(): void;
}

interface SpeechRecognitionConstructor {
    new(): SpeechRecognitionInstance;
}

// Check for browser support
const getSpeechRecognition = (): SpeechRecognitionConstructor | null => {
    if (typeof window === 'undefined') return null;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const windowWithSpeech = window as any;
    return windowWithSpeech.SpeechRecognition || windowWithSpeech.webkitSpeechRecognition || null;
};

export function VoiceInput({ isActive, onToggle, onTranscript, className }: VoiceInputProps) {
    const [isListening, setIsListening] = useState(false);
    const [isSupported, setIsSupported] = useState(true);
    const [recognition, setRecognition] = useState<SpeechRecognitionInstance | null>(null);
    const [interimTranscript, setInterimTranscript] = useState('');

    useEffect(() => {
        const SpeechRecognition = getSpeechRecognition();

        if (!SpeechRecognition) {
            setIsSupported(false);
            return;
        }

        const recognitionInstance = new SpeechRecognition();
        recognitionInstance.continuous = true;
        recognitionInstance.interimResults = true;
        recognitionInstance.lang = 'en-US';

        recognitionInstance.onresult = (event: SpeechRecognitionEventCustom) => {
            let interim = '';
            let final = '';

            for (let i = event.resultIndex; i < event.results.length; i++) {
                const transcript = event.results[i][0].transcript;
                if (event.results[i].isFinal) {
                    final += transcript;
                } else {
                    interim += transcript;
                }
            }

            setInterimTranscript(interim);

            if (final) {
                onTranscript(final);
                setInterimTranscript('');
            }
        };

        recognitionInstance.onerror = (event: SpeechRecognitionErrorEvent) => {
            console.error('Speech recognition error:', event.error);
            setIsListening(false);
            onToggle();
        };

        recognitionInstance.onend = () => {
            setIsListening(false);
        };

        setRecognition(recognitionInstance);

        return () => {
            recognitionInstance.stop();
        };
    }, [onTranscript, onToggle]);

    useEffect(() => {
        if (!recognition) return;

        if (isActive && !isListening) {
            try {
                recognition.start();
                setIsListening(true);
            } catch (error) {
                console.error('Failed to start recognition:', error);
            }
        } else if (!isActive && isListening) {
            recognition.stop();
            setIsListening(false);
            setInterimTranscript('');
        }
    }, [isActive, isListening, recognition]);

    if (!isSupported) {
        return (
            <Button
                type="button"
                variant="ghost"
                size="icon"
                className={cn("h-8 w-8 text-muted-foreground cursor-not-allowed", className)}
                disabled
                title="Voice input not supported in this browser"
            >
                <MicOff className="h-4 w-4" />
            </Button>
        );
    }

    return (
        <>
            <Button
                type="button"
                variant="ghost"
                size="icon"
                className={cn(
                    "h-8 w-8 transition-colors",
                    isActive
                        ? "text-red-500 hover:text-red-600 animate-pulse"
                        : "text-muted-foreground hover:text-foreground",
                    className
                )}
                onClick={onToggle}
                title={isActive ? "Stop listening" : "Start voice input"}
            >
                {isListening ? (
                    <Mic className="h-4 w-4" />
                ) : isActive ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                    <Mic className="h-4 w-4" />
                )}
            </Button>

            {/* Show interim transcript */}
            {interimTranscript && isActive && (
                <div className="absolute bottom-full left-0 right-0 mb-2 p-2 bg-muted rounded-lg text-sm">
                    <span className="text-muted-foreground italic">{interimTranscript}</span>
                </div>
            )}
        </>
    );
}
