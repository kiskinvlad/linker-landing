/**
 * The Ukrainian dev server's proxy (`pnpm start:ua`): the editor only. It must not
 * proxy `/ua` like proxy.conf.mjs does, because it serves `/ua/` itself.
 */
export { editorProxy as default } from './proxy.conf.mjs';
