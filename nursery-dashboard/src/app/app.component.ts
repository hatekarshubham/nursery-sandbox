import { Component } from '@angular/core';
import { RouterModule } from '@angular/router';
import { AppDialogComponent } from './shared/components/ui/app-dialog/app-dialog.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    RouterModule,
    AppDialogComponent,
  ],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css',
})
export class AppComponent {
  title = 'Angular Ecommerce Dashboard | TailAdmin';
}
