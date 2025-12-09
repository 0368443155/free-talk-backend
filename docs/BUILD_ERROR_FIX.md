# Quick Fix for Build Error

## Error:
```
Type error: Object is possibly 'null'.
Line 529: if (this.socket.connected) {
```

## Fix:

**File:** `services/p2p/core/p2p-media-manager.ts`

**Line 529:** Change from:
```typescript
if (this.socket.connected) {
```

**To:**
```typescript
if (this.socket && this.socket.connected) {
```

## Full Context (lines 526-534):

```typescript
this.onSocketEvent('media:user-muted', handleStateUpdate);

// Request latest state (only if socket is connected)
if (this.socket && this.socket.connected) {  // ✅ ADD: && this.socket
  this.emitSocketEvent('room:request-participant-state', { userId: this.userId });
} else {
  clearTimeout(timeout);
  resolve();
}
```

## Why:
TypeScript strict null checks require explicit null check before accessing properties.
Line 474 already has this pattern: `if (!this.socket || !this.socket.connected)`

## Apply Fix:
1. Open `services/p2p/core/p2p-media-manager.ts`
2. Go to line 529
3. Change `if (this.socket.connected)` to `if (this.socket && this.socket.connected)`
4. Save
5. Run `npm run build` again

---

**Status:** Manual fix required (1 line change)
