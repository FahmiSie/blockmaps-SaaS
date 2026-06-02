// types/midtrans.d.ts — client-side window.snap types

export interface SnapCallbacks {
  onSuccess?: (result: SnapResult) => void;
  onPending?: (result: SnapResult) => void;
  onError?:   (result: SnapResult) => void;
  onClose?:   () => void;
}

export interface SnapResult {
  order_id:           string;
  transaction_status: string;
  fraud_status?:      string;
  payment_type?:      string;
}

export interface Snap {
  pay: (snapToken: string, callbacks?: SnapCallbacks) => void;
  hide: () => void;
}

declare global {
  interface Window {
    snap: Snap;
  }
}

export {};