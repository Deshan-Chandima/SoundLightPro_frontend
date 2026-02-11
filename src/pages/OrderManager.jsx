import React, { useState } from 'react';
import {
    Plus, Search, DollarSign,
    AlertCircle, Clock,
    Trash2, X, RefreshCcw, CheckCircle,
    FileDown, Package
} from 'lucide-react';
import { format, differenceInDays, isAfter, parseISO } from 'date-fns';
import { cn } from '../utils/cn';

const OrderManager = ({
    orders, setOrders, equipment, setEquipment, customers, setCustomers, settings
}) => {
    const [showForm, setShowForm] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [activeTab, setActiveTab] = useState('active');

    // Form State
    const [selectedCustomerId, setSelectedCustomerId] = useState('');
    const [rentalItems, setRentalItems] = useState([]);
    const [startDate, setStartDate] = useState(format(new Date(), 'yyyy-MM-dd'));
    const [endDate, setEndDate] = useState(format(new Date(), 'yyyy-MM-dd'));
    const [paidAmount, setPaidAmount] = useState(0);
    const [paymentMethod, setPaymentMethod] = useState('Cash');
    const [notes, setNotes] = useState('');

    // Discount State
    const [discountType, setDiscountType] = useState('percentage');
    const [discountValue, setDiscountValue] = useState(0);

    // Return Processing State
    const [processingReturn, setProcessingReturn] = useState(null);
    const [returnCounts, setReturnCounts] = useState({});
    const [returnReplacementCosts, setReturnReplacementCosts] = useState({});
    const [returnSuccess, setReturnSuccess] = useState(null);

    // Update Order State
    const [updatingOrder, setUpdatingOrder] = useState(null);
    const [updateFormData, setUpdateFormData] = useState({
        additionalPayment: 0,
        lateFee: 0,
        damageFee: 0,
        notes: '',
        startDate: '',
        endDate: '',

        items: []
    });

    const [lateFee, setLateFee] = useState(0);
    const [daysLate, setDaysLate] = useState(0);

    const calculateSubtotal = () => {
        const days = Math.max(1, differenceInDays(parseISO(endDate), parseISO(startDate)));
        return rentalItems.reduce((sum, item) => sum + (item.totalPrice * days), 0);
    };

    const calculateTotalAfterDiscount = () => {
        const subtotal = calculateSubtotal();
        if (discountType === 'percentage') {
            return subtotal - (subtotal * discountValue / 100);
        }
        return Math.max(0, subtotal - discountValue);
    };

    const calculateVAT = () => {
        return calculateTotalAfterDiscount() * ((settings.taxPercentage || 5) / 100);
    };

    const calculateGrandTotal = () => {
        return calculateTotalAfterDiscount() + calculateVAT();
    };

    const handleAddItem = (e) => {
        const equipId = e.target.value;
        if (!equipId) return;

        const item = equipment.find(eq => eq.id === equipId);
        if (item) {
            const existing = rentalItems.find(ri => ri.equipmentId === equipId);
            const currentQtyInOrder = existing ? existing.quantity : 0;

            if (currentQtyInOrder + 1 > item.availableQuantity) {
                alert(`Cannot add more. Only ${item.availableQuantity} units of ${item.name} are available.`);
                return;
            }

            if (existing) {
                setRentalItems(prev => prev.map(ri =>
                    ri.equipmentId === equipId
                        ? { ...ri, quantity: ri.quantity + 1, totalPrice: (ri.quantity + 1) * item.pricePerDay }
                        : ri
                ));
            } else {
                setRentalItems(prev => [...prev, {
                    equipmentId: item.id,
                    name: item.name,
                    quantity: 1,
                    pricePerUnit: item.pricePerDay,
                    totalPrice: item.pricePerDay
                }]);
            }
        }
    };

    const handleCreateOrder = async (status = 'Confirmed') => {
        const customer = customers.find(c => c.id === selectedCustomerId);
        if (!customer || rentalItems.length === 0) return;

        const subtotal = calculateSubtotal();
        const vat = calculateVAT();
        const grandTotal = calculateGrandTotal();

        const newOrder = {
            id: `ORD-${Math.random().toString(36).substr(2, 6).toUpperCase()}`,
            customerId: selectedCustomerId,
            customerName: customer.name,
            customerAddress: customer.address,
            customerTrn: customer.trn,
            items: rentalItems.map(item => ({
                ...item,
                quantityReturnedGood: 0,
                quantityReturnedDamaged: 0
            })),
            startDate,
            endDate,
            status: status,
            subtotalAmount: subtotal,
            taxAmount: vat,
            totalAmount: grandTotal,
            discountType,
            discountValue,
            advancePayment: paidAmount,
            paidAmount: paidAmount,
            balanceAmount: grandTotal - paidAmount,
            lateFee: 0,
            damageFee: 0,
            paymentMethod,
            notes,
            createdAt: new Date().toISOString()
        };

        const sqlMode = localStorage.getItem('rental_sql_mode') === 'true';
        if (sqlMode) {
            try {
                const { api } = await import('../services/apiService');
                await api.saveOrder(newOrder);
                setOrders(prev => [newOrder, ...prev]);
                if (status === 'Confirmed' || status === 'Active') {
                    await updateStockForOrder(rentalItems);
                }
                resetForm();
            } catch (error) {
                console.error("Failed to save order:", error);
                alert("CRITICAL ERROR: Failed to save order to SQL database. Data was not saved.");
            }
        } else {
            setOrders(prev => [newOrder, ...prev]);
            if (status === 'Confirmed' || status === 'Active') {
                await updateStockForOrder(rentalItems);
            }
            resetForm();
        }

        resetForm();
    };

    const updateStockForOrder = async (items) => {
        const sqlMode = localStorage.getItem('rental_sql_mode') === 'true';
        const { api } = sqlMode ? await import('../services/apiService') : { api: null };

        const updatedEquipment = equipment.map(eq => {
            const rentalItem = items.find(ri => ri.equipmentId === eq.id);
            if (rentalItem) {
                const updated = { ...eq, availableQuantity: eq.availableQuantity - rentalItem.quantity };
                if (sqlMode && api) {
                    api.updateEquipment(updated).catch(err => console.error("Stock update failed:", err));
                }
                return updated;
            }
            return eq;
        });

        setEquipment(updatedEquipment);
    };

    const handleConvertQuotationToOrder = async (order) => {
        const updatedOrder = { ...order, status: 'Active' };
        const sqlMode = localStorage.getItem('rental_sql_mode') === 'true';
        if (sqlMode) {
            try {
                const { api } = await import('../services/apiService');
                await api.updateOrder(updatedOrder);
                setOrders(prev => prev.map(o => o.id === order.id ? updatedOrder : o));
                await updateStockForOrder(order.items);
            } catch (error) {
                console.error("Failed to update order:", error);
                alert("Error: Failed to convert quotation. Please try again.");
            }
        } else {
            setOrders(prev => prev.map(o => o.id === order.id ? updatedOrder : o));
            await updateStockForOrder(order.items);
        }
    };

    const handleProcessReturn = (order) => {
        setProcessingReturn(order);
        const initialCounts = {};
        const initialCosts = {};
        order.items.forEach(item => {
            // Calculate remaining quantity (not yet returned)
            const alreadyReturnedGood = Number(item.quantityReturnedGood) || 0;
            const alreadyReturnedDamaged = Number(item.quantityReturnedDamaged) || 0;
            const alreadyReturned = alreadyReturnedGood + alreadyReturnedDamaged;
            const remaining = Math.max(0, item.quantity - alreadyReturned);
            initialCounts[item.equipmentId] = { good: remaining, damaged: 0, remaining };
            // Pre-fill replacement cost with item value if available, or default to 0
            initialCosts[item.equipmentId] = 0;
        });
        setReturnCounts(initialCounts);
        setReturnReplacementCosts(initialCosts);

        // Auto-calculate late fee
        const today = new Date();
        const endDate = parseISO(order.endDate);
        const daysOverdue = differenceInDays(today, endDate);
        setDaysLate(Math.max(0, daysOverdue));

        if (daysOverdue > 0) {
            const startDate = parseISO(order.startDate);
            const duration = Math.max(1, differenceInDays(endDate, startDate));
            const dailyRate = order.totalAmount / duration;
            setLateFee(Math.ceil(dailyRate * daysOverdue));
        } else {
            setLateFee(0);
        }
    };

    const finalizeReturn = async () => {
        if (!processingReturn) return;

        const today = new Date();
        const startDate = parseISO(processingReturn.startDate);
        const dueDate = parseISO(processingReturn.endDate);

        // Calculate actual duration vs original duration
        const originalDuration = Math.max(1, differenceInDays(dueDate, startDate));
        const actualDuration = Math.max(1, differenceInDays(today, startDate));

        // Recalculate totals if returned early
        let subtotalAmount = processingReturn.subtotalAmount;
        let totalAmount = processingReturn.totalAmount;
        let taxAmount = processingReturn.taxAmount;

        if (actualDuration < originalDuration) {
            // Recalculate subtotal for the shorter duration
            subtotalAmount = processingReturn.items.reduce((sum, item) =>
                sum + (item.pricePerUnit * item.quantity * actualDuration), 0
            );

            // Recalculate total with original discount
            let totalAfterDiscount = subtotalAmount;
            if (processingReturn.discountType === 'percentage') {
                totalAfterDiscount = subtotalAmount - (subtotalAmount * processingReturn.discountValue / 100);
            } else {
                totalAfterDiscount = Math.max(0, subtotalAmount - processingReturn.discountValue);
            }

            // Recalculate VAT
            taxAmount = totalAfterDiscount * ((settings.taxPercentage || 5) / 100);
            totalAmount = totalAfterDiscount + taxAmount;
        }

        let damageFeeTotal = 0;
        const updatedItems = processingReturn.items.map(item => {
            const cost = returnReplacementCosts[item.equipmentId] || 0;
            const counts = returnCounts[item.equipmentId] || { good: 0, damaged: 0 };
            damageFeeTotal += cost;
            // Accumulate with previous returns
            const prevGood = Number(item.quantityReturnedGood) || 0;
            const prevDamaged = Number(item.quantityReturnedDamaged) || 0;
            return {
                ...item,
                replacementCost: (item.replacementCost || 0) + cost,
                quantityReturnedGood: prevGood + Number(counts.good),
                quantityReturnedDamaged: prevDamaged + Number(counts.damaged)
            };
        });

        // Check if all items are fully returned
        const allReturned = updatedItems.every(item => {
            const totalReturned = (item.quantityReturnedGood || 0) + (item.quantityReturnedDamaged || 0);
            return totalReturned >= item.quantity;
        });

        const updatedOrder = {
            ...processingReturn,
            items: updatedItems,
            status: allReturned ? 'Returned' : 'Partially Returned',
            returnDate: format(today, 'yyyy-MM-dd'),
            subtotalAmount,
            taxAmount,
            totalAmount,

            lateFee: lateFee,
            damageFee: damageFeeTotal,
            balanceAmount: (totalAmount + lateFee + damageFeeTotal) - processingReturn.paidAmount
        };

        const sqlMode = localStorage.getItem('rental_sql_mode') === 'true';
        if (sqlMode) {
            try {
                const { api } = await import('../services/apiService');
                await api.updateOrder(updatedOrder);

                setOrders(prev => {
                    return prev.map(o => o.id === processingReturn.id ? updatedOrder : o);
                });

                // Restore equipment stock and update condition
                const stockUpdatePromises = [];
                const updatedEquipment = equipment.map(eq => {
                    const rentalItem = processingReturn.items.find(ri => ri.equipmentId === eq.id);
                    if (rentalItem) {
                        const counts = returnCounts[eq.id] || { good: rentalItem.quantity, damaged: 0 };
                        const quantityToAdd = Number(counts.good) || 0;
                        const quantityDamaged = Number(counts.damaged) || 0;
                        const currentAvailable = Number(eq.availableQuantity) || 0;

                        let newStatus = eq.status;
                        if (currentAvailable + quantityToAdd > 0) {
                            newStatus = 'Available';
                        } else if (currentAvailable + quantityToAdd === 0 && quantityDamaged > 0) {
                            newStatus = 'Damaged';
                        }

                        const updated = {
                            ...eq,
                            availableQuantity: currentAvailable + quantityToAdd,
                            damagedQuantity: (eq.damagedQuantity || 0) + quantityDamaged,
                            totalQuantity: Math.max(0, eq.totalQuantity - quantityDamaged),
                            status: newStatus
                        };
                        stockUpdatePromises.push(
                            api.updateEquipment(updated)
                                .then(() => console.log(`Stock restored for ${eq.name}: +${quantityToAdd}`))
                                .catch(err => console.error(`Stock restore FAILED for ${eq.name}:`, err))
                        );
                        return updated;
                    }
                    return eq;
                });

                await Promise.all(stockUpdatePromises);
                setEquipment(updatedEquipment);
                setProcessingReturn(null);
                setReturnSuccess(updatedOrder);
                alert("Return processed successfully. Stock has been updated and saved.");
            } catch (error) {
                console.error("Failed to update order:", error);
                alert("Error: Failed to process return. Please check your connection.");
            }
        } else {
            setOrders(prev => {
                return prev.map(o => o.id === processingReturn.id ? updatedOrder : o);
            });

            const updatedEquipment = equipment.map(eq => {
                const rentalItem = processingReturn.items.find(ri => ri.equipmentId === eq.id);
                if (rentalItem) {
                    const counts = returnCounts[eq.id] || { good: rentalItem.quantity, damaged: 0 };
                    const quantityToAdd = Number(counts.good) || 0;
                    const quantityDamaged = Number(counts.damaged) || 0;
                    const currentAvailable = Number(eq.availableQuantity) || 0;

                    let newStatus = eq.status;
                    if (currentAvailable + quantityToAdd > 0) {
                        newStatus = 'Available';
                    } else if (currentAvailable + quantityToAdd === 0 && quantityDamaged > 0) {
                        newStatus = 'Damaged';
                    }

                    return {
                        ...eq,
                        availableQuantity: currentAvailable + quantityToAdd,
                        damagedQuantity: (eq.damagedQuantity || 0) + quantityDamaged,
                        totalQuantity: Math.max(0, eq.totalQuantity - quantityDamaged),
                        status: newStatus
                    };
                }
                return eq;
            });

            setEquipment(updatedEquipment);
            setProcessingReturn(null);
            setReturnSuccess(updatedOrder);
            alert("Return processed successfully. Stock has been updated.");
        }
    };

    const handleOpenUpdateOrder = (order) => {
        console.log("Opening update for:", order);
        setUpdatingOrder(order);
        // Ensure dates are formatted for input type="date"
        let sDate = order.startDate;
        let eDate = order.endDate;
        try {
            sDate = format(parseISO(order.startDate), 'yyyy-MM-dd');
            eDate = format(parseISO(order.endDate), 'yyyy-MM-dd');
        } catch (e) {
            console.error("Date parsing error:", e);
        }

        setUpdateFormData({
            additionalPayment: 0,
            lateFee: order.lateFee || 0,
            damageFee: order.damageFee || 0,
            notes: order.notes || '',
            startDate: sDate,
            endDate: eDate,
            items: order.items.map(item => ({ ...item })) // Deep copy items to avoid mutating original order immediately
        });
    };

    const handleUpdateOrderSubmit = async (e) => {
        e.preventDefault();
        if (!updatingOrder) return;

        try {
            console.log("Submitting update for:", updatingOrder.id);

            // Calculate new subtotal and total based on updated items and dates
            const days = Math.max(1, differenceInDays(parseISO(updateFormData.endDate), parseISO(updateFormData.startDate)));
            const subtotalAmount = updateFormData.items.reduce((sum, item) => sum + (item.pricePerUnit * item.quantity * days), 0);

            let totalAfterDiscount = subtotalAmount;
            if (updatingOrder.discountType === 'percentage') {
                totalAfterDiscount = subtotalAmount - (subtotalAmount * updatingOrder.discountValue / 100);
            } else {
                totalAfterDiscount = Math.max(0, subtotalAmount - updatingOrder.discountValue);
            }

            const taxAmount = totalAfterDiscount * ((settings.taxPercentage || 5) / 100);
            const totalAmount = totalAfterDiscount + taxAmount;

            const newPaidAmount = updatingOrder.paidAmount + updateFormData.additionalPayment;
            const totalWithFees = totalAmount + updateFormData.lateFee + updateFormData.damageFee;

            const updatedOrder = {
                ...updatingOrder,
                items: updateFormData.items,
                startDate: updateFormData.startDate,
                endDate: updateFormData.endDate,
                subtotalAmount,
                taxAmount,
                totalAmount,
                paidAmount: newPaidAmount,
                lateFee: updateFormData.lateFee,
                damageFee: updateFormData.damageFee,
                notes: updateFormData.notes,
                balanceAmount: totalWithFees - newPaidAmount
            };

            // Handle stock changes if status is Active or Confirmed
            // We need to revert old stock and apply new stock
            if (updatingOrder.status === 'Active' || updatingOrder.status === 'Confirmed') {
                const sqlMode = localStorage.getItem('rental_sql_mode') === 'true';
                const { api } = sqlMode ? await import('../services/apiService') : { api: null };

                // 1. Calculate check for overall stock availability first
                for (const newItem of updateFormData.items) {
                    const originalItem = updatingOrder.items.find(pi => pi.equipmentId === newItem.equipmentId);
                    const originalQty = originalItem ? originalItem.quantity : 0;
                    const additionalNeeded = newItem.quantity - originalQty;

                    if (additionalNeeded > 0) {
                        const eqItem = equipment.find(e => e.id === newItem.equipmentId);
                        if (!eqItem || eqItem.availableQuantity < additionalNeeded) {
                            alert(`Cannot update order: Insufficient stock for ${newItem.name}. Need ${additionalNeeded} more, but only ${eqItem ? eqItem.availableQuantity : 0} available.`);
                            return; // Stop the entire update process
                        }
                    }
                }

                const updatedEquipment = [...equipment];

                // 2. Revert Old Stock (Add back what was taken)
                updatingOrder.items.forEach(oldItem => {
                    const eqIdx = updatedEquipment.findIndex(eq => eq.id === oldItem.equipmentId);
                    if (eqIdx !== -1) {
                        updatedEquipment[eqIdx] = {
                            ...updatedEquipment[eqIdx],
                            availableQuantity: updatedEquipment[eqIdx].availableQuantity + oldItem.quantity
                        };
                    }
                });

                // 3. Apply New Stock (Deduct new quantities)
                for (const newItem of updateFormData.items) {
                    const eqIdx = updatedEquipment.findIndex(eq => eq.id === newItem.equipmentId);
                    if (eqIdx !== -1) {
                        // Strict check should have passed above, but double check logic
                        if (updatedEquipment[eqIdx].availableQuantity < newItem.quantity) {
                            // This should technically not be reached due to pre-check, but acts as a safety net
                            alert(`Critical Error: Stock mismatch during processing for ${newItem.name}.`);
                            return;
                        }

                        updatedEquipment[eqIdx] = {
                            ...updatedEquipment[eqIdx],
                            availableQuantity: updatedEquipment[eqIdx].availableQuantity - newItem.quantity
                        };

                        if (sqlMode && api) {
                            await api.updateEquipment(updatedEquipment[eqIdx]).catch(err => console.error("Stock update failed:", err));
                        }
                    }
                }

                setEquipment(updatedEquipment);
            }

            const sqlMode = localStorage.getItem('rental_sql_mode') === 'true';
            if (sqlMode) {
                const { api } = await import('../services/apiService');
                await api.updateOrder(updatedOrder);
                setOrders(prev => prev.map(o => o.id === updatingOrder.id ? updatedOrder : o));
            } else {
                setOrders(prev => prev.map(o => o.id === updatingOrder.id ? updatedOrder : o));
            }

            setUpdatingOrder(null);
            console.log("Order updated successfully");

        } catch (error) {
            console.error("Failed to update order:", error);
            alert("Error: Failed to save updates. Please check console.");
        }
    };

    const openInvoiceWindow = (orderId) => {
        window.open(`/?view=invoice&id=${orderId}`, '_blank', 'width=1000,height=800');
    };

    const resetForm = () => {
        setShowForm(false);
        setSelectedCustomerId('');
        setRentalItems([]);
        setPaidAmount(0);
        setNotes('');
    };

    const filteredOrders = orders.filter(o => {
        const matchesSearch = o.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
            o.id.toLowerCase().includes(searchTerm.toLowerCase());

        const isPaidOff = o.balanceAmount <= 0;
        const isHistory = o.status === 'Returned' && isPaidOff;

        if (activeTab === 'history') {
            return matchesSearch && isHistory;
        }
        return matchesSearch && !isHistory;
    });

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">Orders & Rentals</h1>
                    <p className="text-slate-500">Track quotes, active rentals, and returns</p>
                </div>
                <button
                    onClick={() => setShowForm(true)}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center justify-center gap-2 transition-colors shadow-sm"
                >
                    <Plus className="w-5 h-5" />
                    New Quotation/Order
                </button>
            </div>

            <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 flex flex-col gap-4">
                {/* Tabs */}
                <div className="flex gap-2 border-b border-slate-100 pb-2">
                    <button
                        onClick={() => setActiveTab('active')}
                        className={cn(
                            "px-4 py-2 text-sm font-bold rounded-lg transition-colors",
                            activeTab === 'active' ? "bg-blue-50 text-blue-600" : "text-slate-500 hover:bg-slate-50"
                        )}
                    >
                        Active Orders
                    </button>
                    <button
                        onClick={() => setActiveTab('history')}
                        className={cn(
                            "px-4 py-2 text-sm font-bold rounded-lg transition-colors",
                            activeTab === 'history' ? "bg-blue-50 text-blue-600" : "text-slate-500 hover:bg-slate-50"
                        )}
                    >
                        History
                    </button>
                </div>

                <div className="flex items-center gap-3">
                    <Search className="w-5 h-5 text-slate-400" />
                    <input
                        type="text"
                        placeholder="Search by customer name or Order ID..."
                        className="flex-1 bg-transparent border-none outline-none text-slate-700"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
            </div>

            {/* Order List */}
            <div className="bg-white rounded-[2rem] shadow-2xl border border-slate-100 overflow-hidden overflow-x-auto">
                <table className="w-full text-left min-w-[800px]">
                    <thead>
                        <tr className="bg-gradient-to-r from-indigo-50 to-blue-50 border-b border-indigo-100 text-indigo-800 text-[10px] font-black uppercase tracking-[0.2em]">
                            <th className="px-4 sm:px-6 py-5">Order ID</th>
                            <th className="px-4 sm:px-6 py-4 font-semibold">Customer</th>
                            <th className="px-4 sm:px-6 py-4 font-semibold">Duration</th>
                            <th className="px-4 sm:px-6 py-4 font-semibold">Amount</th>
                            <th className="px-4 sm:px-6 py-4 font-semibold">Status</th>
                            <th className="px-4 sm:px-6 py-4 font-semibold text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {filteredOrders.length > 0 ? filteredOrders.map((order) => (
                            <tr key={order.id} className="hover:bg-slate-50 transition-colors">
                                <td className="px-6 py-4">
                                    <span className="font-mono text-xs font-bold text-blue-600">{order.id}</span>
                                </td>
                                <td className="px-6 py-4">
                                    <p className="font-medium text-slate-900">{order.customerName}</p>
                                </td>
                                <td className="px-6 py-4">
                                    <div className="flex flex-col text-xs">
                                        <span className="text-slate-600">{format(parseISO(order.startDate), 'MMM dd')} - {format(parseISO(order.endDate), 'MMM dd')}</span>
                                        <span className="text-slate-400">{differenceInDays(parseISO(order.endDate), parseISO(order.startDate))} days</span>
                                    </div>
                                </td>
                                <td className="px-6 py-4">
                                    <div className="text-sm">
                                        <p className="font-bold text-slate-900">{settings.currency}{order.totalAmount}</p>
                                        <p className="text-xs text-red-500">Bal: {settings.currency}{order.balanceAmount}</p>
                                    </div>
                                </td>
                                <td className="px-6 py-4">
                                    <span className={cn(
                                        "px-2.5 py-1 rounded-full text-xs font-medium",
                                        order.status === 'Active' ? "bg-emerald-50 text-emerald-700" :
                                            order.status === 'Quotation' ? "bg-slate-100 text-slate-700" :
                                                order.status === 'Confirmed' ? "bg-blue-50 text-blue-700" :
                                                    order.status === 'Returned' ? "bg-indigo-50 text-indigo-700" :
                                                        order.status === 'Partially Returned' ? "bg-amber-50 text-amber-700" :
                                                            "bg-red-50 text-red-700"
                                    )}>
                                        {order.status}
                                    </span>
                                </td>
                                <td className="px-6 py-4 text-right">
                                    <div className="flex justify-end gap-3">
                                        {order.status === 'Quotation' && (
                                            <button
                                                onClick={() => handleConvertQuotationToOrder(order)}
                                                title="Convert to Active Order"
                                                className="p-2.5 bg-emerald-50 hover:bg-emerald-600 text-emerald-600 hover:text-white rounded-[1.25rem] transition-all duration-300 active:scale-90 shadow-sm border border-emerald-100"
                                            >
                                                <CheckCircle className="w-5 h-5" />
                                            </button>
                                        )}
                                        {/* Edit button removed if paid off (balance <= 0) */}
                                        {order.balanceAmount > 0 && (
                                            <button
                                                onClick={() => handleOpenUpdateOrder(order)}
                                                disabled={order.status === 'Returned' && order.balanceAmount <= 0}
                                                title={order.status === 'Returned' && order.balanceAmount <= 0 ? "Order Settled" : "Update Order"}
                                                className={cn(
                                                    "p-2.5 transition-all duration-300 active:scale-90 rounded-[1.25rem] shadow-sm border",
                                                    order.status === 'Returned' && order.balanceAmount <= 0
                                                        ? "bg-slate-50 text-slate-300 border-slate-100 cursor-not-allowed opacity-50"
                                                        : "bg-indigo-50 hover:bg-indigo-600 text-indigo-600 hover:text-white border-indigo-100"
                                                )}
                                            >
                                                <RefreshCcw className="w-5 h-5" />
                                            </button>
                                        )}
                                        <button
                                            onClick={() => openInvoiceWindow(order.id)}
                                            title="View Invoice"
                                            className="p-2.5 bg-violet-50 hover:bg-violet-600 text-violet-600 hover:text-white rounded-[1.25rem] transition-all duration-300 active:scale-90 shadow-sm border border-violet-100"
                                        >
                                            <FileDown className="w-5 h-5" />
                                        </button>
                                        {(order.status === 'Active' || order.status === 'Partially Returned') && (
                                            <button
                                                onClick={() => handleProcessReturn(order)}
                                                title={order.status === 'Partially Returned' ? 'Continue Return' : 'Process Return'}
                                                className="p-2.5 bg-cyan-50 hover:bg-cyan-600 text-cyan-600 hover:text-white rounded-[1.25rem] transition-all duration-300 active:scale-90 shadow-sm border border-cyan-100"
                                            >
                                                <CheckCircle className="w-5 h-5" />
                                            </button>
                                        )}
                                    </div>
                                </td>
                            </tr>
                        )) : (
                            <tr>
                                <td colSpan={6} className="px-6 py-12 text-center text-slate-500 italic">
                                    No orders found. Create your first rental order!
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* New Order Modal */}
            {showForm && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
                        <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50">
                            <h2 className="text-xl font-bold text-slate-900">New Rental Order</h2>
                            <button onClick={resetForm} className="text-slate-400 hover:text-slate-600">
                                <X className="w-6 h-6" />
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-6 grid grid-cols-1 lg:grid-cols-3 gap-8">
                            {/* Left Column: Details */}
                            <div className="lg:col-span-1 space-y-6">
                                <div>
                                    <label className="block text-sm font-semibold text-slate-700 mb-2">Customer</label>
                                    <select
                                        className="w-full px-3 py-2 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                                        value={selectedCustomerId}
                                        onChange={(e) => setSelectedCustomerId(e.target.value)}
                                    >
                                        <option value="">Select Customer</option>
                                        {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                    </select>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-semibold text-slate-700 mb-2">Start Date</label>
                                        <input
                                            type="date"
                                            className="w-full px-3 py-2 border border-slate-200 rounded-lg outline-none"
                                            value={startDate}
                                            onChange={(e) => setStartDate(e.target.value)}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-semibold text-slate-700 mb-2">End Date</label>
                                        <input
                                            type="date"
                                            className="w-full px-3 py-2 border border-slate-200 rounded-lg outline-none"
                                            value={endDate}
                                            onChange={(e) => setEndDate(e.target.value)}
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-semibold text-slate-700 mb-2">Discount</label>
                                    <div className="flex gap-2 mb-3">
                                        <button
                                            type="button"
                                            onClick={() => setDiscountType('percentage')}
                                            className={cn(
                                                "flex-1 py-1 rounded text-xs font-bold transition-colors",
                                                discountType === 'percentage' ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-600"
                                            )}
                                        >
                                            % Percent
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setDiscountType('fixed')}
                                            className={cn(
                                                "flex-1 py-1 rounded text-xs font-bold transition-colors",
                                                discountType === 'fixed' ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-600"
                                            )}
                                        >
                                            $ Fixed
                                        </button>
                                    </div>
                                    <div className="relative">
                                        <span className="absolute left-3 top-2.5 text-slate-400 text-sm font-bold">
                                            {discountType === 'percentage' ? '%' : '$'}
                                        </span>
                                        <input
                                            type="number"
                                            placeholder="Discount value"
                                            className="w-full pl-8 pr-3 py-2 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
                                            value={discountValue || ''}
                                            onChange={(e) => setDiscountValue(Number(e.target.value))}
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-semibold text-slate-700 mb-2">Payment Details</label>
                                    <div className="space-y-3">
                                        <div className="relative">
                                            <DollarSign className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                                            <input
                                                type="number"
                                                placeholder="Paid Amount"
                                                className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg outline-none"
                                                value={paidAmount || ''}
                                                onChange={(e) => setPaidAmount(Number(e.target.value))}
                                            />
                                        </div>
                                        <select
                                            className="w-full px-3 py-2 border border-slate-200 rounded-lg outline-none bg-white"
                                            value={paymentMethod}
                                            onChange={(e) => setPaymentMethod(e.target.value)}
                                        >
                                            <option value="Cash">Cash</option>
                                            <option value="Card">Card</option>
                                            <option value="Transfer">Bank Transfer</option>
                                            <option value="Other">Other</option>
                                        </select>
                                    </div>
                                </div>
                            </div>

                            {/* Right Column: Items */}
                            <div className="lg:col-span-2 space-y-6">
                                <div>
                                    <label className="block text-sm font-semibold text-slate-700 mb-2">Add Items to Order</label>
                                    <select
                                        className="w-full px-3 py-2 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                                        onChange={handleAddItem}
                                        value=""
                                    >
                                        <option value="">Choose equipment...</option>
                                        {equipment.filter(e => e.availableQuantity > 0).map(e => (
                                            <option key={e.id} value={e.id}>{e.name} ({settings.currency}{e.pricePerDay}/day - {e.availableQuantity} left)</option>
                                        ))}
                                    </select>
                                </div>

                                <div className="border border-slate-100 rounded-xl overflow-hidden overflow-x-auto">
                                    <table className="w-full text-left text-sm min-w-[500px]">
                                        <thead className="bg-slate-50 text-slate-500 uppercase text-[10px] font-bold tracking-wider">
                                            <tr>
                                                <th className="px-4 py-3">Item</th>
                                                <th className="px-4 py-3">Qty</th>
                                                <th className="px-4 py-3">Price/Day</th>
                                                <th className="px-4 py-3">Total ({Math.max(1, differenceInDays(parseISO(endDate), parseISO(startDate)))} Days)</th>
                                                <th className="px-4 py-3 text-right"></th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100">
                                            {rentalItems.length > 0 ? rentalItems.map((item, idx) => {
                                                const days = Math.max(1, differenceInDays(parseISO(endDate), parseISO(startDate)));
                                                return (
                                                    <tr key={idx}>
                                                        <td className="px-4 py-3 font-medium">{item.name}</td>
                                                        <td className="px-4 py-3">
                                                            <input
                                                                type="number"
                                                                className="w-12 border rounded px-1"
                                                                value={item.quantity}
                                                                min="1"
                                                                onChange={(e) => {
                                                                    const eq = equipment.find(e => e.id === item.equipmentId);
                                                                    const val = Math.max(1, Number(e.target.value));
                                                                    const finalVal = eq ? Math.min(val, eq.availableQuantity) : val;

                                                                    setRentalItems(prev => prev.map(ri =>
                                                                        ri.equipmentId === item.equipmentId
                                                                            ? { ...ri, quantity: finalVal, totalPrice: finalVal * ri.pricePerUnit }
                                                                            : ri
                                                                    ));
                                                                }}
                                                            />
                                                        </td>
                                                        <td className="px-4 py-3">{settings.currency}{item.pricePerUnit}</td>
                                                        <td className="px-4 py-3 font-semibold">{settings.currency}{(item.totalPrice * days).toFixed(2)}</td>
                                                        <td className="px-4 py-3 text-right">
                                                            <button
                                                                onClick={() => setRentalItems(prev => prev.filter(ri => ri.equipmentId !== item.equipmentId))}
                                                                className="text-red-400 hover:text-red-600"
                                                            >
                                                                <Trash2 className="w-4 h-4" />
                                                            </button>
                                                        </td>
                                                    </tr>
                                                );
                                            }) : (
                                                <tr>
                                                    <td colSpan={5} className="px-4 py-8 text-center text-slate-400 italic">No items added yet</td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>

                                <div className="bg-slate-50 p-4 rounded-xl space-y-2">
                                    <div className="flex justify-between text-slate-600 text-sm">
                                        <span>Subtotal</span>
                                        <span className="font-medium text-slate-900">{settings.currency}{calculateSubtotal().toFixed(2)}</span>
                                    </div>
                                    <div className="flex justify-between text-slate-600">
                                        <span>Discount Applied</span>
                                        <span className="text-emerald-600 font-bold">-{settings.currency}{(discountType === 'percentage' ? (calculateSubtotal() * discountValue / 100) : discountValue).toFixed(2)}</span>
                                    </div>
                                    <div className="flex justify-between text-slate-600">
                                        <span>VAT ({settings.taxPercentage || 5}%)</span>
                                        <span className="font-bold text-slate-900">{settings.currency}{calculateVAT().toFixed(2)}</span>
                                    </div>
                                    <div className="flex justify-between text-slate-600 border-t border-slate-100 pt-1">
                                        <span className="font-bold">Total Amount</span>
                                        <span className="font-bold text-slate-900">{settings.currency}{calculateGrandTotal().toFixed(2)}</span>
                                    </div>
                                    <div className="flex justify-between text-slate-600">
                                        <span>Paid Amount</span>
                                        <span className="font-bold text-blue-600">-{settings.currency}{paidAmount.toFixed(2)}</span>
                                    </div>
                                    <div className="pt-2 border-t border-slate-200 flex justify-between">
                                        <span className="font-bold text-slate-900 uppercase tracking-wider text-xs flex items-center">Balance Due</span>
                                        <span className="font-black text-red-600 text-lg">{settings.currency}{(calculateGrandTotal() - paidAmount).toFixed(2)}</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="p-6 border-t border-slate-100 bg-slate-50 flex gap-3 justify-end">
                            <button
                                onClick={() => handleCreateOrder('Quotation')}
                                className="px-4 py-2 border border-slate-300 rounded-lg text-slate-700 hover:bg-white font-medium"
                            >
                                Save as Quotation
                            </button>
                            <button
                                onClick={() => handleCreateOrder('Active')}
                                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium shadow-sm shadow-blue-200"
                            >
                                Create Order
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Return Processing Modal */}
            {processingReturn && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
                        <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50">
                            <h2 className="text-xl font-bold text-slate-900">Process Return</h2>
                            <button onClick={() => setProcessingReturn(null)} className="text-slate-400 hover:text-slate-600">
                                <X className="w-6 h-6" />
                            </button>
                        </div>

                        <div className="p-6 overflow-y-auto">
                            <div className="space-y-4">
                                <div className="bg-blue-50 p-4 rounded-lg flex gap-4 items-center">
                                    <AlertCircle className="w-6 h-6 text-blue-600" />
                                    <div>
                                        <p className="font-bold text-blue-900">Return for Order #{processingReturn.id}</p>
                                        <p className="text-blue-700 text-sm">Customer: {processingReturn.customerName}</p>
                                    </div>
                                </div>

                                <h3 className="font-semibold text-slate-900">Item Condition Check</h3>
                                <div className="space-y-3">
                                    {processingReturn.items.map(item => {
                                        const alreadyReturnedGood = Number(item.quantityReturnedGood) || 0;
                                        const alreadyReturnedDamaged = Number(item.quantityReturnedDamaged) || 0;
                                        const alreadyReturned = alreadyReturnedGood + alreadyReturnedDamaged;
                                        const remaining = Math.max(0, item.quantity - alreadyReturned);
                                        if (remaining <= 0) return null; // Skip fully returned items
                                        return (
                                            <div key={item.equipmentId} className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                                                <div className="flex justify-between mb-2">
                                                    <span className="font-medium">{item.name}</span>
                                                    <div className="text-right">
                                                        <span className="text-slate-500 text-sm">Rented: {item.quantity}</span>
                                                        {alreadyReturned > 0 && (
                                                            <span className="ml-2 text-xs text-green-600 font-semibold">Already returned: {alreadyReturned}</span>
                                                        )}
                                                        <span className="ml-2 text-xs text-blue-600 font-bold">Remaining: {remaining}</span>
                                                    </div>
                                                </div>
                                                <div className="grid grid-cols-2 gap-4">
                                                    <div>
                                                        <label className="text-xs font-semibold uppercase text-slate-500">Returning Good</label>
                                                        <input
                                                            type="number"
                                                            min="0"
                                                            max={remaining}
                                                            className="w-full mt-1 border rounded p-2"
                                                            value={returnCounts[item.equipmentId]?.good ?? remaining}
                                                            onChange={(e) => {
                                                                const equipmentItem = equipment.find(eq => eq.id === item.equipmentId);
                                                                const unitValue = equipmentItem ? Number(equipmentItem.value) : (Number(item.value) || 0);

                                                                const good = Math.min(remaining, Math.max(0, parseInt(e.target.value) || 0));
                                                                const damaged = remaining - good;

                                                                setReturnCounts(prev => ({
                                                                    ...prev,
                                                                    [item.equipmentId]: { good, damaged, remaining }
                                                                }));

                                                                setReturnReplacementCosts(prev => ({
                                                                    ...prev,
                                                                    [item.equipmentId]: damaged * unitValue
                                                                }));
                                                            }}
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="text-xs font-semibold uppercase text-red-500">Damaged/Lost</label>
                                                        <input
                                                            type="number"
                                                            readOnly
                                                            className="w-full mt-1 border rounded p-2 bg-red-50 text-red-600 font-bold"
                                                            value={returnCounts[item.equipmentId]?.damaged ?? 0}
                                                        />
                                                    </div>
                                                </div>
                                                {(returnCounts[item.equipmentId]?.damaged > 0) && (
                                                    <div className="mt-2">
                                                        <label className="text-xs font-semibold uppercase text-slate-500">Replacement Cost</label>
                                                        <input
                                                            type="number"
                                                            placeholder="Enter cost..."
                                                            className="w-full mt-1 border rounded p-2 border-red-200 focus:ring-red-500"
                                                            value={returnReplacementCosts[item.equipmentId] || ''}
                                                            onChange={(e) => setReturnReplacementCosts(prev => ({
                                                                ...prev,
                                                                [item.equipmentId]: parseFloat(e.target.value) || 0
                                                            }))}
                                                        />
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>

                            </div>
                        </div>

                        <div className="bg-amber-50 rounded-xl p-4 border border-amber-100">
                            <div className="flex justify-between items-center mb-2">
                                <div className="flex items-center gap-2">
                                    <Clock className="w-5 h-5 text-amber-600" />
                                    <h3 className="font-bold text-amber-900">Late Return Fine</h3>
                                </div>
                                {daysLate > 0 && (
                                    <span className="bg-amber-100 text-amber-700 text-xs font-bold px-2 py-1 rounded">
                                        {daysLate} DAYS LATE
                                    </span>
                                )}
                            </div>
                            <div className="flex items-center justify-between gap-4">
                                <p className="text-sm text-amber-700">
                                    Enter manual fine for delay or leave as calculated.
                                </p>
                                <div className="relative w-32">
                                    <span className="absolute left-3 top-2 text-amber-600 font-bold">{settings.currency}</span>
                                    <input
                                        type="number"
                                        min="0"
                                        className="w-full pl-8 pr-3 py-1.5 border border-amber-200 rounded-lg font-bold text-amber-900 focus:ring-2 focus:ring-amber-500 outline-none"
                                        value={lateFee}
                                        onChange={(e) => setLateFee(parseFloat(e.target.value) || 0)}
                                    />
                                </div>
                            </div>
                        </div>
                        <div className="p-6 border-t border-slate-100 bg-slate-50 flex justify-end gap-3">
                            <button onClick={() => setProcessingReturn(null)} className="px-4 py-2 text-slate-600 font-medium">Cancel</button>
                            <button
                                onClick={() => finalizeReturn()}
                                className="px-6 py-2 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 shadow-lg shadow-blue-200"
                            >
                                Complete Return
                            </button>
                        </div>
                    </div>
                </div>
            )
            }

            {/* Update Order Modal */}
            {
                updatingOrder && (
                    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                        <div className="bg-white rounded-2xl shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
                            <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50">
                                <h2 className="text-xl font-bold text-slate-900">Update Order {updatingOrder.id}</h2>
                                <button onClick={() => setUpdatingOrder(null)} className="text-slate-400 hover:text-slate-600">
                                    <X className="w-6 h-6" />
                                </button>
                            </div>

                            <form onSubmit={handleUpdateOrderSubmit} className="flex-1 overflow-y-auto p-6 grid grid-cols-1 lg:grid-cols-2 gap-8">
                                {/* Date Modifications */}
                                <div className="space-y-4">
                                    <h3 className="font-semibold text-slate-900 border-b pb-2">Trip Dates</h3>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium text-slate-700">Start Date</label>
                                            <input
                                                type="date"
                                                required
                                                className="w-full mt-1 border rounded-lg p-2"
                                                value={updateFormData.startDate}
                                                onChange={(e) => setUpdateFormData({ ...updateFormData, startDate: e.target.value })}
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-slate-700">End Date</label>
                                            <input
                                                type="date"
                                                required
                                                className="w-full mt-1 border rounded-lg p-2"
                                                value={updateFormData.endDate}
                                                onChange={(e) => setUpdateFormData({ ...updateFormData, endDate: e.target.value })}
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* Financial Modifications */}
                                <div className="space-y-4">
                                    <h3 className="font-semibold text-slate-900 border-b pb-2">Financial Adjustments</h3>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700">Additional Payment</label>
                                        <div className="relative mt-1">
                                            <DollarSign className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                                            <input
                                                type="number"
                                                className="w-full pl-9 border rounded-lg p-2"
                                                value={updateFormData.additionalPayment}
                                                onChange={(e) => setUpdateFormData({ ...updateFormData, additionalPayment: parseFloat(e.target.value) || 0 })}
                                            />
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium text-slate-700">Late Fee</label>
                                            <input
                                                type="number"
                                                className="w-full mt-1 border rounded-lg p-2"
                                                value={updateFormData.lateFee}
                                                onChange={(e) => setUpdateFormData({ ...updateFormData, lateFee: parseFloat(e.target.value) || 0 })}
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-slate-700">Damage Fee</label>
                                            <input
                                                type="number"
                                                className="w-full mt-1 border rounded-lg p-2"
                                                value={updateFormData.damageFee}
                                                onChange={(e) => setUpdateFormData({ ...updateFormData, damageFee: parseFloat(e.target.value) || 0 })}
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* Item Modifications */}
                                <div className="lg:col-span-2 space-y-4">
                                    <h3 className="font-semibold text-slate-900 border-b pb-2">Order Items</h3>
                                    <div className="bg-slate-50 rounded-xl p-4">
                                        <table className="w-full text-sm text-left">
                                            <thead className="text-xs uppercase text-slate-500 font-semibold">
                                                <tr>
                                                    <th className="pb-2">Item</th>
                                                    <th className="pb-2">Qty</th>
                                                    <th className="pb-2 text-right">Unit Price</th>
                                                    <th className="pb-2 text-right">Total</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-200">
                                                {updateFormData.items.map((item, idx) => {
                                                    const days = Math.max(1, differenceInDays(parseISO(updateFormData.endDate), parseISO(updateFormData.startDate)));
                                                    return (
                                                        <tr key={idx}>
                                                            <td className="py-2 font-medium">{item.name}</td>
                                                            <td className="py-2">
                                                                <input
                                                                    type="number"
                                                                    min="1"
                                                                    className="w-16 border rounded p-1"
                                                                    value={item.quantity}
                                                                    onChange={(e) => {
                                                                        const newQty = parseInt(e.target.value) || 1;
                                                                        const newItems = [...updateFormData.items];
                                                                        newItems[idx] = { ...item, quantity: newQty };
                                                                        setUpdateFormData({ ...updateFormData, items: newItems });
                                                                    }}
                                                                />
                                                            </td>
                                                            <td className="py-2 text-right">{settings.currency}{item.pricePerUnit}</td>
                                                            <td className="py-2 text-right font-bold">{settings.currency}{(item.pricePerUnit * item.quantity * days).toFixed(2)}</td>
                                                        </tr>
                                                    );
                                                })}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>

                                <div className="lg:col-span-2">
                                    <label className="block text-sm font-medium text-slate-700">Notes / Reason for Update</label>
                                    <textarea
                                        className="w-full mt-1 border rounded-lg p-2 h-20"
                                        value={updateFormData.notes}
                                        onChange={(e) => setUpdateFormData({ ...updateFormData, notes: e.target.value })}
                                    />
                                </div>

                                <div className="lg:col-span-2 flex justify-end gap-3 pt-4 border-t">
                                    <button
                                        type="button"
                                        onClick={() => setUpdatingOrder(null)}
                                        className="px-4 py-2 text-slate-600 font-medium"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        className="px-6 py-2 bg-indigo-600 text-white rounded-lg font-bold hover:bg-indigo-700 shadow-md"
                                    >
                                        Save Order Updates
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )
            }
        </div >
    );
};

export default OrderManager;
