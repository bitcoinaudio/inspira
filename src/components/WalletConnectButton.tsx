import { useMemo, useState } from "react";
import { useWallet } from "../context/WalletContext";

export default function WalletConnectButton() {
  const { isWalletConnected, availableWallets, address, connectWallet, disconnectWallet } = useWallet();
  const [isBusy, setIsBusy] = useState(false);

  const shortAddress = useMemo(
    () => (address ? `${address.slice(0, 5)}...${address.slice(-5)}` : ""),
    [address]
  );

  const handleConnect = async (walletName: "unisat" | "xverse") => {
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
        className="text-xs px-3 py-2 rounded-lg border border-base-300 bg-base-200 hover:bg-base-300 transition"
      >
        {shortAddress}
      </button>
    );
  }

  return (
    <div className="dropdown dropdown-end">
      <button
        type="button"
        tabIndex={0}
        disabled={isBusy}
        className="text-xs px-3 py-2 rounded-lg border border-primary/30 bg-primary/10 hover:bg-primary/20 transition"
      >
        {isBusy ? "Connecting..." : "Connect Wallet"}
      </button>
      <ul tabIndex={0} className="dropdown-content z-[1] mt-2 menu p-2 shadow bg-base-100 rounded-box w-44 border border-base-300">
        <li>
          <button type="button" disabled={isBusy || !availableWallets.unisat} onClick={() => handleConnect("unisat")}>
            UniSat
          </button>
        </li>
        <li>
          <button type="button" disabled={isBusy || !availableWallets.xverse} onClick={() => handleConnect("xverse")}>
            Xverse
          </button>
        </li>
      </ul>
    </div>
  );
}
