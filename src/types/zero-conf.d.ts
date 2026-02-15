declare module '@mhaberler/capacitor-zeroconf-nsd' {
  export interface ZeroConfService {
    name?: string
    type?: string
    hostname?: string
    port?: number
    ipv4Addresses?: string[]
    ipv6Addresses?: string[]
    txtRecord?: Record<string, any>
    domain?: string
  }

  export type ZeroConfAction = 'added' | 'resolved' | 'removed'

  export function watch(
    opts: { type: string; domain?: string; addressFamily?: string },
    callback: (arg: { action: ZeroConfAction; service: ZeroConfService } | null) => void
  ): Promise<void>

  export function unwatch(opts: { type: string; domain?: string }): void

  export const ZeroConf: {
    watch: typeof watch
    unwatch: typeof unwatch
  }

  export default ZeroConf
}
