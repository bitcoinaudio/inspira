import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type PropsWithChildren,
} from "react";

type WalletProviderName = "unisat" | "xverse" | null;
type ConnectableWallet = Exclude<WalletProviderName, null>;
type ConnectOptions = { skipDeeplink?: boolean };

type WalletContextValue = {
  isWalletConnected: boolean;
  provider: WalletProviderName;
  address: string;
  runtime: { isMobile: boolean; inWalletBrowser: boolean };
  mobileConnectNotice: string;
  mobileResumeWallet: ConnectableWallet | null;
  availableWallets: { unisat: boolean; xverse: boolean };
  connectWallet: (provider: ConnectableWallet, options?: ConnectOptions) => Promise<string>;
  disconnectWallet: () => void;
  clearMobileConnectNotice: () => void;
  consumeMobileResumeWallet: () => void;
};

type XverseRpcProvider = {
  request?: (
    methodOrPayload: string | { method: string; params?: Record<string, unknown> },
    params?: Record<string, unknown>
  ) => Promise<unknown>;
  getAccounts?: (params?: Record<string, unknown>) => Promise<unknown>;
};

declare global {
  interface Window {
    unisat?: {
      getAccounts?: () => Promise<string[]>;
      requestAccounts?: () => Promise<string[]>;
    };
    BitcoinProvider?: XverseRpcProvider;
    XverseProviders?: XverseRpcProvider | Record<string, XverseRpcProvider>;
    bitcoin?: XverseRpcProvider;
  }
}

const PENDING_MOBILE_WALLET_KEY = "inspira.pendingMobileWallet";
const PENDING_MOBILE_WALLET_TS_KEY = "inspira.pendingMobileWalletTs";
const PENDING_MOBILE_WALLET_MAX_AGE_MS = 10 * 60 * 1000;
const CONNECTED_WALLET_KEY = "inspira.connectedWallet";

const WalletContext = createContext<WalletContextValue>({
  isWalletConnected: false,
  provider: null,
  address: "",
  runtime: { isMobile: false, inWalletBrowser: false },
  mobileConnectNotice: "",
  mobileResumeWallet: null,
  availableWallets: { unisat: false, xverse: true },
  connectWallet: async () => "",
  disconnectWallet: () => {},
  clearMobileConnectNotice: () => {},
  consumeMobileResumeWallet: () => {},
});

function getWalletRuntime() {
  if (typeof window === "undefined") {
    return { isMobile: false, inWalletBrowser: false };
  }

  const userAgent = navigator.userAgent || "";
  const isMobile = /Android|iPhone|iPad|iPod|IEMobile|Opera Mini/i.test(userAgent);
  const search = window.location.search;
  const inWalletBrowser =
    /xverse|unisat|okx|tokenpocket/i.test(userAgent) ||
    /inXverse=1|inUnisat=1|wallet=/i.test(search);

  return { isMobile, inWalletBrowser };
}

function buildWalletReturnUrl(wallet: ConnectableWallet) {
  if (typeof window === "undefined") return "";

  const url = new URL(window.location.href);
  url.searchParams.set("wallet", wallet);
  url.searchParams.set("walletReturn", "1");
  return `${url.origin}${url.pathname}${url.search}${url.hash}`;
}

function buildWalletDeeplink(wallet: ConnectableWallet, options: { from?: string; returnUrl?: string } = {}) {
  const from = options.from || "inspira.bitcoinaudio.ai";
  const returnUrl = encodeURIComponent(options.returnUrl || "");

  if (wallet === "xverse") {
    return `https://xverse.app/open-url?url=${returnUrl}`;
  }

  return `unisat://dapp?url=${returnUrl}&from=${encodeURIComponent(from)}`;
}

function parseWalletReturnState(search: string): { wallet: ConnectableWallet | null; returned: boolean } {
  const params = new URLSearchParams(search);
  const walletRaw = params.get("wallet");
  const wallet = walletRaw === "unisat" || walletRaw === "xverse" ? walletRaw : null;
  const returned = params.get("walletReturn") === "1";

  return { wallet, returned };
}

function getXverseProvider(): XverseRpcProvider | null {
  if (typeof window === "undefined") return null;

  const providers = [window.BitcoinProvider, window.bitcoin, window.XverseProviders];

  for (const candidate of providers) {
    if (!candidate || typeof candidate !== "object") continue;

    if (typeof candidate.request === "function" || typeof candidate.getAccounts === "function") {
      return candidate;
    }

    for (const item of Object.values(candidate)) {
      if (!item || typeof item !== "object") continue;
      if (typeof item.request === "function" || typeof item.getAccounts === "function") {
        return item;
      }
    }
  }

  return null;
}

function unwrapXverseResult(payload: unknown) {
  if (payload && typeof payload === "object" && "status" in payload) {
    const result = payload as { status?: string; result?: unknown };
    if (result.status === "success") return result.result;
    if (result.status && result.status !== "success") throw new Error("Xverse request failed");
  }

  return payload;
}

