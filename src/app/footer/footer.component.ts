import { Component } from '@angular/core';
import { MatButton } from '@angular/material/button';
import { RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-footer',
  imports: [    RouterLink, MatIconModule],
  templateUrl: './footer.component.html',
  styleUrl: './footer.component.scss'
})
export class FooterComponent {
// public currentYear: number = new Date().getFullYear();

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
}

