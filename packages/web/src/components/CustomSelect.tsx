import { ChevronDown } from 'lucide-react';
import { useState } from 'react';

export interface CustomSelectProps {
    value: string;
    onChange: (value: string) => void;
    options: { id: string; label: string }[];
    label?: string;
    position?: 'top' | 'bottom';
}

export function CustomSelect({ value, onChange, options, label, position = 'bottom' }: CustomSelectProps) {
    const [isOpen, setIsOpen] = useState(false);
    const selectedOption = options.find(o => o.id === value);

    const handleScroll = (e: React.WheelEvent | React.TouchEvent) => {
        e.stopPropagation();
    };

    const isTop = position === 'top';

    return (
        <div className="space-y-2 relative">
            {label && <label className="text-sm font-medium">{label}</label>}
            <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className="w-full flex items-center justify-between px-3 py-2 bg-background border border-input rounded-md hover:border-primary/50 transition-colors focus:outline-none focus:ring-2 focus:ring-primary/20 text-left"
            >
                <span className="text-sm truncate">{selectedOption?.label || 'Select option...'}</span>
                <ChevronDown className={`w-4 h-4 shrink-0 text-muted-foreground transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </button>
            
            {isOpen && (
                <>
                    <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
                    <div 
                        onWheel={handleScroll}
                        onTouchMove={handleScroll}
                        className={`absolute ${isTop ? 'bottom-full mb-1 origin-bottom' : 'top-full mt-1 origin-top'} left-0 right-0 z-50 bg-card border border-border rounded-md shadow-xl overflow-y-auto max-h-60 animate-in fade-in ${isTop ? 'slide-in-from-bottom-2' : 'slide-in-from-top-2'} duration-200`}
                    >
                        <div className="p-1">
                            {options.map(option => (
                                <button
                                    key={option.id}
                                    type="button"
                                    onClick={() => {
                                        onChange(option.id);
                                        setIsOpen(false);
                                    }}
                                    className={`w-full flex items-center text-left px-3 py-2 text-sm rounded-sm transition-colors ${
                                        value === option.id 
                                            ? 'bg-primary text-primary-foreground' 
                                            : 'hover:bg-secondary text-foreground'
                                    }`}
                                >
                                    <span className="truncate">{option.label}</span>
                                </button>
                            ))}
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}
