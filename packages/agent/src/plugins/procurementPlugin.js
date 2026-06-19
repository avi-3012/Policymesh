import {
  ProcureFilecoinStorageTool,
  ProcureAkashComputeTool,
  SwapHbarToFilTool,
  SwapHbarToAktTool,
} from '../tools/ProcurementTools.js';

export const procurementPlugin = {
  name: 'policymesh-procurement',
  version: '1.0.0',
  description: 'PolicyMesh decentralized infrastructure procurement tools',
  tools: (context) => [
    new ProcureFilecoinStorageTool(),
    new ProcureAkashComputeTool(),
    new SwapHbarToFilTool(),
    new SwapHbarToAktTool(),
  ],
};

export const procurementToolMethods = [
  'procure_filecoin_storage',
  'procure_akash_compute',
  'swap_hbar_to_fil',
  'swap_hbar_to_akt',
];
