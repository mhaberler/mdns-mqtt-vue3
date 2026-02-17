---
name: migrateToReactivePersistedState
description: Migrate manual storage getters/setters to reactive persisted composable with shared state
argument-hint: source storage module path, target composable pattern (e.g., usePersistedRef)
---

Migrate manual storage layer to reactive persisted state composable.

**Current pattern to replace:**
- Manual getter/setter function pairs for persistence
- Synchronous storage (e.g., localStorage)
- Manual watch() calls to sync reactive refs with storage
- Import storage functions in each component

**Target pattern:**
- Reactive composable using persisted refs (e.g., usePersistedRef, usePersistence)
- Asynchronous cross-platform storage (e.g., Capacitor Preferences)
- Automatic persistence via built-in watchers
- Shared app-level state via singleton composable pattern

**Implementation steps:**

1. **Research phase**
   - Read the current storage module completely (all functions, types, logic)
   - Find all import/usage sites across the codebase
   - Identify cross-component coordination requirements
   - Document timing dependencies (onMounted checks, auto-actions)
   - Note type definitions that may need extraction

2. **Create shared state composable**
   - Extract shared types from storage module
   - Create module-scope persisted refs (singleton pattern)
   - Export composable function returning shared refs
   - Use appropriate storage backend for target platform

3. **Migrate consuming components**
   - Replace storage function imports with composable import
   - Remove duplicate type definitions
   - Replace manual ref initialization with destructured composable
   - Remove manual watch statements (if auto-save is built-in)
   - Update all setter calls to direct ref value assignments

4. **Fix async initialization issues**
   - Replace onMounted checks with watch() for auto-actions
   - Use immediate:true for watches that should run on load
   - Ensure timing-dependent features wait for persisted data

5. **Ensure cross-component coordination**
   - Verify all components use shared ref instances
   - Test that state changes in one component reflect in others
   - Confirm persistence works across navigation/remounts

6. **Verification**
   - Run type-checking (e.g., vue-tsc, tsc)
   - Test auto-initialization features on slow loading
   - Verify cross-component state updates
   - Confirm persistence survives app restarts
   - Test on target platforms (web, native)

**Critical considerations:**
- **Timing**: Async storage means refs may not have values immediately in setup()
- **Shared state**: Module-scope refs create singletons; per-component refs don't share
- **Watch placement**: Use watch with immediate:true for boot-time auto-actions
- **Type safety**: Extract shared types to avoid duplication and drift

**Decision points:**
- App-level singleton vs per-component instances?
- Migrate all consumers at once vs incremental?
- Keep old storage layer temporarily for rollback?
- Which auto-actions depend on loaded persisted values?
