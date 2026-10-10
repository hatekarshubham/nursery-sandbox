import { Injectable, signal } from '@angular/core';

export type AlertType = 'success' | 'error' | 'warning' | 'info' | 'confirm';

export interface AlertConfig {
  title: string;
  message: string;
  description?: string;

  type?: AlertType;

  confirmText?: string;
  cancelText?: string;
  showCancel?: boolean;
  closeOnBackdrop?: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class AlertService {

  private readonly _alert = signal<AlertConfig | null>(null);

  readonly alert = this._alert.asReadonly();

  private confirmResolver: ((result: boolean) => void) | null = null;

  show(config: AlertConfig): void {
    this._alert.set({
      confirmText: 'OK',
      cancelText: 'Cancel',
      showCancel: false,
      closeOnBackdrop: true,
      type: 'info',
      ...config
    });
  }

  success(
    title: string,
    message: string,
    description: string = ''
  ): void {
    this.show({
      title,
      message,
      description,
      type: 'success'
    });
  }

  error(
    title: string,
    message: string,
    description: string = ''
  ): void {
    this.show({
      title,
      message,
      description,
      type: 'error'
    });
  }

  warning(
    title: string,
    message: string,
    description: string = ''
  ): void {
    this.show({
      title,
      message,
      description,
      type: 'warning'
    });
  }

  info(
    title: string,
    message: string,
    description: string = ''
  ): void {
    this.show({
      title,
      message,
      description,
      type: 'info'
    });
  }

  confirm(config: {
    title: string;
    message: string;
    description?: string;
    confirmText?: string;
    cancelText?: string;
  }): Promise<boolean> {

    return new Promise<boolean>((resolve) => {

      this.confirmResolver = resolve;

      this.show({
        title: config.title,
        message: config.message,
        description: config.description ?? '',
        confirmText: config.confirmText ?? 'Confirm',
        cancelText: config.cancelText ?? 'Cancel',
        showCancel: true,
        closeOnBackdrop: false,
        type: 'confirm'
      });

    });
  }

  confirmAction(): void {
    const resolver = this.confirmResolver;

    this.confirmResolver = null;

    this._alert.set(null);

    resolver?.(true);
  }

  cancel(): void {
    const resolver = this.confirmResolver;

    this.confirmResolver = null;

    this._alert.set(null);

    resolver?.(false);
  }

  close(): void {
    const resolver = this.confirmResolver;

    this.confirmResolver = null;

    this._alert.set(null);

    resolver?.(false);
  }
}