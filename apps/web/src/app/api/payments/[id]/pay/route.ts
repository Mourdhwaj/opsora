import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { requireAuth } from '@/lib/api-helpers';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth(req);
    if (user instanceof NextResponse) return user;

    const { id } = await params;
    const body = await req.json();
    const { paidAmount, paymentMethod, transactionId } = body;

    if (!paidAmount || !paymentMethod) {
      return NextResponse.json(
        { error: 'paidAmount and paymentMethod are required' },
        { status: 400 }
      );
    }

    const paymentRef = adminDb
      .collection('tenants')
      .doc(user.tenantId)
      .collection('financials')
      .doc(id);

    const paymentDoc = await paymentRef.get();
    if (!paymentDoc.exists) {
      return NextResponse.json({ error: 'Payment not found' }, { status: 404 });
    }

    const paymentData = paymentDoc.data()!;
    const newPaidAmount = (paymentData.paidAmount || 0) + paidAmount;
    const paymentStatus =
      newPaidAmount >= paymentData.totalAmount ? 'completed' : 'partial';

    const updates: Record<string, string | number> = {
      paidAmount: newPaidAmount,
      paidDate: new Date().toISOString(),
      paymentMethod,
      paymentStatus,
      updatedAt: new Date().toISOString(),
    };

    if (transactionId) {
      updates.transactionId = transactionId;
    }

    await paymentRef.update(updates);

    const updatedDoc = await paymentRef.get();
    return NextResponse.json({ data: { id: updatedDoc.id, ...updatedDoc.data() } });
  } catch {
    return NextResponse.json({ error: 'Failed to record payment' }, { status: 500 });
  }
}
