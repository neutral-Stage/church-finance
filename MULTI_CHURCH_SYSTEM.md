# Multi-Church Finance Management System

## Overview

This system has been enhanced to support multiple churches, fellowships, and ministries with comprehensive role-based access control. Users can now manage finances for multiple organizations based on their assigned roles and permissions.

## Key Features Implemented

### 1. Multi-Organization Support
- **Churches**: Full church organizations with complete financial management
- **Fellowships**: Smaller groups with focused financial tracking
- **Ministries**: Specialized organizations for specific purposes

### 2. Enhanced Role-Based Access Control (RBAC)
- **Super Admin**: Full system access across all organizations
- **Church Admin**: Complete access to assigned churches
- **Treasurer**: Financial management for assigned churches
- **Finance Viewer**: Read-only access to financial data
- **Member**: Basic member access
- **Custom Roles**: Admins can create custom roles with specific permissions

### 3. Fund Management per Organization
- Each church can have multiple custom funds
- Fund types: General, Building, Mission, Emergency, etc.
- Separate fund balances and tracking per organization

## Database Schema Changes

### New Tables

#### `churches`
```sql
- id (UUID, Primary Key)
- name (VARCHAR, Organization name)
- type (ENUM: 'church', 'fellowship', 'ministry')
- description (TEXT, Optional description)
- address (TEXT, Physical address)
- phone (VARCHAR, Contact phone)
- email (VARCHAR, Contact email)
- website (VARCHAR, Organization website)
- established_date (DATE, When organization was established)
- is_active (BOOLEAN, Active status)
- settings (JSONB, Custom settings)
- created_by (UUID, Creator user ID)
- created_at (TIMESTAMP)
- updated_at (TIMESTAMP)
```

#### `roles`
```sql
- id (UUID, Primary Key)
- name (VARCHAR, System role name)
- display_name (VARCHAR, Human-readable name)
- description (TEXT, Role description)
- permissions (JSONB, Detailed permissions)
- is_system_role (BOOLEAN, System-defined role)
- is_active (BOOLEAN, Active status)
- created_at (TIMESTAMP)
- updated_at (TIMESTAMP)
```

#### `user_church_roles`
```sql
- id (UUID, Primary Key)
- user_id (UUID, References auth.users)
- church_id (UUID, References churches)
- role_id (UUID, References roles)
- granted_by (UUID, Who granted the role)
- granted_at (TIMESTAMP, When role was granted)
- is_active (BOOLEAN, Active status)
- expires_at (TIMESTAMP, Optional expiration)
- notes (TEXT, Additional notes)
- created_at (TIMESTAMP)
- updated_at (TIMESTAMP)
```

### Modified Tables

#### `funds`
- Added `church_id` (UUID, References churches)
- Added `fund_type` (VARCHAR, Type of fund)
- Added `is_active` (BOOLEAN, Active status)
- Added `updated_at` (TIMESTAMP)
- Modified `name` to allow custom fund names (VARCHAR(255))

## API Endpoints

### Church Management
- `GET /api/churches` - List user's accessible churches
- `POST /api/churches` - Create new church (Super Admin only)
- `GET /api/churches/[id]` - Get church details
- `PUT /api/churches/[id]` - Update church
- `DELETE /api/churches/[id]` - Delete church (Super Admin only)

### Fund Management per Church
- `GET /api/churches/[id]/funds` - List church funds
- `POST /api/churches/[id]/funds` - Create new fund for church

### Role Management
- `GET /api/roles` - List all roles
- `POST /api/roles` - Create custom role (Super Admin only)

### User Role Assignment
- `GET /api/user-church-roles?church_id=<id>` - List user roles for church
- `POST /api/user-church-roles` - Grant role to user
- `PUT /api/user-church-roles` - Update user role (activate/deactivate)

### Admin User Management
- `GET /api/admin/users` - List all users with their church roles

## Permission System

### Permission Structure
```typescript
interface ChurchPermissions {
  churches?: { create?: boolean, read?: boolean, update?: boolean, delete?: boolean }
  users?: { create?: boolean, read?: boolean, update?: boolean, delete?: boolean }
  roles?: { create?: boolean, read?: boolean, update?: boolean, delete?: boolean }
  funds?: { create?: boolean, read?: boolean, update?: boolean, delete?: boolean }
  transactions?: { create?: boolean, read?: boolean, update?: boolean, delete?: boolean }
  offerings?: { create?: boolean, read?: boolean, update?: boolean, delete?: boolean }
  bills?: { create?: boolean, read?: boolean, update?: boolean, delete?: boolean }
  advances?: { create?: boolean, read?: boolean, update?: boolean, delete?: boolean }
  reports?: { create?: boolean, read?: boolean, update?: boolean, delete?: boolean }
  members?: { create?: boolean, read?: boolean, update?: boolean, delete?: boolean }
}
```

