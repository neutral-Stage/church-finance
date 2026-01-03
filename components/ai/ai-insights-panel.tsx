'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
    TrendingUp,
    TrendingDown,
    DollarSign,
    ArrowUpRight,
    ArrowDownRight,
    AlertTriangle,
    Sparkles,
    RefreshCw,
    BarChart3,
    PiggyBank,
    Receipt,
    Clock
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface FinancialInsight {
    type: 'positive' | 'negative' | 'neutral' | 'warning';
    title: string;
    value: string;
    change?: {
        value: string;
        direction: 'up' | 'down';
    };
    description?: string;
}

interface AIInsightsPanelProps {
    churchId: string;
    className?: string;
}

export function AIInsightsPanel({ churchId, className }: AIInsightsPanelProps) {
    const [insights, setInsights] = useState<FinancialInsight[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [summary, setSummary] = useState<string>('');

    const fetchInsights = async () => {
        setIsLoading(true);
        try {
            const response = await fetch('/api/ai/chat', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    message: 'Give me a brief financial summary with key insights for this month. Format as JSON with insights array containing type (positive/negative/neutral/warning), title, value, and description.',
                    churchId,
                }),
            });

            const data = await response.json();

            if (data.response) {
                // Try to parse insights from the response
                try {
                    const jsonMatch = data.response.match(/\{[\s\S]*\}/);
                    if (jsonMatch) {
                        const parsed = JSON.parse(jsonMatch[0]);
                        if (parsed.insights) {
                            setInsights(parsed.insights);
                        }
                        if (parsed.summary) {
                            setSummary(parsed.summary);
                        }
                    }
                } catch {
                    // If JSON parsing fails, use default insights and set the summary as the response
                    setSummary(data.response);
                    setInsights([
                        {
                            type: 'neutral',
                            title: 'AI Analysis',
                            value: 'Ready',
                            description: 'Click refresh for updated insights',
                        },
                    ]);
                }
            }
        } catch (error) {
            console.error('Error fetching insights:', error);
            setInsights([
                {
                    type: 'warning',
                    title: 'Connection Error',
                    value: 'Unable to fetch',
                    description: 'Please check your connection and try again',
                },
            ]);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchInsights();
    }, [churchId]);

    const getInsightIcon = (type: string) => {
        switch (type) {
            case 'positive':
                return <TrendingUp className="h-5 w-5 text-green-500" />;
            case 'negative':
                return <TrendingDown className="h-5 w-5 text-red-500" />;
            case 'warning':
                return <AlertTriangle className="h-5 w-5 text-amber-500" />;
            default:
                return <BarChart3 className="h-5 w-5 text-blue-500" />;
        }
    };

    const getInsightBadgeColor = (type: string) => {
        switch (type) {
            case 'positive':
                return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400';
            case 'negative':
                return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400';
            case 'warning':
                return 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400';
            default:
                return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400';
        }
    };

    return (
        <Card className={cn("overflow-hidden", className)}>
            <CardHeader className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white pb-4">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Sparkles className="h-5 w-5" />
                        <CardTitle className="text-lg">AI Insights</CardTitle>
                    </div>
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-white hover:bg-white/20"
                        onClick={fetchInsights}
                        disabled={isLoading}
                    >
                        <RefreshCw className={cn("h-4 w-4", isLoading && "animate-spin")} />
                    </Button>
                </div>
            </CardHeader>
            <CardContent className="p-4 space-y-4">
                {isLoading ? (
                    <div className="space-y-3">
                        {[1, 2, 3].map((i) => (
                            <div key={i} className="flex items-start gap-3">
                                <Skeleton className="h-10 w-10 rounded-lg" />
                                <div className="flex-1 space-y-2">
                                    <Skeleton className="h-4 w-24" />
                                    <Skeleton className="h-6 w-16" />
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <>
                        {/* Summary */}
                        {summary && (
                            <div className="p-3 bg-muted rounded-lg text-sm">
                                <p className="text-muted-foreground">{summary}</p>
                            </div>
                        )}

                        {/* Insight Cards */}
                        <div className="space-y-3">
                            {insights.map((insight, index) => (
                                <div
                                    key={index}
                                    className="flex items-start gap-3 p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                                >
                                    <div className={cn(
                                        "p-2 rounded-lg",
                                        getInsightBadgeColor(insight.type)
                                    )}>
                                        {getInsightIcon(insight.type)}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center justify-between gap-2">
                                            <span className="text-sm font-medium truncate">{insight.title}</span>
                                            {insight.change && (
                                                <Badge variant="outline" className={cn(
                                                    "text-xs flex-shrink-0",
                                                    insight.change.direction === 'up' ? "text-green-600" : "text-red-600"
                                                )}>
                                                    {insight.change.direction === 'up' ? (
                                                        <ArrowUpRight className="h-3 w-3 mr-1" />
                                                    ) : (
                                                        <ArrowDownRight className="h-3 w-3 mr-1" />
                                                    )}
                                                    {insight.change.value}
                                                </Badge>
                                            )}
                                        </div>
                                        <div className="text-lg font-bold">{insight.value}</div>
                                        {insight.description && (
                                            <p className="text-xs text-muted-foreground mt-1">{insight.description}</p>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Quick Stats */}
                        <div className="grid grid-cols-2 gap-2 pt-2">
                            <div className="p-3 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800">
                                <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
                                    <PiggyBank className="h-4 w-4" />
                                    <span className="text-xs font-medium">Total Funds</span>
                                </div>
                                <div className="text-lg font-bold text-green-700 dark:text-green-300 mt-1">
                                    --
                                </div>
                            </div>
                            <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
                                <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400">
                                    <Clock className="h-4 w-4" />
                                    <span className="text-xs font-medium">Pending Bills</span>
                                </div>
                                <div className="text-lg font-bold text-amber-700 dark:text-amber-300 mt-1">
                                    --
                                </div>
                            </div>
                        </div>
                    </>
                )}
            </CardContent>
        </Card>
    );
}
