'use client';

import React from 'react';
import { useChurch } from '@/contexts/ChurchContext';
import { AIChatInterface } from './ai-chat-interface';

export function AIChatWrapper() {
    const { selectedChurch, isLoading } = useChurch();

    // Don't render if no church is selected or still loading
    if (isLoading || !selectedChurch) {
        return null;
    }

    return <AIChatInterface churchId={selectedChurch.id} />;
}
