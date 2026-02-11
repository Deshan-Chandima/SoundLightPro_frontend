import React from 'react';
import {
    LayoutDashboard,
    Package,
    Users,
    ShoppingCart,
    BarChart3,
    Database,
    Settings as SettingsIcon,
    Receipt,
    UserCog,
    LogOut
} from 'lucide-react';
import { cn } from '../utils/cn';

const Sidebar = ({
    isSidebarOpen,
    isMobileMenuOpen,
    settings,
    currentUser,
    activeView,
    onNavClick,
    onLogout
}) => {
    const navItems = [
        { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
        { id: 'inventory', label: 'Inventory', icon: Package },
        { id: 'customers', label: 'Customers', icon: Users },
        { id: 'orders', label: 'Orders & Rentals', icon: ShoppingCart },
        { id: 'expenses', label: 'Expenses', icon: Receipt },
        { id: 'users', label: 'Users', icon: UserCog },
        { id: 'reports', label: 'Reports', icon: BarChart3 },
        { id: 'settings', label: 'Settings', icon: SettingsIcon },
        { id: 'backup', label: 'Backup & Restore', icon: Database },
    ];

    return (
        <aside className={cn(
            "bg-gradient-to-b from-indigo-950 via-indigo-950 to-violet-950 text-white transition-all duration-500 ease-in-out flex flex-col z-50 fixed inset-y-0 left-0 lg:static border-r border-indigo-900/50 shadow-[10px_0_40px_-15px_rgba(0,0,0,0.5)]",
            (isSidebarOpen || isMobileMenuOpen) ? "w-64" : "w-20",
            isMobileMenuOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        )}>
            <div className="p-6 flex items-center gap-3 border-b border-white/5">
                <div className="bg-gradient-to-br from-cyan-400 via-indigo-500 to-purple-600 p-2.5 rounded-2xl flex-shrink-0 shadow-[0_0_20px_rgba(34,211,238,0.4)]">
                    {settings.logo ? (
                        <img src={settings.logo} alt="Logo" className="w-6 h-6 object-contain" />
                    ) : (
                        <Package className="w-6 h-6 text-white" />
                    )}
                </div>
                {(isSidebarOpen || (isMobileMenuOpen && window.innerWidth < 1024)) && (
                    <span className="font-black text-xl tracking-tighter truncate bg-clip-text text-transparent bg-gradient-to-r from-white via-indigo-100 to-indigo-400">
                        {settings.companyName}
                    </span>
                )}
            </div>

            <nav className="flex-1 mt-8 px-4 space-y-3 overflow-y-auto custom-scrollbar">
                {navItems.map((item) => (
                    <button
                        key={item.id}
                        onClick={() => onNavClick(item.id)}
                        className={cn(
                            "w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl transition-all duration-300 group relative",
                            activeView === item.id
                                ? "bg-gradient-to-r from-blue-600/90 to-violet-600/90 text-white shadow-[0_10px_20px_-5px_rgba(37,99,235,0.4)] backdrop-blur-sm scale-105"
                                : "text-indigo-300/80 hover:bg-white/5 hover:text-white"
                        )}
                    >
                        <item.icon className={cn(
                            "w-5 h-5 flex-shrink-0 transition-all duration-500",
                            activeView === item.id ? "scale-110 drop-shadow-[0_0_8px_rgba(255,255,255,0.5)]" : "group-hover:scale-110 group-hover:text-cyan-400"
                        )} />
                        {(isSidebarOpen || (isMobileMenuOpen && window.innerWidth < 1024)) && (
                            <span className="font-black tracking-widest text-xs uppercase">{item.label}</span>
                        )}
                        {activeView === item.id && (
                            <div className="absolute right-0 top-1/2 -translate-y-1/2 w-1.5 h-6 bg-cyan-400 rounded-l-full shadow-[0_0_15px_rgba(34,211,238,0.8)]" />
                        )}
                    </button>
                ))}
            </nav>

            <div className="p-6 border-t border-white/5 bg-black/20">
                <div className={cn("flex items-center justify-between gap-3", !isSidebarOpen && !isMobileMenuOpen && "flex-col")}>
                    <div className="flex items-center gap-3 overflow-hidden">
                        <div className="w-12 h-12 rounded-[1.25rem] bg-gradient-to-br from-rose-500 via-pink-600 to-purple-700 flex items-center justify-center text-lg font-black shrink-0 shadow-lg shadow-rose-500/20 border border-white/10">
                            {currentUser.name.charAt(0)}
                        </div>
                        {(isSidebarOpen || (isMobileMenuOpen && window.innerWidth < 1024)) && (
                            <div className="overflow-hidden">
                                <p className="text-sm font-black truncate text-white tracking-tight">{currentUser.name}</p>
                                <p className="text-[10px] text-indigo-400 uppercase font-black tracking-[0.2em]">{currentUser.role}</p>
                            </div>
                        )}
                    </div>
                    {(isSidebarOpen || (isMobileMenuOpen && window.innerWidth < 1024)) && (
                        <button
                            onClick={onLogout}
                            className="p-3 bg-red-500/10 hover:bg-red-50 text-red-400 hover:text-white rounded-[1.25rem] transition-all duration-300 group"
                            title="Logout"
                        >
                            <LogOut size={18} className="group-hover:rotate-12 transition-transform" />
                        </button>
                    )}
                </div>
            </div>
        </aside>
    );
};

export default Sidebar;
