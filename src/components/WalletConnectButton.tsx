import { useEffect, useMemo, useState } from "react";
import { useWallet } from "../context/WalletContext";

export default function WalletConnectButton() {
  const {
    isWalletConnected,
    availableWallets,
    address,
    connectWallet,
    disconnectWallet,
    mobileConnectNotice,
    clearMobileConnectNotice,
    mobileResumeWallet,
    consumeMobileResumeWallet,
  } = useWallet();
  const [isBusy, setIsBusy] = useState(false);
  const [mobilePrompt, setMobilePrompt] = useState<{ wallet: "unisat" | "xverse"; deeplink: string; message: string } | null>(null);

  const shortAddress = useMemo(
    () => (address ? `${address.slice(0, 5)}...${address.slice(-5)}` : ""),
    [address]
  );

  const handleConnect = async (walletName: "unisat" | "xverse") => {
    setIsBusy(true);
    setMobilePrompt(null);
    clearMobileConnectNotice();

    try {
      await connectWallet(walletName);
    } catch (error) {
      if (
        error &&
        typeof error === "object" &&
        "code" in error &&
        error.code === "DEEPLINK_LAUNCHED" &&
        "deeplink" in error &&
        typeof error.deeplink === "string"
      ) {
        setMobilePrompt({
          wallet: walletName,
          deeplink: error.deeplink,
          message: `Opening ${walletName === "unisat" ? "UniSat" : "Xverse"}. If it did not open, use the link below.`,
        });
      } else {
        disconnectWallet();
      }
    } finally {
      setIsBusy(false);
    }
  };

  useEffect(() => {
    if (!mobileResumeWallet || isBusy || isWalletConnected) return;

    let active = true;

    const resume = async () => {
      setIsBusy(true);
      try {
        await connectWallet(mobileResumeWallet, { skipDeeplink: true });
      } catch {
        if (active) disconnectWallet();
      } finally {
        if (active) {
          consumeMobileResumeWallet();
          clearMobileConnectNotice();
          setIsBusy(false);
        }
      }
    };

    resume();

    return () => {
      active = false;
    };
  }, [
    mobileResumeWallet,
    isBusy,
    isWalletConnected,
    connectWallet,
    disconnectWallet,
    consumeMobileResumeWallet,
    clearMobileConnectNotice,
  ]);

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
    <div className="flex min-h-[2rem] flex-col justify-center gap-1">
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

      {mobilePrompt ? (
        <a className="text-[10px] text-center text-primary underline" href={mobilePrompt.deeplink} target="_blank" rel="noreferrer">
          {mobilePrompt.message}
        </a>
      ) : null}

      {mobileConnectNotice ? (
        <span className="text-[10px] text-center text-base-content/70">{mobileConnectNotice}</span>
      ) : null}
    </div>
  );
}
