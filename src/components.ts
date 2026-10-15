import { computed, defineComponent, h, ref, type PropType } from 'vue';
import {
  fileToAttachment,
  type Attachment,
  type Contact,
  type SendMessage,
  type SendResult,
  type Signature,
  type Template,
} from '@lockally/ui-core';
import { useLockally } from './client.js';
import { useContacts, useTemplates } from './composables.js';

// Components are lightly styled — each root carries a `data-lockally` hook and
// accepts a `class`, so you theme with your own CSS. No stylesheet required.

function splitAddresses(value: string): string[] {
  return value.split(',').map((s) => s.trim()).filter(Boolean);
}

// ── ContactPicker ────────────────────────────────────────────────────────────

export const ContactPicker = defineComponent({
  name: 'ContactPicker',
  props: {
    placeholder: { type: String, default: 'Search contacts…' },
  },
  emits: { select: (_c: Contact) => true },
  setup(props, { emit }) {
    const q = ref('');
    const query = computed(() => (q.value.trim() ? q.value.trim() : undefined));
    const { data, loading } = useContacts(query);

    return () =>
      h('div', { 'data-lockally': 'contact-picker' }, [
        h('input', {
          type: 'search',
          value: q.value,
          'aria-label': 'Search contacts',
          placeholder: props.placeholder,
          onInput: (e: Event) => (q.value = (e.target as HTMLInputElement).value),
        }),
        h('ul', { 'data-lockally': 'contact-list' }, [
          loading.value ? h('li', { 'data-lockally': 'loading' }, 'Loading…') : null,
          ...(!loading.value
            ? data.value.map((c) =>
                h('li', { key: c.id }, [
                  h('button', { type: 'button', onClick: () => emit('select', c) },
                    c.name ? `${c.name} <${c.email}>` : c.email),
                ]),
              )
            : []),
        ]),
      ]);
  },
});

// ── TemplateSelector ─────────────────────────────────────────────────────────

export const TemplateSelector = defineComponent({
  name: 'TemplateSelector',
  emits: { select: (_t: Template) => true },
  setup(_props, { emit }) {
    const { data, loading } = useTemplates();
    return () =>
      h(
        'select',
        {
          'data-lockally': 'template-selector',
          'aria-label': 'Choose a template',
          disabled: loading.value,
          onChange: (e: Event) => {
            const t = data.value.find((x) => x.id === (e.target as HTMLSelectElement).value);
            if (t) emit('select', t);
          },
        },
        [
          h('option', { value: '', disabled: true }, loading.value ? 'Loading templates…' : 'Choose a template…'),
          ...data.value.map((t) => h('option', { key: t.id, value: t.id }, t.name)),
        ],
      );
  },
});

// ── SignaturePicker (prop-driven; Lockally has no public signatures API) ───────

export const SignaturePicker = defineComponent({
  name: 'SignaturePicker',
  props: {
    signatures: { type: Array as PropType<Signature[]>, required: true },
  },
  emits: { select: (_s: Signature) => true },
  setup(props, { emit }) {
    return () =>
      h(
        'select',
        {
          'data-lockally': 'signature-picker',
          'aria-label': 'Choose a signature',
          onChange: (e: Event) => {
            const s = props.signatures.find((x) => x.id === (e.target as HTMLSelectElement).value);
            if (s) emit('select', s);
          },
        },
        [
          h('option', { value: '', disabled: true }, 'Choose a signature…'),
          ...props.signatures.map((s) => h('option', { key: s.id, value: s.id }, s.name)),
        ],
      );
  },
});

// ── AttachmentUpload ─────────────────────────────────────────────────────────

