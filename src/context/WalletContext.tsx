import { createContext, useCallback, useContext, useEffect, useMemo, useState, type PropsWithChildren } from "react";

type WalletProviderName = "unisat" | "xverse" | null;

declare global {
  interface Window {
    unisat?: {
      getAccounts?: () => Promise<string[]>;
      requestAccounts?: () => Promise<string[]>;
    };
  }
}

type WalletContextValue = {
  isWalletConnected: boolean;
  provider: WalletProviderName;
  address: string;
  availableWallets: { unisat: boolean; xverse: boolean };
  connectWallet: (provider: Exclude<WalletProviderName, null>) => Promise<string>;
  disconnectWallet: () => void;
};

type XverseProvider = {
  request?: (method: string | { method: string; params?: unknown }, params?: unknown) => Promise<unknown>;
  getAccounts?: (params?: unknown) => Promise<unknown>;
};

type XverseAccount = {
  address?: string;
  purpose?: string;
};

const WalletContext = createContext<WalletContextValue>({
  isWalletConnected: false,
  provider: null,
  address: "",
  availableWallets: { unisat: false, xverse: true },
  connectWallet: async () => "",
  disconnectWallet: () => {},
});

const getXverseProvider = (): XverseProvider | null => {
  if (typeof window === "undefined") return null;

  const providers: unknown[] = [window.BitcoinProvider, window.bitcoin, window.XverseProviders];

  for (const candidate of providers) {
    if (!candidate || typeof candidate !== "object") continue;

    const provider = candidate as XverseProvider;
    if (typeof provider.request === "function" || typeof provider.getAccounts === "function") {
      return provider;
    }

    const nested = Object.values(candidate as Record<string, unknown>);
    for (const item of nested) {
      if (!item || typeof item !== "object") continue;
      const nestedProvider = item as XverseProvider;
      if (typeof nestedProvider.request === "function" || typeof nestedProvider.getAccounts === "function") {
        return nestedProvider;
      }
    }
  }

  return null;
};

const unwrapXverseResult = (payload: unknown) => {
  const response = payload as { status?: string; result?: unknown };
  if (response?.status === "success") return response.result;
  if (response?.status && response.status !== "success") {
    throw new Error("Xverse request failed");
  }
  return payload;
};

const requestXverse = async (method: string, params?: unknown): Promise<unknown> => {
  const provider = getXverseProvider();
  if (!provider) throw new Error("Xverse wallet not detected");

  if (typeof provider.request === "function") {
    try {
      const response = await provider.request(method, params);
      return unwrapXverseResult(response);
    } catch {
      const response = await provider.request({ method, params });
      return unwrapXverseResult(response);
    }
  }

  if (method === "getAccounts" && typeof provider.getAccounts === "function") {
    const response = await provider.getAccounts(params);
    return unwrapXverseResult(response);
  }

  throw new Error(`Xverse provider does not support method: ${method}`);
};

const extractXverseAccounts = (payload: unknown): XverseAccount[] => {
  const roots: unknown[] = [
    payload,
    (payload as { result?: unknown })?.result,
    (payload as { data?: unknown })?.data,
    (payload as { accounts?: unknown })?.accounts,
    (payload as { addresses?: unknown })?.addresses,
  ];

  for (const root of roots) {
    const rows = Array.isArray(root)
      ? root
      : Array.isArray((root as { addresses?: unknown })?.addresses)
        ? (root as { addresses: unknown[] }).addresses
        : null;

    if (!rows) continue;

    const accounts = rows
      .map((entry) => {
        const row = entry as {
          address?: string;
          addressString?: string;
          btcAddress?: string;
          paymentAddress?: string;
          purpose?: string;
          type?: string;
        };

        return {
          address: row.address || row.addressString || row.btcAddress || row.paymentAddress,
          purpose: row.purpose || row.type,
        };
      })
      .filter((item) => Boolean(item.address));

    if (accounts.length > 0) return accounts;
  }

  return [];
};

export function WalletProvider({ children }: PropsWithChildren) {
  const [provider, setProvider] = useState<WalletProviderName>(null);
  const [address, setAddress] = useState("");
  const [availableWallets, setAvailableWallets] = useState({ unisat: false, xverse: true });

  useEffect(() => {
    if (typeof window === "undefined") return;
    const hasUnisat = Boolean(window.unisat);
    const hasXverse = Boolean(window.BitcoinProvider || window.XverseProviders);
    setAvailableWallets({ unisat: hasUnisat, xverse: hasXverse || true });
  }, []);

  const disconnectWallet = useCallback(() => {
    setProvider(null);
    setAddress("");
  }, []);

  const connectWallet = useCallback(async (walletProvider: Exclude<WalletProviderName, null>) => {
    if (walletProvider === "unisat") {
      if (!window?.unisat) throw new Error("UniSat wallet not detected");
      const accounts =
        (await window.unisat.requestAccounts?.()) ||
        (await window.unisat.getAccounts?.()) ||
        [];
      const nextAddress = accounts[0];
      if (!nextAddress) throw new Error("No UniSat account available");
      setProvider("unisat");
      setAddress(nextAddress);
      return nextAddress;
    }

    const response = await requestXverse("getAccounts", {
      purposes: ["ordinals", "payment"],
      message: "Connect wallet to Generate/Publish packs.",
    });

    const addresses = extractXverseAccounts(response);
    const ordinals = addresses.find((entry) => (entry.purpose || "").toLowerCase() === "ordinals");
    const nextAddress = ordinals?.address || addresses[0]?.address || "";
    if (!nextAddress) throw new Error("No Xverse account available");

    setProvider("xverse");
    setAddress(nextAddress);
    return nextAddress;
  }, []);

  const value = useMemo<WalletContextValue>(
    () => ({
      isWalletConnected: Boolean(provider && address),
      provider,
      address,
      availableWallets,
      connectWallet,
      disconnectWallet,
    }),
    [provider, address, availableWallets, connectWallet, disconnectWallet]
  );

  return <WalletContext.Provider value={value}>{children}</WalletContext.Provider>;
}

export function useWallet() {
  return useContext(WalletContext);
}
