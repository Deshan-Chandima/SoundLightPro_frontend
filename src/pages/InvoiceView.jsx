import React from 'react';
import { format, parseISO, differenceInDays } from 'date-fns';
import { Printer, FileDown, X, Box, ClipboardList, Send } from 'lucide-react';
import { generateInvoicePDF, generateTicketPDF } from '../utils/pdfGenerator';
import { api } from '../services/apiService';

const InvoiceView = ({ order, customer, settings, onClose }) => {
    const handlePrint = () => {
        window.print();
    };

    const handleDownloadPDF = () => {
        try {
            console.log('Generating PDF for order:', order);
            console.log('Settings:', settings);
            const doc = generateInvoicePDF(order, settings);
            console.log('PDF Generated, saving...');
            doc.save(`Invoice_${order.id || 'draft'}.pdf`);
            console.log('Save called');
        } catch (error) {
            console.error('Error downloading PDF:', error);
            alert('Failed to download PDF. See console for details.');
        }
    };

    const handleDownloadTicket = () => {
        try {
            const doc = generateTicketPDF(order, settings);
            doc.save(`Ticket_${order.id || 'draft'}.pdf`);
        } catch (error) {
            console.error('Error downloading Ticket:', error);
            alert('Failed to download Ticket.');
        }
    };

    const handleSendEmail = async () => {
        // value from customer object or order object
        const emailToSend = customer?.email || order?.customerEmail;

        if (!emailToSend) {
            alert('No email address found for this customer.');
            return;
        }

        if (!confirm(`Send invoice to ${emailToSend}?`)) {
            return;
        }

        try {
            const doc = generateInvoicePDF(order, settings);
            const blob = doc.output('blob');

            const formData = new FormData();
            formData.append('invoice', blob, `Invoice_${order.id}.pdf`);
            formData.append('email', emailToSend);
            formData.append('orderId', order.id);
            formData.append('customerName', order.customerName);

            await api.sendInvoice(formData);
            alert(`Invoice sent successfully to ${emailToSend}`);
        } catch (error) {
            console.error('Error sending invoice:', error);
            alert('Failed to send invoice. Check console for details.');
        }
    };

    if (!order) return <div className="p-10 text-center">Loading Invoice...</div>;

    const isReturned = order.status === 'Returned' && order.returnDate;
    const originalDuration = Math.max(1, differenceInDays(parseISO(order.endDate), parseISO(order.startDate)));
    const actualDuration = isReturned
        ? Math.max(1, differenceInDays(parseISO(order.returnDate), parseISO(order.startDate)))
        : originalDuration;

    const durationDays = actualDuration;
    const currency = settings.currency || 'AED';

    return (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 print:p-0 print:bg-white print:overflow-visible print:static print:block">

            {/* Print Actions Bar */}
            <div className="fixed top-0 left-0 right-0 bg-white border-b border-slate-200 px-6 py-4 flex justify-between items-center shadow-sm print:hidden z-50">
                <div className="flex gap-3">
                    <button
                        onClick={handlePrint}
                        className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold transition-colors shadow-sm shadow-blue-200"
                    >
                        <Printer className="w-4 h-4" />
                        Print Invoice
                    </button>

                    {/* PDF Download Button */}
                    <button
                        onClick={handleDownloadPDF}
                        className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 font-semibold transition-colors shadow-sm shadow-emerald-200"
                    >
                        <FileDown className="w-4 h-4" />
                        Save as PDF
                    </button>

                    {/* Ticket Download Button */}
                    <button
                        onClick={handleDownloadTicket}
                        className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-semibold transition-colors shadow-sm shadow-indigo-200"
                    >
                        <ClipboardList className="w-4 h-4" />
                        Download Ticket
                    </button>

                    {/* Send Email Button */}
                    <button
                        onClick={handleSendEmail}
                        className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 font-semibold transition-colors shadow-sm shadow-blue-200"
                    >
                        <Send className="w-4 h-4" />
                        Send to Customer
                    </button>
                </div>
                <button
                    onClick={onClose}
                    className="flex items-center gap-2 px-4 py-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg font-medium transition-colors border border-slate-200"
                >
                    <X className="w-4 h-4" />
                    Close Window
                </button>
            </div>

            {/* Main Invoice Container - A4 ratio roughly */}
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-[850px] min-h-[1000px] mt-20 mb-10 print:mt-0 print:mb-0 print:shadow-none print:rounded-none overflow-hidden flex flex-col">

                {/* Header Section */}
                <div className="p-12 pb-8">
                    <div className="flex justify-between items-start">
                        <div className="flex items-center gap-4">
                            {settings.logo ? (
                                <img src={settings.logo} alt="Logo" className="w-16 h-16 object-contain rounded-lg" />
                            ) : (
                                <div className="w-16 h-16 bg-slate-900 text-white rounded-lg flex items-center justify-center">
                                    <Box className="w-8 h-8" />
                                </div>
                            )}
                            <div>
                                <h1 className="text-4xl font-black text-slate-900 tracking-tight uppercase">INVOICE</h1>
                                <p className="text-slate-400 font-medium tracking-wide text-sm mt-1 uppercase">Invoice ID: #{order.id}</p>
                            </div>
                        </div>

                        <div className="text-right">
                            <h2 className="text-xl font-black text-slate-900 uppercase tracking-tight">{settings.companyName}</h2>
                            <div className="text-sm text-slate-500 font-medium leading-relaxed mt-1">
                                <p>{settings.address}</p>
                                <p>{settings.phone}</p>
                                <p>{settings.email}</p>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="border-t border-slate-100 mx-12"></div>

                {/* Client & Dates Section */}
                <div className="p-12 py-8 grid grid-cols-2 gap-12">
                    <div>
                        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Billed To</h3>
                        <div className="text-slate-900 font-bold text-lg mb-1">{order.customerName}</div>
                        <div className="text-slate-500 text-sm leading-relaxed whitespace-pre-line mb-2">
                            {order.customerAddress}
                        </div>
                        {order.customerTrn && (
                            <div className="text-sm font-medium text-slate-600">
                                <span className="text-slate-400 mr-2">TRN:</span>
                                {order.customerTrn}
                            </div>
                        )}
                        {/* If we have customer ID in the object, display it */}
                        {order.customerId && (
                            <div className="text-xs text-slate-400 mt-2 uppercase tracking-wide">ID: {order.customerId}</div>
                        )}
                    </div>

                    <div className="text-right">
                        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Rental Period</h3>
                        <div className="text-slate-900 font-bold text-lg mb-1">
                            {format(parseISO(order.startDate), 'MMM dd, yyyy')} — {format(parseISO(isReturned ? order.returnDate : order.endDate), 'MMM dd, yyyy')}
                        </div>
                        <div className="text-slate-500 text-sm font-medium">
                            Duration: {durationDays} {durationDays === 1 ? 'day' : 'days'}
                        </div>
                    </div>
                </div>

                {/* Items Table */}
                <div className="px-12 py-4 flex-1">
                    <table className="w-full">
                        <thead>
                            <tr className="border-b-2 border-slate-900">
                                <th className="text-left py-4 text-xs font-bold text-slate-900 uppercase tracking-widest">Equipment Name</th>
                                <th className="text-center py-4 text-xs font-bold text-slate-900 uppercase tracking-widest">Qty</th>
                                <th className="text-right py-4 text-xs font-bold text-slate-900 uppercase tracking-widest">Price/Day</th>
                                <th className="text-right py-4 text-xs font-bold text-slate-900 uppercase tracking-widest">Total ({durationDays} Days)</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {order.items.map((item, idx) => (
                                <tr key={idx}>
                                    <td className="py-5 text-sm key={idx} text-slate-700 font-bold">{item.name}</td>
                                    <td className="py-5 text-sm text-slate-500 font-medium text-center">{item.quantity}</td>
                                    <td className="py-5 text-sm text-slate-500 font-medium text-right text-slate-600">
                                        {currency}{parseFloat(item.pricePerUnit).toFixed(0)}
                                        {/* Removed decimal .00 for cleaner look in price/day if integer, but keeping consistent usually better. Let's stick to no decimals if whole number? Or fixed. Design shows no decimals in price/day but decimals in total. */}
                                    </td>
                                    <td className="py-5 text-sm text-slate-900 font-bold text-right">
                                        {currency}{parseFloat(item.pricePerUnit * item.quantity * durationDays).toFixed(2)}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Footer Totals */}
                <div className="px-12 pb-12 mt-8">
                    <div className="flex justify-end">
                        <div className="w-1/2 max-w-sm space-y-3">
                            <div className="flex justify-between items-center text-slate-500 text-sm font-medium">
                                <span>Subtotal:</span>
                                <span className="text-slate-700 font-bold">{currency}{parseFloat(order.subtotalAmount || 0).toFixed(0)}</span>
                            </div>

                            {order.discountValue > 0 && (
                                <div className="flex justify-between items-center text-blue-600 text-sm font-medium">
                                    <span>Discount {order.discountType === 'percentage' ? `(${order.discountValue}%)` : '(Fixed)'}:</span>
                                    <span className="font-bold">-{currency}{order.discountType === 'percentage'
                                        ? (order.subtotalAmount * order.discountValue / 100).toFixed(2)
                                        : parseFloat(order.discountValue).toFixed(2)}
                                    </span>
                                </div>
                            )}

                            <div className="flex justify-between items-center text-slate-500 text-sm font-medium">
                                <span>VAT ({settings.taxPercentage || 5}%):</span>
                                <span className="text-slate-700 font-bold">+{currency}{parseFloat(order.taxAmount || 0).toFixed(2)}</span>
                            </div>

                            {(parseFloat(order.lateFee) > 0) && (
                                <div className="flex justify-between items-center text-red-600 text-sm font-medium">
                                    <span>Late Fees:</span>
                                    <span className="font-bold">+{currency}{parseFloat(order.lateFee).toFixed(2)}</span>
                                </div>
                            )}

                            {(parseFloat(order.paidAmount) > 0) && (
                                <div className="flex justify-between items-center text-emerald-600 text-sm font-medium pt-2">
                                    <span>Total Paid To Date:</span>
                                    <span className="font-bold">-{currency}{parseFloat(order.paidAmount || 0).toFixed(0)}</span>
                                </div>
                            )}

                            <div className="mt-4 pt-4">
                                <div className="bg-slate-900 text-white p-4 rounded-lg flex justify-between items-center shadow-lg">
                                    <span className="text-xs font-bold uppercase tracking-widest text-slate-400">Balance Due</span>
                                    <span className="text-2xl font-black">{currency}{parseFloat(order.balanceAmount || 0).toFixed(0)}</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="mt-20 pt-8 border-t border-slate-100 text-center">
                        <p className="text-slate-400 font-bold text-sm">Thank you for choosing {settings.companyName}!</p>
                        <p className="text-slate-300 text-xs italic mt-1">This is a computer generated document.</p>
                    </div>
                </div>

            </div>
        </div>
    );
};

export default InvoiceView;

