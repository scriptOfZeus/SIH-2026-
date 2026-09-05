/**
 * Payout & Financial Calculation Service (Phase 6)
 *
 * Implements:
 *  - Authoritative server-side price calculation with quantity & minimum quantity
 *  - Exact integer-paise commission splits:
 *      * Federation Worker:  85% Worker, 7% Insurance, 4% Federation, 4% Platform (Total = 100%)
 *      * Independent Worker: 85% Worker, 10% Insurance, 0% Federation, 5% Platform (Total = 100%)
 *  - Zero rounding drift: Worker + Insurance + Federation + Platform === Gross (Paise exact)
 *  - Idempotent financial allocation to payment_ledger and welfare_contributions
 *  - Auditable refund & dispute reversal logging
 */

const { v4: uuidv4 } = require('uuid');

/**
 * Calculate booking financials in exact integer paise and formatted rupees
 *
 * @param {Object} params
 * @param {number} [params.baseUnitPrice] - Price in INR (e.g. 300)
 * @param {number} [params.baseUnitPricePaise] - Price in integer paise (e.g. 30000)
 * @param {number} [params.quantity=1] - Requested quantity
 * @param {number} [params.minimumQuantity=1] - Minimum quantity requirement from catalog
 * @param {string} [params.workerType='federation'] - 'federation' | 'independent'
 * @returns {Object} Authoritative financial breakdown
 */
function calculateBookingFinancials({
  baseUnitPrice,
  baseUnitPricePaise,
  quantity = 1,
  minimumQuantity = 1,
  workerType = 'federation',
}) {
  const reqQty = Math.max(1, parseInt(quantity, 10) || 1);
  const minQty = Math.max(1, parseInt(minimumQuantity, 10) || 1);
  const effectiveQty = Math.max(reqQty, minQty);

  let unitPaise;
  if (baseUnitPricePaise !== undefined && !isNaN(parseInt(baseUnitPricePaise, 10))) {
    unitPaise = parseInt(baseUnitPricePaise, 10);
  } else if (baseUnitPrice !== undefined && !isNaN(parseFloat(baseUnitPrice))) {
    unitPaise = Math.round(parseFloat(baseUnitPrice) * 100);
  } else {
    throw new Error('Valid baseUnitPrice or baseUnitPricePaise is required');
  }

  if (unitPaise < 0) {
    throw new Error('Base service price cannot be negative');
  }

  const grossPaise = unitPaise * effectiveQty;
  const isFederation = workerType === 'federation';

  let workerPaise, insurancePaise, federationPaise, platformPaise;

  if (isFederation) {
    // Federation Split: 85% Worker, 7% Insurance, 4% Federation, 4% Platform
    workerPaise = Math.round(grossPaise * 0.85);
    insurancePaise = Math.round(grossPaise * 0.07);
    federationPaise = Math.round(grossPaise * 0.04);
    // Residual platform fee guarantees 100% exact equality with gross
    platformPaise = grossPaise - workerPaise - insurancePaise - federationPaise;
  } else {
    // Independent Split: 85% Worker, 10% Insurance, 0% Federation, 5% Platform
    workerPaise = Math.round(grossPaise * 0.85);
    insurancePaise = Math.round(grossPaise * 0.10);
    federationPaise = 0;
    // Residual platform fee guarantees 100% exact equality with gross
    platformPaise = grossPaise - workerPaise - insurancePaise;
  }

  // Strict invariant verification
  const totalAllocatedPaise = workerPaise + insurancePaise + federationPaise + platformPaise;
  if (totalAllocatedPaise !== grossPaise) {
    throw new Error(`Financial reconciliation assertion failed: ${totalAllocatedPaise} !== ${grossPaise}`);
  }

  return {
    base_unit_price: +(unitPaise / 100).toFixed(2),
    base_unit_price_paise: unitPaise,
    requested_quantity: reqQty,
    minimum_quantity: minQty,
    effective_quantity: effectiveQty,

    gross_amount: +(grossPaise / 100).toFixed(2),
    gross_amount_paise: grossPaise,

    worker_type: isFederation ? 'federation' : 'independent',

    worker_share: +(workerPaise / 100).toFixed(2),
    worker_share_paise: workerPaise,
    worker_percentage: 85,

    insurance_share: +(insurancePaise / 100).toFixed(2),
    insurance_share_paise: insurancePaise,
    insurance_percentage: isFederation ? 7 : 10,

    federation_share: +(federationPaise / 100).toFixed(2),
    federation_share_paise: federationPaise,
    federation_percentage: isFederation ? 4 : 0,

    platform_fee: +(platformPaise / 100).toFixed(2),
    platform_fee_paise: platformPaise,
    platform_percentage: isFederation ? 4 : 5,

    total_allocated: +(totalAllocatedPaise / 100).toFixed(2),
    total_allocated_paise: totalAllocatedPaise,
    reconciled: true,
  };
}

