## Gmail Lead Engine - Complete Implementation Plan

### Phase 1: Database Schema
Create all required tables:
- `gmail_integrations` - OAuth tokens & connection state
- `email_leads` - Leads from Gmail  
- `lead_email_filters` - Keyword/rule-based filtering
- `email_reply_logs` - Reply tracking
- `lead_followups` - Follow-up scheduling
- RLS policies for all tables

### Phase 2: Edge Functions
- `gmail-oauth-start` - Initiates OAuth flow, returns Google auth URL
- `gmail-oauth-callback` - Handles OAuth callback, stores tokens
- `gmail-sync` - Fetches & filters emails, creates leads
- `gmail-reply` - Sends replies via Gmail API
- `gmail-disconnect` - Revokes access & cleans up

### Phase 3: React Hooks & Data Layer
- `useGmailIntegration` - Connection status, connect/disconnect
- `useEmailLeads` - CRUD for email leads
- `useLeadFilters` - Manage filter rules
- `useLeadFollowups` - Follow-up scheduling

### Phase 4: UI Pages & Components
- Gmail Leads page (`/gmail-leads`) - CRM inbox layout
- Gmail Settings integration section
- Email Lead Detail drawer with actions
- Filter Rules management dialog
- Follow-up scheduling UI
- Sidebar navigation update

### Phase 5: Automation & Analytics
- Scheduled sync via cron (every 5 min)
- Auto follow-up reminders
- Email lead analytics cards
