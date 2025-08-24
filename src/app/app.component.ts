import { Component, OnInit } from '@angular/core';
import { NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { NavbarComponent } from "./navbar/navbar.component";
import { FooterComponent } from "./footer/footer.component";

import { filter } from 'rxjs/internal/operators/filter';
import { GoogleAnalyticsService } from './services/google-analytics.service';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, NavbarComponent, FooterComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss'
})
export class AppComponent implements OnInit {
  title = 'imarketzone';
 constructor(private router: Router,
    private ga: GoogleAnalyticsService){

 }


  ngOnInit(): void {
    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd)
    ).subscribe((event: NavigationEnd) => {
      this.ga.trackPageView(event.urlAfterRedirects);
    });
  }
  }

