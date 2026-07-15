'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { useAuth } from './auth-context';
import { api } from './api';

const DEFAULTS: Record<string, boolean> = {
  // Trainer — PT module always on; finance/reports/settings off by default
  perm_trainer_pt_module: true,
  perm_trainer_finance: false,
  perm_trainer_reports: false,
  perm_trainer_insights: false,
  perm_trainer_settings: false,
  perm_trainer_all_pt_clients: false,
  perm_trainer_commissions: true,
  perm_trainer_record_payment: false,
  // Receptionist — PT module off; record payment on; finance/reports/settings off
  perm_reception_pt_module: false,
  perm_reception_finance: false,
  perm_reception_reports: false,
  perm_reception_insights: false,
  perm_reception_settings: false,
  perm_reception_record_payment: true,
};

interface PermissionsCtx {
  can: (feature: string) => boolean;
  perms: Record<string, boolean>;
  loaded: boolean;
}

const Ctx = createContext<PermissionsCtx>({
  can: () => true,
  perms: DEFAULTS,
  loaded: false,
});

export function PermissionsProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [perms, setPerms] = useState<Record<string, boolean>>(DEFAULTS);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!user) return;
    api.settings.getPermissions()
      .then(r => { setPerms({ ...DEFAULTS, ...r.permissions }); setLoaded(true); })
      .catch(() => setLoaded(true));
  }, [user]);

  const role = user?.role === 'receptionist' ? 'reception' : user?.role;

  const can = (feature: string): boolean => {
    if (!user) return false;
    if (user.role === 'admin' || user.role === 'manager') return true;
    const key = `perm_${role}_${feature}`;
    return perms[key] ?? DEFAULTS[key] ?? false;
  };

  return <Ctx.Provider value={{ can, perms, loaded }}>{children}</Ctx.Provider>;
}

export function usePermissions() {
  return useContext(Ctx);
}
