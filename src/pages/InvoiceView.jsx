import React from 'react';
import { format, parseISO, differenceInDays } from 'date-fns';
import { Printer, FileDown, X, Box, ClipboardList, Send } from 'lucide-react';
import { generateInvoicePDF, generateTicketPDF, formatTerms } from '../utils/pdfGenerator';
import { api } from '../services/apiService';

const InvoiceView = ({ equipment, order, customer, settings, onClose, currentUser }) => {
    const handlePrint = () => {
        window.print();
    };

    const handleDownloadPDF = (docType) => {
        try {
            const doc = generateInvoicePDF(order, settings, docType, currentUser, equipment);
            doc.save(`${docType}_${order.id || 'draft'}.pdf`);
        } catch (error) {
            console.error(`Error downloading ${docType}:`, error);
            alert(`Failed to download ${docType}. See console for details.`);
        }
    };

    const handleDownloadTicket = () => {
        try {
            // Attach customer phone from the full customer object if not present on order
            const orderWithPhone = {
                ...order,
                customerPhone: order.customerPhone || customer?.phone || ''
            };
            const doc = generateTicketPDF(orderWithPhone, settings, equipment);
            doc.save(`Ticket_${order.id || 'draft'}.pdf`);
        } catch (error) {
            console.error('Error downloading Ticket:', error);
            alert('Failed to download Ticket.');
        }
    };

    const handleSendEmail = async () => {
        const emailToSend = customer?.email || order?.customerEmail;

        if (!emailToSend) {
            alert('No email address found for this customer.');
            return;
        }

        const isQuotation = order.status === 'Quotation';
        const docName = isQuotation ? 'Quotation' : 'Invoice';

        if (!confirm(`Send ${docName} to ${emailToSend}?`)) {
            return;
        }

        try {
            const doc = generateInvoicePDF(order, settings, isQuotation ? 'Quotation' : 'Invoice', currentUser, equipment);
            const blob = doc.output('blob');

            const formData = new FormData();
            formData.append('invoice', blob, `${docName}_${order.id}.pdf`);
            formData.append('email', emailToSend);
            formData.append('orderId', order.id);
            formData.append('customerName', order.customerName);
            formData.append('docType', docName);

            await api.sendInvoice(formData);
            alert(`${docName} sent successfully to ${emailToSend}`);
        } catch (error) {
            console.error(`Error sending ${docName.toLowerCase()}:`, error);
            alert(`Failed to send ${docName.toLowerCase()}. Check console for details.`);
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

    let displayLateFee = parseFloat(order.lateFee) || 0;
    if (order.status === 'Active') {
        if (order.isLateFeeManual) {
            displayLateFee = parseFloat(order.lateFee) || 0;
        } else {
            const today = new Date();
            const endDateObj = parseISO(order.endDate);
            const daysOverdue = differenceInDays(today, endDateObj);
            if (daysOverdue > 0) {
                const startDateObj = parseISO(order.startDate);
                const duration = Math.max(1, differenceInDays(endDateObj, startDateObj));
                const dailyRate = (parseFloat(order.subtotalAmount) || 0) / duration;
                displayLateFee = Math.ceil(dailyRate * daysOverdue);
            }
        }
    }

    const savedLateFee = parseFloat(order.lateFee) || 0;
    const displayBalanceAmount = (parseFloat(order.balanceAmount) || 0) - savedLateFee + displayLateFee;

    return (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/50 backdrop-blur-sm flex items-start justify-center p-4 print:p-0 print:bg-white print:overflow-visible print:static print:block">


            <div className="fixed top-0 left-0 right-0 bg-white border-b border-slate-200 px-6 py-4 flex justify-between items-center shadow-sm print:hidden z-50">
                <div className="flex gap-3">
                    <button
                        onClick={handlePrint}
                        className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold transition-colors shadow-sm shadow-blue-200"
                    >
                        <Printer className="w-4 h-4" />
                        Print Invoice
                    </button>


                    {order.status !== 'Quotation' && (
                        <button
                            onClick={() => handleDownloadPDF('Invoice')}
                            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 font-semibold transition-colors shadow-sm shadow-emerald-200"
                        >
                            <FileDown className="w-4 h-4" />
                            Save Invoice PDF
                        </button>
                    )}

                    {order.status === 'Quotation' && (
                        <button
                            onClick={() => handleDownloadPDF('Quotation')}
                            className="flex items-center gap-2 px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 font-semibold transition-colors shadow-sm shadow-teal-200"
                        >
                            <FileDown className="w-4 h-4" />
                            Save Quotation PDF
                        </button>
                    )}


                    <button
                        onClick={handleDownloadTicket}
                        className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-semibold transition-colors shadow-sm shadow-indigo-200"
                    >
                        <ClipboardList className="w-4 h-4" />
                        Download Ticket
                    </button>


                    <button
                        onClick={handleSendEmail}
                        className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 font-semibold transition-colors shadow-sm shadow-blue-200"
                    >
                        <Send className="w-4 h-4" />
                        {order.status === 'Quotation' ? 'Send Quotation' : 'Send Invoice'}
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


            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-[850px] min-h-[1000px] mt-20 mb-10 print:mt-0 print:mb-0 print:shadow-none print:rounded-none overflow-hidden flex flex-col">


                <div className="p-12 pb-4">
                    <div className="flex justify-between items-start">
                        <div className="flex flex-col gap-4">
                            <div>
                                <h1 className="text-4xl font-black text-slate-900 tracking-tight uppercase">
                                    {order.status === 'Quotation' ? 'QUOTATION' : 'TAX INVOICE'}
                                </h1>
                                <p className="text-slate-400 font-medium tracking-wide text-sm mt-1 uppercase">
                                    {order.status === 'Quotation' ? 'Quote' : 'Invoice'} ID: #{order.id}
                                </p>
                            </div>
                        </div>

                        <div className="text-right">
                            {settings.logo ? (
                                <img src={settings.logo} alt="Logo" className="w-80 h-auto max-h-48 object-contain rounded-lg ml-auto mb-0" />
                            ) : (
                                <div className="w-32 h-32 bg-slate-900 text-white rounded-lg flex items-center justify-center ml-auto mb-0">
                                    <Box className="w-16 h-16" />
                                </div>
                            )}
                        </div>
                    </div>
                    <div className="flex justify-between items-start mt-0 mb-4">
                        <div className="w-full">
                            <h2 className="text-xl font-black text-slate-900 uppercase tracking-tight">{settings.companyName}</h2>
                            <div className="text-sm text-slate-500 font-medium leading-relaxed mt-1">
                                <p>{settings.address}</p>
                                <p>{settings.phone}</p>
                                <p>{settings.email}</p>
                            </div>
                        </div>
                        <div className="text-right min-w-[200px]">
                        </div>
                    </div>
                </div>

                <div className="border-t border-slate-100 mx-12"></div>


                <div className="p-12 py-8 grid grid-cols-2 gap-12 print:break-inside-avoid">
                    <div>
                        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">
                            {order.status === 'Quotation' ? 'Customer Details' : 'Billed To'}
                        </h3>
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


                <div className="px-12 py-4 flex-1">
                    <table className="w-full border-2 border-slate-900">
                        <thead className="bg-[#b5e522]">
                            <tr className="border-b-2 border-slate-900">
                                <th className="text-center py-3 text-xs font-bold text-slate-900 uppercase tracking-widest w-12 border-r-2 border-slate-900">#</th>
                                <th className="text-center py-3 px-4 text-xs font-bold text-slate-900 uppercase tracking-widest border-r-2 border-slate-900">ITEMS</th>
                                <th className="text-center py-3 text-xs font-bold text-slate-900 uppercase tracking-widest w-20 border-r-2 border-slate-900">QTY</th>
                                <th className="text-center py-3 text-xs font-bold text-slate-900 uppercase tracking-widest w-40">Amount</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white">
                            {(() => {
                                const groupedItems = {};
                                order.items.forEach(item => {
                                    // If the order item doesn't have a category saved, fall back to "OTHER" (or we could pass equipment list to look it up)
                                    // Let's rely on the order's saved category. If not present, log as OTHER.
                                    let cat = item.category;

                                    if (!cat || cat.toUpperCase() === 'OTHER') {
                                        const eq = equipment?.find(e => e.id === item.equipmentId);
                                        if (eq && eq.category) {
                                            cat = eq.category;
                                        } else {
                                            cat = 'OTHER';
                                        }
                                    }

                                    cat = cat.toUpperCase();

                                    if (!groupedItems[cat]) groupedItems[cat] = { items: [], total: 0 };
                                    groupedItems[cat].items.push(item);
                                    groupedItems[cat].total += (Number(item.pricePerUnit || item.totalPrice || 0) * Number(item.quantity || 1) * durationDays);
                                });

                                let globalItemIndex = 1;
                                return Object.entries(groupedItems).map(([category, data], catIdx) => (
                                    <React.Fragment key={category}>
                                        <tr className="border-b border-slate-900 bg-slate-300">
                                            <td colSpan="3" className="py-1 px-4 text-sm font-black text-slate-900 uppercase text-center border-r-2 border-slate-900">
                                                {category}
                                            </td>
                                            <td rowSpan={data.items.length + 1} className="py-2 px-4 text-sm text-slate-900 font-bold text-center align-middle border-b-2 border-slate-900 border-l border-slate-200 bg-white">
                                                {parseFloat(data.total || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                            </td>
                                        </tr>
                                        {data.items.map((item, idx) => {
                                            const isLastInCategory = idx === data.items.length - 1;
                                            return (
                                                <tr key={idx} className={`last:border-0 hover:bg-slate-50 transition-colors ${isLastInCategory ? 'border-b-2 border-slate-900' : 'border-b border-slate-300'} print:break-inside-avoid`}>
                                                    <td className="py-1 px-2 text-sm text-slate-900 font-bold text-center border-r-2 border-slate-900">{/* Empty index column to match the picture style or just use global index? The picture has empty first column for indices, wait, no it is empty in picture, but let's keep it empty or remove index for cleaner look. Let's leave it blank or just remove text. Actually let's just leave it blank to perfectly match the photo. */}</td>
                                                    <td className="py-1 px-4 text-sm text-slate-900 font-medium border-r-2 border-slate-900">{item.name}</td>
                                                    <td className="py-1 px-2 text-sm text-slate-900 font-medium text-center border-r-2 border-slate-900">{item.quantity}</td>
                                                </tr>
                                            );
                                        })}
                                    </React.Fragment>
                                ));
                            })()}
                        </tbody>
                    </table>
                </div>


                <div className="px-12 pb-12 mt-8 print:break-inside-avoid">
                    <div className="flex justify-end">
                        <div className="w-1/2 max-w-sm space-y-3">
                            <div className="flex justify-between items-center text-slate-500 text-sm font-medium">
                                <span>Subtotal:</span>
                                <span className="text-slate-700 font-bold">{currency}{parseFloat(order.subtotalAmount || 0).toFixed(2)}</span>
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

                            {order.status !== 'Quotation' ? (
                                <>
                                    {(displayLateFee > 0) && (
                                        <div className="flex justify-between items-center text-red-600 text-sm font-medium">
                                            <span>Late Fees:</span>
                                            <span className="font-bold">+{currency}{displayLateFee.toFixed(2)}</span>
                                        </div>
                                    )}

                                    {parseFloat(order.damageFee) > 0 && (
                                        <div className="flex justify-between items-center text-rose-600 text-sm font-medium">
                                            <span>Damage Fees:</span>
                                            <span className="font-bold">+{currency}{parseFloat(order.damageFee).toFixed(2)}</span>
                                        </div>
                                    )}

                                    {(parseFloat(order.paidAmount) > 0) && (
                                        <div className="flex justify-between items-center text-emerald-600 text-sm font-medium pt-2">
                                            <span>Total Paid To Date:</span>
                                            <span className="font-bold">-{currency}{parseFloat(order.paidAmount || 0).toFixed(2)}</span>
                                        </div>
                                    )}

                                    <div className="mt-4 pt-4">
                                        <div className="bg-slate-900 text-white p-4 rounded-lg flex justify-between items-center shadow-lg">
                                            <span className="text-xs font-bold uppercase tracking-widest text-slate-400">Balance Due</span>
                                            <span className="text-2xl font-black">{currency}{displayBalanceAmount.toFixed(2)}</span>
                                        </div>
                                    </div>
                                </>
                            ) : (
                                <div className="mt-4 pt-4">
                                    <div className="bg-slate-900 text-white p-4 rounded-lg flex justify-between items-center shadow-lg">
                                        <span className="text-xs font-bold uppercase tracking-widest text-slate-400">Grand Total</span>
                                        <span className="text-2xl font-black">{currency}{parseFloat(order.totalAmount || 0).toFixed(2)}</span>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                </div>

                <div className="mt-auto">
                    {/* Bank Details (Invoice Only) */}
                    {order.status !== 'Quotation' && settings.bankDetails && (
                        <div className="mt-12 text-left px-12 print:break-inside-avoid">
                            <div className="text-sm text-slate-900 whitespace-pre-line font-bold leading-relaxed">
                                {settings.bankDetails}
                            </div>
                        </div>
                    )}

                    {/* Terms and Conditions (Quotation Only) */}
                    {order.status === 'Quotation' && settings.termsAndConditions && (
                        <div className="mt-16 text-left border-t border-slate-100 pt-8 px-12 print:break-inside-avoid">
                            <h4 className="text-sm font-bold text-slate-900 mb-4">Terms and Conditions:</h4>
                            <div className="text-xs text-slate-600 whitespace-pre-line leading-relaxed text-justify">
                                {formatTerms(settings.termsAndConditions)}
                            </div>
                        </div>
                    )}

                    <div className="mt-16 pt-8 border-t border-slate-100 px-12 pb-8 print:break-inside-avoid">
                        {order.status === 'Quotation' && (
                            <div className="text-left w-1/2 mb-12">
                                <p className="text-slate-700 text-sm mb-4">
                                    Best Regards,<br />
                                    On behalf of {settings.companyName}.
                                </p>
                                <div className="mt-12 w-48"></div>
                                <p className="text-slate-900 font-bold tracking-widest uppercase mt-4 text-xs">
                                    {currentUser?.name || currentUser?.username || 'AUTHORIZED SIGNATORY'}
                                </p>
                            </div>
                        )}

                        <div className="text-center w-full mt-8">
                            <p className="text-slate-400 font-bold text-sm">
                                {order.status !== 'Quotation' ? 'Thank You For Your Business.' : `Thank you for choosing ${settings.companyName}!`}
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default InvoiceView;

