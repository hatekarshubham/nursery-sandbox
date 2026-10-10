import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { RouterModule } from '@angular/router';
import { AlertService } from '../../../services/alert.service';

@Component({
  selector: 'app-alert',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule
  ],
  templateUrl: './alert.component.html',
  styles: ``
})
export class AlertComponent {

  private readonly alertService = inject(AlertService);

  readonly alert = this.alertService.alert;

  close(): void {
    this.alertService.close();
  }

  cancel(): void {
    this.alertService.cancel();
  }

  confirm(): void {
    this.alertService.confirmAction();
  }

  onBackdropClick(): void {

    const currentAlert = this.alert();

    if (currentAlert?.closeOnBackdrop !== false) {
      this.close();
    }
  }
}