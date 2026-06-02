declare module "midtrans-client" {
  interface MidtransConfig {
    isProduction: boolean;
    serverKey: string;
    clientKey?: string;
  }

  interface TransactionStatus {
    order_id:           string;
    transaction_status: string;
    payment_type:       string;
    fraud_status?:      string;
    gross_amount:       string;
    currency:           string;
  }

  interface TransactionApi {
    status: (orderId: string) => Promise<TransactionStatus>;
  }

  class Snap {
    constructor(config: MidtransConfig);
    createTransaction(parameter: object): Promise<{ token: string; redirect_url: string }>;
    transaction: TransactionApi;
  }

  class CoreApi {
    constructor(config: MidtransConfig);
    transaction: TransactionApi;
  }

  export { Snap, CoreApi };
}