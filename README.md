<!-- lockally-brand-header -->
<p align="center">
  <a href="https://lockally.com">
    <picture>
      <source media="(prefers-color-scheme: dark)" srcset="https://raw.githubusercontent.com/LockallyInc/community/main/brand/lockup-dark.png">
      <img alt="Lockally" src="https://raw.githubusercontent.com/LockallyInc/community/main/brand/lockup-light.png" width="260">
    </picture>
  </a>
</p>
<!-- /lockally-brand-header -->

# @lockally/vue

Official [Lockally](https://lockally.com) Vue 3 components for embedding transactional
email into your app: `EmailComposer`, `ContactPicker`, `AttachmentUpload`,
`TemplateSelector`, `SignaturePicker`.

## Install

```bash
npm install @lockally/vue @lockally/ui-core vue
```

## Secure setup (never ship a secret key in the browser)

A `lk_live_` / `lk_test_` key must **never** run in browser code. Provide a
`getToken()` that fetches a **short-lived token from your backend** (which holds the
secret key), or point `baseUrl` at your own proxy.

```vue
<script setup lang="ts">
import { LockallyProvider, EmailComposer } from '@lockally/vue';

async function getToken() {
  const res = await fetch('/api/lockally-token');   // your backend mints a short-lived token
  return (await res.json()).token;
}
</script>

<template>
  <LockallyProvider :get-token="getToken">
    <EmailComposer
      default-from="alerts@yourdomain.com"
      @sent="(r) => console.log('sent', r.id)"
      @error="(e) => console.error(e)"
    />
  </LockallyProvider>
</template>
```

Or provide the client in `setup()` with `provideLockally({ getToken })` and read it
anywhere with `useLockally()`.

## Components

| Component | Purpose |
|---|---|
| `EmailComposer` | Full compose form → `POST /v1/send`. Emits `sent` / `error`. |
| `ContactPicker` | Search contacts (`GET /v1/contacts?q=`). Emits `select`. |
| `TemplateSelector` | Pick a stored template (`GET /v1/templates`). Emits `select`. |
| `AttachmentUpload` | `File` → base64; `v-model` of `Attachment[]`. |
| `SignaturePicker` | **Prop-driven** — pass your own `signatures`; emits the chosen one. Lockally has no public signatures API. |

Composables `useContacts(q)` and `useTemplates()` return `{ data, loading, error }` refs.

Every element carries a `data-lockally="…"` hook and accepts a `class`, so you theme it
with your own CSS — no stylesheet required.

## License

MIT © Lockally
