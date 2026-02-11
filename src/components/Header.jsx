import React from 'react';
import { Menu, Database, Bell } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '../utils/cn';

const Header = ({
    onToggleSidebar,
    sqlMode,
    isSqlOnline
}) => {
    return (
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-4 sm:px-6 z-10 shrink-0 overflow-x-hidden">
            <button onClick={onToggleSidebar} className="p-2 hover:bg-slate-100 rounded-lg text-slate-500">
                <Menu className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2 sm:gap-4">
                <div className={cn(
                    "flex items-center gap-2 px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border",
                    sqlMode
                        ? (isSqlOnline ? "bg-emerald-50 text-emerald-600 border-emerald-200" : "bg-rose-50 text-rose-600 border-rose-200")
                        : "bg-slate-100 text-slate-600 border-slate-200"
                )}>
                    <Database className="w-3.5 h-3.5" />
                    {sqlMode ? (isSqlOnline ? 'Online' : 'Offline') : 'Local Mode'}
                </div>
                <div className="h-8 w-px bg-slate-200"></div>
                <div className="flex items-center gap-2">
                    <span className="text-xs sm:text-sm font-medium text-slate-700 whitespace-nowrap">
                        {format(new Date(), 'MMM dd, yyyy')}
                    </span>
                </div>
            </div>
        </header>
    );
};

export default Header;
