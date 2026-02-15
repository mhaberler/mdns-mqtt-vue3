---
name: fixNullableTypePersistence
description: Debug and fix persistence bugs caused by nullable type defaults in serialization utilities
argument-hint: persistence utility file path, affected data type
---

Debug and fix persistence/serialization bugs where nullable type defaults break deserialization logic.

**Common symptom:**
Data saves correctly but doesn't load/deserialize properly after restart, with nullable object references (`null` as defaultValue but object as runtime value).

**Investigation steps:**

1. **Identify the persistence mechanism**
   - Locate the utility/composable handling save/load
   - Check how it determines serialization format (JSON vs primitives)
   - Find type-checking conditions for serialization/deserialization

2. **Look for nullable type bugs in deserialization logic**
   - Check conditions like `typeof defaultValue === 'object' && defaultValue !== null`
   - Null defaults fail this check, even though runtime values are objects
   - This causes JSON strings to be assigned raw instead of parsed

3. **Check watch/reactivity depth settings**
   - If using `typeof defaultValue` to set deep watch
   - Nullable defaults may disable deep watching even when values are objects
   - Nested property changes won't trigger persistence

4. **Verify serialization path vs deserialization path**
   - Saving may correctly detect object values with `typeof data.value === 'object'`
   - Loading may incorrectly check `typeof defaultValue` instead
   - This asymmetry causes data loss

**Fix pattern:**

Replace type detection based on `defaultValue` with:

**Option A: Automatic format detection**
```typescript
// Try JSON parse for all stored values
try {
  data.value = JSON.parse(storedValue) as T;
} catch (e) {
  // Fall back to type coercion only if JSON parse fails
  if (typeof defaultValue === 'number') {
    data.value = Number(storedValue) as T;
  } else if (typeof defaultValue === 'boolean') {
    data.value = (storedValue === 'true') as T;
  } else {
    data.value = storedValue as T;
  }
}
```

**Option B: Runtime type detection**
```typescript
// Check current value type, not defaultValue type
if (typeof data.value === 'object' && data.value !== null) {
  // Handle as JSON
}
```

**Option C: Type metadata**
```typescript
// Store type information alongside data
await storage.set(key, { type: 'object', value: JSON.stringify(data) });
```

**Watch depth fix:**
```typescript
// Always use deep watch, or check runtime value
watch(data, saveData, { deep: true })
// OR
watch(data, saveData, {
  deep: typeof data.value === 'object' && data.value !== null
})
```

**Test cases to verify:**

1. **Nullable object ref:**
   - Default: `null`
   - Runtime: `{ prop: 'value' }`
   - Must: serialize as JSON, deserialize as object

2. **Nested object changes:**
   - Modify deep property: `obj.nested.field = 'new'`
   - Must: trigger save with deep watch

3. **Null assignments:**
   - Set value back to `null`
   - Must: handle null serialization/deserialization

4. **Type transitions:**
   - Start null → assign object → reload
   - Must: preserve object across restarts

5. **Invalid JSON:**
   - Corrupted storage value
   - Must: fall back to default gracefully

**Common locations for this bug:**
- Generic persistence utilities/composables
- LocalStorage/AsyncStorage wrappers
- State management persistence plugins
- Serialization middleware
- Cache implementations

**Prevention:**
- Use runtime type checks (`typeof data.value`) over design-time checks (`typeof defaultValue`)
- Attempt deserialize-then-fallback rather than conditional deserialization
- Test with nullable object references explicitly
- Document supported type patterns clearly
