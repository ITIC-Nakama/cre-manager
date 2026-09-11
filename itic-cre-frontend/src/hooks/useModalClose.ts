import { useState, useCallback, useRef, useEffect } from 'react';

const EXIT_DURATION_MS = 180;

// React unmounts immediately on state change, so an exit animation needs to be staged:
// flip to the closing className, wait for it to finish, then actually call onClose.
export function useModalClose(onClose: () => void) {
    const [isClosing, setIsClosing] = useState(false);
    const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const handleClose = useCallback(() => {
        setIsClosing(true);
        timerRef.current = setTimeout(onClose, EXIT_DURATION_MS);
    }, [onClose]);

    useEffect(() => () => {
        if (timerRef.current) clearTimeout(timerRef.current);
    }, []);

    return { isClosing, handleClose };
}

// For modals controlled by an `isOpen` prop (rendered unconditionally by the parent, returning
// null when closed) rather than mounted/unmounted by the parent — keeps rendering a bit longer
// after isOpen flips false so the exit animation can play, with no change needed at call sites.
export function useDelayedUnmount(isOpen: boolean) {
    const [shouldRender, setShouldRender] = useState(isOpen);
    const [isClosing, setIsClosing] = useState(false);
    const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => {
        if (timerRef.current) clearTimeout(timerRef.current);
        if (isOpen) {
            setShouldRender(true);
            setIsClosing(false);
        } else {
            setIsClosing(true);
            timerRef.current = setTimeout(() => setShouldRender(false), EXIT_DURATION_MS);
        }
    }, [isOpen]);

    useEffect(() => () => {
        if (timerRef.current) clearTimeout(timerRef.current);
    }, []);

    return { shouldRender, isClosing };
}
