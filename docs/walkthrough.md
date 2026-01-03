# AI Integration Walkthrough

## Summary
The Church Finance application now features a comprehensive AI suite including an interactive chat assistant, voice commands, semantic search, and an intelligent receipt scanner.

## Key Features

### 1. AI Chat Assistant
Located in the bottom-right corner of the dashboard, the chat assistant can:
- **Answer Questions**: "What is the balance of the Missions fund?"
- **Analyze Trends**: "Show me income vs expenses for last month."
- **Find Data**: "Find the transaction for 'Piano repair'."
- **Create Records**: "Log an offering of $500 from John Doe for General Fund." (User confirmation required)

### 2. Voice Input
Click the microphone icon 🎙️ in the chat to speak your commands naturally.

### 3. AI Receipt Scanner 📸 (New!)
Automatically extract details from receipt images to fill out transaction forms.
**How to use:**
1. Go to **Transactions** or **Bills** page.
2. Click **Add Transaction** or **Add Bill**.
3. Click the **Scan Receipt** button.
4. Upload an image of your receipt.
5. Watch as the Date, Vendor, Amount, and Category are automatically filled in!
6. Review the details and save.

## Technical Architecture

### AI Service Layer
- **Providers**: Configurable support for Groq (Llama 3) and Google Gemini.
- **Vision**: Uses Gemini 1.5 Flash for high-speed image analysis (Receipts).
- **Embeddings**: Uses Gemini text-embedding-004 for semantic search.

### Database
- **Supabase**: PostgreSQL database.
- **pgvector**: Vector extension for semantic search capabilities.
- **RLS**: Row-Level Security ensures data privacy per church.

## Configuration
Ensure your `.env.local` has valid keys:
```env
AI_PROVIDER=groq
GROQ_API_KEY=...
GOOGLE_AI_API_KEY=... (Required for Vision & Embeddings)
```
