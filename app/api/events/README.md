# Events API (Not Implemented)

This directory is reserved for Event-related API endpoints.

## Planned Endpoints

- `POST /api/events` - Create new event
- `GET /api/events` - List events
- `GET /api/events/:id` - Get event details
- `PUT /api/events/:id` - Update event
- `DELETE /api/events/:id` - Delete event

## Status

🚧 Not yet implemented - placeholder directory

## Implementation Notes

When implementing:

- Use Zod validation schemas from `lib/validations/`
- Follow multi-church tenancy pattern
- Implement RLS policies in Supabase
- Add `dynamic = 'force-dynamic'` export
