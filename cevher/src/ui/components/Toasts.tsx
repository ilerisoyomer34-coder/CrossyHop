import { toasts } from '../store';

export function Toasts() {
  return (
    <div class="toasts" role="status" aria-live="polite">
      {toasts.value.map((toast) => (
        <div key={toast.id} class={`toast toast--${toast.tone}`}>
          {toast.text}
        </div>
      ))}
    </div>
  );
}
