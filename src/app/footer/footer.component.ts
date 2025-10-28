import { Component } from '@angular/core';
import { MatButton } from '@angular/material/button';
import { RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { TranslateModule } from '@ngx-translate/core'; // ✅ დამატება

@Component({
  selector: 'app-footer',
  standalone: true,
  imports: [
    RouterLink, 
    MatIconModule,
    TranslateModule // ✅ დამატება
  ],
  templateUrl: './footer.component.html',
  styleUrl: './footer.component.scss'
})
export class FooterComponent {
  currentYear = new Date().getFullYear();
  
  constructor() {}
  
  onNavigate(route: string) {
    console.log('ნავიგაცია:', route);
    // Router navigation logic here
    // this.router.navigate([route]);
  }
  
  onSocialClick(platform: string) {
    console.log('სოციალური პლატფორმა:', platform);
  }
  
  onClick() {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
}