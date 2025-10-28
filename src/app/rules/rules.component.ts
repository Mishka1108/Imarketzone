import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslateModule, TranslateService } from '@ngx-translate/core'; // ✅ დამატება

@Component({
  selector: 'app-rules',
  standalone: true,
  imports: [CommonModule, TranslateModule], // ✅ დამატება
  templateUrl: './rules.component.html',
  styleUrl: './rules.component.scss'
})
export class RulesComponent implements OnInit {
  currentDate: string = '';

  constructor(private translate: TranslateService) {} // ✅ დამატება

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
    
    // ✅ განახლებული: ენის მიხედვით თარიღის ფორმატი
    const currentLang = this.translate.currentLang || 'ka';
    const locale = currentLang === 'ka' ? 'ka-GE' : 'en-US';
    this.currentDate = now.toLocaleDateString(locale, options);
  }
}