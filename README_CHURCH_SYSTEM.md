# Global Church Selection System

This document describes the implementation of the global church selection system that allows users to switch between churches and ensures all operations use the selected church context.

## Architecture Overview

### Components

1. **ChurchContext** (`/contexts/ChurchContext.tsx`) - Global state management for church selection
2. **ChurchProvider** - Context provider that wraps the dashboard layout
3. **HeaderChurchSelector** (`/components/header-church-selector.tsx`) - Compact church selector for the header
4. **useChurch** - Hook to access church context throughout the app
5. **useChurchApi** (`/hooks/useChurchApi.ts`) - Helper hook for church-scoped API operations

### Key Features

- **Persistent Selection**: Selected church is stored in localStorage
- **Automatic Loading**: User's available churches are fetched on app load
- **Context Propagation**: Selected church is available throughout the app
- **API Integration**: All database operations automatically include church_id
- **Loading States**: Proper loading and error handling
- **Role-based Access**: Churches are filtered by user permissions

## Implementation Details

### Church Context

The `ChurchContext` provides:
- `selectedChurch`: Currently selected church with role information
- `availableChurches`: All churches the user has access to
- `setSelectedChurch`: Function to change the selected church
- `isLoading`: Loading state
- `error`: Error state
- `refreshChurches`: Function to refresh the church list

### Header Integration

The church selector is integrated into the dashboard header at `/app/(dashboard)/layout.tsx`:

```tsx
// Header actions
<div className="flex items-center space-x-2">
  {/* Church Selector */}
  <HeaderChurchSelector className="hidden sm:flex" />

  {/* Other header items... */}
</div>
```

### Page Integration

Pages that need church context should:

1. Import the church hook:
```tsx
import { useChurch } from '@/contexts/ChurchContext'
```

2. Access the selected church:
```tsx
const { selectedChurch, isLoading } = useChurch()
```

3. Handle no church selected state:
```tsx
if (!selectedChurch) {
  return <NoChurchSelectedMessage />
}
```

4. Filter data by church_id:
```tsx
// When fetching data
const { data } = await supabase
  .from('offerings')
  .select('*')
  .eq('church_id', selectedChurch.id)
```

## Example Usage

### Basic Page Implementation

```tsx
'use client'

import { useChurch } from '@/contexts/ChurchContext'
import { useEffect, useState } from 'react'

export default function MyPage() {
  const { selectedChurch, isLoading } = useChurch()
  const [data, setData] = useState([])

  useEffect(() => {
    if (!selectedChurch) return

    // Fetch data for selected church
    fetchData()
  }, [selectedChurch])

  const fetchData = async () => {
    const { data } = await supabase
      .from('table_name')
      .select('*')
      .eq('church_id', selectedChurch.id)

    setData(data || [])
  }

  if (isLoading) return <Loading />
  if (!selectedChurch) return <NoChurchSelected />

  return (
    <div>
      <h1>Data for {selectedChurch.name}</h1>
      {/* Render data */}
    </div>
  )
}
```

### Using the Church API Hook

```tsx
import { useChurchApi } from '@/hooks/useChurchApi'

export default function MyComponent() {
  const { churchQuery, churchInsert, isChurchSelected } = useChurchApi()

  const fetchData = async () => {
    if (!isChurchSelected) return

    const { data, error } = await churchQuery('offerings')
      .select('*')
      .order('created_at', { ascending: false })
  }

  const createRecord = async (recordData) => {
    const { data, error } = await churchInsert('offerings', recordData)
    // church_id is automatically added
  }
}
```

## Database Schema Requirements

Tables that should be church-scoped must have a `church_id` column:

```sql
ALTER TABLE offerings ADD COLUMN church_id UUID REFERENCES churches(id);
ALTER TABLE funds ADD COLUMN church_id UUID REFERENCES churches(id);
ALTER TABLE transactions ADD COLUMN church_id UUID REFERENCES churches(id);
ALTER TABLE bills ADD COLUMN church_id UUID REFERENCES churches(id);
-- etc.
```

## Migration Guide

To add church context to an existing page:

1. Add the church hook:
```tsx
import { useChurch } from '@/contexts/ChurchContext'

// In component:
const { selectedChurch } = useChurch()
```

2. Update data fetching to include church_id:
```tsx
// Before
.from('table_name').select('*')

// After
.from('table_name').select('*').eq('church_id', selectedChurch?.id)
```

3. Add church_id to insert operations:
```tsx
// Before
.insert({ field1: value1 })

// After
.insert({ field1: value1, church_id: selectedChurch?.id })
```

4. Add loading/empty states:
```tsx
if (!selectedChurch) {
  return <NoChurchSelectedMessage />
}
```

## Current Status

✅ Context and provider implemented
✅ Header church selector created
✅ Dashboard layout updated with provider
✅ Offerings page updated to use church context
✅ Helper hooks created
✅ localStorage persistence working
✅ API endpoints support church filtering

## Testing

To test the church selection system:

1. Log in with a user that has access to multiple churches
2. Use the church selector in the header to switch between churches
3. Navigate to different pages and verify they show data for the selected church
4. Refresh the page and verify the church selection persists
5. Try creating/editing records and verify they're associated with the correct church

## Troubleshooting

### Common Issues

1. **No churches shown**: Check that the user has active roles in the `user_church_roles` table
2. **Data not filtering**: Ensure the table has a `church_id` column and queries include the filter
3. **Selection not persisting**: Check browser localStorage for the `selectedChurch` key
4. **API errors**: Verify the church context is available when making API calls

### Debug Mode

Add logging to see what's happening:

```tsx
const { selectedChurch, availableChurches } = useChurch()

console.log('Selected church:', selectedChurch)
console.log('Available churches:', availableChurches)
```