import { reactive } from 'vue';

const state = reactive({ toasts: [] });

let nextId = 1;

export function useToast() {
  function show(message, type = 'success', duration = 4500) {
    const id = nextId++;
    state.toasts.push({ id, message, type });
    setTimeout(() => {
      const idx = state.toasts.findIndex((t) => t.id === id);
      if (idx > -1) state.toasts.splice(idx, 1);
    }, duration);
  }

  function success(msg) { show(msg, 'success'); }
  function error(msg)   { show(msg, 'error'); }
  function info(msg)    { show(msg, 'info'); }

  return { toasts: state.toasts, show, success, error, info };
}
