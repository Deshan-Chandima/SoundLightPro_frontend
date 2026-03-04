import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format, parseISO, differenceInDays } from 'date-fns';

export const formatTerms = (text) => {
    if (!text) return '';
    const cleanedText = text.replace(/^Terms and Conditions:?\s*\n?/i, '');
    const lines = cleanedText.split('\n');
    let formatted = '';

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) {
            formatted += '\n\n';
            continue;
        }

        if (/^(\*|-|•|\d+\.)/i.test(line) || formatted === '' || formatted.endsWith('\n\n')) {
            formatted += (formatted && !formatted.endsWith('\n') ? '\n' : '') + line;
        } else {
            formatted += ' ' + line;
        }
    }
    return formatted.replace(/\n{3,}/g, '\n\n').trim();
};

export const generateInvoicePDF = (order, settings, docType = null, currentUser = null, equipment = []) => {
    try {
        const doc = new jsPDF();
        const safeSettings = settings || {};
        const currency = safeSettings.currency || 'AED';
        const companyName = safeSettings.companyName || 'Company Name';
        const isQuotation = docType ? docType === 'Quotation' : order.status === 'Quotation';

        doc.setFillColor(255, 255, 255);
        doc.rect(0, 0, 210, 40, 'F');
        doc.setDrawColor(241, 245, 249);
        doc.line(0, 40, 210, 40);

        doc.setTextColor(15, 23, 42);
        doc.setFontSize(24);
        doc.setFont('helvetica', 'bold');
        const title = isQuotation ? 'QUOTATION' : 'TAX INVOICE';
        doc.text(title, 14, 25);

        doc.setTextColor(100, 116, 139);
        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');
        doc.text(`${isQuotation ? 'Quote' : 'Invoice'} ID: #${order.id}`, 14, 32);

        // In the PDF, since we want a very large layout like the picture:
        if (safeSettings.logo) {
            try {
                // If the user uploads a JPEG, passing 'PNG' might sometimes still work in jsPDF, or it might infer it.
                // It's safer to just provide the image data, the type, the X, the Y, and the Width, and let jsPDF figure out the Height.
                // We'll extract the type from the data URL if possible, or default to 'PNG'.
                let imgType = 'PNG';
                if (typeof safeSettings.logo === 'string' && safeSettings.logo.startsWith('data:image/')) {
                    const match = safeSettings.logo.match(/^data:image\/([a-zA-Z0-9]+);/);
                    if (match && match[1]) {
                        imgType = match[1].toUpperCase();
                        if (imgType === 'JPEG') imgType = 'JPEG'; // jsPDF expects JPEG or format name
                    }
                }

                // Draw image with fixed width of 65, and auto-scaled height (by omitting height argument or passing 0/undefined appropriately).
                // jsPDF sig is `addImage(imageData, format, x, y, w, h)`. If `h` is omitted or 0, it scales automatically.
                // Let's pass 0 for height just to be safe, or just omit it.
                // align right: x = 135 (since width is 65, and side margin is ~10, 210-75)
                doc.addImage(safeSettings.logo, imgType, 135, 5, 65, 0);
            } catch (e) {
                console.error("Error drawing logo:", e);
                // Fallback drawing company name instead if it completely fails to avoid breaking the whole PDF
                doc.setTextColor(15, 23, 42);
                doc.setFontSize(12);
                doc.setFont('helvetica', 'bold');
                doc.text(companyName.toUpperCase(), 140, 15);
            }
        } else {
            // No logo, but we will print company details on the left anyway, so we don't need to put the name on the right side.
        }

        // Adjusted Y position for the rest of the document.
        // Tax Invoice is at 25, Invoice ID at 32. 
        // Company details will start at 45 on the left.

        doc.setTextColor(0, 0, 0);

        // Add company details on the left side under the title
        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        doc.text(companyName.toUpperCase(), 14, 45);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);
        const compY = 50;
        const splitAddressComp = doc.splitTextToSize(safeSettings.address || '', 60);
        doc.text(splitAddressComp, 14, compY);
        const addressHeightComp = splitAddressComp.length * 4;
        doc.text(`Contact: ${safeSettings.phone || ''}`, 14, compY + addressHeightComp);
        doc.text(`Email: ${safeSettings.email || ''}`, 14, compY + addressHeightComp + 4);

        // Billed To section starts lower to clear company details and logo
        let currentY = 65;

        doc.setTextColor(0, 0, 0);
        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        doc.text(isQuotation ? 'CUSTOMER DETAILS:' : 'BILLED TO:', 14, currentY);
        doc.setFont('helvetica', 'normal');
        currentY += 5;
        doc.text(order.customerName, 14, currentY);
        currentY += 5;

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
        doc.setFontSize(10);

        const tableStartY = Math.max(currentY + 5, 95);

        doc.setFont('helvetica', 'bold');
        doc.text('RENTAL PERIOD:', 140, 65);
        doc.setFont('helvetica', 'normal');
        doc.text(`${format(parseISO(order.startDate), 'MMM dd, yyyy')} to`, 140, 70);
        doc.text(`${format(parseISO(order.endDate), 'MMM dd, yyyy')}`, 140, 75);

        const isReturned = order.status === 'Returned' && order.returnDate;
        const originalDuration = Math.max(1, differenceInDays(parseISO(order.endDate), parseISO(order.startDate)));
        const actualDuration = isReturned
            ? Math.max(1, differenceInDays(parseISO(order.returnDate), parseISO(order.startDate)))
            : originalDuration;

        const durationDays = actualDuration;

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

        const groupedItems = {};
        order.items.forEach(item => {
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

        const tableData = [];
        Object.entries(groupedItems).forEach(([category, data]) => {
            tableData.push([
                {
                    content: category,
                    colSpan: 3,
                    styles: { halign: 'center', fontStyle: 'bold', fillColor: [210, 210, 210] }
                },
                {
                    content: parseFloat(data.total || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
                    rowSpan: data.items.length + 1,
                    styles: { halign: 'center', valign: 'middle', fontStyle: 'bold', fillColor: [255, 255, 255] }
                }
            ]);

            data.items.forEach(item => {
                tableData.push([
                    '',
                    item.name,
                    item.quantity.toString()
                ]);
            });
        });

        autoTable(doc, {
            startY: tableStartY,
            head: [['#', 'ITEMS', 'QTY', 'Amount']],
            body: tableData,
            theme: 'grid',
            headStyles: { fillColor: [181, 229, 34], textColor: [0, 0, 0], halign: 'center', lineColor: [0, 0, 0], lineWidth: 0.1 },
            styles: {
                lineColor: [0, 0, 0],
                lineWidth: 0.1,
                textColor: [15, 23, 42]
            },
            columnStyles: {
                0: { cellWidth: 15, halign: 'center' },
                1: { cellWidth: 'auto', fontStyle: 'bold' },
                2: { cellWidth: 20, halign: 'center' },
                3: { cellWidth: 40, halign: 'center', valign: 'middle' }
            }
        });

        const finalY = doc.lastAutoTable?.finalY || tableStartY + 20;

        const leftX = 140;
        currentY = finalY + 5;

        // Calculate required space for footer (totals + signatures + notes)
        // Approximate height needed: ~80-100 units depending on content
        const requiredFooterHeight = 90;

        if (currentY + requiredFooterHeight > 280) {
            doc.addPage();
            currentY = 40; // Reset to top margin
        }

        const subtotalLabel = isQuotation ? 'Total:' : 'Subtotal:';
        doc.text(subtotalLabel, leftX, currentY);
        doc.text(`${currency}${parseFloat(order.subtotalAmount || 0).toFixed(2)}`, 190, currentY, { align: 'right' });

        if (order.discountValue > 0) {
            currentY += 7;
            doc.setTextColor(59, 130, 246);
            const discountLabel = order.discountType === 'percentage' ? `Discount (${order.discountValue}%):` : 'Discount:';
            const discountAmt = order.discountType === 'percentage'
                ? (parseFloat(order.subtotalAmount || 0) * parseFloat(order.discountValue || 0) / 100)
                : parseFloat(order.discountValue || 0);
            doc.text(discountLabel, leftX, currentY);
            doc.text(`-${currency}${discountAmt.toFixed(2)}`, 190, currentY, { align: 'right' });
            doc.setTextColor(0, 0, 0);
        }

        currentY += 7;
        doc.text('VAT (5%):', leftX, currentY);
        doc.text(`+${currency}${parseFloat(order.taxAmount || 0).toFixed(2)}`, 190, currentY, { align: 'right' });

        if (!isQuotation) {
            if (displayLateFee > 0) {
                currentY += 7;
                doc.setTextColor(220, 38, 38);
                doc.text('Late Charges:', leftX, currentY);
                doc.text(`+${currency}${displayLateFee.toFixed(2)}`, 190, currentY, { align: 'right' });
                doc.setTextColor(0, 0, 0);
            }

            if (order.damageFee > 0) {
                currentY += 7;
                doc.setTextColor(185, 28, 28);
                doc.text('Damage Fees:', leftX, currentY);
                doc.text(`+${currency}${parseFloat(order.damageFee || 0).toFixed(2)}`, 190, currentY, { align: 'right' });
                doc.setTextColor(0, 0, 0);
            }

            currentY += 7;
            doc.setTextColor(5, 150, 105);
            doc.text('Total Paid:', leftX, currentY);
            doc.text(`-${currency}${parseFloat(order.paidAmount || 0).toFixed(2)}`, 190, currentY, { align: 'right' });
            doc.setTextColor(0, 0, 0);

            currentY += 5;
            doc.setFillColor(15, 23, 42);
            doc.roundedRect(leftX - 5, currentY, 70, 12, 1, 1, 'F');

            doc.setTextColor(255, 255, 255);
            doc.setFontSize(10);
            doc.setFont('helvetica', 'bold');
            doc.text('BALANCE DUE', leftX, currentY + 8);
            doc.setFontSize(14);
            doc.text(`${settings.currency}${displayBalanceAmount.toFixed(2)}`, 190, currentY + 8, { align: 'right' });
            doc.setTextColor(0, 0, 0);

            // Print Bank Details on Invoice
            currentY = Math.max(currentY + 20, 230);
            if (safeSettings.bankDetails) {
                const lines = doc.splitTextToSize(safeSettings.bankDetails, 120);
                if (currentY + (lines.length * 4) > 270) {
                    doc.addPage();
                    currentY = 20;
                }
                doc.setFontSize(10);
                doc.setFont('helvetica', 'bold');
                doc.setTextColor(0, 0, 0);
                doc.text(lines, 14, currentY); // Already aligned to left margin '14'
                currentY += lines.length * 5;
            }
        } else {
            currentY += 10;
            doc.setFontSize(12);
            doc.setFont('helvetica', 'bold');
            doc.text('Grand Total:', leftX, currentY);
            doc.text(`${currency}${parseFloat(order.totalAmount || 0).toFixed(2)}`, 190, currentY, { align: 'right' });

            // Print Terms and Conditions on Quotation
            let termsY = currentY + 15;
            if (safeSettings.termsAndConditions) {
                const formattedTerms = formatTerms(safeSettings.termsAndConditions);
                const paragraphs = formattedTerms.split('\n');

                doc.setFontSize(8);
                doc.setFont('helvetica', 'normal');
                const totalLines = doc.splitTextToSize(formattedTerms, 182);

                if (termsY + (totalLines.length * 4) + 10 > 270) {
                    doc.addPage();
                    termsY = 20;
                }

                doc.setFontSize(9);
                doc.setFont('helvetica', 'bold');
                doc.setTextColor(0, 0, 0);
                doc.text("Terms and Conditions:", 14, termsY);
                termsY += 8;

                doc.setFontSize(8);
                doc.setFont('helvetica', 'normal');

                paragraphs.forEach(p => {
                    if (!p.trim()) {
                        termsY += 4;
                        return;
                    }
                    const plines = doc.splitTextToSize(p, 182);
                    for (let i = 0; i < plines.length; i++) {
                        if (i === plines.length - 1) {
                            // Last line of paragraph should be left aligned to avoid stretching
                            doc.text(plines[i], 14, termsY, { align: 'left' });
                        } else {
                            // Internal paragraph lines stretch justification
                            doc.text(plines[i], 14, termsY, { align: 'justify', maxWidth: 182 });
                        }
                        termsY += 4;
                    }
                });

                currentY = termsY;
            }
        }

        if (order.items.some(i => (i.replacementCost || 0) > 0)) {
            currentY += 10;
            doc.setFontSize(10);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(185, 28, 28);
            doc.text('DAMAGE REPORT:', 14, currentY);
            doc.setFont('helvetica', 'normal');

            order.items.filter(i => (i.replacementCost || 0) > 0).forEach(item => {
                currentY += 6;
                doc.text(`${item.name} (Replacement): ${currency}${item.replacementCost}`, 14, currentY);
            });
        }

        // Print Signature Block (Only for Quotations)
        if (isQuotation) {
            // Calculate Y position to be always near the bottom, but above the footer text
            let signatureY = currentY + 15;
            if (signatureY > 250) {
                doc.addPage();
                signatureY = 30;
            } else {
                signatureY = Math.max(signatureY, 210); // Pin it to the bottom area if there's room, otherwise use currentY + 15
            }

            doc.setFontSize(9);
            doc.setFont('helvetica', 'normal');
            doc.setTextColor(50, 50, 50);
            doc.text("Best Regards,", 14, signatureY);
            doc.text(`On behalf of ${companyName}.`, 14, signatureY + 5);

            // Draw signature line (removed per request, keeping space)
            // doc.setDrawColor(50, 50, 50);
            // doc.line(14, signatureY + 15, 64, signatureY + 15);

            // Print Signature Image if available
            if (currentUser?.signature) {
                try {
                    // Determine image type (png or jpeg)
                    const isPng = currentUser.signature.includes('image/png');
                    const imageType = isPng ? 'PNG' : 'JPEG';
                    // Adjust dimensions to fit nicely above the line
                    doc.addImage(currentUser.signature, imageType, 14, signatureY - 5, 40, 20);
                } catch (err) {
                    console.warn('Failed to render user signature image:', err);
                }
            }

            doc.setFontSize(9);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(0, 0, 0);
            const signatureName = currentUser?.name || currentUser?.username || 'AUTHORIZED SIGNATORY';
            doc.text(signatureName.toUpperCase(), 14, signatureY + 20);
        }


        // Centered Footer Message
        doc.setFontSize(9);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(150, 150, 150);

        const footerMessage = isQuotation
            ? `Thank you for choosing ${companyName}!`
            : 'Thank You For Your Business.';

        doc.text(footerMessage, 105, 280, { align: 'center' });

        return doc;
    } catch (error) {
        console.error('PDF Generation Error:', error);
        alert('Error generating PDF. Check console for details.');
        throw error;
    }
};

export const generateTicketPDF = (order, settings, equipment = []) => {
    try {
        const doc = new jsPDF();
        const safeSettings = settings || {};
        const companyName = safeSettings.companyName || 'Company Name';

        doc.setFillColor(255, 255, 255);
        doc.rect(0, 0, 210, 40, 'F');
        doc.setDrawColor(241, 245, 249);
        doc.line(0, 40, 210, 40);

        doc.setTextColor(15, 23, 42);
        doc.setFontSize(24);
        doc.setFont('helvetica', 'bold');
        doc.text("DISPATCH TICKET", 14, 25);

        doc.setTextColor(100, 116, 139);
        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');
        doc.text(`Order ID: #${order.id}`, 14, 32);

        doc.setTextColor(15, 23, 42);
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.text(companyName.toUpperCase(), 140, 15);

        doc.setTextColor(0, 0, 0);
        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        doc.text('DELIVER TO:', 14, 45);
        doc.setFont('helvetica', 'normal');
        doc.text(order.customerName, 14, 50);
        let currentY = 55;
        if (order.customerAddress) {
            const splitAddress = doc.splitTextToSize(order.customerAddress, 80);
            doc.text(splitAddress, 14, currentY);
            currentY += (splitAddress.length * 5);
        }

        doc.setFontSize(8);
        doc.text(`Customer Contact: ${order.customerPhone || 'N/A'}`, 14, currentY);
        currentY += 5;

        const tableStartY = Math.max(currentY + 5, 75);

        doc.setFont('helvetica', 'bold');
        doc.text('RENTAL PERIOD:', 140, 45);
        doc.setFont('helvetica', 'normal');
        doc.text(`${format(parseISO(order.startDate), 'MMM dd, yyyy')} to`, 140, 50);
        doc.text(`${format(parseISO(order.endDate), 'MMM dd, yyyy')}`, 140, 55);

        const isReturned = order.status === 'Returned' && order.returnDate;
        const originalDuration = Math.max(1, differenceInDays(parseISO(order.endDate), parseISO(order.startDate)));
        const actualDuration = isReturned
            ? Math.max(1, differenceInDays(parseISO(order.returnDate), parseISO(order.startDate)))
            : originalDuration;
        const durationDays = actualDuration;

        doc.text(`Duration: ${durationDays} Days`, 140, 60);

        const groupedItems = {};
        order.items.forEach(item => {
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

            if (!groupedItems[cat]) groupedItems[cat] = { items: [] };
            groupedItems[cat].items.push(item);
        });

        const tableData = [];
        Object.entries(groupedItems).forEach(([category, data]) => {
            tableData.push([
                {
                    content: category,
                    colSpan: 3,
                    styles: { halign: 'center', fontStyle: 'bold', fillColor: [210, 210, 210], textColor: [0, 0, 0] }
                }
            ]);

            data.items.forEach(item => {
                tableData.push([
                    item.name,
                    item.quantity.toString(),
                    "_______"
                ]);
            });
        });

        autoTable(doc, {
            startY: tableStartY,
            head: [['Equipment Name', 'Qty', 'Checked Out']],
            body: tableData,
            headStyles: { fillColor: [51, 65, 85] },
            alternateRowStyles: { fillColor: [248, 250, 252] },
            columnStyles: {
                0: { cellWidth: 'auto' },
                1: { cellWidth: 30, halign: 'center' },
                2: { cellWidth: 40, halign: 'center' }
            }
        });

        const finalY = doc.lastAutoTable?.finalY || tableStartY + 20;
        currentY = finalY + 20;

        if (order.notes) {
            doc.setFontSize(10);
            doc.setFont('helvetica', 'bold');
            doc.text("NOTES:", 14, currentY);
            doc.setFont('helvetica', 'normal');
            const splitNotes = doc.splitTextToSize(order.notes, 180);
            doc.text(splitNotes, 14, currentY + 6);
            currentY += (splitNotes.length * 6) + 20;
        }

        doc.setLineWidth(0.1);
        doc.line(14, currentY + 15, 80, currentY + 15);
        doc.line(120, currentY + 15, 190, currentY + 15);

        doc.setFontSize(8);
        doc.text("Staff Signature", 14, currentY + 20);
        doc.text("Customer Signature", 120, currentY + 20);

        doc.setFontSize(8);
        doc.setTextColor(150, 150, 150);
        doc.text(`${companyName} - Internal Dispatch Ticket`, 105, 280, { align: 'center' });
        doc.text(`${format(new Date(), 'yyyy-MM-dd HH:mm')}`, 105, 285, { align: 'center' });

        return doc;
    } catch (error) {
        console.error('PDF Generation Error:', error);
        alert('Error generating Ticket. Check console for details.');
        throw error;
    }
};

export const openPDFInNewWindow = (order, settings) => {
    const doc = generateInvoicePDF(order, settings);
    const string = doc.output('bloburl');
    window.open(string, '_blank');
};
