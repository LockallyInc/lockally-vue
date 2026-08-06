export { LockallyProvider, provideLockally, useLockally } from './client.js';
export { useContacts, useTemplates, type AsyncState } from './composables.js';
export {
  EmailComposer,
  ContactPicker,
  AttachmentUpload,
  TemplateSelector,
  SignaturePicker,
} from './components.js';

// Re-export the core client + types for convenience.
export { LockallyClient, LockallyError, fileToAttachment } from '@lockally/ui-core';
export type {
  GetToken,
  LockallyAuth,
  Attachment,
  SendMessage,
  SendResult,
  Contact,
  Template,
  Signature,
} from '@lockally/ui-core';
