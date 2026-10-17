import { Component, HostListener, inject } from '@angular/core';

import {
  AppDialogService,
  DialogTone
} from '../../../services/app-dialog.service';

@Component({
  selector: 'app-dialog',
  templateUrl: './app-dialog.component.html'
})
export class AppDialogComponent {

  readonly dialog = inject(AppDialogService);


  @HostListener('document:keydown.escape')
  onEscape(): void {

    const current = this.dialog.current();

    if (!current) {
      return;
    }

    if (current.mode === 'confirm') {
      this.dialog.cancel();
      return;
    }

    this.dialog.accept();

  }


  iconWrap(tone: DialogTone): string {

    const tones: Record<DialogTone, string> = {
      success: 'bg-green-100 text-green-600 dark:bg-green-500/10 dark:text-green-400',
      warning: 'bg-amber-100 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400',
      danger: 'bg-red-100 text-red-600 dark:bg-red-500/10 dark:text-red-400',
      info: 'bg-blue-100 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400'
    };

    return `flex h-12 w-12 shrink-0 items-center justify-center rounded-full ${tones[tone]}`;

  }


  confirmButton(tone: DialogTone): string {

    const tones: Record<DialogTone, string> = {
      success: 'bg-green-600 hover:bg-green-700',
      warning: 'bg-amber-500 hover:bg-amber-600',
      danger: 'bg-red-600 hover:bg-red-700',
      info: 'bg-blue-600 hover:bg-blue-700'
    };

    return `rounded-lg px-4 py-2.5 text-sm font-medium text-white ${tones[tone]}`;

  }

}
