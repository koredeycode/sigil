import { AlertTriangle, Info, Trash2 } from 'lucide-react';

interface ConfirmationModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    variant?: 'danger' | 'warning' | 'info';
    isLoading?: boolean;
}

export function ConfirmationModal({
    isOpen,
    onClose,
    onConfirm,
    title,
    message,
    confirmText = 'Confirm',
    cancelText = 'Cancel',
    variant = 'info',
    isLoading = false
}: ConfirmationModalProps) {
    if (!isOpen) return null;

    const variantStyles = {
        danger: {
            icon: <Trash2 className="w-5 h-5 text-red-500" />,
            bg: 'bg-red-500/10',
            button: 'bg-red-500 hover:bg-red-600 text-white',
        },
        warning: {
            icon: <AlertTriangle className="w-5 h-5 text-orange-500" />,
            bg: 'bg-orange-500/10',
            button: 'bg-orange-500 hover:bg-orange-600 text-white',
        },
        info: {
            icon: <Info className="w-5 h-5 text-blue-500" />,
            bg: 'bg-blue-500/10',
            button: 'bg-blue-500 hover:bg-blue-600 text-white',
        }
    };

    const style = variantStyles[variant];

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div 
                className="absolute inset-0 bg-background/80 backdrop-blur-sm animate-in fade-in duration-200" 
                onClick={onClose} 
            />
            <div className="relative w-full max-w-sm bg-card border border-border rounded-xl shadow-xl overflow-hidden animate-in zoom-in-95 duration-200">
                <div className="p-6">
                    <div className="flex items-start gap-4">
                        <div className={`p-2 rounded-full ${style.bg} shrink-0`}>
                            {style.icon}
                        </div>
                        <div className="space-y-1">
                            <h3 className="font-semibold text-lg leading-none">{title}</h3>
                            <p className="text-sm text-muted-foreground leading-relaxed">
                                {message}
                            </p>
                        </div>
                    </div>
                </div>
                <div className="px-6 py-4 bg-secondary/20 border-t border-border flex justify-end gap-3">
                    <button
                        onClick={onClose}
                        disabled={isLoading}
                        className="px-4 py-2 rounded-md hover:bg-secondary text-sm font-medium transition-colors border border-border disabled:opacity-50"
                    >
                        {cancelText}
                    </button>
                    <button
                        onClick={onConfirm}
                        disabled={isLoading}
                        className={`px-4 py-2 rounded-md text-sm font-medium transition-colors shadow-sm active:scale-95 disabled:opacity-50 ${style.button}`}
                    >
                        {isLoading ? 'Processing...' : confirmText}
                    </button>
                </div>
            </div>
        </div>
    );
}
