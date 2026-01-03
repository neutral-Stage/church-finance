const fs = require('fs');
const { execSync } = require('child_process');

try {
    const log = fs.readFileSync('push_error_final.log', 'utf8');
    // Look for the "Remote migration versions not found..." section and the list following it/migration repair suggestion
    // The log usually lists them or suggests: "supabase migration repair --status reverted ver1 ver2 ..."

    // Let's try to match the suggestion line first
    const repairMatch = log.match(/supabase migration repair --status reverted\s+([0-9\s]+)/);

    let versions = [];
    if (repairMatch) {
        versions = repairMatch[1].trim().split(/\s+/);
    } else {
        // Fallback: finding "Remote migration versions not found" and grabbing numbers
        // This is harder to parse robustly from truncated CLI output, but usually the suggestion line is present.
        console.log("Could not find repair suggestion in log. Printing log for inspection:");
        console.log(log);
        process.exit(1);
    }

    console.log(`Found ${versions.length} versions to revert:`, versions);

    for (const ver of versions) {
        if (!ver) continue;
        console.log(`Reverting ${ver}...`);
        try {
            execSync(`npx supabase migration repair --status reverted ${ver}`, { stdio: 'inherit' });
        } catch (e) {
            console.error(`Failed to revert ${ver}`, e);
        }
    }

    console.log("History repair complete.");

} catch (err) {
    console.error(err);
}
