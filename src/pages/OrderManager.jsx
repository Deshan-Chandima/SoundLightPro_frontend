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


    const [selectedCustomerId, setSelectedCustomerId] = useState('');
    const [rentalItems, setRentalItems] = useState([]);
    const [startDate, setStartDate] = useState(format(new Date(), 'yyyy-MM-dd'));
    const [endDate, setEndDate] = useState(format(new Date(), 'yyyy-MM-dd'));
    const [paidAmount, setPaidAmount] = useState(0);
    const [paymentMethod, setPaymentMethod] = useState('Cash');
    const [notes, setNotes] = useState('');


    const [discountType, setDiscountType] = useState('percentage');
    const [discountValue, setDiscountValue] = useState(0);


    const [processingReturn, setProcessingReturn] = useState(null);
    const [returnCounts, setReturnCounts] = useState({});
    const [returnReplacementCosts, setReturnReplacementCosts] = useState({});
    const [returnSuccess, setReturnSuccess] = useState(null);


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

            const alreadyReturnedGood = Number(item.quantityReturnedGood) || 0;
            const alreadyReturnedDamaged = Number(item.quantityReturnedDamaged) || 0;
            const alreadyReturned = alreadyReturnedGood + alreadyReturnedDamaged;
            const remaining = Math.max(0, item.quantity - alreadyReturned);
            initialCounts[item.equipmentId] = { good: remaining, damaged: 0, remaining };

            initialCosts[item.equipmentId] = 0;
        });
        setReturnCounts(initialCounts);
        setReturnReplacementCosts(initialCosts);


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


        const originalDuration = Math.max(1, differenceInDays(dueDate, startDate));
        const actualDuration = Math.max(1, differenceInDays(today, startDate));


        let subtotalAmount = processingReturn.subtotalAmount;
        let totalAmount = processingReturn.totalAmount;
        let taxAmount = processingReturn.taxAmount;

        if (actualDuration < originalDuration) {

            subtotalAmount = processingReturn.items.reduce((sum, item) =>
                sum + (item.pricePerUnit * item.quantity * actualDuration), 0
            );


            let totalAfterDiscount = subtotalAmount;
            if (processingReturn.discountType === 'percentage') {
                totalAfterDiscount = subtotalAmount - (subtotalAmount * processingReturn.discountValue / 100);
            } else {
                totalAfterDiscount = Math.max(0, subtotalAmount - processingReturn.discountValue);
            }


            taxAmount = totalAfterDiscount * ((settings.taxPercentage || 5) / 100);
            totalAmount = totalAfterDiscount + taxAmount;
        }

        let damageFeeTotal = 0;
        const updatedItems = processingReturn.items.map(item => {
            const cost = returnReplacementCosts[item.equipmentId] || 0;
            const counts = returnCounts[item.equipmentId] || { good: 0, damaged: 0 };
            damageFeeTotal += cost;

            const prevGood = Number(item.quantityReturnedGood) || 0;
            const prevDamaged = Number(item.quantityReturnedDamaged) || 0;
            return {
                ...item,
                replacementCost: (item.replacementCost || 0) + cost,
                quantityReturnedGood: prevGood + Number(counts.good),
                quantityReturnedDamaged: prevDamaged + Number(counts.damaged)
            };
        });


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

        setUpdatingOrder(order);

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
            lateFee: Number(order.lateFee) || 0,
            damageFee: Number(order.damageFee) || 0,
            notes: order.notes || '',
            startDate: sDate,
            endDate: eDate,
            items: order.items.map(item => ({ ...item }))
        });
    };

    const handleUpdateOrderSubmit = async (e) => {
        e.preventDefault();
        if (!updatingOrder) return;

        try {

            const days = Math.max(1, differenceInDays(parseISO(updateFormData.endDate), parseISO(updateFormData.startDate)));
            const subtotalAmount = updateFormData.items.reduce((sum, item) => sum + ((Number(item.pricePerUnit) || 0) * (Number(item.quantity) || 0) * days), 0);

            const discountValue = Number(updatingOrder.discountValue) || 0;
            let totalAfterDiscount = subtotalAmount;
            if (updatingOrder.discountType === 'percentage') {
                totalAfterDiscount = subtotalAmount - (subtotalAmount * discountValue / 100);
            } else {
                totalAfterDiscount = Math.max(0, subtotalAmount - discountValue);
            }

            const taxRate = (Number(settings.taxPercentage) || 5) / 100;
            const taxAmount = totalAfterDiscount * taxRate;
            const totalAmount = totalAfterDiscount + taxAmount;

            const additionalPayment = Number(updateFormData.additionalPayment) || 0;
            const lateFee = Number(updateFormData.lateFee) || 0;
            const damageFee = Number(updateFormData.damageFee) || 0;
            const newPaidAmount = (Number(updatingOrder.paidAmount) || 0) + additionalPayment;
            const totalWithFees = totalAmount + lateFee + damageFee;

            const updatedOrder = {
                ...updatingOrder,
                items: updateFormData.items,
                startDate: updateFormData.startDate,
                endDate: updateFormData.endDate,
                subtotalAmount,
                taxAmount,
                totalAmount,
                paidAmount: newPaidAmount,
                lateFee,
                damageFee,
                notes: updateFormData.notes,
                balanceAmount: totalWithFees - newPaidAmount
            };


            if (updatingOrder.status === 'Active') {
                const sqlMode = localStorage.getItem('rental_sql_mode') === 'true';
                const { api } = sqlMode ? await import('../services/apiService') : { api: null };

                const updatedEquipment = [...equipment];


                updatingOrder.items.forEach(oldItem => {
                    const eqIdx = updatedEquipment.findIndex(eq => eq.id === oldItem.equipmentId);
                    if (eqIdx !== -1) {
                        updatedEquipment[eqIdx] = {
                            ...updatedEquipment[eqIdx],
                            availableQuantity: (Number(updatedEquipment[eqIdx].availableQuantity) || 0) + (Number(oldItem.quantity) || 0)
                        };
                    }
                });


                updateFormData.items.forEach(newItem => {
                    const eqIdx = updatedEquipment.findIndex(eq => eq.id === newItem.equipmentId);
                    if (eqIdx !== -1) {
                        updatedEquipment[eqIdx] = {
                            ...updatedEquipment[eqIdx],
                            availableQuantity: (Number(updatedEquipment[eqIdx].availableQuantity) || 0) - (Number(newItem.quantity) || 0)
                        };
                        if (sqlMode && api) {
                            api.updateEquipment(updatedEquipment[eqIdx]).catch(err => console.error("Stock update failed:", err));
                        }
                    }
                });

                setEquipment(updatedEquipment);
            }

            const sqlMode = localStorage.getItem('rental_sql_mode') === 'true';
            if (sqlMode) {
                const { api } = await import('../services/apiService');
                await api.updateOrder(updatedOrder);
            }

            setOrders(prev => prev.map(o => o.id === updatingOrder.id ? updatedOrder : o));
            setUpdatingOrder(null);
        } catch (error) {
            console.error("Failed to update order:", error);
            alert("Error: Failed to save updates. " + error.message);
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


            {updatingOrder && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-2 sm:p-4">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[95vh]">
                        <div className="p-4 sm:p-6 border-b border-slate-100 flex items-center justify-between bg-indigo-50 text-indigo-900 shrink-0">
                            <div className="flex items-center gap-2">
                                <RefreshCcw className="w-5 h-5 shrink-0" />
                                <h2 className="text-lg sm:text-xl font-bold">Update Order Details</h2>
                            </div>
                            <button onClick={() => setUpdatingOrder(null)} className="text-indigo-700 p-2">
                                <X className="w-6 h-6" />
                            </button>
                        </div>
                        <form onSubmit={handleUpdateOrderSubmit} className="p-4 sm:p-6 space-y-6 overflow-y-auto">
                            <div className="bg-indigo-50 p-4 rounded-lg grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4 shrink-0">
                                <div>
                                    <p className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest">Customer</p>
                                    <p className="text-lg font-black text-indigo-900 truncate">{updatingOrder.customerName}</p>
                                </div>
                                <div>
                                    <p className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest">Order ID</p>
                                    <p className="text-lg font-black text-indigo-900">{updatingOrder.id}</p>
                                </div>
                            </div>

                            {(updatingOrder.status === 'Active' || updatingOrder.status === 'Quotation') && (
                                <div className="space-y-4 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                                    <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest flex items-center gap-2">
                                        <Package className="w-4 h-4 text-indigo-500" />
                                        Manage Equipment & Dates
                                    </h3>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Start Date</label>
                                            <input
                                                type="date"
                                                className="w-full px-3 py-2 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                                                value={updateFormData.startDate}
                                                onChange={(e) => setUpdateFormData({ ...updateFormData, startDate: e.target.value })}
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">End Date</label>
                                            <input
                                                type="date"
                                                className="w-full px-3 py-2 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                                                value={updateFormData.endDate}
                                                onChange={(e) => setUpdateFormData({ ...updateFormData, endDate: e.target.value })}
                                            />
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <label className="block text-xs font-bold text-slate-500 uppercase">Add Equipment</label>
                                        <select
                                            className="w-full px-3 py-2 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 bg-white text-sm"
                                            onChange={(e) => {
                                                const equipId = e.target.value;
                                                if (!equipId) return;
                                                const item = equipment.find(eq => eq.id === equipId);
                                                if (item && item.availableQuantity > 0) {
                                                    const existing = updateFormData.items.find(ri => ri.equipmentId === equipId);
                                                    if (existing) {
                                                        if (existing.quantity >= item.availableQuantity + (updatingOrder.items.find(o => o.equipmentId === equipId)?.quantity || 0)) {
                                                            alert(`Not enough stock.`);
                                                            return;
                                                        }
                                                        setUpdateFormData({
                                                            ...updateFormData,
                                                            items: updateFormData.items.map(ri =>
                                                                ri.equipmentId === equipId
                                                                    ? { ...ri, quantity: ri.quantity + 1, totalPrice: (ri.quantity + 1) * item.pricePerDay }
                                                                    : ri
                                                            )
                                                        });
                                                    } else {
                                                        setUpdateFormData({
                                                            ...updateFormData,
                                                            items: [...updateFormData.items, {
                                                                equipmentId: item.id,
                                                                name: item.name,
                                                                quantity: 1,
                                                                pricePerUnit: item.pricePerDay,
                                                                totalPrice: item.pricePerDay
                                                            }]
                                                        });
                                                    }
                                                }
                                            }}
                                            value=""
                                        >
                                            <option value="">Choose equipment...</option>
                                            {equipment.map(e => {

                                                const inCurrentOrder = updatingOrder.status === 'Active' ? (updatingOrder.items.find(oi => oi.equipmentId === e.id)?.quantity || 0) : 0;
                                                const totalAvail = e.availableQuantity + inCurrentOrder;
                                                if (totalAvail <= 0) return null;
                                                return (
                                                    <option key={e.id} value={e.id}>{e.name} ({settings.currency}{e.pricePerDay}/day - {totalAvail} available)</option>
                                                );
                                            })}
                                        </select>
                                    </div>

                                    <div className="border border-slate-200 rounded-xl overflow-hidden max-h-40 overflow-y-auto bg-white">
                                        <table className="w-full text-left text-xs">
                                            <thead className="bg-slate-50 text-slate-500 uppercase font-black tracking-widest sticky top-0">
                                                <tr>
                                                    <th className="px-3 py-2">Item</th>
                                                    <th className="px-3 py-2">Qty</th>
                                                    <th className="px-3 py-2">Price</th>
                                                    <th className="px-3 py-2 text-right"></th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-100">
                                                {updateFormData.items.map((item, idx) => (
                                                    <tr key={idx}>
                                                        <td className="px-3 py-2 font-bold">{item.name}</td>
                                                        <td className="px-3 py-2">
                                                            <input
                                                                type="number"
                                                                className="w-10 border rounded px-1 outline-none"
                                                                value={item.quantity}
                                                                min="1"
                                                                onChange={(e) => {
                                                                    const eq = equipment.find(e => e.id === item.equipmentId);
                                                                    const val = Math.max(1, Number(e.target.value));
                                                                    const inCurrentOrder = updatingOrder.status === 'Active' ? (updatingOrder.items.find(oi => oi.equipmentId === item.equipmentId)?.quantity || 0) : 0;
                                                                    const totalAvail = eq ? eq.availableQuantity + inCurrentOrder : val;
                                                                    const finalVal = Math.min(val, totalAvail);

                                                                    setUpdateFormData({
                                                                        ...updateFormData,
                                                                        items: updateFormData.items.map(ri =>
                                                                            ri.equipmentId === item.equipmentId
                                                                                ? { ...ri, quantity: finalVal, totalPrice: finalVal * ri.pricePerUnit }
                                                                                : ri
                                                                        )
                                                                    });
                                                                }}
                                                            />
                                                        </td>
                                                        <td className="px-3 py-2">{settings.currency}{item.pricePerUnit}</td>
                                                        <td className="px-3 py-2 text-right">
                                                            <button
                                                                type="button"
                                                                onClick={() => setUpdateFormData({
                                                                    ...updateFormData,
                                                                    items: updateFormData.items.filter(ri => ri.equipmentId !== item.equipmentId)
                                                                })}
                                                                className="text-red-400 hover:text-red-600 p-1"
                                                            >
                                                                <Trash2 className="w-3.5 h-3.5" />
                                                            </button>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            )}

                            <div className="grid grid-cols-2 gap-4">
                                <div className="col-span-2">
                                    <label className="block text-sm font-bold text-slate-700 mb-2">Record Payment ({settings.currency})</label>
                                    <div className="relative">
                                        <DollarSign className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                                        <input
                                            type="number"
                                            className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500"
                                            placeholder="Add partial payment..."
                                            value={updateFormData.additionalPayment || ''}
                                            onChange={e => setUpdateFormData({ ...updateFormData, additionalPayment: Number(e.target.value) })}
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-bold text-slate-700 mb-2 italic">Late Fee / Fine</label>
                                    <div className="relative group">
                                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                            <span className="text-amber-500 font-bold">{settings.currency || '$'}</span>
                                        </div>
                                        <input
                                            type="number"
                                            className="w-full pl-9 pr-3 py-2 bg-amber-50 border border-amber-200 rounded-lg outline-none focus:ring-2 focus:ring-amber-500 font-bold text-amber-700 transition-all"
                                            value={updateFormData.lateFee}
                                            onChange={e => setUpdateFormData({ ...updateFormData, lateFee: Number(e.target.value) })}
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-bold text-slate-700 mb-2 italic">Replacement / Damage Fee</label>
                                    <div className="relative group">
                                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                            <span className="text-rose-500 font-bold">{settings.currency || '$'}</span>
                                        </div>
                                        <input
                                            type="number"
                                            className="w-full pl-9 pr-3 py-2 bg-rose-50 border border-rose-200 rounded-lg outline-none focus:ring-2 focus:ring-rose-500 font-bold text-rose-700 transition-all"
                                            value={updateFormData.damageFee}
                                            onChange={e => setUpdateFormData({ ...updateFormData, damageFee: Number(e.target.value) })}
                                        />
                                    </div>
                                </div>

                                <div className="col-span-2">
                                    <label className="block text-sm font-bold text-slate-700 mb-2">Order Notes</label>
                                    <textarea
                                        className="w-full px-3 py-2 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 h-20 resize-none text-sm"
                                        value={updateFormData.notes}
                                        onChange={e => setUpdateFormData({ ...updateFormData, notes: e.target.value })}
                                    ></textarea>
                                </div>
                            </div>


                            <div className="bg-slate-900 text-white p-5 rounded-[2rem] shadow-xl relative overflow-hidden">
                                <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -mr-16 -mt-16"></div>

                                {(() => {
                                    const days = Math.max(1, differenceInDays(parseISO(updateFormData.endDate), parseISO(updateFormData.startDate)));
                                    const subtotal = updateFormData.items.reduce((sum, item) => sum + ((Number(item.pricePerUnit) || 0) * (Number(item.quantity) || 0) * days), 0);
                                    let totalAfterDiscount = subtotal;
                                    const discountVal = Number(updatingOrder.discountValue) || 0;
                                    if (updatingOrder.discountType === 'percentage') {
                                        totalAfterDiscount = subtotal - (subtotal * discountVal / 100);
                                    } else {
                                        totalAfterDiscount = Math.max(0, subtotal - discountVal);
                                    }
                                    const vat = totalAfterDiscount * ((Number(settings.taxPercentage) || 5) / 100);
                                    const totalWithTax = totalAfterDiscount + vat;
                                    const fees = (Number(updateFormData.lateFee) || 0) + (Number(updateFormData.damageFee) || 0);
                                    const paid = (Number(updatingOrder.paidAmount) || 0) + (Number(updateFormData.additionalPayment) || 0);
                                    const balance = (totalWithTax + fees) - paid;

                                    return (
                                        <div className="relative z-10 space-y-3">
                                            <div className="flex justify-between text-xs font-bold uppercase tracking-widest text-white/50 border-b border-white/10 pb-2">
                                                <span>Financial Summary</span>
                                                <span>{days} Days</span>
                                            </div>
                                            <div className="flex justify-between text-sm">
                                                <span className="opacity-70 italic">Rental Subtotal:</span>
                                                <span className="font-bold">{settings.currency}{subtotal.toFixed(2)}</span>
                                            </div>
                                            {updatingOrder.discountValue > 0 && (
                                                <div className="flex justify-between text-sm text-emerald-400">
                                                    <span className="opacity-70 italic">Discount Applied:</span>
                                                    <span className="font-bold">-{settings.currency}{(subtotal - totalAfterDiscount).toFixed(2)}</span>
                                                </div>
                                            )}
                                            <div className="flex justify-between text-sm">
                                                <span className="opacity-70 italic">VAT ({settings.taxPercentage || 5}%):</span>
                                                <span className="font-bold">+{settings.currency}{vat.toFixed(2)}</span>
                                            </div>
                                            <div className="flex justify-between text-sm text-rose-400">
                                                <span className="opacity-70 italic">Additional Fees:</span>
                                                <span className="font-bold">+{settings.currency}{fees.toFixed(2)}</span>
                                            </div>
                                            <div className="flex justify-between text-sm text-indigo-300">
                                                <span className="opacity-70 italic">Total Paid to Date:</span>
                                                <span className="font-bold">-{settings.currency}{paid.toFixed(2)}</span>
                                            </div>
                                            <div className="flex justify-between text-xl pt-2 border-t border-white/10">
                                                <span className="font-black tracking-tight">Remaining Balance:</span>
                                                <span className={cn("font-black tracking-tighter", balance > 0 ? "text-rose-500" : "text-emerald-400")}>
                                                    {settings.currency}{balance.toFixed(2)}
                                                </span>
                                            </div>
                                        </div>
                                    );
                                })()}
                            </div>

                            <div className="flex gap-4 pt-2">
                                <button
                                    type="button"
                                    onClick={() => setUpdatingOrder(null)}
                                    className="flex-1 px-4 py-3 border border-slate-200 rounded-2xl hover:bg-slate-50 transition-all font-bold text-slate-600 active:scale-95"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="flex-1 px-4 py-3 bg-gradient-to-r from-indigo-600 to-violet-600 text-white rounded-2xl font-black shadow-lg shadow-indigo-500/30 transition-all active:scale-95"
                                >
                                    Save Order Updates
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div >
    );
};

export default OrderManager;
