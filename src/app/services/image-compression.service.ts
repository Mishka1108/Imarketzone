// image-compression.service.ts
import { Injectable } from '@angular/core';

export interface CompressionOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number; // 0.1 - 1.0
  maxSizeInMB?: number;
  format?: 'jpeg' | 'png' | 'webp';
}

@Injectable({
  providedIn: 'root'
})
export class ImageCompressionService {

  /**
   * მთავარი კომპრესიის მეთოდი
   */
  async compressImage(file: File, options: CompressionOptions = {}): Promise<File> {
    const defaultOptions: CompressionOptions = {
      maxWidth: 1920,
      maxHeight: 1080,
      quality: 0.8,
      maxSizeInMB: 5,
      format: 'jpeg'
    };

    const config = { ...defaultOptions, ...options };
    
    // თუ ფაილი უკვე პატარაა, აბრუნებს ორიგინალს
    if (file.size <= (config.maxSizeInMB! * 1024 * 1024)) {
      return file;
    }

    try {
      const compressedFile = await this.performCompression(file, config);
      console.log(`ორიგინალი: ${(file.size / 1024 / 1024).toFixed(2)}MB -> კომპრესია: ${(compressedFile.size / 1024 / 1024).toFixed(2)}MB`);
      return compressedFile;
    } catch (error) {
      console.error('სურათის კომპრესიის შეცდომა:', error);
      throw new Error('სურათის კომპრესია ვერ მოხერხდა');
    }
  }

  private async performCompression(file: File, options: CompressionOptions): Promise<File> {
    return new Promise((resolve, reject) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();

      img.onload = () => {
        try {
          // ზომის გამოთვლა aspect ratio-ს შენარჩუნებით
          const { width, height } = this.calculateDimensions(
            img.width, 
            img.height, 
            options.maxWidth!,
            options.maxHeight!
          );

          canvas.width = width;
          canvas.height = height;

          // სურათის დახატვა canvas-ზე
          ctx!.drawImage(img, 0, 0, width, height);

          // კომპრესია და blob-ად კონვერტაცია
          canvas.toBlob(
            (blob) => {
              if (!blob) {
                reject(new Error('კომპრესია ვერ მოხერხდა'));
                return;
              }

              // File ობიექტის შექმნა
              const compressedFile = new File(
                [blob], 
                this.generateFileName(file.name, options.format!),
                { 
                  type: `image/${options.format}`,
                  lastModified: Date.now()
                }
              );

              // თუ კვლავ დიდია, კიდევ უფრო მეტი კომპრესია
              if (compressedFile.size > (options.maxSizeInMB! * 1024 * 1024)) {
                this.performAggressiveCompression(file, options)
                  .then(resolve)
                  .catch(reject);
              } else {
                resolve(compressedFile);
              }
            },
            `image/${options.format}`,
            options.quality
          );
        } catch (error) {
          reject(error);
        }
      };

      img.onerror = () => reject(new Error('სურათის ჩატვირთვა ვერ მოხერხდა'));
      img.src = URL.createObjectURL(file);
    });
  }

  /**
   * აგრესიული კომპრესია დიდი ფაილებისთვის
   */
  private async performAggressiveCompression(file: File, options: CompressionOptions): Promise<File> {
    console.log('აგრესიული კომპრესიის გამოყენება...');
    
    const aggressiveOptions = {
      ...options,
      maxWidth: Math.min(options.maxWidth! * 0.7, 1280),
      maxHeight: Math.min(options.maxHeight! * 0.7, 720),
      quality: Math.max(options.quality! * 0.6, 0.3)
    };

    return this.performCompression(file, aggressiveOptions);
  }

  /**
   * ზომების გამოთვლა aspect ratio-ს შენარჩუნებით
   */
  private calculateDimensions(originalWidth: number, originalHeight: number, maxWidth: number, maxHeight: number) {
    let { width, height } = { width: originalWidth, height: originalHeight };

    // თუ სურათი დიდია, შევამცირებთ
    if (width > maxWidth) {
      height = (height * maxWidth) / width;
      width = maxWidth;
    }

    if (height > maxHeight) {
      width = (width * maxHeight) / height;
      height = maxHeight;
    }

    return {
      width: Math.round(width),
      height: Math.round(height)
    };
  }

  /**
   * ფაილის სახელის გენერაცია
   */
  private generateFileName(originalName: string, format: string): string {
    const nameWithoutExt = originalName.replace(/\.[^/.]+$/, '');
    return `${nameWithoutExt}_compressed.${format}`;
  }

  /**
   * მრავალეტაპობრივი კომპრესია
   */
  async progressiveCompression(file: File, targetSizeInMB: number = 2): Promise<File> {
    let currentFile = file;
    let attempts = 0;
    const maxAttempts = 5;

    const compressionSteps: CompressionOptions[] = [
      { maxWidth: 1920, maxHeight: 1080, quality: 0.9, format: 'jpeg' },
      { maxWidth: 1600, maxHeight: 900, quality: 0.8, format: 'jpeg' },
      { maxWidth: 1280, maxHeight: 720, quality: 0.7, format: 'jpeg' },
      { maxWidth: 1024, maxHeight: 576, quality: 0.6, format: 'jpeg' },
      { maxWidth: 800, maxHeight: 450, quality: 0.5, format: 'jpeg' }
    ];

    while (currentFile.size > (targetSizeInMB * 1024 * 1024) && attempts < maxAttempts) {
      const options = compressionSteps[attempts] || compressionSteps[compressionSteps.length - 1];
      
      console.log(`კომპრესიის ეტაპი ${attempts + 1}: ${(currentFile.size / 1024 / 1024).toFixed(2)}MB`);
      
      try {
        currentFile = await this.performCompression(currentFile, options);
        attempts++;
      } catch (error) {
        console.error(`კომპრესიის ეტაპი ${attempts + 1} ვერ მოხერხდა:`, error);
        break;
      }
    }

    return currentFile;
  }

  /**
   * WebP ფორმატში კონვერტაცია (უკეთესი კომპრესია)
   */
  async convertToWebP(file: File, quality: number = 0.8): Promise<File> {
    const options: CompressionOptions = {
      maxWidth: 1920,
      maxHeight: 1080,
      quality: quality,
      format: 'webp'
    };

    return this.performCompression(file, options);
  }

  /**
   * ბრაუზერის WebP მხარდაჭერის შემოწმება
   */
  supportsWebP(): Promise<boolean> {
    return new Promise((resolve) => {
      const webP = new Image();
      webP.onload = webP.onerror = () => {
        resolve(webP.height === 2);
      };
      webP.src = 'data:image/webp;base64,UklGRjoAAABXRUJQVlA4IC4AAACyAgCdASoCAAIALmk0mk0iIiIiIgBoSygABc6WWgAA/veff/0PP8bA//LwYAAA';
    });
  }
}