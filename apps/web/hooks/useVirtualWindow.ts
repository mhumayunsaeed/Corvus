"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { RefObject } from "react";

interface UseVirtualWindowParams<T> {
    items: T[];
    getItemKey: (item: T, index: number) => string;
    containerRef: RefObject<HTMLElement | null>;
    estimateSize: number;
    overscan: number;
    enabled?: boolean;
}

interface VirtualWindowItem<T> {
    item: T;
    index: number;
    key: string;
    measureRef: (element: HTMLElement | null) => void;
}

interface VirtualWindowResult<T> {
    items: VirtualWindowItem<T>[];
    topSpacer: number;
    bottomSpacer: number;
}

function lowerBound(values: number[], target: number) {
    let low = 0;
    let high = values.length;

    while (low < high) {
        const mid = (low + high) >> 1;
        if (values[mid] < target) {
            low = mid + 1;
        } else {
            high = mid;
        }
    }

    return low;
}

export function useVirtualWindow<T>({
    items,
    getItemKey,
    containerRef,
    estimateSize,
    overscan,
    enabled = true,
}: UseVirtualWindowParams<T>): VirtualWindowResult<T> {
    const [scrollTop, setScrollTop] = useState(0);
    const [viewportHeight, setViewportHeight] = useState(0);
    const [measurementVersion, setMeasurementVersion] = useState(0);

    const itemKeys = useMemo(
        () => items.map((item, index) => getItemKey(item, index)),
        [items, getItemKey]
    );

    const measuredHeightsRef = useRef<Map<string, number>>(new Map());
    const observedElementsRef = useRef<Map<string, HTMLElement>>(new Map());
    const measureRefCacheRef = useRef<Map<string, (el: HTMLElement | null) => void>>(
        new Map()
    );
    const resizeObserverRef = useRef<ResizeObserver | null>(null);

    useEffect(() => {
        if (typeof window === "undefined" || !enabled || typeof ResizeObserver === "undefined") {
            return;
        }

        const observer = new ResizeObserver((entries) => {
            let changed = false;
            for (const entry of entries) {
                const target = entry.target as HTMLElement;
                const key = target.dataset.virtualKey;
                if (!key) continue;

                const nextHeight = Math.max(1, Math.ceil(entry.contentRect.height));
                const prevHeight = measuredHeightsRef.current.get(key);
                if (prevHeight !== nextHeight) {
                    measuredHeightsRef.current.set(key, nextHeight);
                    changed = true;
                }
            }

            if (changed) {
                setMeasurementVersion((value) => value + 1);
            }
        });

        resizeObserverRef.current = observer;

        return () => {
            observer.disconnect();
            resizeObserverRef.current = null;
            observedElementsRef.current.clear();
            measureRefCacheRef.current.clear();
        };
    }, [enabled]);

    useEffect(() => {
        const keySet = new Set(itemKeys);

        for (const key of measuredHeightsRef.current.keys()) {
            if (!keySet.has(key)) {
                measuredHeightsRef.current.delete(key);
            }
        }

        for (const key of observedElementsRef.current.keys()) {
            if (!keySet.has(key)) {
                const element = observedElementsRef.current.get(key);
                if (element && resizeObserverRef.current) {
                    resizeObserverRef.current.unobserve(element);
                }
                observedElementsRef.current.delete(key);
            }
        }

        for (const key of measureRefCacheRef.current.keys()) {
            if (!keySet.has(key)) {
                measureRefCacheRef.current.delete(key);
            }
        }
    }, [itemKeys]);

    useEffect(() => {
        const container = containerRef.current;
        if (!container) return;

        let frame = 0;
        const syncState = () => {
            frame = 0;
            setScrollTop(container.scrollTop);
            setViewportHeight(container.clientHeight);
        };

        const onScroll = () => {
            if (frame !== 0) return;
            frame = window.requestAnimationFrame(syncState);
        };

        syncState();
        container.addEventListener("scroll", onScroll, { passive: true });
        window.addEventListener("resize", onScroll);

        return () => {
            if (frame !== 0) {
                window.cancelAnimationFrame(frame);
            }
            container.removeEventListener("scroll", onScroll);
            window.removeEventListener("resize", onScroll);
        };
    }, [containerRef, enabled]);

    const offsets = useMemo(() => {
        const values = new Array(itemKeys.length + 1).fill(0);
        for (let i = 0; i < itemKeys.length; i++) {
            const key = itemKeys[i];
            const height = measuredHeightsRef.current.get(key) ?? estimateSize;
            values[i + 1] = values[i] + height;
        }
        return values;
    }, [estimateSize, itemKeys, measurementVersion]);

    const totalHeight = offsets[offsets.length - 1] || 0;

    const { startIndex, endIndex } = useMemo(() => {
        if (!enabled || items.length === 0) {
            return {
                startIndex: 0,
                endIndex: Math.max(0, items.length - 1),
            };
        }

        const visibleStart = Math.max(0, lowerBound(offsets, scrollTop) - 1);
        const visibleEnd = Math.max(
            visibleStart,
            lowerBound(offsets, scrollTop + Math.max(viewportHeight, estimateSize))
        );

        return {
            startIndex: Math.max(0, visibleStart - overscan),
            endIndex: Math.min(items.length - 1, visibleEnd + overscan),
        };
    }, [enabled, estimateSize, items.length, offsets, overscan, scrollTop, viewportHeight]);

    const getMeasureRef = useCallback((key: string) => {
        const cached = measureRefCacheRef.current.get(key);
        if (cached) return cached;

        const callback = (element: HTMLElement | null) => {
            const observer = resizeObserverRef.current;
            const previous = observedElementsRef.current.get(key);

            if (previous && previous !== element && observer) {
                observer.unobserve(previous);
            }

            if (!element) {
                observedElementsRef.current.delete(key);
                return;
            }

            element.dataset.virtualKey = key;
            observedElementsRef.current.set(key, element);

            const measured = Math.max(1, Math.ceil(element.getBoundingClientRect().height));
            if (measuredHeightsRef.current.get(key) !== measured) {
                measuredHeightsRef.current.set(key, measured);
                setMeasurementVersion((value) => value + 1);
            }

            observer?.observe(element);
        };

        measureRefCacheRef.current.set(key, callback);
        return callback;
    }, []);

    const virtualItems = useMemo(() => {
        if (items.length === 0) return [] as VirtualWindowItem<T>[];

        const from = enabled ? startIndex : 0;
        const to = enabled ? endIndex : items.length - 1;
        const result: VirtualWindowItem<T>[] = [];

        for (let i = from; i <= to; i++) {
            if (i < 0 || i >= items.length) continue;
            const key = itemKeys[i];
            result.push({
                item: items[i],
                index: i,
                key,
                measureRef: getMeasureRef(key),
            });
        }

        return result;
    }, [enabled, endIndex, getMeasureRef, itemKeys, items, startIndex]);

    const topSpacer = enabled && items.length > 0 ? offsets[startIndex] || 0 : 0;
    const bottomSpacer =
        enabled && items.length > 0
            ? Math.max(0, totalHeight - (offsets[endIndex + 1] || totalHeight))
            : 0;

    return {
        items: virtualItems,
        topSpacer,
        bottomSpacer,
    };
}
