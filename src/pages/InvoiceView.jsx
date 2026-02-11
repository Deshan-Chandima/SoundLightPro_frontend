import React from 'react';
import { format, parseISO, differenceInDays } from 'date-fns';
import { Printer, FileDown, X, Mail, Package } from 'lucide-react';
import { generateInvoicePDF } from '../utils/pdfGenerator';

const InvoiceView = ({ order, customer, settings, onClose }) => {
  const handlePrint = () => {
    window.print();
  };

  if (!order) return <div className="p-10 text-center">Loading Invoice...</div>;

  const isReturned = order.status === 'Returned' && order.returnDate;
  const originalDuration = Math.max(1, differenceInDays(parseISO(order.endDate), parseISO(order.startDate)));
  const actualDuration = isReturned
    ? Math.max(1, differenceInDays(parseISO(order.returnDate), parseISO(order.startDate)))
    : originalDuration;

  const durationDays = actualDuration;

  const discountAmt = order.discountType === 'percentage'
    ? (order.subtotalAmount * order.discountValue / 100)
    : order.discountValue;

  return (
    <div className="min-h-screen bg-slate-50 py-8 px-4 sm:px-6 lg:px-8 print:bg-white print:p-0">
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Actions - Hidden on print */}
        <div className="flex justify-between items-center bg-white p-3 rounded-lg shadow-sm border border-slate-200 print:hidden">
          <button
            onClick={handlePrint}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 font-medium transition-colors"
          >
            <Printer className="w-4 h-4" />
            Print / Save PDF
          </button>
          <button
            onClick={onClose}
            className="flex items-center gap-2 px-4 py-2 text-slate-600 hover:text-slate-800 font-medium transition-colors"
          >
            <X className="w-4 h-4" />
            Close
          </button>
        </div>

        {/* Invoice Document */}
        <div className="bg-white shadow-xl rounded-xl overflow-hidden print:shadow-none print:rounded-none">
          {/* Header */}
          <div className="p-8 border-b border-slate-100 flex justify-between items-start">
            <div>
              {settings.logo && (
                <img src={settings.logo} alt="Logo" className="h-12 object-contain mb-4" />
              )}
              <h1 className="text-2xl font-bold text-slate-800 uppercase tracking-wide">
                {order.status === 'Quotation' ? 'Quotation' : 'Invoice'}
              </h1>
              <p className="text-slate-500 text-sm mt-1">#{order.id}</p>
            </div>
            <div className="text-right">
              <h2 className="font-bold text-slate-800">{settings.companyName}</h2>
              <div className="text-sm text-slate-500 mt-1 whitespace-pre-line leading-relaxed">
                {settings.address}<br />
                {settings.phone}<br />
                {settings.email}
              </div>
            </div>
          </div>

          <div className="p-8">
            {/* Bill To & Details */}
            <div className="flex justify-between mb-8 gap-8">
              <div className="flex-1">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Bill To</h3>
                <div className="text-slate-800 font-semibold">{order.customerName}</div>
                <div className="text-sm text-slate-500 whitespace-pre-line">{order.customerAddress}</div>
                {order.customerTrn && <div className="text-sm text-slate-500 mt-1">TRN: {order.customerTrn}</div>}
              </div>
              <div className="flex-1 text-right">
                <div className="inline-block text-left">
                  <div className="flex justify-between gap-8 mb-1">
                    <span className="text-slate-500 text-sm">Date:</span>
                    <span className="font-medium text-slate-800">{format(parseISO(order.createdAt), 'MMM dd, yyyy')}</span>
                  </div>
                  <div className="flex justify-between gap-8 mb-1">
                    <span className="text-slate-500 text-sm">Period:</span>
                    <span className="font-medium text-slate-800">
                      {format(parseISO(order.startDate), 'MMM dd')} - {format(parseISO(isReturned ? order.returnDate : order.endDate), 'MMM dd')}
                    </span>
                  </div>
                  <div className="flex justify-between gap-8">
                    <span className="text-slate-500 text-sm">Duration:</span>
                    <span className="font-medium text-slate-800">{durationDays} Days</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Items Table */}
            <table className="w-full mb-8">
              <thead>
                <tr className="border-b-2 border-slate-100">
                  <th className="text-left py-3 text-sm font-bold text-slate-600">Item Description</th>
                  <th className="text-center py-3 text-sm font-bold text-slate-600">Qty</th>
                  <th className="text-right py-3 text-sm font-bold text-slate-600">Price</th>
                  <th className="text-right py-3 text-sm font-bold text-slate-600">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {order.items.map((item, idx) => (
                  <tr key={idx}>
                    <td className="py-4 text-sm text-slate-800 font-medium">{item.name}</td>
                    <td className="py-4 text-sm text-slate-600 text-center">{item.quantity}</td>
                    <td className="py-4 text-sm text-slate-600 text-right">{settings.currency}{parseFloat(item.pricePerUnit).toFixed(2)}</td>
                    <td className="py-4 text-sm text-slate-800 font-bold text-right">
                      {settings.currency}{(item.pricePerUnit * item.quantity * durationDays).toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Totals */}
            <div className="flex justify-end">
              <div className="w-64 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Subtotal</span>
                  <span className="font-medium text-slate-800">{settings.currency}{parseFloat(order.subtotalAmount || 0).toFixed(2)}</span>
                </div>
                {order.discountValue > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500">Discount {order.discountType === 'percentage' && `(${order.discountValue}%)`}</span>
                    <span className="font-medium text-slate-800">-{settings.currency}{discountAmt.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Tax (5%)</span>
                  <span className="font-medium text-slate-800">{settings.currency}{parseFloat(order.taxAmount || 0).toFixed(2)}</span>
                </div>

                {(parseFloat(order.lateFee) > 0) && (
                  <div className="flex justify-between text-sm text-red-600">
                    <span>Late Fees</span>
                    <span className="font-medium">+{settings.currency}{parseFloat(order.lateFee).toFixed(2)}</span>
                  </div>
                )}

                {(parseFloat(order.damageFee) > 0) && (
                  <div className="flex justify-between text-sm text-red-600">
                    <span>Damage Fees</span>
                    <span className="font-medium">+{settings.currency}{parseFloat(order.damageFee).toFixed(2)}</span>
                  </div>
                )}

                <div className="border-t border-slate-200 pt-2 mt-2">
                  <div className="flex justify-between text-base font-bold text-slate-900">
                    <span>Total</span>
                    <span>{settings.currency}{parseFloat(order.totalAmount || 0).toFixed(2)}</span>
                  </div>
                </div>

                {order.status !== 'Quotation' && (
                  <>
                    <div className="flex justify-between text-sm text-slate-500 pt-1">
                      <span>Paid</span>
                      <span>-{settings.currency}{parseFloat(order.paidAmount || 0).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-sm font-bold text-slate-800 bg-slate-100 p-2 rounded mt-2">
                      <span>Balance Due</span>
                      <span>{settings.currency}{parseFloat(order.balanceAmount || 0).toFixed(2)}</span>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Notes */}
            {order.notes && (
              <div className="mt-8 pt-6 border-t border-slate-100">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Notes</h4>
                <p className="text-sm text-slate-600 italic bg-amber-50 p-3 rounded border border-amber-100">{order.notes}</p>
              </div>
            )}

            {/* Footer */}
            <div className="mt-12 text-center text-xs text-slate-400">
              <p>Thank you for your business!</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InvoiceView;

