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

import { ContactService } from '../services/contact.service';

@Component({
  selector: 'app-contact',
  imports: [
    NgIf,
    MatInput,
    MatLabel,
    MatFormField,
    MatIcon, 
    MatButton,
    FormsModule,
    HttpClientModule,
    MatSnackBarModule
  ],
  templateUrl: './contact.component.html',
  styleUrl: './contact.component.scss',
  standalone: true
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
    private snackBar: MatSnackBar
  ) {}

  // ფორმის გაგზავნის ფუნქცია
  onSubmit(): void {
    this.errorMessage = '';
    
    // ვალიდაცია
    if (!this.contactForm.name || !this.contactForm.email || !this.contactForm.message) {
      this.errorMessage = 'გთხოვთ შეავსოთ ყველა სავალდებულო ველი';
      this.snackBar.open(this.errorMessage, 'დახურვა', {
        duration: 3000
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
          
          // შეტყობინების ჩვენება
          this.snackBar.open('შეტყობინება წარმატებით გაიგზავნა!', 'დახურვა', {
            duration: 3000
          });
          
          // ფორმის გასუფთავება
          this.resetForm();
        },
        error: (error) => {
          this.loading = false;
          console.error('შეცდომა გაგზავნისას:', error);
          
          // შეცდომის შეტყობინება
          this.errorMessage = error.error?.error || 'შეცდომა შეტყობინების გაგზავნისას. გთხოვთ სცადოთ მოგვიანებით.';
          this.snackBar.open(this.errorMessage, 'დახურვა', {
            duration: 5000
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