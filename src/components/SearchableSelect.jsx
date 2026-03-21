import React, { useState, useRef, useEffect } from 'react';
import { Search, ChevronDown } from 'lucide-react';
import { cn } from '../utils/cn';

const SearchableSelect = ({ 
    options, 
    value, 
    onChange, 
    placeholder = 'Select...',
    renderOption,
    className
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const wrapperRef = useRef(null);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const selectedOption = options.find(opt => opt.value === value);

    const filteredOptions = options.filter(opt => 
        (opt.searchLabel || opt.label).toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div ref={wrapperRef} className={cn("relative w-full", className)}>
            <div 
                className={cn(
                    "w-full px-3 py-2 border border-slate-200 rounded-lg bg-white flex items-center justify-between cursor-pointer focus-within:ring-2 focus-within:ring-blue-500",
                    isOpen && "ring-2 ring-blue-500 border-transparent"
                )}
                onClick={() => setIsOpen(!isOpen)}
            >
                <div className={cn("truncate flex-1 overflow-hidden", !selectedOption && "text-slate-500")}>
                    {selectedOption ? (renderOption ? renderOption(selectedOption) : selectedOption.label) : placeholder}
                </div>
                <ChevronDown className="w-4 h-4 text-slate-400 shrink-0 ml-2" />
            </div>

            {isOpen && (
                <div className="absolute z-50 w-full mt-1 bg-white border border-slate-200 rounded-lg shadow-lg max-h-60 flex flex-col">
                    <div className="p-2 border-b border-slate-100 sticky top-0 bg-white rounded-t-lg z-10">
                        <div className="relative">
                            <Search className="absolute left-2.5 top-2.5 w-4 h-4 text-slate-400" />
                            <input
                                type="text"
                                className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-md text-sm outline-none focus:ring-2 focus:ring-blue-500"
                                placeholder="Search..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                onClick={(e) => e.stopPropagation()}
                                autoFocus
                            />
                        </div>
                    </div>
                    
                    <div className="overflow-y-auto overflow-x-hidden p-1 relative z-0">
                        {filteredOptions.length === 0 ? (
                            <div className="px-3 py-4 text-sm text-slate-500 text-center">No results found</div>
                        ) : (
                            filteredOptions.map((opt, index) => (
                                <div
                                    key={index}
                                    className={cn(
                                        "px-3 py-2 text-sm rounded-md cursor-pointer transition-colors break-words",
                                        opt.value === value 
                                            ? "bg-blue-50 text-blue-700 font-medium" 
                                            : "hover:bg-slate-50 text-slate-700"
                                    )}
                                    onClick={() => {
                                        onChange(opt.value);
                                        setIsOpen(false);
                                        setSearchTerm('');
                                    }}
                                >
                                    {renderOption ? renderOption(opt) : opt.label}
                                </div>
                            ))
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default SearchableSelect;