### Row Level Security (RLS)
- All tables have RLS enabled
- Users can only access data from churches they have roles in
- Super admins can access all data
- Permissions are checked at the database level

## UI Components

### New Pages
- `/admin/churches` - Church management (Super Admin)
- `/admin/roles` - Role management (Super Admin)
- `/admin/users` - User role assignment (Admins)

### New Components
- `ChurchSelector` - Multi-church selection component
- Enhanced authentication with church context
- Role-based UI rendering

## Database Functions

### `check_user_permission(user_id, church_id, resource, action)`
Checks if a user has a specific permission for a church.

### `get_user_churches(user_id)`
Returns all churches a user has access to with their roles.

## Setup Instructions

### 1. Run Database Migration
```bash
# Apply the migration to create the multi-church system
supabase db push
```

### 2. Initialize Default Data
The migration automatically:
- Creates default system roles
- Creates a "Main Church" for existing data
- Migrates existing users to the new role system
- Updates existing funds to belong to the default church

### 3. Configure Super Admin
After migration, assign super admin role to your primary administrator:
```sql
-- Get the super admin role ID
SELECT id FROM roles WHERE name = 'super_admin';

-- Get your user ID from the users table
SELECT id FROM users WHERE email = 'your-admin-email@example.com';

-- Grant super admin role (replace with actual IDs)
INSERT INTO user_church_roles (user_id, church_id, role_id, granted_by)
SELECT 
  'your-user-id',
  (SELECT id FROM churches WHERE name = 'Main Church'),
  (SELECT id FROM roles WHERE name = 'super_admin'),
  'your-user-id';
```

## Usage Workflow

### For Super Admins
1. Create churches/fellowships/ministries
2. Create custom roles if needed
3. Assign users to churches with appropriate roles
4. Manage organization settings

### For Church Admins
1. Select church from church selector
2. Create and manage funds
3. Assign roles to users within their church
4. Manage financial transactions

### For Users
1. Select church from available churches
2. Access features based on assigned role
3. View/edit data within permission scope

## Security Features

- **Hierarchical Permissions**: Super Admin > Church Admin > Treasurer > Viewer
- **Church Isolation**: Users can only access churches they're assigned to
- **Role Expiration**: Roles can have expiration dates
- **Audit Trail**: All role grants are logged with granter information
- **Database-Level Security**: RLS policies enforce access control

## Testing the Implementation

### Prerequisites
1. Ensure Docker is running for local Supabase
2. Apply the database migration
3. Start the development server

### Test Scenarios
1. **Multi-Church Access**: Create multiple churches and test user access
2. **Role Permissions**: Test different roles and their permission levels
3. **Fund Management**: Create funds in different churches
4. **User Management**: Grant and revoke roles for different users
5. **Church Switching**: Test the church selector functionality

### Sample Test Data
```sql
-- Create test churches
INSERT INTO churches (name, type, description) VALUES 
  ('Grace Community Church', 'church', 'Main community church'),
  ('Youth Fellowship', 'fellowship', 'Young adults fellowship'),
  ('Missions Ministry', 'ministry', 'Global missions outreach');

-- Create test funds for each church
-- (Will need church IDs from above inserts)
```

## Migration Notes

- Existing data is preserved and migrated to the "Main Church"
- All existing users maintain their current access through the new role system
- Fund structure remains compatible with existing transactions
- UI components are backward compatible

## Future Enhancements

- Multi-tenant reporting across churches
- Church-to-church fund transfers
- Consolidated financial reporting
- Church hierarchy support (parent/child churches)
- Advanced permission granularity
- Church-specific customizations and branding

## Troubleshooting

### Common Issues
1. **Permission Denied**: Check user has active role in selected church
2. **No Churches Available**: Ensure user has been granted access to at least one church
3. **Fund Creation Failed**: Verify user has 'funds.create' permission
4. **Migration Issues**: Check database connection and permissions

### Debug Commands
```bash
# Check Supabase status
supabase status

# View migration status
supabase db diff

# Reset local database (if needed)
supabase db reset
```