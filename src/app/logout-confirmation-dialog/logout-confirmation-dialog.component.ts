import { Component } from '@angular/core';
import { MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { TranslateModule } from '@ngx-translate/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-logout-confirmation-dialog',
  standalone: true,
  imports: [
    CommonModule,
    MatDialogModule,
    MatButtonModule,
    TranslateModule
  ],
  template: `
    <div class="logout-dialog">
      <h2 mat-dialog-title>{{ 'LOGOUT.CONFIRM_TITLE' | translate }}</h2>
      
      <mat-dialog-content>
        <p>{{ 'LOGOUT.CONFIRM_MESSAGE' | translate }}</p>
      </mat-dialog-content>
      
      <mat-dialog-actions align="end">
        <button 
          mat-button 
          (click)="onCancel()"
          class="cancel-btn">
          {{ 'LOGOUT.CANCEL' | translate }}
        </button>
        <button 
          mat-flat-button 
          color="warn"
          (click)="onConfirm()"
          class="confirm-btn">
          {{ 'LOGOUT.CONFIRM' | translate }}
        </button>
      </mat-dialog-actions>
    </div>
  `,
  styles: [`
    .logout-dialog {
      padding: 20px;
      min-width: 300px;
    }

    h2 {
      margin: 0 0 20px 0;
      font-size: 24px;
      color: #333;
    }

    mat-dialog-content {
      margin-bottom: 20px;
    }

    p {
      font-size: 16px;
      color: #666;
      margin: 0;
    }

    mat-dialog-actions {
      gap: 10px;
      padding: 0;
      margin: 0;
    }

    .cancel-btn {
      background: #f5f5f5;
      color: #333;
    }

    .confirm-btn {
      background: #dc3545;
      color: white;
    }

    .cancel-btn:hover {
      background: #e0e0e0;
    }

    .confirm-btn:hover {
      background: #c82333;
    }
  `]
})
export class LogoutConfirmationDialogComponent {
  constructor(
    private dialogRef: MatDialogRef<LogoutConfirmationDialogComponent>
  ) {}

  onCancel(): void {
    this.dialogRef.close(false);
  }

  onConfirm(): void {
    this.dialogRef.close(true);
  }
}