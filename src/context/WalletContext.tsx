import { createContext, useCallback, useContext, useEffect, useMemo, useState, type PropsWithChildren } from "react";
import Wallet, { AddressPurpose } from "sats-connect";

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

const WalletContext = createContext<WalletContextValue>({
  isWalletConnected: false,
  provider: null,
  address: "",
  availableWallets: { unisat: false, xverse: true },
  connectWallet: async () => "",
  disconnectWallet: () => {},
});

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

    const response = await Wallet.request("getAccounts", {
      purposes: [AddressPurpose.Ordinals, AddressPurpose.Payment],
      message: "Connect wallet to Generate/Publish packs.",
    });

    if (response.status !== "success") {
      throw new Error("Xverse connection failed");
    }

    const addresses = response.result || [];
    const ordinals = addresses.find((entry) => entry.purpose === AddressPurpose.Ordinals);
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
