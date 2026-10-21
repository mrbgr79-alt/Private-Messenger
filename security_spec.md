# RM CHAT - Security Specification & Test Payloads

## 1. Data Invariants
1. A user profile document `/users/{userId}` can only be created and updated by the authenticated user with matching `request.auth.uid == userId`.
2. A username index `/usernames/{username}` can only be created by an authenticated user if it does not already exist, with `uid == request.auth.uid`. Usernames cannot be overwritten by other users.
3. A conversation `/conversations/{conversationId}` can only be read, created, or updated by users whose UID is included in `resource.data.participantIds` or `request.resource.data.participantIds`.
4. A message `/conversations/{conversationId}/messages/{messageId}` can only be created by a member of the conversation where `request.resource.data.senderId == request.auth.uid`.
5. Messages can only be edited or deleted by the original sender (`senderId == request.auth.uid`), or updated for read status by the recipient.
6. A call `/calls/{callId}` can only be read/updated by `callerId` or `receiverId`.
7. Ice candidates in `/calls/{callId}/candidates/{candidateId}` can only be written by participants of the parent call.
8. Blocked users and contacts subcollections can only be read or written by the owning user (`request.auth.uid == userId`).
9. User reports can be created by any authenticated user for abuse reporting, but cannot be modified or deleted by clients.

## 2. The Dirty Dozen Attack Payloads
1. **Ghost Field Profile Update**: An attacker attempts to append `role: "admin"` to `/users/{userId}`. (Blocked: strict `affectedKeys` and schema validation).
2. **Username Hijack**: Attacker tries to write over an existing `/usernames/alice` with `request.auth.uid = attackerUid`. (Blocked: `create` requires `!exists(...)` and no updates allowed).
3. **Impersonated Sender**: Attacker sends a message to `/conversations/123/messages/msg1` with `senderId: "victimUid"`. (Blocked: `senderId == request.auth.uid`).
4. **Third-Party Conversation Snooping**: Attacker attempts to `get` `/conversations/alice_bob` when neither is the attacker. (Blocked: `request.auth.uid in resource.data.participantIds`).
5. **Third-Party Message Listing**: Attacker queries messages from another user's conversation. (Blocked: parent conversation gate requires `request.auth.uid in get(...).data.participantIds`).
6. **Forged Call Session**: Attacker creates a call setting `callerId: "victimUid"`. (Blocked: `request.resource.data.callerId == request.auth.uid`).
7. **Signal Eavesdropping**: Attacker attempts to read ICE candidates from `/calls/{callId}/candidates`. (Blocked: parent call membership required).
8. **Malicious Contact Insertion**: Attacker writes to `/users/{victimId}/contacts/bob`. (Blocked: `request.auth.uid == victimId`).
9. **Tampering with Other User's Message Text**: Attacker updates message text authored by someone else. (Blocked: `resource.data.senderId == request.auth.uid`).
10. **Report Tampering**: Attacker attempts to delete or modify a report in `/reports/{reportId}`. (Blocked: `allow update, delete: if false`).
11. **Negative Timestamp / Future Spoofing**: Attacker sends artificial timestamps. (Enforced: server timestamp checks where applicable).
12. **Denial of Wallet Document ID Injection**: Attacker attempts to write a 10KB string ID. (Blocked: `isValidId(id)` limit <= 128 characters).
