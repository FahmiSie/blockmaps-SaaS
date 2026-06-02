import { NextResponse } from "next/server";
import crypto from "crypto";
import { prisma } from "@/server/db";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      order_id,
      status_code,
      gross_amount,
      signature_key,
      transaction_status,
      payment_type,
    } = body;

    // Validate Signature Key
    // signature_key = sha512(order_id + status_code + gross_amount + ServerKey)
    const serverKey = process.env.MIDTRANS_SERVER_KEY;
    if (!serverKey) {
      console.error("MIDTRANS_SERVER_KEY is not set in environment variables");
      return NextResponse.json({ error: "Server misconfiguration" }, { status: 500 });
    }

    const signaturePayload = `${order_id}${status_code}${gross_amount}${serverKey}`;
    const calculatedSignature = crypto
      .createHash("sha512")
      .update(signaturePayload)
      .digest("hex");

    if (signature_key !== calculatedSignature) {
      console.warn(`[Midtrans Webhook] Invalid signature key for order: ${order_id}`);
      return NextResponse.json({ error: "Invalid signature" }, { status: 403 });
    }

    console.log(`[Midtrans Webhook] Received notification for ${order_id}: status = ${transaction_status}`);

    // Update Transaction in DB
    const tx = await prisma.transaction.findUnique({
      where: { order_id },
    });

    if (!tx) {
      console.warn(`[Midtrans Webhook] Transaction not found: ${order_id}`);
      return NextResponse.json({ error: "Transaction not found" }, { status: 404 });
    }

    await prisma.transaction.update({
      where: { order_id },
      data: {
        status: transaction_status,
        payment_type: payment_type ?? null,
      },
    });

    // Update Company to Active if transaction succeeded
    if (transaction_status === "settlement" || transaction_status === "capture") {
      await prisma.company.update({
        where: { id: tx.company_id },
        data: { status: "Active" },
      });
      console.log(`[Midtrans Webhook] Company ${tx.company_id} activated successfully.`);
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[Midtrans Webhook Error]:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
