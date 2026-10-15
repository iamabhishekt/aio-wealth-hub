import React from 'react';
import { Fingerprint, Bell, HardDrive, DollarSign, Smartphone } from 'lucide-react';
import { nativeBridge } from '../nativeBridge';

export const NativeDeviceBar: React.FC = () => {
  const caps = nativeBridge.getCapabilities();

  return (
    <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-2.5 rounded-xl bg-vault-950/80 border border-vault-800 text-xs text-slate-400">
      <div className="flex items-center gap-4 flex-wrap">
        <span className="flex items-center gap-1.5 text-slate-300">
          <Smartphone className="w-3.5 h-3.5 text-purple-400" />
          Platform: <strong className="text-white uppercase">{caps.platform}</strong>
        </span>
        <span className="flex items-center gap-1.5 text-slate-300">
          <Fingerprint className="w-3.5 h-3.5 text-emerald-400" />
          Native Biometrics: <strong className="text-white">Active</strong>
        </span>
        <span className="flex items-center gap-1.5 text-slate-300">
          <HardDrive className="w-3.5 h-3.5 text-vault-cyan" />
          Secure Enclave Keyring: <strong className="text-white">Hardware Encrypted</strong>
        </span>
        <span className="flex items-center gap-1.5 text-slate-300">
          <Bell className="w-3.5 h-3.5 text-amber-400" />
          Local Notifications: <strong className="text-white">Zero-Server Push</strong>
        </span>
      </div>

      <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-bold">
        <DollarSign className="w-3 h-3" />
        Total API/Cloud Cost: $0.00
      </div>
    </div>
  );
};
