# Demo Account Setup

This document explains how to set up demo accounts for the Church Finance Management App.

## Quick Setup

Run the following command to create all demo accounts:

```bash
npm run setup-demo
```

This will create three demo accounts with the following credentials:

- **Admin**: admin@church.com / admin123
- **Treasurer**: treasurer@church.com / treasurer123
- **Viewer**: viewer@church.com / viewer123

## Account Roles

### Admin
- Full access to all features
- Can manage users, transactions, and reports
- Can view and edit all financial data

### Treasurer
- Can manage transactions and financial records
- Can generate reports
- Limited user management capabilities

### Viewer
- Read-only access to financial data
- Can view reports but cannot edit
- Cannot manage transactions or users

## Manual Setup

If you need to create accounts manually:

1. Go to your Supabase project dashboard
2. Navigate to Authentication > Users
3. Click "Add user"
4. Enter the email and password
5. In the "User Metadata" section, add:
   ```json
   {
     "role": "Admin", // or "Treasurer" or "Viewer"
     "full_name": "Church Administrator" // or appropriate name
   }
   ```
6. Save the user

## Troubleshooting

### "Invalid login credentials" Error

If you see this error, it means the demo accounts haven't been created yet. Run:

```bash
npm run setup-demo
```

### Script Fails to Run

Make sure you have:
1. Supabase project properly configured
2. Environment variables set in `.env.local`
3. All dependencies installed (`npm install` or `pnpm install`)

### Accounts Already Exist

The script will detect existing accounts and skip creation. This is normal behavior.

## Security Note

⚠️ **Important**: These are demo accounts with simple passwords. In a production environment:

1. Use strong, unique passwords
2. Enable two-factor authentication
3. Regularly rotate credentials
4. Remove demo accounts before going live