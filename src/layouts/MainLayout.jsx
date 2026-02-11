import React, { useState } from 'react';
import Sidebar from '../components/Sidebar';
import Header from '../components/Header';

const MainLayout = ({
    children,
    activeView,
    setActiveView,
    currentUser,
    handleLogout,
    settings,
    sqlMode,
    isSqlOnline
}) => {
    const [isSidebarOpen, setIsSidebarOpen] = useState(window.innerWidth > 1024);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    const toggleSidebar = () => {
        if (window.innerWidth < 1024) {
            setIsMobileMenuOpen(!isMobileMenuOpen);
        } else {
            setIsSidebarOpen(!isSidebarOpen);
        }
    };

    const handleNavClick = (view) => {
        setActiveView(view);
        if (window.innerWidth < 1024) {
            setIsMobileMenuOpen(false);
        }
    };

    return (
        <div className="flex h-[100dvh] bg-slate-50 overflow-hidden relative font-sans">
            {/* Mobile Backdrop */}
            {isMobileMenuOpen && (
                <div
                    className="fixed inset-0 bg-black/60 z-40 lg:hidden backdrop-blur-md"
                    onClick={() => setIsMobileMenuOpen(false)}
                ></div>
            )}

            <Sidebar
                isSidebarOpen={isSidebarOpen}
                isMobileMenuOpen={isMobileMenuOpen}
                settings={settings}
                currentUser={currentUser}
                activeView={activeView}
                onNavClick={handleNavClick}
                onLogout={handleLogout}
            />

            <main className="flex-1 flex flex-col overflow-hidden w-full">
                <Header
                    onToggleSidebar={toggleSidebar}
                    sqlMode={sqlMode}
                    isSqlOnline={isSqlOnline}
                />
                <div className="flex-1 overflow-y-auto p-4 sm:p-6">
                    {children}
                </div>
            </main>
        </div>
    );
};

export default MainLayout;
