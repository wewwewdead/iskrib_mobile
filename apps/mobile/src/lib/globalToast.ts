type ToastType = 'success' | 'error' | 'info';

interface ToastEvent {
  message: string;
  type: ToastType;
}

type Listener = (event: ToastEvent) => void;

const listeners = new Set<Listener>();

export function subscribeGlobalToast(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function emitGlobalToast(message: string, type: ToastType = 'info') {
  for (const listener of listeners) {
    listener({message, type});
  }
}
