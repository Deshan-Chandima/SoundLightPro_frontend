import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format, parseISO, differenceInDays } from 'date-fns';
import { toPng } from 'html-to-image';
import { getProxyImageUrl } from '../services/apiService';

export const generatePDFFromHTML = async (elementId) => {
    const element = document.getElementById(elementId);
    if (!element) throw new Error("Element not found");

    // Create a dummy PDF to get exact A4 dimensions for calculation
    const dummyPdf = new jsPDF({ orientation: 'p', unit: 'px', format: 'a4' });
    const pdfWidth = dummyPdf.internal.pageSize.getWidth();
    const pdfHeight = dummyPdf.internal.pageSize.getHeight();
    
    // Swap the logo image to use the backend proxy if it's external, bypassing strict CSPs
    const logoImg = element.querySelector('img[alt="Logo"]');
    let originalLogoSrc = null;
    if (logoImg && logoImg.src.startsWith('http') && 
        !logoImg.src.includes('/api/proxy-image') && 
        !logoImg.src.startsWith(window.location.origin)) {
        
        originalLogoSrc = logoImg.src;
        // Create a promise that resolves when the proxied image finishes loading
        const loadPromise = new Promise(resolve => {
            logoImg.onload = resolve;
            logoImg.onerror = (e) => {
                console.warn("Logo proxy load failed, continuing with original or broken image", e);
                resolve();
            };
        });
        logoImg.src = getProxyImageUrl(logoImg.src);
        await loadPromise;
    }
    
    // Temporarily neuter tricky flexbox properties that cause html-to-image rendering glitches
    // Forcefully remove the tailwind classes that cause artificial blank space
    const originalMinHeight = element.style.minHeight;
    const hadMinHeight = element.classList.contains('min-h-[1000px]');
    if (hadMinHeight) element.classList.remove('min-h-[1000px]');
    element.style.setProperty('min-height', 'auto', 'important');
    
    // Fix mt-auto tearing by switching it off so the layout tightens up naturally
    const mtAutoDivs = element.querySelectorAll('.mt-auto');
    const originalMtStyles = new Map();
    mtAutoDivs.forEach(div => {
        div.classList.remove('mt-auto');
        originalMtStyles.set(div, div.style.marginTop);
        div.style.setProperty('margin-top', '60px', 'important');
    });

    // Ratio of PDF width to actual element width on screen
    // We force a reflow by reading scrollWidth to ensure the new tightened heights apply
    const elementWidth = element.scrollWidth || 800;
    const contentHeight = element.scrollHeight; // Read newly tightened physical height
    const ratio = pdfWidth / elementWidth;
    
    // Dynamic height of one page in screen pixels, subtract a safety margin
    const imgPageHeight = (pdfHeight / ratio) - 10; 
    
    const sectionsToKeepTogether = element.querySelectorAll('.terms-section, .bank-details-section');
    let originalStyles = new Map();
    
    sectionsToKeepTogether.forEach(section => {
        const rect = section.getBoundingClientRect();
        const containerRect = element.getBoundingClientRect();
        const topOffset = rect.top - containerRect.top;
        const bottomOffset = rect.bottom - containerRect.top;
        
        const startsOnPage = Math.floor(topOffset / imgPageHeight);
        const endsOnPage = Math.floor(bottomOffset / imgPageHeight);
        
        // Strict boundary: Only push if the section mathematically crosses the splitting line
        if (startsOnPage !== endsOnPage && rect.height < (imgPageHeight * 0.9)) {
            originalStyles.set(section, section.style.marginTop);
            const nextPageStart = (endsOnPage) * imgPageHeight;
            const pushAmount = nextPageStart - topOffset + 20;
            const currentMargin = parseFloat(window.getComputedStyle(section).marginTop) || 0;
            section.style.marginTop = `${currentMargin + pushAmount}px`;
        }
    });

    try {
        const imgData = await toPng(element, { 
            pixelRatio: 2, 
            backgroundColor: '#ffffff',
            cacheBust: true,
            height: element.scrollHeight,
            width: element.scrollWidth
        });

        // Restore styles
        originalStyles.forEach((style, section) => {
            section.style.marginTop = style;
        });

        const pdf = new jsPDF({
            orientation: 'p',
            unit: 'px',
            format: 'a4'
        });

        const img = new Image();
        img.src = imgData;
        await new Promise(resolve => img.onload = resolve);

        const canvasWidth = img.width;
        const canvasHeight = img.height;

        let drawingRatio = pdfWidth / canvasWidth;
        let scaledHeight = canvasHeight * drawingRatio;
        let renderWidth = pdfWidth;
        let marginX = 0;

        // Auto-fit to 1 page if it's just lightly spilling over (up to 35% of a second page)
        // This stops it from generating a mostly blank 2nd page just for the footer!
        if (scaledHeight > pdfHeight && scaledHeight <= pdfHeight * 1.35) {
            drawingRatio = pdfHeight / canvasHeight; 
            scaledHeight = pdfHeight;
            renderWidth = canvasWidth * drawingRatio;
            marginX = (pdfWidth - renderWidth) / 2; // Center horizontally
        }

        let heightLeft = scaledHeight;
        let position = 0;

        pdf.addImage(imgData, 'PNG', marginX, position, renderWidth, scaledHeight);
        heightLeft -= pdfHeight;

        // Tolerance of 30px to prevent rendering a completely blank page just for a sliver of padding
        while (heightLeft > 30) {
            position -= pdfHeight;
            pdf.addPage();
            pdf.addImage(imgData, 'PNG', marginX, position, renderWidth, scaledHeight);
            heightLeft -= pdfHeight;
        }

        return pdf;
    } catch (error) {
        // Cleanup on error
        originalStyles.forEach((style, section) => {
            section.style.marginTop = style;
        });
        
        if (hadMinHeight) element.classList.add('min-h-[1000px]');
        element.style.minHeight = originalMinHeight;
        mtAutoDivs.forEach(div => {
            div.classList.add('mt-auto');
            div.style.marginTop = originalMtStyles.get(div);
        });
        if (originalLogoSrc && logoImg) logoImg.src = originalLogoSrc;
        throw error;
    } finally {
        if (hadMinHeight) element.classList.add('min-h-[1000px]');
        element.style.minHeight = originalMinHeight;
        mtAutoDivs.forEach(div => {
            div.classList.add('mt-auto');
            div.style.marginTop = originalMtStyles.get(div);
        });
        if (originalLogoSrc && logoImg) logoImg.src = originalLogoSrc;
    }
};

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

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(22);
        const splitCompanyName = doc.splitTextToSize(companyName.toUpperCase(), 180);
        const companyTextHeight = splitCompanyName.length * 8;
        const headerBottomY = 18 + companyTextHeight + 15;

        doc.setFillColor(255, 255, 255);
        doc.rect(0, 0, 210, headerBottomY, 'F');
        doc.setDrawColor(241, 245, 249);
        doc.line(0, headerBottomY, 210, headerBottomY);

        doc.setTextColor(15, 23, 42);
        doc.text(splitCompanyName, 105, 18, { align: 'center' });
        
        let headerNextY = 18 + companyTextHeight + 2;

        const title = isQuotation ? 'QUOTATION' : 'TAX INVOICE';
        doc.setFontSize(16);
        doc.text(title, 105, headerNextY, { align: 'center' });

        headerNextY += 6;
        doc.setTextColor(100, 116, 139);
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.text(`${isQuotation ? 'Quote' : 'Invoice'} ID: #${order.id}`, 105, headerNextY, { align: 'center' });

        if (safeSettings.logo) {
            try {
                let imgType = 'PNG';
                if (typeof safeSettings.logo === 'string' && safeSettings.logo.startsWith('data:image/')) {
                    const match = safeSettings.logo.match(/^data:image\/([a-zA-Z0-9]+);/);
                    if (match && match[1]) {
                        imgType = match[1].toUpperCase();
                        if (imgType === 'JPEG') imgType = 'JPEG';
                    }
                }
                doc.addImage(safeSettings.logo, imgType, 135, 5, 65, 0);
            } catch (e) {
                console.error("Error drawing logo:", e);
            }
        }

        doc.setTextColor(0, 0, 0);

        // Add company details on the left side under the header
        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        const compNameY = headerBottomY + 5;
        doc.text(companyName.toUpperCase(), 14, compNameY);

        doc.setFontSize(8);
        doc.setFont('helvetica', 'normal');
        const compY = compNameY + 5;
        const splitAddressComp = doc.splitTextToSize(safeSettings.address || '', 60);
        doc.text(splitAddressComp, 14, compY);
        const addressHeightComp = splitAddressComp.length * 4;
        doc.text(`Contact: ${safeSettings.phone || ''}`, 14, compY + addressHeightComp);
        doc.text(`Email: ${safeSettings.email || ''}`, 14, compY + addressHeightComp + 4);

        // Billed To section starts lower to clear company details and logo
        let currentY = Math.max(headerBottomY + 30, compY + addressHeightComp + 15);

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

        const tableStartY = Math.max(currentY + 5, headerBottomY + 60);

        doc.setFont('helvetica', 'bold');
        doc.text('RENTAL PERIOD:', 140, compNameY);
        doc.setFont('helvetica', 'normal');
        doc.text(`${format(parseISO(order.startDate), 'MMM dd, yyyy')} to`, 140, compNameY + 5);
        doc.text(`${format(parseISO(order.endDate), 'MMM dd, yyyy')}`, 140, compNameY + 10);

        const isReturned = order.status === 'Returned' && order.returnDate;
        const originalDuration = Math.max(1, differenceInDays(parseISO(order.endDate), parseISO(order.startDate)) + 1);
        const actualDuration = isReturned
            ? Math.max(1, differenceInDays(parseISO(order.returnDate), parseISO(order.startDate)) + 1)
            : originalDuration;

        // Use original duration for display on returned invoices if late return, 
        // because extra days are handled via late fees.
        const durationDays = (isReturned && actualDuration > originalDuration) ? originalDuration : actualDuration;

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
                    const duration = Math.max(1, differenceInDays(endDateObj, startDateObj) + 1);
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
        doc.text(`VAT (${order.taxPercentage ?? safeSettings.taxPercentage ?? 5}%):`, leftX, currentY);
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

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(22);
        const splitCompanyName = doc.splitTextToSize(companyName.toUpperCase(), 180);
        const companyTextHeight = splitCompanyName.length * 8;
        const headerBottomY = 18 + companyTextHeight + 15;

        doc.setFillColor(255, 255, 255);
        doc.rect(0, 0, 210, headerBottomY, 'F');
        doc.setDrawColor(241, 245, 249);
        doc.line(0, headerBottomY, 210, headerBottomY);

        doc.setTextColor(15, 23, 42);
        doc.text(splitCompanyName, 105, 18, { align: 'center' });
        
        let headerNextY = 18 + companyTextHeight + 2;

        doc.setFontSize(16);
        doc.text("DISPATCH TICKET", 105, headerNextY, { align: 'center' });

        headerNextY += 6;
        doc.setTextColor(100, 116, 139);
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.text(`Order ID: #${order.id}`, 105, headerNextY, { align: 'center' });

        let contentStartY = headerBottomY + 5;

        doc.setTextColor(0, 0, 0);
        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        doc.text('DELIVER TO:', 14, contentStartY);
        doc.setFont('helvetica', 'normal');
        doc.text(order.customerName, 14, contentStartY + 5);
        let currentY = contentStartY + 10;
        
        if (order.customerAddress) {
            const splitAddress = doc.splitTextToSize(order.customerAddress, 80);
            doc.text(splitAddress, 14, currentY);
            currentY += (splitAddress.length * 5);
        }

        doc.setFontSize(8);
        doc.text(`Customer Contact: ${order.customerPhone || 'N/A'}`, 14, currentY);
        currentY += 5;

        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        doc.text('RENTAL PERIOD:', 140, contentStartY);
        doc.setFont('helvetica', 'normal');
        doc.text(`${format(parseISO(order.startDate), 'MMM dd, yyyy')} to`, 140, contentStartY + 5);
        doc.text(`${format(parseISO(order.endDate), 'MMM dd, yyyy')}`, 140, contentStartY + 10);

        const isReturned = order.status === 'Returned' && order.returnDate;
        const originalDuration = Math.max(1, differenceInDays(parseISO(order.endDate), parseISO(order.startDate)) + 1);
        const actualDuration = isReturned
            ? Math.max(1, differenceInDays(parseISO(order.returnDate), parseISO(order.startDate)) + 1)
            : originalDuration;
        const durationDays = (isReturned && actualDuration > originalDuration) ? originalDuration : actualDuration;

        doc.text(`Duration: ${durationDays} Days`, 140, contentStartY + 15);

        const tableStartY = Math.max(currentY + 5, contentStartY + 25);

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
