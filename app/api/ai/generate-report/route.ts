// AI Report Generation API Route - Generate narrative financial reports
import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase-server';
import { GoogleGenerativeAI } from '@google/generative-ai';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60; // Allow up to 60 seconds for report generation

interface ReportData {
    transactions: Array<{
        id: string;
        type: string;
        amount: number;
        category: string;
        description: string;
        transaction_date: string;
        fund?: { name: string } | null;
    }>;
    offerings: Array<{
        id: string;
        type: string;
        amount: number;
        service_date: string;
        notes?: string | null;
    }>;
    bills: Array<{
        id: string;
        vendor_name: string;
        amount: number;
        status: string | null;
        due_date: string;
        category?: string | null;
    }>;
    advances: Array<{
        id: string;
        recipient_name: string;
        amount: number;
        amount_returned: number | null;
        status: string | null;
        advance_date: string;
    }>;
    funds: Array<{
        id: string;
        name: string;
        current_balance: number | null;
        description?: string | null;
    }>;
}

interface NarrativeReport {
    executiveSummary: string;
    incomeAnalysis: string;
    expenseAnalysis: string;
    fundPerformance: string;
    trendsAndInsights: string;
    recommendations: string;
    generatedAt: string;
}

function buildReportPrompt(data: ReportData, dateRange: { startDate: string; endDate: string }): string {
    // Calculate financial metrics
    const totalIncome = data.transactions
        .filter(t => t.type === 'income')
        .reduce((sum, t) => sum + t.amount, 0);

    const totalExpenses = data.transactions
        .filter(t => t.type === 'expense')
        .reduce((sum, t) => sum + t.amount, 0);

    const netIncome = totalIncome - totalExpenses;

    const totalOfferings = data.offerings.reduce((sum, o) => sum + o.amount, 0);

    const paidBills = data.bills.filter(b => b.status === 'paid');
    const pendingBills = data.bills.filter(b => b.status === 'pending');
    const overdueBills = data.bills.filter(b => b.status === 'overdue');

    const outstandingAdvances = data.advances.filter(a => a.status !== 'returned');
    const totalAdvanceBalance = outstandingAdvances.reduce(
        (sum, a) => sum + (a.amount - (a.amount_returned || 0)),
        0
    );

    // Group transactions by category
    const incomeByCategory = data.transactions
        .filter(t => t.type === 'income')
        .reduce((acc, t) => {
            acc[t.category || 'Uncategorized'] = (acc[t.category || 'Uncategorized'] || 0) + t.amount;
            return acc;
        }, {} as Record<string, number>);

    const expensesByCategory = data.transactions
        .filter(t => t.type === 'expense')
        .reduce((acc, t) => {
            acc[t.category || 'Uncategorized'] = (acc[t.category || 'Uncategorized'] || 0) + t.amount;
            return acc;
        }, {} as Record<string, number>);

    // Offerings by type
    const offeringsByType = data.offerings.reduce((acc, o) => {
        acc[o.type || 'General'] = (acc[o.type || 'General'] || 0) + o.amount;
        return acc;
    }, {} as Record<string, number>);

    return `You are a professional church financial analyst. Generate a detailed narrative financial report for the period ${dateRange.startDate} to ${dateRange.endDate}.

FINANCIAL DATA:
===============

INCOME SUMMARY:
- Total Income: ৳${totalIncome.toLocaleString()}
- Total Offerings: ৳${totalOfferings.toLocaleString()}
- Net Income (after expenses): ৳${netIncome.toLocaleString()}
- Income by Category: ${JSON.stringify(incomeByCategory)}
- Number of income transactions: ${data.transactions.filter(t => t.type === 'income').length}

EXPENSE SUMMARY:
- Total Expenses: ৳${totalExpenses.toLocaleString()}
- Expenses by Category: ${JSON.stringify(expensesByCategory)}
- Number of expense transactions: ${data.transactions.filter(t => t.type === 'expense').length}

OFFERINGS BREAKDOWN:
- Total Offerings: ৳${totalOfferings.toLocaleString()}
- By Type: ${JSON.stringify(offeringsByType)}
- Number of offerings: ${data.offerings.length}

BILLS STATUS:
- Paid Bills: ${paidBills.length} (Total: ৳${paidBills.reduce((s, b) => s + b.amount, 0).toLocaleString()})
- Pending Bills: ${pendingBills.length} (Total: ৳${pendingBills.reduce((s, b) => s + b.amount, 0).toLocaleString()})
- Overdue Bills: ${overdueBills.length} (Total: ৳${overdueBills.reduce((s, b) => s + b.amount, 0).toLocaleString()})

ADVANCES:
- Outstanding Advances: ${outstandingAdvances.length}
- Total Outstanding Balance: ৳${totalAdvanceBalance.toLocaleString()}

FUND BALANCES:
${data.funds.map(f => `- ${f.name}: ৳${(f.current_balance || 0).toLocaleString()}`).join('\n')}

Generate a professional narrative report with the following sections. Each section should be 2-3 paragraphs with specific insights:

1. EXECUTIVE SUMMARY - High-level overview of financial health
2. INCOME ANALYSIS - Detailed breakdown of income sources and trends
3. EXPENSE ANALYSIS - Review of spending patterns and efficiency
4. FUND PERFORMANCE - Status of each fund and allocation effectiveness
5. TRENDS AND INSIGHTS - Patterns, comparisons, and observations
6. RECOMMENDATIONS - Actionable suggestions for improvement

Format your response as JSON with these exact keys:
{
    "executiveSummary": "...",
    "incomeAnalysis": "...",
    "expenseAnalysis": "...",
    "fundPerformance": "...",
    "trendsAndInsights": "...",
    "recommendations": "..."
}`;
}

