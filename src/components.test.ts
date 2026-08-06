import { describe, expect, it, vi } from 'vitest';
import { h } from 'vue';
import { flushPromises, mount } from '@vue/test-utils';
import { LockallyClient } from '@lockally/ui-core';
import { LockallyProvider } from './client.js';
import { ContactPicker, EmailComposer, SignaturePicker } from './components.js';

function clientWith(routes: Record<string, unknown>) {
  const fetchImpl = vi.fn(async (url: string) => {
    const path = url.replace('https://api.lockally.com', '');
    const key = path.startsWith('/v1/contacts') ? '/v1/contacts' : path;
    const body = routes[key] ?? {};
    return new Response(JSON.stringify(body), { status: 200, headers: { 'Content-Type': 'application/json' } });
  });
  const client = new LockallyClient({ getToken: async () => 'tok' }, fetchImpl as unknown as typeof fetch);
  return { client, fetchImpl };
}

describe('@lockally/vue components', () => {
  it('EmailComposer sends and emits sent', async () => {
    const { client, fetchImpl } = clientWith({
      '/v1/send': { id: 'm_1', message_id: '<x@lockally.com>', status: 'queued' },
      '/v1/templates': { data: [] },
    });
    const wrapper = mount(LockallyProvider, {
      props: { client },
      slots: {
        default: () => h(EmailComposer, { defaultFrom: 'alerts@acme.com', defaultTo: 'user@example.com' }),
      },
    });
    const composer = wrapper.findComponent(EmailComposer);
    await composer.find('textarea[aria-label="Body"]').setValue('<b>hi</b>');
    await composer.find('form').trigger('submit');
    await flushPromises();

    const sendCall = fetchImpl.mock.calls.find(([u]) => String(u).endsWith('/v1/send'));
    expect(sendCall).toBeTruthy();
    const [, init] = sendCall!;
    const payload = JSON.parse((init as RequestInit).body as string);
    expect(payload.from).toBe('alerts@acme.com');
    expect(payload.to).toEqual(['user@example.com']);
    expect((init as RequestInit).headers).toMatchObject({ 'Idempotency-Key': expect.stringMatching(/^lk-/) });
    expect(composer.emitted('sent')).toHaveLength(1);
  });

  it('ContactPicker lists and selects', async () => {
    const { client } = clientWith({
      '/v1/contacts': { data: [{ id: 'c1', name: 'Ada', email: 'ada@example.com' }] },
    });
    const wrapper = mount(LockallyProvider, {
      props: { client },
      slots: { default: () => h(ContactPicker) },
    });
    await flushPromises();
    const picker = wrapper.findComponent(ContactPicker);
    const btn = picker.find('button');
    expect(btn.text()).toContain('ada@example.com');
    await btn.trigger('click');
    expect(picker.emitted('select')?.[0]?.[0]).toMatchObject({ email: 'ada@example.com' });
  });

  it('SignaturePicker is prop-driven', async () => {
    const { client } = clientWith({});
    const sigs = [{ id: 's1', name: 'Default', html: '<p>Cheers</p>' }];
    const wrapper = mount(LockallyProvider, {
      props: { client },
      slots: { default: () => h(SignaturePicker, { signatures: sigs }) },
    });
    const picker = wrapper.findComponent(SignaturePicker);
    await picker.find('select').setValue('s1');
    expect(picker.emitted('select')?.[0]?.[0]).toMatchObject({ id: 's1' });
  });
});
