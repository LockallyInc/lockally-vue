import { defineComponent, inject, provide, type InjectionKey, type PropType } from 'vue';
import { LockallyClient, type GetToken, type LockallyAuth } from '@lockally/ui-core';

const KEY: InjectionKey<LockallyClient> = Symbol('lockally');

/** Provide a Lockally client to descendant components. Call in a parent `setup()`. */
export function provideLockally(auth: LockallyAuth | LockallyClient): LockallyClient {
  const client = auth instanceof LockallyClient ? auth : new LockallyClient(auth);
  provide(KEY, client);
  return client;
}

/** Access the Lockally client provided by an ancestor. */
export function useLockally(): LockallyClient {
  const client = inject(KEY, null);
  if (!client) {
    throw new Error('useLockally() must be used under <LockallyProvider> or provideLockally().');
  }
  return client;
}

/**
 * Wrapper component that provides a Lockally client to its default slot. Never pass
 * a secret `lk_live_` key — supply `getToken` (short-lived token from your backend)
 * or a `baseUrl` proxy.
 */
export const LockallyProvider = defineComponent({
  name: 'LockallyProvider',
  props: {
    getToken: { type: Function as PropType<GetToken>, default: undefined },
    baseUrl: { type: String, default: undefined },
    client: { type: Object as PropType<LockallyClient>, default: undefined },
  },
  setup(props, { slots }) {
    provideLockally(props.client ?? new LockallyClient({ getToken: props.getToken, baseUrl: props.baseUrl }));
    return () => slots.default?.();
  },
});
