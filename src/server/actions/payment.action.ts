"use server";

import MidtransClient from "midtrans-client";

const snap = new MidtransClient.Snap({
  isProduction: process.env.MIDTRANS_IS_PRODUCTION === "true",
  serverKey: process.env.MIDTRANS_SERVER_KEY!,
  clientKey: process.env.MIDTRANS_CLIENT_KEY!,
});

export const coreApi = new MidtransClient.CoreApi({
  isProduction: process.env.MIDTRANS_IS_PRODUCTION === "true",
  serverKey: process.env.MIDTRANS_SERVER_KEY!,
  clientKey: process.env.MIDTRANS_CLIENT_KEY!,
});

export async function createMidtransTransaction({
  orderId,
  amount,
  userId,
  description,
}: {
  orderId: string;
  amount: number;
  userId: string;
  description?: string;
}): Promise<string> {
  const parameter = {
    transaction_details: {
      order_id: orderId,
      gross_amount: amount,
    },
    custom_field1: userId,
    item_details: [
      {
        id: "workspace",
        price: amount,
        quantity: 1,
        name: description ?? "BlockMaps Workspace",
      },
    ],
  };

  const transaction = await snap.createTransaction(parameter);
  return transaction.token as string;
}