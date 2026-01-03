'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
    FileText,
    DollarSign,
    Calendar,
    ExternalLink,
    Search,
    Sparkles
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface SearchResult {
    id: string;
    sourceTable: string;
    sourceId: string;
    content: string;
    similarity: number;
    metadata?: Record<string, unknown>;
}

interface SearchResultsProps {
    query: string;
    results: SearchResult[];
    isLoading?: boolean;
    onNavigate?: (table: string, id: string) => void;
    className?: string;
}

export function SearchResults({
    query,
    results,
    isLoading,
    onNavigate,
    className
}: SearchResultsProps) {
    const getTableIcon = (table: string) => {
        switch (table) {
            case 'transactions':
                return <DollarSign className="h-4 w-4" />;
            case 'bills':
                return <FileText className="h-4 w-4" />;
            case 'offerings':
                return <Sparkles className="h-4 w-4" />;
            default:
                return <FileText className="h-4 w-4" />;
        }
    };

    const getTableColor = (table: string) => {
        switch (table) {
            case 'transactions':
                return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400';
            case 'bills':
                return 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400';
            case 'offerings':
                return 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400';
            case 'members':
                return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400';
            default:
                return 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400';
        }
    };

    const formatSimilarity = (similarity: number) => {
        return `${Math.round(similarity * 100)}%`;
    };

    const getTableLabel = (table: string) => {
        const labels: Record<string, string> = {
            transactions: 'Transaction',
            bills: 'Bill',
            offerings: 'Offering',
            members: 'Member',
        };
        return labels[table] || table;
    };

    const navigateToRecord = (table: string, id: string) => {
        if (onNavigate) {
            onNavigate(table, id);
        } else {
            // Default navigation paths
            const paths: Record<string, string> = {
                transactions: `/transactions?id=${id}`,
                bills: `/bills?id=${id}`,
                offerings: `/offerings?id=${id}`,
                members: `/members?id=${id}`,
            };
            if (paths[table]) {
                window.location.href = paths[table];
            }
        }
    };

    if (isLoading) {
        return (
            <Card className={className}>
                <CardContent className="p-6">
                    <div className="flex items-center justify-center gap-2 text-muted-foreground">
                        <Search className="h-5 w-5 animate-pulse" />
                        <span>Searching...</span>
                    </div>
                </CardContent>
            </Card>
        );
    }

    if (results.length === 0) {
        return (
            <Card className={className}>
                <CardContent className="p-6">
                    <div className="text-center text-muted-foreground">
                        <Search className="h-8 w-8 mx-auto mb-2 opacity-50" />
                        <p>No results found for "{query}"</p>
                        <p className="text-sm mt-1">Try different keywords or a broader search</p>
                    </div>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card className={className}>
            <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                    <CardTitle className="text-lg flex items-center gap-2">
                        <Search className="h-5 w-5 text-indigo-500" />
                        Search Results
                    </CardTitle>
                    <Badge variant="secondary">{results.length} found</Badge>
                </div>
                <p className="text-sm text-muted-foreground">
                    Results for: <span className="font-medium">"{query}"</span>
                </p>
            </CardHeader>
            <CardContent className="p-0">
                <ScrollArea className="h-[400px]">
                    <div className="divide-y">
                        {results.map((result, index) => (
                            <div
                                key={result.id || index}
                                className="p-4 hover:bg-accent/50 transition-colors cursor-pointer"
                                onClick={() => navigateToRecord(result.sourceTable, result.sourceId)}
                            >
                                <div className="flex items-start gap-3">
                                    <div className={cn(
                                        "p-2 rounded-lg flex-shrink-0",
                                        getTableColor(result.sourceTable)
                                    )}>
                                        {getTableIcon(result.sourceTable)}
                                    </div>

                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 mb-1">
                                            <Badge variant="outline" className="text-xs">
                                                {getTableLabel(result.sourceTable)}
                                            </Badge>
                                            <Badge
                                                variant="secondary"
                                                className={cn(
                                                    "text-xs",
                                                    result.similarity > 0.9
                                                        ? "bg-green-100 text-green-700"
                                                        : result.similarity > 0.8
                                                            ? "bg-blue-100 text-blue-700"
                                                            : "bg-gray-100 text-gray-700"
                                                )}
                                            >
                                                {formatSimilarity(result.similarity)} match
                                            </Badge>
                                        </div>

                                        <p className="text-sm line-clamp-2">{result.content}</p>

                                        {result.metadata && (
                                            <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                                                {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                                                {(result.metadata as any).date && (
                                                    <span className="flex items-center gap-1">
                                                        <Calendar className="h-3 w-3" />
                                                        {String((result.metadata as any).date)}
                                                    </span>
                                                )}
                                                {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                                                {(result.metadata as any).amount && (
                                                    <span className="flex items-center gap-1">
                                                        <DollarSign className="h-3 w-3" />
                                                        {String((result.metadata as any).amount)}
                                                    </span>
                                                )}
                                            </div>
                                        )}
                                    </div>

                                    <Button variant="ghost" size="icon" className="flex-shrink-0">
                                        <ExternalLink className="h-4 w-4" />
                                    </Button>
                                </div>
                            </div>
                        ))}
                    </div>
                </ScrollArea>
            </CardContent>
        </Card>
    );
}