/**
 * Idempotently allocate a verified payment into payment_ledger and welfare_contributions
 *
 * @param {Object} params
 * @param {string} params.bookingId
 * @param {string} params.paymentId
 * @param {string} [params.idempotencyKey]
 * @param {Object} params.db
 * @returns {Promise<Object>} The allocated payment_ledger entry
 */
async function allocateBookingPayment({ bookingId, paymentId, idempotencyKey, db }) {
  const effectiveKey = idempotencyKey || `alloc_${paymentId || bookingId}`;

  // 1. Check idempotency: Return existing ledger entry if already created
  const existingLedger = await db.get(
    'SELECT * FROM payment_ledger WHERE idempotency_key = ? OR (payment_id = ? AND transaction_type = ?)',
    [effectiveKey, paymentId, 'payment']
  );
  if (existingLedger) {
    return { entry: existingLedger, isDuplicate: true };
  }

  // 2. Fetch booking and payment details
  const booking = await db.get('SELECT * FROM bookings WHERE id = ?', [bookingId]);
  if (!booking) throw new Error(`Booking ${bookingId} not found`);

  const payment = await db.get('SELECT * FROM payments WHERE id = ?', [paymentId]);
  if (!payment) throw new Error(`Payment ${paymentId} not found`);

  // 3. Determine worker and authoritative worker type
  let workerType = 'independent';
  let federationId = null;

  if (booking.worker_id) {
    const worker = await db.get('SELECT id, federation_id, worker_type FROM workers WHERE id = ?', [booking.worker_id]);
    if (worker) {
      federationId = worker.federation_id || null;
      workerType = (federationId !== null && worker.worker_type !== 'independent') ? 'federation' : 'independent';
    }
  } else if (booking.federation_id) {
    federationId = booking.federation_id;
    workerType = 'federation';
  }

  // 4. Determine gross amount and unit price
  let baseUnitPricePaise = booking.service_unit_price_paise;
  let quantity = booking.quantity || 1;
  let minQuantity = booking.minimum_quantity || 1;

  if (!baseUnitPricePaise) {
    if (booking.service_unit_price) {
      baseUnitPricePaise = Math.round(booking.service_unit_price * 100);
    } else {
      // Use payment amount as gross fallback
      baseUnitPricePaise = Math.round(payment.amount * 100);
      quantity = 1;
      minQuantity = 1;
    }
  }

  const financials = calculateBookingFinancials({
    baseUnitPricePaise,
    quantity,
    minimumQuantity: minQuantity,
    workerType,
  });

  const ledgerId = uuidv4();

  // 5. Execute atomic database insertion
  await db.exec('BEGIN');
  try {
    await db.run(`
      INSERT INTO payment_ledger (
        id, booking_id, payment_id, worker_id, federation_id, worker_type,
        gross_amount_paise, worker_amount_paise, insurance_amount_paise, federation_amount_paise, platform_amount_paise,
        gross_amount, worker_amount, insurance_amount, federation_amount, platform_amount,
        currency, transaction_type, status, reconciled, idempotency_key
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'INR', 'payment', 'paid', 1, ?)
    `, [
      ledgerId,
      bookingId,
      paymentId,
      booking.worker_id || null,
      federationId,
      financials.worker_type,
      financials.gross_amount_paise,
      financials.worker_share_paise,
      financials.insurance_share_paise,
      financials.federation_share_paise,
      financials.platform_fee_paise,
      financials.gross_amount,
      financials.worker_share,
      financials.insurance_share,
      financials.federation_share,
      financials.platform_fee,
      effectiveKey,
    ]);

    // Record into welfare_contributions
    if (financials.insurance_share > 0 && booking.worker_id) {
      const contribId = uuidv4();
      await db.run(`
        INSERT INTO welfare_contributions (
          id, worker_id, booking_id, payment_id, federation_id, amount
        )
        VALUES (?, ?, ?, ?, ?, ?)
      `, [
        contribId,
        booking.worker_id,
        bookingId,
        paymentId,
        federationId || 'FED-INDEPENDENT',
        financials.insurance_share,
      ]);

      // Update active enrollment accumulated counter if exists
      await db.run(`
        UPDATE worker_welfare_enrollments
        SET total_contributions_accumulated = total_contributions_accumulated + ?,
            last_contribution_at = CURRENT_TIMESTAMP
        WHERE worker_id = ? AND status = 'active'
      `, [financials.insurance_share, booking.worker_id]);
    }

    // Update payments table with authoritative split fields
    await db.run(`
      UPDATE payments
      SET worker_type = ?,
          worker_payout = ?,
          worker_payout_paise = ?,
          welfare_deduction = ?,
          insurance_deduction_paise = ?,
          federation_share = ?,
          federation_share_paise = ?,
          platform_commission = ?,
          platform_commission_paise = ?,
          amount_paise = ?,
          split_status = 'allocated'
      WHERE id = ?
    `, [
      financials.worker_type,
      financials.worker_share,
      financials.worker_share_paise,
      financials.insurance_share,
      financials.insurance_share_paise,
      financials.federation_share,
      financials.federation_share_paise,
      financials.platform_fee,
      financials.platform_fee_paise,
      financials.gross_amount_paise,
      paymentId,
    ]);

    // Update bookings table pricing snapshot with final calculated shares
    await db.run(`
      UPDATE bookings
      SET worker_payout = ?,
          worker_payout_paise = ?,
          insurance_contribution = ?,
          insurance_contribution_paise = ?,
          federation_share = ?,
          federation_share_paise = ?,
          platform_fee = ?,
          platform_fee_paise = ?,
          gross_amount = ?,
          gross_amount_paise = ?
      WHERE id = ?
    `, [
      financials.worker_share,
      financials.worker_share_paise,
      financials.insurance_share,
      financials.insurance_share_paise,
      financials.federation_share,
      financials.federation_share_paise,
      financials.platform_fee,
      financials.platform_fee_paise,
      financials.gross_amount,
      financials.gross_amount_paise,
      bookingId,
    ]);

    await db.exec('COMMIT');
  } catch (txErr) {
    await db.exec('ROLLBACK');
    throw txErr;
  }

  const createdLedger = await db.get('SELECT * FROM payment_ledger WHERE id = ?', [ledgerId]);
  return { entry: createdLedger, isDuplicate: false, financials };
}

