import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { QRCodeComponent } from 'angularx-qrcode';
import { TranslateModule } from '@ngx-translate/core';
import jsPDF from 'jspdf';
@Component({
  selector: 'app-qr-code',
  imports: [CommonModule,FormsModule, QRCodeComponent,TranslateModule],
  templateUrl: './qr-code.component.html',
  styleUrl: './qr-code.component.scss'
})
export class QrCodeComponent {
qrCodeValue: string = '';
  qrCodeSize: number = 256;
  errorCorrectionLevel: 'L' | 'M' | 'Q' | 'H' = 'H'; // მაღალი კორექცია ლოგოსთვის
  logoImage: string | null = null;
  logoSize: number = 60; // ლოგოს ზომა პიქსელებში
  // property დაამატე
private originalQRCanvas: string | null = null;
  
  generateQRCode(value: string): void {
    this.qrCodeValue = value;
  }
  
onFileSelected(event: any): void {
  const file = event.target.files[0];
  if (file) {
    const reader = new FileReader();
    reader.onload = (e: any) => {
      this.logoImage = e.target.result;
      setTimeout(() => this.addLogoToQR(), 300);
    };
    reader.readAsDataURL(file);
  }
}
  
  removeLogo(): void {
    this.logoImage = null;
  }
  
addLogoToQR(): void {
  if (!this.logoImage) return;

  setTimeout(() => {
    const canvas = document.querySelector('.qr-canvas canvas') as HTMLCanvasElement;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // პირველად QR კოდის ორიგინალი შევინახოთ (მხოლოდ ერთხელ)
    if (!this.originalQRCanvas) {
      this.originalQRCanvas = canvas.toDataURL();
    }

    const qrImage = new Image();
    qrImage.onload = () => {
      // ყოველ ჯერზე ორიგინალი QR კოდი დავხატოთ
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(qrImage, 0, 0, canvas.width, canvas.height);

      const logo = new Image();
      logo.onload = () => {
        const logoSizeScaled = this.logoSize;
        const x = (canvas.width - logoSizeScaled) / 2;
        const y = (canvas.height - logoSizeScaled) / 2;
        const radius = 10;
        const padding = 6;

        // თეთრი მომრგვალებული ფონი
        ctx.beginPath();
        ctx.moveTo(x - padding + radius, y - padding);
        ctx.lineTo(x - padding + logoSizeScaled + padding * 2 - radius, y - padding);
        ctx.quadraticCurveTo(x - padding + logoSizeScaled + padding * 2, y - padding, x - padding + logoSizeScaled + padding * 2, y - padding + radius);
        ctx.lineTo(x - padding + logoSizeScaled + padding * 2, y - padding + logoSizeScaled + padding * 2 - radius);
        ctx.quadraticCurveTo(x - padding + logoSizeScaled + padding * 2, y - padding + logoSizeScaled + padding * 2, x - padding + logoSizeScaled + padding * 2 - radius, y - padding + logoSizeScaled + padding * 2);
        ctx.lineTo(x - padding + radius, y - padding + logoSizeScaled + padding * 2);
        ctx.quadraticCurveTo(x - padding, y - padding + logoSizeScaled + padding * 2, x - padding, y - padding + logoSizeScaled + padding * 2 - radius);
        ctx.lineTo(x - padding, y - padding + radius);
        ctx.quadraticCurveTo(x - padding, y - padding, x - padding + radius, y - padding);
        ctx.closePath();
        ctx.fillStyle = 'white';
        ctx.fill();

        // მომრგვალებული ლოგო
        ctx.save();
        ctx.beginPath();
        ctx.moveTo(x + radius, y);
        ctx.lineTo(x + logoSizeScaled - radius, y);
        ctx.quadraticCurveTo(x + logoSizeScaled, y, x + logoSizeScaled, y + radius);
        ctx.lineTo(x + logoSizeScaled, y + logoSizeScaled - radius);
        ctx.quadraticCurveTo(x + logoSizeScaled, y + logoSizeScaled, x + logoSizeScaled - radius, y + logoSizeScaled);
        ctx.lineTo(x + radius, y + logoSizeScaled);
        ctx.quadraticCurveTo(x, y + logoSizeScaled, x, y + logoSizeScaled - radius);
        ctx.lineTo(x, y + radius);
        ctx.quadraticCurveTo(x, y, x + radius, y);
        ctx.closePath();
        ctx.clip();
        ctx.drawImage(logo, x, y, logoSizeScaled, logoSizeScaled);
        ctx.restore();
      };
      logo.src = this.logoImage!;
    };

    // ორიგინალი QR კოდიდან ვხატავთ ყოველ ჯერზე
    qrImage.src = this.originalQRCanvas!;
  }, 150);
}


downloadPDF(): void {
  const qrCodeElement = document.querySelector('.qr-canvas canvas') as HTMLCanvasElement;
  
  if (!qrCodeElement) {
    alert('QR code not found!');
    return;
  }
  
  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });
  
  const imgData = qrCodeElement.toDataURL('image/png');
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  
  const qrWidth = 80;
  const qrHeight = 80;
  const x = (pageWidth - qrWidth) / 2;
  const y = 40;
  
  pdf.setFontSize(20);
  pdf.text('QR Code', pageWidth / 2, 25, { align: 'center' });
  
  pdf.addImage(imgData, 'PNG', x, y, qrWidth, qrHeight);
  
  // URL/ტექსტი - მხოლოდ ლათინური სიმბოლოები დარჩება
  const safeText = this.qrCodeValue.replace(/[^\x00-\x7F]/g, '');
  
  pdf.setFontSize(12);
  const textY = y + qrHeight + 15;
  const maxWidth = pageWidth - 40;
  const lines = pdf.splitTextToSize(safeText || this.qrCodeValue, maxWidth);
  pdf.text(lines, pageWidth / 2, textY, { align: 'center' });
  
  pdf.setFontSize(10);
  pdf.setTextColor(128, 128, 128);
  const date = new Date().toLocaleDateString('en-GB');
  pdf.text(`Date: ${date}`, pageWidth / 2, pageHeight - 15, { align: 'center' });
  
  const fileName = `qr-code-${Date.now()}.pdf`;
  pdf.save(fileName);
}
  downloadImage(): void {
    const qrCodeElement = document.querySelector('.qr-canvas canvas') as HTMLCanvasElement;
    
    if (!qrCodeElement) {
      alert('QR კოდი ვერ მოიძებნა!');
      return;
    }
    
    const url = qrCodeElement.toDataURL('image/png');
    const link = document.createElement('a');
    link.href = url;
    link.download = `qr-code-${Date.now()}.png`;
    link.click();
  }
  
  clearQRCode(): void {
    this.qrCodeValue = '';
    this.logoImage = null;
  }
}
