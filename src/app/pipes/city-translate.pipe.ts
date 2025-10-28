import { Pipe, PipeTransform } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';

@Pipe({
  name: 'cityTranslate',
  standalone: true,
  pure: false
})
export class CityTranslatePipe implements PipeTransform {
  
  // ქართული → ინგლისური რუქა
  private cityMap: { [key: string]: { en: string, ka: string } } = {
    'თბილისი': { en: 'Tbilisi', ka: 'თბილისი' },
    'ბათუმი': { en: 'Batumi', ka: 'ბათუმი' },
    'ქუთაისი': { en: 'Kutaisi', ka: 'ქუთაისი' },
    'რუსთავი': { en: 'Rustavi', ka: 'რუსთავი' },
    'გორი': { en: 'Gori', ka: 'გორი' },
    'ფოთი': { en: 'Poti', ka: 'ფოთი' },
    'ზუგდიდი': { en: 'Zugdidi', ka: 'ზუგდიდი' },
    'თელავი': { en: 'Telavi', ka: 'თელავი' },
    'ოზურგეთი': { en: 'Ozurgeti', ka: 'ოზურგეთი' },
    'მარნეული': { en: 'Marneuli', ka: 'მარნეული' },
    'ახალციხე': { en: 'Akhaltsikhe', ka: 'ახალციხე' },
    'ახალქალაქი': { en: 'Akhalkalaki', ka: 'ახალქალაქი' },
    'ბოლნისი': { en: 'Bolnisi', ka: 'ბოლნისი' },
    'საგარეჯო': { en: 'Sagarejo', ka: 'საგარეჯო' },
    'გარდაბანი': { en: 'Gardabani', ka: 'გარდაბანი' },
    'ცხინვალი': { en: 'Tskhinvali', ka: 'ცხინვალი' },
    'ჭიათურა': { en: 'Chiatura', ka: 'ჭიათურა' },
    'დუშეთი': { en: 'Dusheti', ka: 'დუშეთი' },
    'დმანისი': { en: 'Dmanisi', ka: 'დმანისი' },
    'წალკა': { en: 'Tsalka', ka: 'წალკა' },
    'თეთრიწყარო': { en: 'Tetritskaro', ka: 'თეთრიწყარო' },
    'საჩხერე': { en: 'Sachkhere', ka: 'საჩხერე' },
    'ლაგოდეხი': { en: 'Lagodekhi', ka: 'ლაგოდეხი' },
    'ყვარელი': { en: 'Kvareli', ka: 'ყვარელი' },
    'თიანეთი': { en: 'Tianeti', ka: 'თიანეთი' },
    'კასპი': { en: 'Kaspi', ka: 'კასპი' },
    'ხაშური': { en: 'Khashuri', ka: 'ხაშური' },
    'ხობი': { en: 'Khobi', ka: 'ხობი' },
    'წალენჯიხა': { en: 'Tsalenjikha', ka: 'წალენჯიხა' },
    'მესტია': { en: 'Mestia', ka: 'მესტია' },
    'ამბროლაური': { en: 'Ambrolauri', ka: 'ამბროლაური' },
    'ცაგერი': { en: 'Tsageri', ka: 'ცაგერი' },
    'ონი': { en: 'Oni', ka: 'ონი' },
    'ლანჩხუთი': { en: 'Lanchkhuti', ka: 'ლანჩხუთი' },
    'ჩოხატაური': { en: 'Chokhatauri', ka: 'ჩოხატაური' },
    'ქობულეთი': { en: 'Kobuleti', ka: 'ქობულეთი' },
    'სურამი': { en: 'Surami', ka: 'სურამი' },
    'აბაშა': { en: 'Abasha', ka: 'აბაშა' },
    'სენაკი': { en: 'Senaki', ka: 'სენაკი' },
    'ტყიბული': { en: 'Tkibuli', ka: 'ტყიბული' },
    'წყალტუბო': { en: 'Tskaltubo', ka: 'წყალტუბო' },
    'ნინოწმინდა': { en: 'Ninotsminda', ka: 'ნინოწმინდა' },
    'ბაკურიანი': { en: 'Bakuriani', ka: 'ბაკურიანი' },
    'გუდაური': { en: 'Gudauri', ka: 'გუდაური' },
    'წნორი': { en: 'Tsnori', ka: 'წნორი' },
    'ახმეტა': { en: 'Akhmeta', ka: 'ახმეტა' },
    'ბარნოვი': { en: 'Barnovi', ka: 'ბარნოვი' },
    'შორაპანი': { en: 'Shorapani', ka: 'შორაპანი' },
    'სოხუმი': { en: 'Sokhumi', ka: 'სოხუმი' }
  };

  constructor(private translate: TranslateService) {}

  transform(city: string): string {
    if (!city) return '';
    
    const currentLang = this.translate.currentLang || 'ka';
    
    // თუ ქალაქი რუქაში არის
    if (this.cityMap[city]) {
      return currentLang === 'en' ? this.cityMap[city].en : this.cityMap[city].ka;
    }
    
    // თუ არ მოიძებნა, დააბრუნე ორიგინალი
    return city;
  }
}