/**
 * Create an auditable refund reversal entry in payment_ledger
 *
 * @param {Object} params
 * @param {string} params.bookingId
 * @param {string} params.paymentId
 * @param {number} params.refundAmount - In INR
 * @param {string} [params.reason='dispute_refund']
 * @param {string} [params.adminId]
 * @param {string} [params.idempotencyKey]
 * @param {Object} params.db
 * @returns {Promise<Object>}
 */
async function createRefundReversal({
  bookingId,
  paymentId,
  refundAmount,
  reason = 'dispute_refund',
  adminId = null,
  idempotencyKey = null,
  db,
}) {
  const effectiveKey = idempotencyKey || `rev_${paymentId}_${Math.round(refundAmount * 100)}`;

  // Prevent duplicate refund allocation
  const existing = await db.get('SELECT * FROM payment_ledger WHERE idempotency_key = ?', [effectiveKey]);
  if (existing) {
    return { entry: existing, isDuplicate: true };
  }

  const payment = await db.get('SELECT * FROM payments WHERE id = ?', [paymentId]);
  if (!payment) throw new Error(`Payment ${paymentId} not found`);

  const originalLedger = await db.get(
    'SELECT * FROM payment_ledger WHERE payment_id = ? AND transaction_type = ?',
    [paymentId, 'payment']
  );

  const refundPaise = Math.round(refundAmount * 100);
  const grossPaise = originalLedger ? originalLedger.gross_amount_paise : Math.round(payment.amount * 100);
  const isFederation = originalLedger ? originalLedger.worker_type === 'federation' : (payment.federation_id !== null);

  // Proportional reversal computation
  const ratio = grossPaise > 0 ? (refundPaise / grossPaise) : 1;
  const revWorkerPaise = -Math.round((originalLedger ? originalLedger.worker_amount_paise : Math.round(payment.amount * 0.85 * 100)) * ratio);
  const revInsurancePaise = -Math.round((originalLedger ? originalLedger.insurance_amount_paise : Math.round(payment.amount * (isFederation ? 0.07 : 0.10) * 100)) * ratio);
  const revFedPaise = isFederation ? -Math.round((originalLedger ? originalLedger.federation_amount_paise : Math.round(payment.amount * 0.04 * 100)) * ratio) : 0;
  const revPlatformPaise = -(refundPaise + revWorkerPaise + revInsurancePaise + revFedPaise); // residual

  const reversalId = uuidv4();
  await db.run(`
    INSERT INTO payment_ledger (
      id, booking_id, payment_id, worker_id, federation_id, worker_type,
      gross_amount_paise, worker_amount_paise, insurance_amount_paise, federation_amount_paise, platform_amount_paise,
      gross_amount, worker_amount, insurance_amount, federation_amount, platform_amount,
      currency, transaction_type, status, reconciled, idempotency_key
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'INR', 'refund', 'refunded', 1, ?)
  `, [
    reversalId,
    bookingId,
    paymentId,
    originalLedger?.worker_id || null,
    originalLedger?.federation_id || payment.federation_id || null,
    originalLedger?.worker_type || (isFederation ? 'federation' : 'independent'),
    -refundPaise,
    revWorkerPaise,
    revInsurancePaise,
    revFedPaise,
    revPlatformPaise,
    -refundAmount,
    +(revWorkerPaise / 100).toFixed(2),
    +(revInsurancePaise / 100).toFixed(2),
    +(revFedPaise / 100).toFixed(2),
    +(revPlatformPaise / 100).toFixed(2),
    effectiveKey,
  ]);

  const reversalEntry = await db.get('SELECT * FROM payment_ledger WHERE id = ?', [reversalId]);
  return { entry: reversalEntry, isDuplicate: false };
}

module.exports = {
  calculateBookingFinancials,
  allocateBookingPayment,
  createRefundReversal,
};