export const AttachmentUpload = defineComponent({
  name: 'AttachmentUpload',
  props: {
    modelValue: { type: Array as PropType<Attachment[]>, default: () => [] },
  },
  emits: { 'update:modelValue': (_a: Attachment[]) => true },
  setup(props, { emit }) {
    const onFiles = async (files: FileList | null) => {
      if (!files || files.length === 0) return;
      const added = await Promise.all(Array.from(files).map(fileToAttachment));
      emit('update:modelValue', [...props.modelValue, ...added]);
    };
    return () =>
      h('div', { 'data-lockally': 'attachment-upload' }, [
        h('input', {
          type: 'file',
          multiple: true,
          'aria-label': 'Add attachments',
          onChange: (e: Event) => onFiles((e.target as HTMLInputElement).files),
        }),
        h('ul', { 'data-lockally': 'attachment-list' },
          props.modelValue.map((a, i) =>
            h('li', { key: `${a.filename}-${i}` }, [
              h('span', a.filename),
              h('button', {
                type: 'button',
                'aria-label': `Remove ${a.filename}`,
                onClick: () => emit('update:modelValue', props.modelValue.filter((_, j) => j !== i)),
              }, '×'),
            ]),
          ),
        ),
      ]);
  },
});

// ── EmailComposer ────────────────────────────────────────────────────────────

export const EmailComposer = defineComponent({
  name: 'EmailComposer',
  props: {
    defaultFrom: { type: String, default: '' },
    defaultTo: { type: String, default: '' },
    signatures: { type: Array as PropType<Signature[]>, default: undefined },
  },
  emits: {
    sent: (_r: SendResult) => true,
    error: (_e: Error) => true,
  },
  setup(props, { emit }) {
    const client = useLockally();
    const from = ref(props.defaultFrom);
    const to = ref(props.defaultTo);
    const cc = ref('');
    const subject = ref('');
    const body = ref('');
    const attachments = ref<Attachment[]>([]);
    const templateId = ref<string | undefined>();
    const sending = ref(false);
    const error = ref<string | undefined>();

    const submit = async (e: Event) => {
      e.preventDefault();
      sending.value = true;
      error.value = undefined;
      try {
        const message: SendMessage = {
          from: from.value,
          to: splitAddresses(to.value),
          ...(cc.value.trim() ? { cc: splitAddresses(cc.value) } : {}),
          ...(subject.value ? { subject: subject.value } : {}),
          ...(templateId.value ? { template_id: templateId.value } : { html: body.value }),
          ...(attachments.value.length ? { attachments: attachments.value } : {}),
        };
        const result = await client.send(message);
        emit('sent', result);
        body.value = '';
        attachments.value = [];
        templateId.value = undefined;
      } catch (err) {
        error.value = (err as Error).message;
        emit('error', err as Error);
      } finally {
        sending.value = false;
      }
    };

    const model = (r: { value: string }) => ({
      value: r.value,
      onInput: (e: Event) => (r.value = (e.target as HTMLInputElement).value),
    });

    return () =>
      h('form', { 'data-lockally': 'email-composer', onSubmit: submit }, [
        h('input', { 'aria-label': 'From', placeholder: 'From', ...model(from) }),
        h('input', { 'aria-label': 'To', placeholder: 'To (comma-separated)', ...model(to) }),
        h('input', { 'aria-label': 'Cc', placeholder: 'Cc', ...model(cc) }),
        h('input', { 'aria-label': 'Subject', placeholder: 'Subject', ...model(subject) }),
        h(TemplateSelector, {
          onSelect: (t: Template) => {
            templateId.value = t.id;
            if (t.subject) subject.value = t.subject;
            if (t.html) body.value = t.html;
          },
        }),
        h('textarea', { 'aria-label': 'Body', placeholder: 'Write your message…', ...model(body) }),
        props.signatures && props.signatures.length > 0
          ? h(SignaturePicker, {
              signatures: props.signatures,
              onSelect: (s: Signature) => (body.value += s.html),
            })
          : null,
        h(AttachmentUpload, {
          modelValue: attachments.value,
          'onUpdate:modelValue': (a: Attachment[]) => (attachments.value = a),
        }),
        error.value ? h('p', { role: 'alert', 'data-lockally': 'error' }, error.value) : null,
        h('button', {
          type: 'submit',
          disabled: sending.value || !from.value || !to.value.trim(),
        }, sending.value ? 'Sending…' : 'Send'),
      ]);
  },
});
