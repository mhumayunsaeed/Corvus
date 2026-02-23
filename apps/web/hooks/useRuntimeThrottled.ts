"use client";

import { useEffect, useState } from "react";
import { isRuntimeThrottled, subscribeRuntimeState } from "@/lib/runtime-state";

export function useRuntimeThrottled() {
    const [throttled, setThrottled] = useState(() => isRuntimeThrottled());

    useEffect(() => {
        return subscribeRuntimeState(setThrottled);
    }, []);

    return throttled;
}
