// src/app/guards/admin.guard.ts
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { AdminAuthService } from '../services/admin-auth.service';

export const adminGuard = () => {
  const adminAuthService = inject(AdminAuthService);
  const router = inject(Router);

  if (adminAuthService.isAdmin()) {
    return true;
  }
  
  // თუ ადმინი არ არის, გადამისამართება login გვერდზე
  return router.createUrlTree(['/admin/login']);
};