import { Injectable, signal } from '@angular/core';

export type DialogTone = 'success' | 'warning' | 'danger' | 'info';

export interface DialogState {
  tone: DialogTone;
  title: string;
  message: string;
  lines: string[];
  mode: 'alert' | 'confirm';
  confirmLabel: string;
  cancelLabel: string;
}

interface QueuedDialog {
  state: DialogState;
  resolve: (value: boolean) => void;
}

@Injectable({
  providedIn: 'root'
})
export class AppDialogService {

  readonly current = signal<DialogState | null>(null);

  private queue: QueuedDialog[] = [];

  private activeResolve: ((value: boolean) => void) | null = null;


  alert(message: string): Promise<void> {

    return this.open(
      this.parse(message, 'alert')
    ).then(() => undefined);

  }


  confirm(message: string): Promise<boolean> {

    return this.open(
      this.parse(message, 'confirm')
    );

  }


  accept(): void {

    this.finish(true);

  }


  cancel(): void {

    this.finish(false);

  }


  dismiss(): void {

    const pending = this.queue.splice(0);

    const resolve = this.activeResolve;

    this.activeResolve = null;

    this.current.set(null);

    resolve?.(false);

    for (const item of pending) {
      item.resolve(false);
    }

  }


  private open(
    state: DialogState
  ): Promise<boolean> {

    return new Promise(resolve => {

      if (this.current()) {

        this.queue.push({
          state,
          resolve
        });

        return;

      }

      this.activeResolve = resolve;

      this.current.set(state);

    });

  }


  private finish(result: boolean): void {

    const resolve = this.activeResolve;

    this.activeResolve = null;

    this.current.set(null);

    resolve?.(result);


    const next = this.queue.shift();

    if (!next) {
      return;
    }

    this.activeResolve = next.resolve;

    this.current.set(next.state);

  }


  private parse(
    raw: string,
    mode: 'alert' | 'confirm'
  ): DialogState {

    const parts = raw
      .split('\n')
      .map(part => part.trim())
      .filter(Boolean);

    const first = parts[0] ?? '';

    const extra = parts.slice(1);


    if (mode === 'confirm') {

      const tone = this.confirmTone(raw);

      return {
        tone,
        title: first || 'Please confirm',
        message: extra.length <= 1
          ? (extra[0] ?? this.confirmSubtitle(tone))
          : '',
        lines: extra.length > 1 ? extra : [],
        mode,
        confirmLabel: this.confirmLabel(first),
        cancelLabel: 'Cancel'
      };

    }


    const tone = this.alertTone(raw);

    const title = this.alertTitle(first, tone);

    return {
      tone,
      title,
      message: title === first ? '' : first,
      lines: extra,
      mode,
      confirmLabel: 'OK',
      cancelLabel: 'Cancel'
    };

  }


  private alertTone(message: string): DialogTone {

    if (/successfully/i.test(message)) {
      return 'success';
    }

    if (
      /^(failed|unable)\b/i.test(message) ||
      /\berror:/i.test(message)
    ) {
      return 'danger';
    }

    return 'warning';

  }


  private alertTitle(
    first: string,
    tone: DialogTone
  ): string {

    if (tone === 'success') {

      const title = first
        .replace(/!\s*$/, '')
        .replace(/\s*successfully\.?$/i, '');

      return title || 'Saved';

    }

    if (/pop-ups/i.test(first)) {
      return 'Pop-ups blocked';
    }

    if (/^login error/i.test(first)) {
      return 'Login failed';
    }

    if (/^sign up error/i.test(first)) {
      return 'Sign up failed';
    }

    if (/^no product found/i.test(first)) {
      return 'Product not found';
    }

    if (/^there are no barcode/i.test(first)) {
      return 'Nothing to print';
    }

    if (/already uses this code/i.test(first)) {
      return 'Code already used';
    }

    if (/more than once/i.test(first)) {
      return 'Duplicate product';
    }

    if (/cannot be the same/i.test(first)) {
      return 'Warehouses must differ';
    }

    if (/only pending/i.test(first)) {
      return 'Not allowed';
    }

    if (/in the future/i.test(first)) {
      return 'Invalid date';
    }

    if (
      /out of stock|available|insufficient|no inventory|no available stock/i
        .test(first)
    ) {
      return 'Not enough stock';
    }

    if (/discount/i.test(first)) {
      return 'Invalid discount';
    }

    if (/^please enter a valid|^invalid /i.test(first)) {
      return 'Invalid value';
    }

    if (/\binvalid\b/i.test(first)) {
      return 'Invalid selection';
    }

    if (
      /^please (enter|select|add|fill|agree)/i.test(first) ||
      /is missing/i.test(first)
    ) {
      return 'Missing information';
    }

    if (
      /must be|cannot be negative|start position|configured labels|greater than/i
        .test(first)
    ) {
      return 'Check the settings';
    }

    if (/^failed to (.+?)\.?\s*(please try again\.?)?$/i.test(first)) {

      const action = first
        .replace(/^failed to /i, '')
        .replace(/\.\s*please try again\.?$/i, '')
        .replace(/\.$/, '');

      return `Could not ${action}`;

    }

    if (/^unable to /i.test(first)) {
      return 'Could not continue';
    }

    if (tone === 'danger') {
      return 'Something went wrong';
    }

    return 'Please check this';

  }


  private confirmTone(message: string): DialogTone {

    if (
      /cancel this purchase|clear all products|delete/i
        .test(message)
    ) {
      return 'danger';
    }

    return 'warning';

  }


  private confirmSubtitle(tone: DialogTone): string {

    if (tone === 'danger') {
      return 'This action cannot be undone.';
    }

    return 'Please confirm to continue.';

  }


  private confirmLabel(first: string): string {

    if (/complete this purchase/i.test(first)) {
      return 'Complete purchase';
    }

    if (/cancel this purchase/i.test(first)) {
      return 'Cancel purchase';
    }

    if (/clear all products/i.test(first)) {
      return 'Clear cart';
    }

    if (/changing the warehouse/i.test(first)) {
      return 'Change warehouse';
    }

    if (/stock adjustment/i.test(first)) {
      return 'Adjust stock';
    }

    if (/^transfer /i.test(first)) {
      return 'Transfer stock';
    }

    return 'Confirm';

  }

}
