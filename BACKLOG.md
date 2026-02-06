# Blisko — Backlog

Remaining work, grouped by area. Everything above this (auth, profiles, geolocation, waves, design book) is done.

---

## Chat (partial)

Schema and screens exist, but no real-time messaging yet.

- [ ] Wire up message sending through tRPC (`messages.send`)
- [ ] Implement real-time updates (polling, WebSocket, or tRPC subscriptions)
- [ ] Conversation list screen — show last message, unread count
- [ ] Chat screen — message input, scroll, timestamps

## Push Notifications (partial)

`pushTokens` table exists but no push service implementation.

- [ ] Register push tokens on app launch (`useNotifications` hook → tRPC)
- [ ] Send push on new wave received
- [ ] Send push on new message received
- [ ] Handle notification tap → deep link to wave/chat

## Avatar Upload

Schema has `avatarUrl` on profiles but no storage integration.

- [ ] Pick image from gallery
- [ ] Upload to object storage (S3, R2, or similar)
- [ ] Save URL to profile

## User Profile Modal

Route exists at `(modals)/user/[id]` but is sparse.

- [ ] Show full profile (name, bio, lookingFor, distance)
- [ ] Wave / block actions from modal

## Polish & UX

- [ ] Empty states for all lists (nearby, waves, chats)
- [ ] Error handling and retry UI
- [ ] Loading skeletons
- [ ] Onboarding flow refinements

## Beta Release

- [ ] App Store assets (icon, screenshots, description)
- [ ] EAS production build configuration
- [ ] TestFlight / internal testing distribution

## Future Ideas

- Groups / shared interests matching
- Phone number auth (alternative to magic link)
- Profile verification
- Report system
