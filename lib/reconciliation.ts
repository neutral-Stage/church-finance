import { Transaction, BankStatementItem } from '@/types/database';

export interface MatchSuggestion {
    statementItem: BankStatementItem;
    possibleMatches: Transaction[];
    matchType: 'exact' | 'likely' | 'potential' | 'none';
}

/**
 * Auto-matches statement items against system transactions.
 * 
 * Rules:
 * 1. Exact Match: Amount == Amount AND Date == Date
 * 2. Likely Match: Amount == Amount AND Date +/- 3 days
 * 3. Potential Match: Amount == Amount OR (Date matches AND fuzzy description match)
 */
export function autoMatchItems(
    statementItems: BankStatementItem[],
    transactions: Transaction[]
): MatchSuggestion[] {
    return statementItems.map(item => {
        const itemDate = new Date(item.transaction_date);

        // Filter transactions that are already matched? (Ideally we filter these out before passing in, but we can do it here too if we had that info)
        // For now, we assume 'transactions' are candidates.

        // 1. Exact Matches
        const exactMatches = transactions.filter(t =>
            Number(t.amount) === Number(item.amount) &&
            t.transaction_date === item.transaction_date &&
            // Check direction: Income in statement (positive) implies Income in system
            // Expense (negative in statement usually, but we store absolute values? Need to handle signs)
            // Assuming statement items are absolute values and we need to infer type, OR we rely on amounts matching.
            // Let's assume amounts are absolute for now and we match based on magnitude.
            true
        );

        if (exactMatches.length > 0) {
            return { statementItem: item, possibleMatches: exactMatches, matchType: 'exact' };
        }

        // 2. Likely Matches (+/- 3 days)
        const likelyMatches = transactions.filter(t => {
            if (Number(t.amount) !== Number(item.amount)) return false;

            const transDate = new Date(t.transaction_date);
            const diffTime = Math.abs(transDate.getTime() - itemDate.getTime());
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

            return diffDays <= 3;
        });

        if (likelyMatches.length > 0) {
            return { statementItem: item, possibleMatches: likelyMatches, matchType: 'likely' };
        }

        // 3. Potential Matches (Same amount, further date OR Same date, slightly different amount?)
        // Let's stick to Amount match but wide date window (e.g. 7 days), or description fuzzy match logic could go here.
        const potentialMatches = transactions.filter(t => {
            if (Number(t.amount) === Number(item.amount)) {
                // Wide date window
                const transDate = new Date(t.transaction_date);
                const diffTime = Math.abs(transDate.getTime() - itemDate.getTime());
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                return diffDays <= 10;
            }
            return false;
        });

        if (potentialMatches.length > 0) {
            return { statementItem: item, possibleMatches: potentialMatches, matchType: 'potential' };
        }

        return { statementItem: item, possibleMatches: [], matchType: 'none' };
    });
}
