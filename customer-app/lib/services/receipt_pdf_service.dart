import 'dart:typed_data';
import 'package:pdf/pdf.dart';
import 'package:pdf/widgets.dart' as pw;
import 'package:printing/printing.dart';
import '../models/booking_model.dart';
import '../models/payment_model.dart';

/// Service for generating, printing, downloading, and sharing formal PDF Service Receipts.
class ReceiptPdfService {
  /// Generates the raw PDF bytes for a booking receipt.
  static Future<Uint8List> generateReceiptPdf({
    required BookingModel booking,
    PaymentModel? payment,
    String? customerName,
    String? customerPhone,
    String? customerAddress,
  }) async {
    final pdf = pw.Document();

    final laborAmount = booking.grossAmount ?? (booking.totalAmount - (booking.partsFee > 0 ? booking.partsFee : 0.0));
    final partsAmount = booking.partsFee;
    final platformCommission = payment?.platformCommission ?? (laborAmount * 0.04);
    final welfareDeduction = payment?.welfareDeduction ?? (laborAmount * 0.07);
    final totalAmount = laborAmount + partsAmount;
    final transactionId = payment?.id ?? 'TXN_${booking.id.substring(0, booking.id.length > 8 ? 8 : booking.id.length).toUpperCase()}_PAID';
    final bookingShortId = booking.shortCode ?? booking.id.substring(0, booking.id.length > 8 ? 8 : booking.id.length).toUpperCase();

    pdf.addPage(
      pw.Page(
        pageFormat: PdfPageFormat.a4,
        margin: const pw.EdgeInsets.all(36),
        build: (pw.Context context) {
          return pw.Column(
            crossAxisAlignment: pw.CrossAxisAlignment.start,
            children: [
              // Header
              pw.Container(
                padding: const pw.EdgeInsets.only(bottom: 16),
                decoration: const pw.BoxDecoration(
                  border: pw.Border(bottom: pw.BorderSide(color: PdfColors.blue800, width: 2)),
                ),
                child: pw.Row(
                  mainAxisAlignment: pw.MainAxisAlignment.spaceBetween,
                  crossAxisAlignment: pw.CrossAxisAlignment.start,
                  children: [
                    pw.Column(
                      crossAxisAlignment: pw.CrossAxisAlignment.start,
                      children: [
                        pw.Text(
                          'SAHKAR SEWA',
                          style: pw.TextStyle(
                            fontSize: 20,
                            fontWeight: pw.FontWeight.bold,
                            color: PdfColors.blue900,
                          ),
                        ),
                        pw.SizedBox(height: 4),
                        pw.Text(
                          'NSDC Certified Sahkar Sewa Platform',
                          style: const pw.TextStyle(fontSize: 10, color: PdfColors.grey700),
                        ),
                        pw.Text(
                          'Formal Worker Welfare Network',
                          style: const pw.TextStyle(fontSize: 10, color: PdfColors.grey700),
                        ),
                      ],
                    ),
                    pw.Column(
                      crossAxisAlignment: pw.CrossAxisAlignment.end,
                      children: [
                        pw.Container(
                          padding: const pw.EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                          decoration: pw.BoxDecoration(
                            color: PdfColors.green50,
                            border: pw.Border.all(color: PdfColors.green700),
                            borderRadius: const pw.BorderRadius.all(pw.Radius.circular(4)),
                          ),
                          child: pw.Text(
                            'PAID & SETTLED',
                            style: pw.TextStyle(
                              fontSize: 10,
                              fontWeight: pw.FontWeight.bold,
                              color: PdfColors.green800,
                            ),
                          ),
                        ),
                        pw.SizedBox(height: 6),
                        pw.Text('Receipt #: RCP-$bookingShortId', style: pw.TextStyle(fontSize: 10, fontWeight: pw.FontWeight.bold)),
                        pw.Text('Date: ${booking.scheduledTime}', style: const pw.TextStyle(fontSize: 9, color: PdfColors.grey700)),
                      ],
                    ),
                  ],
                ),
              ),

              pw.SizedBox(height: 20),

              // Customer & Worker info grid
              pw.Row(
                crossAxisAlignment: pw.CrossAxisAlignment.start,
                children: [
                  pw.Expanded(
                    child: pw.Container(
                      padding: const pw.EdgeInsets.all(12),
                      decoration: pw.BoxDecoration(
                        color: PdfColors.grey100,
                        borderRadius: const pw.BorderRadius.all(pw.Radius.circular(6)),
                      ),
                      child: pw.Column(
                        crossAxisAlignment: pw.CrossAxisAlignment.start,
                        children: [
                          pw.Text('BILLED TO (CUSTOMER)', style: pw.TextStyle(fontSize: 9, fontWeight: pw.FontWeight.bold, color: PdfColors.grey800)),
                          pw.SizedBox(height: 4),
                          pw.Text(customerName ?? 'Verified Customer', style: pw.TextStyle(fontSize: 12, fontWeight: pw.FontWeight.bold)),
                          if (customerPhone != null) pw.Text('Phone: $customerPhone', style: const pw.TextStyle(fontSize: 9)),
                          pw.Text('Address: ${customerAddress ?? booking.serviceAddress}', style: const pw.TextStyle(fontSize: 9)),
                        ],
                      ),
                    ),
                  ),
                  pw.SizedBox(width: 16),
                  pw.Expanded(
                    child: pw.Container(
                      padding: const pw.EdgeInsets.all(12),
                      decoration: pw.BoxDecoration(
                        color: PdfColors.blue50,
                        borderRadius: const pw.BorderRadius.all(pw.Radius.circular(6)),
                      ),
                      child: pw.Column(
                        crossAxisAlignment: pw.CrossAxisAlignment.start,
                        children: [
                          pw.Text('SERVICE PROFESSIONAL', style: pw.TextStyle(fontSize: 9, fontWeight: pw.FontWeight.bold, color: PdfColors.blue900)),
                          pw.SizedBox(height: 4),
                          pw.Text(booking.workerName ?? 'Assigned Professional', style: pw.TextStyle(fontSize: 12, fontWeight: pw.FontWeight.bold, color: PdfColors.blue900)),
                          pw.Text('Skill: ${booking.skillCategory.toUpperCase()}', style: const pw.TextStyle(fontSize: 9)),
                          pw.Text('Status: NSDC Certified & Verified', style: pw.TextStyle(fontSize: 9, color: PdfColors.green800)),
                        ],
                      ),
                    ),
                  ),
                ],
              ),

              pw.SizedBox(height: 24),

              // Line items table
              pw.Text('SERVICE & PAYMENT BREAKDOWN', style: pw.TextStyle(fontSize: 11, fontWeight: pw.FontWeight.bold, color: PdfColors.blue900)),
              pw.SizedBox(height: 8),
              pw.Table(
                border: pw.TableBorder.all(color: PdfColors.grey300, width: 0.5),
                children: [
                  pw.TableRow(
                    decoration: const pw.BoxDecoration(color: PdfColors.grey200),
                    children: [
                      pw.Padding(
                        padding: const pw.EdgeInsets.all(8),
                        child: pw.Text('Description', style: pw.TextStyle(fontSize: 10, fontWeight: pw.FontWeight.bold)),
                      ),
                      pw.Padding(
                        padding: const pw.EdgeInsets.all(8),
                        child: pw.Text('Category', style: pw.TextStyle(fontSize: 10, fontWeight: pw.FontWeight.bold)),
                      ),
                      pw.Padding(
                        padding: const pw.EdgeInsets.all(8),
                        child: pw.Text('Amount (INR)', textAlign: pw.TextAlign.right, style: pw.TextStyle(fontSize: 10, fontWeight: pw.FontWeight.bold)),
                      ),
                    ],
                  ),
                  pw.TableRow(
                    children: [
                      pw.Padding(
                        padding: const pw.EdgeInsets.all(8),
                        child: pw.Text('${booking.skillCategory.toUpperCase()} Service & Labor (Standard Rate)', style: const pw.TextStyle(fontSize: 9)),
                      ),
                      pw.Padding(
                        padding: const pw.EdgeInsets.all(8),
                        child: pw.Text('Labor', style: const pw.TextStyle(fontSize: 9)),
                      ),
                      pw.Padding(
                        padding: const pw.EdgeInsets.all(8),
                        child: pw.Text('INR ${laborAmount.toStringAsFixed(2)}', textAlign: pw.TextAlign.right, style: const pw.TextStyle(fontSize: 9)),
                      ),
                    ],
                  ),
                  pw.TableRow(
                    children: [
                      pw.Padding(
                        padding: const pw.EdgeInsets.all(8),
                        child: pw.Text('Replacement Materials & Consumables', style: const pw.TextStyle(fontSize: 9)),
                      ),
                      pw.Padding(
                        padding: const pw.EdgeInsets.all(8),
                        child: pw.Text('Parts', style: const pw.TextStyle(fontSize: 9)),
                      ),
                      pw.Padding(
                        padding: const pw.EdgeInsets.all(8),
                        child: pw.Text('INR ${partsAmount.toStringAsFixed(2)}', textAlign: pw.TextAlign.right, style: const pw.TextStyle(fontSize: 9)),
                      ),
                    ],
                  ),
                  pw.TableRow(
                    children: [
                      pw.Padding(
                        padding: const pw.EdgeInsets.all(8),
                        child: pw.Text('Cooperative Platform Technology & Dispatch Fee', style: const pw.TextStyle(fontSize: 9)),
                      ),
                      pw.Padding(
                        padding: const pw.EdgeInsets.all(8),
                        child: pw.Text('Platform Fee', style: const pw.TextStyle(fontSize: 9)),
                      ),
                      pw.Padding(
                        padding: const pw.EdgeInsets.all(8),
                        child: pw.Text('INR ${platformCommission.toStringAsFixed(2)}', textAlign: pw.TextAlign.right, style: const pw.TextStyle(fontSize: 9)),
                      ),
                    ],
                  ),
                  pw.TableRow(
                    children: [
                      pw.Padding(
                        padding: const pw.EdgeInsets.all(8),
                        child: pw.Text('Worker Social Security & Welfare Fund Contribution', style: const pw.TextStyle(fontSize: 9, color: PdfColors.blue800)),
                      ),
                      pw.Padding(
                        padding: const pw.EdgeInsets.all(8),
                        child: pw.Text('Welfare Fund', style: const pw.TextStyle(fontSize: 9, color: PdfColors.blue800)),
                      ),
                      pw.Padding(
                        padding: const pw.EdgeInsets.all(8),
                        child: pw.Text('INR ${welfareDeduction.toStringAsFixed(2)}', textAlign: pw.TextAlign.right, style: const pw.TextStyle(fontSize: 9, color: PdfColors.blue800)),
                      ),
                    ],
                  ),
                ],
              ),

              pw.SizedBox(height: 16),

              // Total Summary
              pw.Row(
                mainAxisAlignment: pw.MainAxisAlignment.end,
                children: [
                  pw.Container(
                    width: 240,
                    padding: const pw.EdgeInsets.all(12),
                    decoration: pw.BoxDecoration(
                      color: PdfColors.blue50,
                      borderRadius: const pw.BorderRadius.all(pw.Radius.circular(6)),
                      border: pw.Border.all(color: PdfColors.blue200),
                    ),
                    child: pw.Column(
                      children: [
                        pw.Row(
                          mainAxisAlignment: pw.MainAxisAlignment.spaceBetween,
                          children: [
                            pw.Text('Total Paid:', style: pw.TextStyle(fontSize: 13, fontWeight: pw.FontWeight.bold, color: PdfColors.blue900)),
                            pw.Text('INR ${totalAmount.toStringAsFixed(2)}', style: pw.TextStyle(fontSize: 14, fontWeight: pw.FontWeight.bold, color: PdfColors.blue900)),
                          ],
                        ),
                        pw.SizedBox(height: 4),
                        pw.Row(
                          mainAxisAlignment: pw.MainAxisAlignment.spaceBetween,
                          children: [
                            pw.Text('Currency:', style: const pw.TextStyle(fontSize: 9, color: PdfColors.grey700)),
                            pw.Text('Indian Rupee (INR / Rs.)', style: const pw.TextStyle(fontSize: 9, color: PdfColors.grey700)),
                          ],
                        ),
                      ],
                    ),
                  ),
                ],
              ),

              pw.Spacer(),

              // Footer & Transaction info
              pw.Container(
                padding: const pw.EdgeInsets.only(top: 12),
                decoration: const pw.BoxDecoration(
                  border: pw.Border(top: pw.BorderSide(color: PdfColors.grey300)),
                ),
                child: pw.Column(
                  crossAxisAlignment: pw.CrossAxisAlignment.start,
                  children: [
                    pw.Text('Transaction Reference: $transactionId', style: pw.TextStyle(fontSize: 8, color: PdfColors.grey800, fontWeight: pw.FontWeight.bold)),
                    pw.SizedBox(height: 2),
                    pw.Text('Booking UUID: ${booking.id}', style: const pw.TextStyle(fontSize: 8, color: PdfColors.grey600)),
                    pw.SizedBox(height: 6),
                    pw.Text(
                      'This is a computer-generated formal tax receipt for cooperative gig services. NSDC skill verified and monitored.',
                      style: const pw.TextStyle(fontSize: 8, color: PdfColors.grey600),
                    ),
                  ],
                ),
              ),
            ],
          );
        },
      ),
    );

    return pdf.save();
  }

