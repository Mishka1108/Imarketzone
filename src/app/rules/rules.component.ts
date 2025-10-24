import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-rules',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './rules.component.html',
  styleUrl: './rules.component.scss'
})
export class RulesComponent implements OnInit {
  currentDate: string = '';

  ngOnInit(): void {
    this.setCurrentDate();
  }

  private setCurrentDate(): void {
    const now = new Date();
    const options: Intl.DateTimeFormatOptions = {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    };
    
    // Format date in Georgian
    this.currentDate = now.toLocaleDateString('ka-GE', options);
  }
}