async function requestXverse(method: string, params: Record<string, unknown>) {
  const provider = getXverseProvider();
  if (!provider) throw new Error("Xverse wallet not detected");

  if (typeof provider.request === "function") {
    try {
      return unwrapXverseResult(await provider.request(method, params));
    } catch {
      try {
        return unwrapXverseResult(await provider.request({ method, params }));
      } catch (requestError) {
        if (!provider.getAccounts) {
          throw requestError;
        }
      }
    }
  }

  if (method === "getAccounts" && typeof provider.getAccounts === "function") {
    return unwrapXverseResult(await provider.getAccounts(params));
  }

  throw new Error(`Xverse provider does not support method: ${method}`);
}

function extractXverseAccounts(payload: unknown) {
  const roots =
    payload && typeof payload === "object"
      ? [
          payload,
          (payload as { result?: unknown }).result,
          (payload as { data?: unknown }).data,
          (payload as { accounts?: unknown }).accounts,
          (payload as { addresses?: unknown }).addresses,
        ]
      : [payload];

  for (const root of roots) {
    const rows = Array.isArray(root)
      ? root
      : Array.isArray((root as { addresses?: unknown[] } | null)?.addresses)
        ? (root as { addresses: unknown[] }).addresses
        : null;

    if (!rows) continue;

    const accounts = rows
      .flatMap((entry) => {
        if (!entry || typeof entry !== "object") return [];

        const mapped: { address: string; purpose?: string }[] = [];
        const item = entry as {
          ordinalsAddress?: string;
          paymentAddress?: string;
          address?: string;
          addressString?: string;
          btcAddress?: string;
          purpose?: string;
          type?: string;
        };

        if (item.ordinalsAddress) mapped.push({ address: item.ordinalsAddress, purpose: "ordinals" });
        if (item.paymentAddress) mapped.push({ address: item.paymentAddress, purpose: "payment" });

        const fallbackAddress = item.address || item.addressString || item.btcAddress;
        if (fallbackAddress) {
          mapped.push({ address: fallbackAddress, purpose: item.purpose || item.type });
        }

        return mapped;
      })
      .filter((item) => Boolean(item.address));

    if (accounts.length > 0) return accounts;
  }

  return [];
}

function readPendingMobileWallet(): ConnectableWallet | null {
  if (typeof window === "undefined") return null;

  const wallet = window.sessionStorage.getItem(PENDING_MOBILE_WALLET_KEY);
  const tsRaw = window.sessionStorage.getItem(PENDING_MOBILE_WALLET_TS_KEY);
  const ts = Number(tsRaw || 0);
  const isFresh = Number.isFinite(ts) && ts > 0 && Date.now() - ts < PENDING_MOBILE_WALLET_MAX_AGE_MS;

  if (!isFresh) {
    window.sessionStorage.removeItem(PENDING_MOBILE_WALLET_KEY);
    window.sessionStorage.removeItem(PENDING_MOBILE_WALLET_TS_KEY);
    return null;
  }

  return wallet === "unisat" || wallet === "xverse" ? wallet : null;
}

function writePendingMobileWallet(wallet: ConnectableWallet) {
  if (typeof window === "undefined") return;
  window.sessionStorage.setItem(PENDING_MOBILE_WALLET_KEY, wallet);
  window.sessionStorage.setItem(PENDING_MOBILE_WALLET_TS_KEY, Date.now().toString());
}

function clearPendingMobileWallet() {
  if (typeof window === "undefined") return;
  window.sessionStorage.removeItem(PENDING_MOBILE_WALLET_KEY);
  window.sessionStorage.removeItem(PENDING_MOBILE_WALLET_TS_KEY);
}

function readPersistedConnectedWallet(): { provider: ConnectableWallet; address: string } | null {
  if (typeof window === "undefined") return null;

  const raw = window.localStorage.getItem(CONNECTED_WALLET_KEY);
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as { provider?: string; address?: string };
    if (
      (parsed.provider === "unisat" || parsed.provider === "xverse") &&
      typeof parsed.address === "string" &&
      parsed.address
    ) {
      return { provider: parsed.provider, address: parsed.address };
    }
  } catch {
  }

  window.localStorage.removeItem(CONNECTED_WALLET_KEY);
  return null;
}

function writePersistedConnectedWallet(wallet: { provider: ConnectableWallet; address: string }) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(CONNECTED_WALLET_KEY, JSON.stringify(wallet));
}

function clearPersistedConnectedWallet() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(CONNECTED_WALLET_KEY);
}

function stripWalletReturnParams() {
  if (typeof window === "undefined") return;

  const url = new URL(window.location.href);
  const keysToDrop = ["wallet", "walletReturn", "wallet_status", "status", "inXverse", "inUnisat", "error", "cancelled", "data", "message"];

  let removed = false;
  keysToDrop.forEach((key) => {
    if (url.searchParams.has(key)) {
      url.searchParams.delete(key);
      removed = true;
    }
  });

  if (removed) {
    const nextUrl = `${url.pathname}${url.search}${url.hash}`;
    window.history.replaceState({}, document.title, nextUrl);
  }
}