export async function POST(request: NextRequest) {
    try {
        // Get authenticated user
        const supabase = await createServerClient();
        const { data: { user }, error: authError } = await supabase.auth.getUser();

        if (authError || !user) {
            return NextResponse.json(
                { error: 'Unauthorized' },
                { status: 401 }
            );
        }

        // Parse request body
        const body = await request.json();
        const { data, dateRange, churchId } = body as {
            data: ReportData;
            dateRange: { startDate: string; endDate: string };
            churchId: string;
        };

        if (!data || !dateRange || !churchId) {
            return NextResponse.json(
                { error: 'Report data, date range, and church ID are required' },
                { status: 400 }
            );
        }

        // Verify user has access to this church
        const { data: userRole, error: roleError } = await supabase
            .from('user_church_roles')
            .select('role_id')
            .eq('user_id', user.id)
            .eq('church_id', churchId)
            .eq('is_active', true)
            .single();

        if (roleError || !userRole) {
            return NextResponse.json(
                { error: 'You do not have access to this church' },
                { status: 403 }
            );
        }

        // Initialize Gemini
        const apiKey = process.env.GOOGLE_AI_API_KEY;
        if (!apiKey) {
            return NextResponse.json(
                { error: 'AI service not configured' },
                { status: 500 }
            );
        }

        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({
            model: 'gemini-1.5-flash',
            generationConfig: {
                temperature: 0.7,
                maxOutputTokens: 4096,
            }
        });

        // Build prompt and generate report
        const prompt = buildReportPrompt(data, dateRange);

        const result = await model.generateContent(prompt);
        const response = result.response;
        const text = response.text();

        // Parse JSON response
        let reportContent: Omit<NarrativeReport, 'generatedAt'>;
        try {
            // Extract JSON from response (handle markdown code blocks)
            const jsonMatch = text.match(/\{[\s\S]*\}/);
            if (!jsonMatch) {
                throw new Error('No JSON found in response');
            }
            reportContent = JSON.parse(jsonMatch[0]);
        } catch (parseError) {
            console.error('Failed to parse AI response:', text);
            // Fallback: create structured response from raw text
            reportContent = {
                executiveSummary: text.substring(0, 500),
                incomeAnalysis: 'Unable to parse detailed analysis.',
                expenseAnalysis: 'Unable to parse detailed analysis.',
                fundPerformance: 'Unable to parse detailed analysis.',
                trendsAndInsights: 'Unable to parse detailed analysis.',
                recommendations: 'Please regenerate the report for full analysis.'
            };
        }

        const narrativeReport: NarrativeReport = {
            ...reportContent,
            generatedAt: new Date().toISOString()
        };

        return NextResponse.json(narrativeReport);

    } catch (error) {
        console.error('Error generating report:', error);
        return NextResponse.json(
            { error: 'Failed to generate report. Please try again.' },
            { status: 500 }
        );
    }
}
