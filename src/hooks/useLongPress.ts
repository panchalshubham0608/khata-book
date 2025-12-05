import { useRef, useCallback } from "react";

type LongPressOptions = {
    threshold?: number; // ms
    onStart?: () => void;
    onFinish?: () => void;
    onCancel?: () => void;
};

export function useLongPress(
    callback: () => void,
    { threshold = 600, onStart, onFinish, onCancel }: LongPressOptions = {}
) {
    const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const isPressed = useRef(false);

    const start = useCallback(() => {
        isPressed.current = true;
        onStart?.();

        timerRef.current = setTimeout(() => {
            if (isPressed.current) {
                callback();
                onFinish?.();
            }
        }, threshold);
    }, [callback, threshold, onStart, onFinish]);

    const clear = useCallback(() => {
        if (!isPressed.current) return;

        isPressed.current = false;
        if (timerRef.current) {
            clearTimeout(timerRef.current);
            timerRef.current = null;
            onCancel?.();
        }
    }, [onCancel]);

    return {
        onMouseDown: start,
        onTouchStart: start,
        onMouseUp: clear,
        onMouseLeave: clear,
        onTouchEnd: clear,
    };
}
