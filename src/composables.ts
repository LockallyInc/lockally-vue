import { ref, unref, watchEffect, type MaybeRef, type Ref } from 'vue';
import type { Contact, Template } from '@lockally/ui-core';
import { useLockally } from './client.js';

export interface AsyncState<T> {
  data: Ref<T>;
  loading: Ref<boolean>;
  error: Ref<Error | undefined>;
}

/** Reactive contact search. Pass a ref/getter for `q` to re-query as it changes. */
export function useContacts(q?: MaybeRef<string | undefined>): AsyncState<Contact[]> {
  const client = useLockally();
  const data = ref<Contact[]>([]);
  const loading = ref(false);
  const error = ref<Error | undefined>();
  let seq = 0;

  watchEffect(async () => {
    const query = unref(q);
    const mine = ++seq;
    loading.value = true;
    error.value = undefined;
    try {
      const result = await client.listContacts(query);
      if (mine === seq) data.value = result;
    } catch (e) {
      if (mine === seq) {
        error.value = e as Error;
        data.value = [];
      }
    } finally {
      if (mine === seq) loading.value = false;
    }
  });

  return { data, loading, error };
}

/** Loads the tenant's templates once. */
export function useTemplates(): AsyncState<Template[]> {
  const client = useLockally();
  const data = ref<Template[]>([]);
  const loading = ref(true);
  const error = ref<Error | undefined>();

  watchEffect(async () => {
    loading.value = true;
    try {
      data.value = await client.listTemplates();
    } catch (e) {
      error.value = e as Error;
      data.value = [];
    } finally {
      loading.value = false;
    }
  });

  return { data, loading, error };
}
