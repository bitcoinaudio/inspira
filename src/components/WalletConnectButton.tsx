import { useEffect, useMemo, useRef, useState } from "react";
import { useWallet } from "../context/WalletContext";

export default function WalletConnectButton() {
  const { isWalletConnected, availableWallets, address, connectWallet, disconnectWallet } = useWallet();
  const [isBusy, setIsBusy] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setIsOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const shortAddress = useMemo(
    () => (address ? `${address.slice(0, 5)}...${address.slice(-5)}` : ""),
    [address]
  );

  const handleConnect = async (walletName: "unisat" | "xverse") => {
    setIsOpen(false);
    setIsBusy(true);
    try {
      await connectWallet(walletName);
    } catch {
      disconnectWallet();
    } finally {
      setIsBusy(false);
    }
  };

  if (isWalletConnected) {
    return (
      <button
        type="button"
        onClick={disconnectWallet}
        className="rounded-full border border-base-300/80 bg-base-100/75 px-4 py-2 text-sm font-semibold text-base-content hover:border-primary hover:text-primary"
      >
        {shortAddress}
      </button>
    );
  }

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        disabled={isBusy}
        onClick={() => setIsOpen((o) => !o)}
        className="rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-content shadow-lg shadow-primary/20"
      >
        {isBusy ? "Connecting..." : "Connect Wallet"}
      </button>
      {isOpen && (
        <ul className="absolute right-0 z-50 mt-2 w-44 rounded-[18px] border border-base-300 bg-base-100 p-2 shadow-lg">
          <li>
            <button
              type="button"
              disabled={isBusy || !availableWallets.unisat}
              onClick={() => handleConnect("unisat")}
              className="w-full rounded-[14px] px-4 py-2 text-left text-sm font-semibold text-base-content hover:bg-base-200 disabled:opacity-40"
            >
              UniSat
            </button>
          </li>
          <li>
            <button
              type="button"
              disabled={isBusy || !availableWallets.xverse}
              onClick={() => handleConnect("xverse")}
              className="w-full rounded-[14px] px-4 py-2 text-left text-sm font-semibold text-base-content hover:bg-base-200 disabled:opacity-40"
            >
              Xverse
            </button>
          </li>
        </ul>
      )}
    </div>
  );
}