  /// Opens the system print and PDF download preview.
  static Future<void> downloadOrPrintReceipt({
    required BookingModel booking,
    PaymentModel? payment,
    String? customerName,
    String? customerPhone,
    String? customerAddress,
  }) async {
    final pdfBytes = await generateReceiptPdf(
      booking: booking,
      payment: payment,
      customerName: customerName,
      customerPhone: customerPhone,
      customerAddress: customerAddress,
    );

    final bookingShortId = booking.shortCode ?? booking.id.substring(0, booking.id.length > 8 ? 8 : booking.id.length).toUpperCase();
    await Printing.layoutPdf(
      onLayout: (PdfPageFormat format) async => pdfBytes,
      name: 'SahkarSewa_Receipt_$bookingShortId.pdf',
    );
  }

  /// Opens the native share sheet with the generated PDF file.
  static Future<void> shareReceipt({
    required BookingModel booking,
    PaymentModel? payment,
    String? customerName,
    String? customerPhone,
    String? customerAddress,
  }) async {
    final pdfBytes = await generateReceiptPdf(
      booking: booking,
      payment: payment,
      customerName: customerName,
      customerPhone: customerPhone,
      customerAddress: customerAddress,
    );

    final bookingShortId = booking.shortCode ?? booking.id.substring(0, booking.id.length > 8 ? 8 : booking.id.length).toUpperCase();
    await Printing.sharePdf(
      bytes: pdfBytes,
      filename: 'SahkarSewa_Receipt_$bookingShortId.pdf',
    );
  }
}
