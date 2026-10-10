import NetInfo from "@react-native-community/netinfo";
import { onlineManager } from "@tanstack/react-query";
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { networkState } from "./network-state";

const NetworkContext = createContext<boolean | null>(null);

export function NetworkProvider({ children }: { children: ReactNode }) {
  const [online, setOnline] = useState<boolean | null>(null);
  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener(state => {
      const next = state.isConnected === false || state.isInternetReachable === false ? false
        : state.isConnected === true ? true : null;
      networkState.setOnline(next);
      if (next !== null) onlineManager.setOnline(next);
      setOnline(next);
    });
    return () => {
      unsubscribe();
      networkState.setOnline(null);
      onlineManager.setOnline(true);
    };
  }, []);
  return <NetworkContext.Provider value={online}>{children}</NetworkContext.Provider>;
}

export function useNetworkStatus() { return useContext(NetworkContext); }
