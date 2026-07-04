<template>
  <div class="relative">
    <div class="flex">
      <input :value="modelValue" :placeholder="placeholder"
             class="flex-1 min-w-0 border border-gray-300 rounded-l px-2 py-1 text-sm font-mono text-gray-900"
             :class="error ? 'border-error' : ''"
             @input="onInput"
             @focus="open = true"
             @blur="onBlur" />
      <button type="button" tabindex="-1"
              class="border border-l-0 border-gray-300 rounded-r px-2 bg-gray-100 text-gray-500 text-xs"
              :class="error ? 'border-error' : ''"
              @pointerdown.prevent="toggle">
        ▾
      </button>
    </div>
    <div v-if="open && filtered.length"
         class="absolute z-50 left-0 right-0 mt-0.5 max-h-52 overflow-y-auto bg-white border border-gray-300 rounded shadow-lg">
      <button v-for="option in filtered" :key="option" type="button"
              class="block w-full text-left px-3 py-2 text-sm font-mono text-gray-900 hover:bg-gray-100 active:bg-gray-200 border-b border-gray-100 last:border-b-0"
              @pointerdown.prevent="select(option)">
        {{ option }}
      </button>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, ref, computed, type PropType } from 'vue'

/** Text input + dropdown of suggestions. Free text always allowed; the list
 *  filters on the current text and is fully tappable on mobile (native
 *  <datalist> is near-unusable in the Android WebView). */
export default defineComponent({
  name: 'ComboInput',
  props: {
    modelValue: { type: String, default: '' },
    options: { type: Array as PropType<string[]>, default: () => [] },
    placeholder: { type: String, default: '' },
    error: { type: Boolean, default: false }
  },
  emits: ['update:modelValue'],
  setup(props, { emit }) {
    const open = ref(false)

    const filtered = computed(() => {
      const text = props.modelValue.trim().toLowerCase()
      if (!text) return props.options
      const matches = props.options.filter(o => o.toLowerCase().includes(text))
      // nothing matches → current text is free-form; offer the full list
      if (matches.length === 0) return props.options
      // exact-only match → user already picked it; show full list on reopen
      if (matches.length === 1 && matches[0].toLowerCase() === text) return props.options
      return matches
    })

    function onInput(event: Event) {
      emit('update:modelValue', (event.target as HTMLInputElement).value)
      open.value = true
    }

    function select(option: string) {
      emit('update:modelValue', option)
      open.value = false
    }

    function toggle() {
      open.value = !open.value
    }

    function onBlur() {
      // delay so a pointerdown on an option wins the race
      setTimeout(() => { open.value = false }, 150)
    }

    return { open, filtered, onInput, select, toggle, onBlur }
  }
})
</script>
