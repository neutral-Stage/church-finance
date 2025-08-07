# Church Finance Management System

A comprehensive Church Finance Management System built with Next.js, Supabase, and TypeScript. This application provides churches with a complete solution for managing their finances, including fund management, transaction tracking, member contributions, and financial reporting.

## 🌟 Features

### 💰 Financial Management
- **Fund Management**: Create and manage multiple funds (General, Building, Missions, etc.)
- **Transaction Tracking**: Record income and expenses with detailed categorization
- **Member Contributions**: Track individual member donations and contributions
- **Bill Management**: Manage recurring bills and payment schedules
- **Advance Payments**: Handle advance payments to members and vendors

### 📊 Reporting & Analytics
- **Financial Dashboard**: Real-time overview of church finances
- **Monthly Reports**: Detailed financial reports by month and fund
- **Fund Summaries**: Current balances and transaction history for each fund
- **Member Contribution Reports**: Individual and aggregate contribution tracking

### 🔐 Security & Access Control
- **Role-based Authentication**: Admin, Treasurer, and Viewer roles
- **Secure Database**: Supabase with Row Level Security (RLS)
- **Environment-based Configuration**: Secure handling of sensitive data

### 🎨 User Experience
- **Responsive Design**: Works seamlessly on desktop and mobile devices
- **Modern UI**: Built with Tailwind CSS and shadcn/ui components
- **Real-time Updates**: Live data synchronization across all users
- **Intuitive Navigation**: Easy-to-use interface for all user levels

## 🚀 Tech Stack

- **Frontend**: Next.js 14 with App Router, TypeScript, Tailwind CSS
- **Backend**: Supabase (PostgreSQL database, Authentication, Real-time subscriptions)
- **UI Components**: shadcn/ui, Lucide React icons
- **Deployment**: Vercel (optimized for Next.js)
- **Package Manager**: pnpm

## 📋 Prerequisites

- Node.js 18+ 
- pnpm (recommended) or npm
- Supabase account
- Vercel account (for deployment)

## 🛠️ Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/YOUR_USERNAME/church-finance-management.git
   cd church-finance-management
   ```

2. **Install dependencies**
   ```bash
   pnpm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env.local
   ```
   
   Fill in your Supabase credentials:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
   NEXTAUTH_SECRET=your_nextauth_secret
   NEXTAUTH_URL=http://localhost:3000
   ```

4. **Set up the database**
   - Run the SQL migrations in the `supabase/migrations/` folder in your Supabase dashboard
   - Or use the Supabase CLI to apply migrations

5. **Run the development server**
   ```bash
   pnpm dev
   ```

6. **Set up demo data (optional)**
   ```bash
   npm run setup-demo
   ```

## 🗄️ Database Schema

The application uses the following main tables:
- `funds` - Church funds (General, Building, Missions, etc.)
- `transactions` - All financial transactions
- `members` - Church member information
- `bills` - Recurring bills and payments
- `advances` - Advance payments tracking
- `offerings` - Special offerings and collections

## 🚀 Deployment

### Vercel (Recommended)

1. **Push to GitHub**
   ```bash
   git add .
   git commit -m "Initial commit"
   git push origin main
   ```

2. **Deploy to Vercel**
   - Connect your GitHub repository to Vercel
   - Set environment variables in Vercel dashboard
   - Deploy automatically on every push

### Manual Deployment

See `DEPLOYMENT.md` for detailed deployment instructions for various platforms.

## 📖 Usage

### Getting Started
1. **Admin Setup**: Create an admin account and set up initial funds
2. **Member Management**: Add church members to the system
3. **Transaction Recording**: Start recording income and expenses
4. **Report Generation**: Use the dashboard and reports for financial insights

### User Roles
- **Admin**: Full access to all features and settings
- **Treasurer**: Can manage transactions, bills, and view reports
- **Viewer**: Read-only access to reports and summaries

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

For support and questions:
- Check the `DEMO_SETUP.md` for setup instructions
- Review the `DEPLOYMENT.md` for deployment help
- Open an issue on GitHub for bugs or feature requests

## 🙏 Acknowledgments

- Built with [Next.js](https://nextjs.org/)
- Database and authentication by [Supabase](https://supabase.com/)
- UI components from [shadcn/ui](https://ui.shadcn.com/)
- Icons by [Lucide](https://lucide.dev/)

---

**Made with ❤️ for church communities**
