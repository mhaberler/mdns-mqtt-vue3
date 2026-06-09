<template>
  <div class="w-full min-h-screen p-3 md:p-6 bg-gray-50">
    <!-- Header row: title + refresh -->
    <div class="flex items-center justify-between mb-3">
      <h1 class="text-lg font-bold text-gray-800">Local Hosts</h1>
      <div class="flex items-center gap-2">
        <button
          v-if="isCapacitorApp"
          @click="refreshScan"
          :disabled="isRefreshing"
          class="btn text-sm py-1.5 px-3 btn-success">
          {{ isRefreshing ? 'Refreshing…' : 'Refresh' }}
        </button>
        <span v-else class="text-[10px] text-amber-600 bg-amber-50 px-2 py-1 rounded border border-amber-200">
          mDNS: native only
        </span>
      </div>
    </div>

    <!-- Host list -->
    <div class="space-y-1">
      <div v-for="host in hostList" :key="host.host" class="broker-row">
        <div class="flex flex-col gap-1 flex-1 min-w-0">
          <div class="flex items-center gap-2">
            <span class="w-1.5 h-1.5 rounded-full flex-shrink-0 bg-success"></span>
            <span class="font-semibold text-sm text-gray-800 truncate">{{ host.host }}</span>
            <span v-if="host.serviceTypes.length" class="text-[10px] text-gray-400 flex-shrink-0">
              {{ host.serviceTypes.length }} service{{ host.serviceTypes.length === 1 ? '' : 's' }}
            </span>
          </div>
          <div v-if="allAddresses(host).length" class="text-[10px] text-gray-400 font-mono pl-3.5 truncate">
            {{ allAddresses(host).join(', ') }}
          </div>
          <div v-if="host.serviceTypes.length" class="flex flex-wrap gap-1 pl-3.5">
            <span v-for="t in host.serviceTypes" :key="t"
              class="bg-gray-100 px-1.5 py-0.5 rounded text-[10px] text-gray-500">{{ t }}</span>
          </div>
        </div>
        <div class="flex gap-1 flex-shrink-0">
          <button @click="copyHost(host.host)" class="btn-icon text-primary" title="Copy hostname">
            <svg v-if="copiedHost !== host.host" class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"/></svg>
            <svg v-else class="w-4 h-4 text-success" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg>
          </button>
        </div>
      </div>

      <!-- Empty state -->
      <div v-if="hostList.length === 0" class="py-8 text-center text-gray-400 text-sm">
        <p v-if="isCapacitorApp">Scanning for local hosts…</p>
        <p v-else>Host discovery uses mDNS and works on native (iOS/Android) only.</p>
        <p class="text-xs mt-1">Hosts answering <span class="font-mono">foo.local</span> that advertise a common service (http, ssh, workstation, …) appear here.</p>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, ref, computed } from 'vue'
import { Capacitor } from '@capacitor/core'
import { useHostDiscovery, type HostEntry } from '../composables/useHostDiscovery'

export default defineComponent({
  name: 'HostsView',
  setup() {
    const isCapacitorApp = ref<boolean>(Capacitor.isNativePlatform())
    const { discoveredHosts, refresh } = useHostDiscovery()
    const isRefreshing = ref<boolean>(false)
    const copiedHost = ref<string | null>(null)

    const hostList = computed(() =>
      Object.values(discoveredHosts.value).sort((a, b) => a.host.localeCompare(b.host))
    )

    const allAddresses = (host: HostEntry): string[] =>
      [...host.ipv4Addresses, ...host.ipv6Addresses]

    const refreshScan = async () => {
      if (isRefreshing.value) return
      isRefreshing.value = true
      await refresh()
      setTimeout(() => { isRefreshing.value = false }, 800)
    }

    const copyHost = async (host: string) => {
      try {
        await navigator.clipboard.writeText(host)
        copiedHost.value = host
        setTimeout(() => { if (copiedHost.value === host) copiedHost.value = null }, 1500)
      } catch (_) { /* clipboard unavailable */ }
    }

    return {
      isCapacitorApp,
      isRefreshing,
      copiedHost,
      hostList,
      allAddresses,
      refreshScan,
      copyHost
    }
  }
})
</script>

<style scoped>
@reference "../style.css";

.broker-row {
  @apply flex items-center justify-between gap-2 px-3 py-2 bg-white rounded-lg border border-gray-100 transition-colors;
}
.broker-row:hover {
  border-color: rgba(33, 150, 243, 0.2);
}
.btn-icon {
  @apply w-8 h-8 flex items-center justify-center rounded-full transition-colors;
  min-width: 32px;
  min-height: 32px;
}
.btn-icon:hover {
  background-color: #f3f4f6;
}
</style>
