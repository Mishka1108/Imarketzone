// src/app/components/admin/admin-dashboard/admin-dashboard.component.ts
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AdminService } from '../services/admin.service';
import { AdminAuthService } from '../services/admin-auth.service';
import { User } from '../models/user.model';

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './admin-dashboard.component.html',
  styleUrls: ['./admin-dashboard.component.scss'],
})
export class AdminDashboardComponent implements OnInit {
  users: User[] = [];
  filteredUsers: User[] = [];
  selectedUser: User | null = null;
  loading = false;
  error = '';
  searchTerm = '';
  deletingUserId: string | null = null;
  // ახალი ცვლადი მოდალის ლოდინგისთვის
  modalLoading = false;

  constructor(
    private adminService: AdminService,
    private adminAuthService: AdminAuthService
  ) { }

  ngOnInit(): void {
    this.loadUsers();
    console.log("კომპონენტი ინიციალიზებულია");
  }

  loadUsers(): void {
    this.loading = true;
    this.error = '';
    console.log("მომხმარებლების ჩატვირთვა დაიწყო");

    this.adminService.getUsers().subscribe({
      next: (response: any) => {
        console.log("API პასუხი:", response);
        let users: User[] = [];
        
        if (Array.isArray(response)) {
          users = response;
        } else if (response && typeof response === 'object') {
          if (Array.isArray(response.users)) {
            users = response.users;
          } else if (Array.isArray(response.data)) {
            users = response.data;
          } else if (Array.isArray(response.items)) {
            users = response.items;
          } else {
            const possibleArrays = Object.values(response).find(value => Array.isArray(value));
            if (possibleArrays) {
              users = possibleArrays as User[];
            } else {
              console.error('ვერ მოხერხდა მომხმარებლების მასივის მოძიება პასუხში:', response);
              this.error = 'მონაცემების არასწორი ფორმატი მიღებულია სერვერიდან.';
            }
          }
        }
        
        console.log("მომხმარებლები ჩატვირთულია:", users);
        this.users = users;
        this.filteredUsers = [...users];
        this.loading = false;
      },
      error: (err: any) => {
        console.error('მომხმარებლების ჩატვირთვის შეცდომა:', err);
        this.error = 'მომხმარებლების ჩატვირთვა ვერ მოხერხდა. გთხოვთ სცადოთ მოგვიანებით.';
        this.loading = false;
      }
    });
  }

  searchUsers(): void {
    if (!this.searchTerm.trim()) {
      this.filteredUsers = [...this.users];
      return;
    }

    const term = this.searchTerm.toLowerCase().trim();
    this.filteredUsers = this.users.filter(user => 
      user.name?.toLowerCase().includes(term) ||
      user.secondName?.toLowerCase().includes(term) ||
      user.email?.toLowerCase().includes(term) ||
      (user.personalNumber?.toString().toLowerCase().includes(term) || false)
    );
    console.log("ძიების შედეგები:", this.filteredUsers.length);
  }

  viewUserDetails(userId: string): void {
    if (!userId) {
      console.error('მომხმარებლის ID არ არის მოწოდებული');
      return;
    }

    console.log(`მომხმარებლის დეტალების მოთხოვნა ID-თ: ${userId}`);
    
    // პირველ რიგში ვცადოთ არსებული users სიიდან მოძიება
    const existingUser = this.users.find(user => user._id === userId);
    if (existingUser) {
      console.log("მომხმარებელი ნაპოვნია არსებულ სიაში:", existingUser);
      this.selectedUser = { ...existingUser }; // კოპია გავაკეთოთ
      return;
    }

    // თუ არ ნაპოვნია, მაშინ API-დან მოვითხოვოთ
    this.modalLoading = true;
    this.adminService.getUserDetails(userId).subscribe({
      next: (user: User) => {
        console.log("მომხმარებლის დეტალები მიღებულია API-დან:", user);
        this.selectedUser = user;
        this.modalLoading = false;
      },
      error: (err: any) => {
        console.error('მომხმარებლის დეტალების მოთხოვნის შეცდომა:', err);
        this.modalLoading = false;
        this.showErrorMessage('მომხმარებლის დეტალების ჩატვირთვა ვერ მოხერხდა.');
      }
    });
  }

