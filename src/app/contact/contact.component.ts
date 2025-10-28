import { Component } from '@angular/core';
import { MatInput } from '@angular/material/input';
import { MatLabel } from '@angular/material/input';
import { MatFormField } from '@angular/material/input';
import { MatIcon } from '@angular/material/icon';
import { MatButton } from '@angular/material/button';
import { FormsModule } from '@angular/forms';
import { HttpClientModule } from '@angular/common/http';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { NgIf } from '@angular/common';
import { TranslateModule, TranslateService } from '@ngx-translate/core'; // ✅ დამატება

import { ContactService } from '../services/contact.service';

@Component({
  selector: 'app-contact',
  standalone: true,
  imports: [
    NgIf,
    MatInput,
    MatLabel,
    MatFormField,
    MatIcon, 
    MatButton,
    FormsModule,
    HttpClientModule,
    MatSnackBarModule,
    TranslateModule // ✅ დამატება
  ],
  templateUrl: './contact.component.html',
  styleUrl: './contact.component.scss'
})
export class ContactComponent {
  // მოდელი საკონტაქტო ფორმის მონაცემებისთვის
  contactForm = {
    name: '',
    email: '',
    message: ''
  };
  
  // ჩატვირთვის სტატუსის ინდიკატორი
  loading = false;
  formSubmitted = false;
  errorMessage = '';

  constructor(
    private contactService: ContactService,
    private snackBar: MatSnackBar,
    private translate: TranslateService // ✅ დამატება
  ) {}

  // ფორმის გაგზავნის ფუნქცია
  onSubmit(): void {
    this.errorMessage = '';
    
    // ვალიდაცია - თარგმნილი შეტყობინებით
    if (!this.contactForm.name || !this.contactForm.email || !this.contactForm.message) {
      this.translate.get('CONTACT.ERROR.REQUIRED_FIELDS').subscribe(message => {
        this.errorMessage = message;
        this.snackBar.open(this.errorMessage, this.translate.instant('COMMON.CLOSE'), {
          duration: 3000
        });
      });
      return;
    }

    this.loading = true;

    // სერვისის გამოძახება
    this.contactService.sendContactForm(this.contactForm)
      .subscribe({
        next: (response) => {
          this.loading = false;
          this.formSubmitted = true;
          
          // შეტყობინების ჩვენება - თარგმნილი
          this.translate.get('CONTACT.SUCCESS.MESSAGE').subscribe(message => {
            this.snackBar.open(message, this.translate.instant('COMMON.CLOSE'), {
              duration: 3000
            });
          });
          
          // ფორმის გასუფთავება
          this.resetForm();
        },
        error: (error) => {
          this.loading = false;
          console.error('შეცდომა გაგზავნისას:', error);
          
          // შეცდომის შეტყობინება - თარგმნილი
          this.translate.get('CONTACT.ERROR.SEND_FAILED').subscribe(message => {
            this.errorMessage = error.error?.error || message;
            this.snackBar.open(this.errorMessage, this.translate.instant('COMMON.CLOSE'), {
              duration: 5000
            });
          });
        }
      });
  }

  // ფორმის გასუფთავება
  resetForm(): void {
    this.contactForm = {
      name: '',
      email: '',
      message: ''
    };
  }
}