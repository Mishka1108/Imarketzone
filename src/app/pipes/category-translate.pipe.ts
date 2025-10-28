// src/app/pipes/category-translate.pipe.ts

import { Pipe, PipeTransform } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';

@Pipe({
  name: 'categoryTranslate',
  standalone: true,
  pure: false // რომ დინამიურად განახლდეს ენის შეცვლისას
})
export class CategoryTranslatePipe implements PipeTransform {
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
  // კატეგორიების მიმაგრება
  private categoryMapping: { [key: string]: string } = {
    // ქართული -> Translation Key
    'ტელეფონები': 'HOME.CATEGORIES.PHONES.NAME',
    'ტექნიკა': 'HOME.CATEGORIES.TECH.NAME',
    'ავტომობილები': 'HOME.CATEGORIES.CARS.NAME',
    'ტანსაცმელი': 'HOME.CATEGORIES.CLOTHING.NAME',
    'სათამაშოები': 'HOME.CATEGORIES.TOYS.NAME',
    'კომპიუტერები': 'HOME.CATEGORIES.COMPUTERS.NAME',
    'სპორტი': 'HOME.CATEGORIES.SPORT.NAME',
    'წიგნები': 'HOME.CATEGORIES.BOOKS.NAME',
    
    // ინგლისური ვერსიები (case-insensitive)
    'phones': 'HOME.CATEGORIES.PHONES.NAME',
    'tech': 'HOME.CATEGORIES.TECH.NAME',
    'electronics': 'HOME.CATEGORIES.TECH.NAME',
    'cars': 'HOME.CATEGORIES.CARS.NAME',
    'automobiles': 'HOME.CATEGORIES.CARS.NAME',
    'clothing': 'HOME.CATEGORIES.CLOTHING.NAME',
    'toys': 'HOME.CATEGORIES.TOYS.NAME',
    'computers': 'HOME.CATEGORIES.COMPUTERS.NAME',
    'sport': 'HOME.CATEGORIES.SPORT.NAME',
    'sports': 'HOME.CATEGORIES.SPORT.NAME',
    'books': 'HOME.CATEGORIES.BOOKS.NAME'
  };

  constructor(private translate: TranslateService) {}

  transform(category: string): string {
    if (!category) return '';
    
    // case-insensitive ძებნა
    const normalizedCategory = category.toLowerCase().trim();
    const translationKey = this.categoryMapping[normalizedCategory];
    
    if (translationKey) {
      // თუ იპოვა translation key, ვთარგმნით
      return this.translate.instant(translationKey);
    }
    
    // თუ არ იპოვა mapping-ში, ვაბრუნებთ ორიგინალს
    return category;
  }
  
}