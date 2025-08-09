import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

// გარემოს კონფიგურაციის ფაილი
import { environment } from '../environment';

@Injectable({
  providedIn: 'root'
})
export class ContactService {
  private apiUrl = `${environment.apiUrl}/contact`;

  constructor(private http: HttpClient) { }

  // საკონტაქტო ფორმის გაგზავნა
  sendContactForm(formData: any): Observable<any> {
    return this.http.post(this.apiUrl, formData);
  }

  // ყველა საკონტაქტო შეტყობინების მიღება (ადმინისთვის)
  getAllContacts(): Observable<any> {
    return this.http.get(this.apiUrl);
  }
}