export function WalletProvider({ children }: PropsWithChildren) {
  const [provider, setProvider] = useState<WalletProviderName>(null);
  const [address, setAddress] = useState("");
  const [runtime, setRuntime] = useState({ isMobile: false, inWalletBrowser: false });
  const [mobileConnectNotice, setMobileConnectNotice] = useState("");
  const [mobileResumeWallet, setMobileResumeWallet] = useState<ConnectableWallet | null>(null);
  const [availableWallets, setAvailableWallets] = useState({ unisat: false, xverse: true });

  useEffect(() => {
    if (typeof window === "undefined") return;

    setRuntime(getWalletRuntime());
    const hasUnisat = Boolean(window.unisat);
    const hasXverse = Boolean(window.BitcoinProvider || window.XverseProviders || window.bitcoin);
    setAvailableWallets({ unisat: hasUnisat, xverse: hasXverse || true });

    const pendingMobileWallet = readPendingMobileWallet();
    const returnState = parseWalletReturnState(window.location.search);
    const shouldResume: ConnectableWallet | null = returnState.returned
      ? returnState.wallet || pendingMobileWallet
      : pendingMobileWallet;
    if (shouldResume) {
      setMobileResumeWallet(shouldResume);
      setMobileConnectNotice(`Welcome back - reconnect your ${shouldResume === "unisat" ? "UniSat" : "Xverse"} wallet.`);
    }

    const persisted = readPersistedConnectedWallet();
    if (persisted) {
      setProvider(persisted.provider);
      setAddress(persisted.address);
    }

    if (returnState.returned) {
      stripWalletReturnParams();
    }
  }, []);

  const disconnectWallet = useCallback(() => {
    setProvider(null);
    setAddress("");
    setMobileConnectNotice("");
    setMobileResumeWallet(null);
    clearPendingMobileWallet();
    clearPersistedConnectedWallet();
  }, []);

  const connectWallet = useCallback(
    async (walletProvider: ConnectableWallet, options: ConnectOptions = {}) => {
      const allowDirectConnect = options.skipDeeplink === true || runtime.inWalletBrowser || !runtime.isMobile;

      if (!allowDirectConnect) {
        writePendingMobileWallet(walletProvider);
        const deeplink = buildWalletDeeplink(walletProvider, {
          from: "inspira.bitcoinaudio.ai",
          returnUrl: buildWalletReturnUrl(walletProvider),
        });

        const error = new Error(`Open ${walletProvider} to continue`) as Error & {
          code?: string;
          deeplink?: string;
          walletProvider?: ConnectableWallet;
        };
        error.code = "DEEPLINK_LAUNCHED";
        error.deeplink = deeplink;
        error.walletProvider = walletProvider;
        throw error;
      }

      if (walletProvider === "unisat") {
        if (!window?.unisat) throw new Error("UniSat wallet not detected");
        const accounts = (await window.unisat.requestAccounts?.()) || (await window.unisat.getAccounts?.()) || [];
        const nextAddress = accounts[0];
        if (!nextAddress) throw new Error("No UniSat account available");
        setProvider("unisat");
        setAddress(nextAddress);
        writePersistedConnectedWallet({ provider: "unisat", address: nextAddress });
        clearPendingMobileWallet();
        setMobileConnectNotice("");
        return nextAddress;
      }

      const response = await requestXverse("getAccounts", {
        purposes: ["ordinals", "payment"],
        message: "Connect wallet to generate and publish packs.",
      });
      const addresses = extractXverseAccounts(response);
      const ordinals = addresses.find((entry) => (entry.purpose || "").toLowerCase() === "ordinals");
      const nextAddress = ordinals?.address || addresses[0]?.address || "";
      if (!nextAddress) throw new Error("No Xverse account available");

      setProvider("xverse");
      setAddress(nextAddress);
      writePersistedConnectedWallet({ provider: "xverse", address: nextAddress });
      clearPendingMobileWallet();
      setMobileConnectNotice("");
      return nextAddress;
    },
    [runtime]
  );

  const value = useMemo<WalletContextValue>(
    () => ({
      isWalletConnected: Boolean(provider && address),
      provider,
      address,
      runtime,
      mobileConnectNotice,
      mobileResumeWallet,
      availableWallets,
      connectWallet,
      disconnectWallet,
      clearMobileConnectNotice: () => setMobileConnectNotice(""),
      consumeMobileResumeWallet: () => setMobileResumeWallet(null),
    }),
    [
      provider,
      address,
      runtime,
      mobileConnectNotice,
      mobileResumeWallet,
      availableWallets,
      connectWallet,
      disconnectWallet,
    ]
  );

  return <WalletContext.Provider value={value}>{children}</WalletContext.Provider>;
}

export function useWallet() {
  return useContext(WalletContext);
}