  toggleUserVerification(user: User): void {
    const newStatus = !user.isVerified;
    console.log(`მომხმარებლის სტატუსის ცვლილება: ${user._id}, ახალი სტატუსი: ${newStatus}`);
    
    this.adminService.updateUserStatus(user._id!, { isVerified: newStatus }).subscribe({
      next: (response: any) => {
        console.log("სტატუსი განახლებულია:", response);
        
        // ცვლილება მიმდინარე მომხმარებლისთვის
        user.isVerified = newStatus;
        
        // ასევე განახლება მთავარი სიისთვის
        const index = this.users.findIndex(u => u._id === user._id);
        if (index >= 0) {
          this.users[index].isVerified = newStatus;
        }
        
        // განახლება ფილტრირებული სიისთვის
        const filteredIndex = this.filteredUsers.findIndex(u => u._id === user._id);
        if (filteredIndex >= 0) {
          this.filteredUsers[filteredIndex].isVerified = newStatus;
        }
        
        // და მოდალის მომხმარებლისთვის, თუ იგივეა
        if (this.selectedUser && this.selectedUser._id === user._id) {
          this.selectedUser.isVerified = newStatus;
        }
        
        // Success შეტყობინება
        this.showSuccessMessage(newStatus ? 'მომხმარებელი წარმატებით ვერიფიცირებულია.' : 'მომხმარებლის ვერიფიკაცია გაუქმებულია.');
      },
      error: (err: any) => {
        console.error('მომხმარებლის სტატუსის განახლების შეცდომა:', err);
        this.showErrorMessage('სტატუსის განახლება ვერ მოხერხდა. გთხოვთ, სცადოთ მოგვიანებით.');
      }
    });
  }

  deleteUser(userId: string): void {
    if (confirm('დარწმუნებული ხართ, რომ გსურთ ამ მომხმარებლის წაშლა?')) {
      this.deletingUserId = userId;
      console.log(`მომხმარებლის წაშლა დაიწყო: ${userId}`);
      
      this.adminService.deleteUser(userId).subscribe({
        next: () => {
          console.log("მომხმარებელი წაშლილია");
          this.users = this.users.filter(user => user._id !== userId);
          this.filteredUsers = this.filteredUsers.filter(user => user._id !== userId);
          
          if (this.selectedUser && this.selectedUser._id === userId) {
            this.selectedUser = null;
          }
          
          this.deletingUserId = null;
          this.showSuccessMessage('მომხმარებელი წარმატებით წაიშალა.');
        },
        error: (err: any) => {
          console.error('მომხმარებლის წაშლის შეცდომა:', err);
          this.showErrorMessage('მომხმარებლის წაშლა ვერ მოხერხდა. გთხოვთ, სცადოთ მოგვიანებით.');
          this.deletingUserId = null;
        }
      });
    }
  }

  closeModal(event?: MouseEvent): void {
    if (!event || (event.target as HTMLElement).className === 'modal') {
      this.selectedUser = null;
      this.modalLoading = false;
    }
  }

  logout(): void {
    console.log("მიმდინარეობს გამოსვლა...");
    this.adminAuthService.logout();
  }

  // დამატებითი მეთოდები შეტყობინებებისთვის
  private showSuccessMessage(message: string): void {
    // აქ შეგიძლიათ toast notification-ი ან სხვა UI component-ი გამოიყენოთ
    alert(message); // დროებით alert-ს ვიყენებთ
  }

  private showErrorMessage(message: string): void {
    // აქ შეგიძლიათ toast notification-ი ან სხვა UI component-ი გამოიყენოთ
    alert(message); // დროებით alert-ს ვიყენებთ
  }

  // Debug მეთოდი - შეგიძლიათ კონსოლში შეამოწმოთ selectedUser-ის მნიშვნელობა
  debugSelectedUser(): void {
    console.log('selectedUser მნიშვნელობა:', this.selectedUser);
    console.log('modalLoading მნიშვნელობა:', this.modalLoading);
    console.log('ყველა მომხმარებელი:', this.users);
    console.log('ფილტრირებული მომხმარებლები:', this.filteredUsers);
  }

  // TrackBy ფუნქცია ngFor-ისთვის
  trackByUserId = (index: number, user: User): string => {
    return user._id || index.toString();
  }
}