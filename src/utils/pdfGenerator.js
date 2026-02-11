import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format, parseISO, differenceInDays } from 'date-fns';

export const generateInvoicePDF = (order, settings) => {
    const doc = new jsPDF();

    // Header
    doc.setFillColor(255, 255, 255);
    doc.rect(0, 0, 210, 40, 'F');
    doc.setDrawColor(241, 245, 249);
    doc.line(0, 40, 210, 40);

    doc.setTextColor(15, 23, 42);
    doc.setFontSize(24);
    doc.setFont('helvetica', 'bold');
    const title = order.status === 'Quotation' ? 'QUOTATION' : 'INVOICE';
    doc.text(title, 14, 25);

    doc.setTextColor(100, 116, 139);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text(`${order.status === 'Quotation' ? 'Quote' : 'Invoice'} ID: #${order.id}`, 14, 32);

    // Company Info
    doc.setTextColor(15, 23, 42);
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text(settings.companyName.toUpperCase(), 140, 15);

    doc.setTextColor(100, 116, 139);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    const splitAddress = doc.splitTextToSize(settings.address, 60);
    doc.text(splitAddress, 140, 21);
    const addressHeight = splitAddress.length * 4;
    doc.text(settings.phone, 140, 21 + addressHeight);
    doc.text(settings.email, 140, 21 + addressHeight + 4);

    // Bill To
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('BILLED TO:', 14, 55);
    doc.setFont('helvetica', 'normal');
    doc.text(order.customerName, 14, 60);
    let currentY = 65;
    if (order.customerAddress) {
        const splitAddress = doc.splitTextToSize(order.customerAddress, 80);
        doc.text(splitAddress, 14, currentY);
        currentY += (splitAddress.length * 5);
    }
    if (order.customerTrn) {
        doc.setFont('helvetica', 'bold');
        doc.text(`TRN: ${order.customerTrn}`, 14, currentY);
        doc.setFont('helvetica', 'normal');
        currentY += 5;
    }
    doc.setFontSize(8);
    doc.text(`Customer ID: ${order.customerId}`, 14, currentY);
    doc.setFontSize(10);

    const tableStartY = Math.max(currentY + 10, 80);

    // Rental Info
    doc.setFont('helvetica', 'bold');
    doc.text('RENTAL PERIOD:', 140, 55);
    doc.setFont('helvetica', 'normal');
    doc.text(`${format(parseISO(order.startDate), 'MMM dd, yyyy')} to`, 140, 60);
    doc.text(`${format(parseISO(order.endDate), 'MMM dd, yyyy')}`, 140, 65);

    // Rental Duration for item total calculation
    const isReturned = order.status === 'Returned' && order.returnDate;
    const originalDuration = Math.max(1, differenceInDays(parseISO(order.endDate), parseISO(order.startDate)));
    const actualDuration = isReturned
        ? Math.max(1, differenceInDays(parseISO(order.returnDate), parseISO(order.startDate)))
        : originalDuration;

    const durationDays = actualDuration;

    // Table
    const tableData = order.items.map(item => [
        item.name,
        item.quantity.toString(),
        `${settings.currency}${item.pricePerUnit}`,
        `${settings.currency}${(item.pricePerUnit * item.quantity * durationDays).toFixed(2)}`
    ]);

    autoTable(doc, {
        startY: tableStartY,
        head: [['Equipment Name', 'Qty', 'Price/Day', `Total (${durationDays} Days)`]],
        body: tableData,
        headStyles: { fillColor: [51, 65, 85] },
        alternateRowStyles: { fillColor: [248, 250, 252] },
    });

    const finalY = doc.lastAutoTable?.finalY || tableStartY + 20;

    // Totals
    const leftX = 140;
    currentY = finalY + 10;

    const subtotalLabel = order.status === 'Quotation' ? 'Total:' : 'Subtotal:';
    doc.text(subtotalLabel, leftX, currentY);
    doc.text(`${settings.currency}${order.subtotalAmount.toFixed(2)}`, 190, currentY, { align: 'right' });

    if (order.discountValue > 0) {
        currentY += 7;
        doc.setTextColor(59, 130, 246);
        const discountLabel = order.discountType === 'percentage' ? `Discount (${order.discountValue}%):` : 'Discount:';
        const discountAmt = order.discountType === 'percentage'
            ? (order.subtotalAmount * order.discountValue / 100)
            : order.discountValue;
        doc.text(discountLabel, leftX, currentY);
        doc.text(`-${settings.currency}${discountAmt.toFixed(2)}`, 190, currentY, { align: 'right' });
        doc.setTextColor(0, 0, 0);
    }

    currentY += 7;
    doc.text('VAT (5%):', leftX, currentY);
    doc.text(`+${settings.currency}${order.taxAmount.toFixed(2)}`, 190, currentY, { align: 'right' });

    if (order.status !== 'Quotation') {
        if (order.lateFee > 0) {
            currentY += 7;
            doc.setTextColor(220, 38, 38);
            doc.text('Late Charges:', leftX, currentY);
            doc.text(`+${settings.currency}${order.lateFee}`, 190, currentY, { align: 'right' });
            doc.setTextColor(0, 0, 0);
        }

        if (order.damageFee > 0) {
            currentY += 7;
            doc.setTextColor(185, 28, 28);
            doc.text('Damage Fees:', leftX, currentY);
            doc.text(`+${settings.currency}${order.damageFee}`, 190, currentY, { align: 'right' });
            doc.setTextColor(0, 0, 0);
        }

        currentY += 7;
        doc.setTextColor(5, 150, 105);
        doc.text('Total Paid:', leftX, currentY);
        doc.text(`-${settings.currency}${order.paidAmount}`, 190, currentY, { align: 'right' });
        doc.setTextColor(0, 0, 0);

        currentY += 10;
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.text('Balance Due:', leftX, currentY);
        doc.text(`${settings.currency}${order.balanceAmount}`, 190, currentY, { align: 'right' });
    } else {
        currentY += 10;
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.text('Grand Total:', leftX, currentY);
        doc.text(`${settings.currency}${order.totalAmount}`, 190, currentY, { align: 'right' });
    }

    // Damage Report if exists
    if (order.items.some(i => (i.replacementCost || 0) > 0)) {
        currentY += 20;
        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(185, 28, 28);
        doc.text('DAMAGE REPORT:', 14, currentY);
        doc.setFont('helvetica', 'normal');

        order.items.filter(i => (i.replacementCost || 0) > 0).forEach(item => {
            currentY += 6;
            doc.text(`${item.name} (Replacement): ${settings.currency}${item.replacementCost}`, 14, currentY);
        });
    }

    // Footer
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.text(`Thank you for choosing ${settings.companyName}!`, 105, 280, { align: 'center' });
    doc.text('This is a computer generated document.', 105, 285, { align: 'center' });

    return doc;
};

export const openPDFInNewWindow = (order, settings) => {
    const doc = generateInvoicePDF(order, settings);
    const string = doc.output('bloburl');
    window.open(string, '_blank');
};
