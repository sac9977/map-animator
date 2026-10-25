import { useEffect, useRef, type RefObject } from 'react';

const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(', ');

/**
 * Shared modal accessibility wiring. Attach the returned ref to the dialog
 * element (the visible card inside the backdrop). Provides:
 *  - `role="dialog"` + `aria-modal="true"` expected to be set on the same node
 *  - Escape closes the modal (capture phase beats inner stopPropagation)
 *  - Tab cycles are trapped inside the dialog while it is open
 *  - Initial focus moves to the first focusable element (or the dialog itself)
 *  - Focus is restored to the triggering element when the dialog closes
 */
export function useModalA11y(
  isOpen: boolean,
  onClose: () => void
): RefObject<HTMLDivElement | null> {
  const dialogRef = useRef<HTMLDivElement>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!isOpen || !dialog) return;

    const previouslyFocused =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;

    // Move initial focus into the dialog.
    const initial = dialog.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR);
    (initial[0] ?? dialog).focus();

    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onCloseRef.current();
        return;
      }
      if (e.key !== 'Tab') return;

      const focusable = Array.from(
        dialog.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)
      ).filter((el) => el.offsetParent !== null); // visible + not display:none
      if (focusable.length === 0) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const active = document.activeElement;

      if (e.shiftKey && (active === first || active === dialog)) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && active === last) {
        e.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', handleKey, true);
    return () => {
      document.removeEventListener('keydown', handleKey, true);
      previouslyFocused?.focus();
    };
  }, [isOpen]);

  return dialogRef;
}
