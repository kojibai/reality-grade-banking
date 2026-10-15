import {
  createElement,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type ComponentPropsWithoutRef,
  type ReactElement,
  type ReactNode,
} from "react";
import {
  createReceizClient,
  type JsonObject,
  type ReceizAppStatePublishInput,
  type ReceizAppStateResolveInput,
  type ReceizAppStateResolveResult,
  type ReceizClient,
  type ReceizClientOptions,
  type ReceizMediaUploadOptions,
  type ReceizOneClickCheckoutRequest,
  type ReceizOneClickCheckoutResponse,
  type TwinPromotionApprovalInput,
} from "./index.js";

export type ReceizReactClientOptions = ReceizClientOptions & {
  client?: ReceizClient;
};

type ReceizReactClientOptionsInput = {
  client?: ReceizClient | undefined;
  baseUrl?: string | undefined;
  accessToken?: string | undefined;
  fetchImpl?: typeof fetch | undefined;
};

type ReceizIdentityHookOptionsInput = ReceizReactClientOptionsInput & {
  authorize?: ReceizIdentityHookOptions["authorize"] | undefined;
  logoutUrl?: string | undefined;
};

export type ReceizAsyncState<T> = {
  loading: boolean;
  error: Error | null;
  data: T | null;
};

export type ReceizIdentityHook = {
  client: ReceizClient;
  login: () => void;
  logout: () => void;
  authorizeUrl: string | null;
};

export type ReceizIdentityHookOptions = ReceizReactClientOptions & {
  authorize?: {
    clientId: string;
    redirectUri: string;
    codeChallenge: string;
    codeChallengeMethod?: "S256" | "plain";
    state?: string;
    scope?: string | string[];
    usernameHint?: string;
  };
  logoutUrl?: string;
};

export type ReceizCheckoutHook = ReceizAsyncState<ReceizOneClickCheckoutResponse> & {
  checkout: (request: ReceizOneClickCheckoutRequest) => Promise<ReceizOneClickCheckoutResponse>;
};

export type ReceizAppStateHook<TData extends JsonObject = JsonObject> = ReceizAsyncState<ReceizAppStateResolveResult<TData>> & {
  resolve: (input?: ReceizAppStateResolveInput) => Promise<ReceizAppStateResolveResult<TData>>;
  publish: (input: ReceizAppStatePublishInput) => Promise<JsonObject>;
};

export type ReceizAppStateHookOptions<TData extends JsonObject = JsonObject> = ReceizReactClientOptions & {
  resolve?: ReceizAppStateResolveInput;
  initial?: ReceizAppStateResolveResult<TData> | null;
  autoResolve?: boolean;
};

export type ReceizMediaHook = ReceizAsyncState<JsonObject> & {
  upload: (file: Blob, options?: ReceizMediaUploadOptions) => Promise<JsonObject>;
};

type ReceizButtonProps = Omit<ComponentPropsWithoutRef<"button">, "onClick"> & {
  children?: ReactNode;
};

type ReceizIdentityButtonProps = ReceizButtonProps & ReceizIdentityHookOptions;

type ReceizCheckoutButtonProps = ReceizButtonProps & ReceizReactClientOptions & {
  request: ReceizOneClickCheckoutRequest;
  onCheckout?: (response: ReceizOneClickCheckoutResponse) => void;
};

type ReceizWalletBalanceProps = ReceizReactClientOptions & {
  tenantHost?: string;
  fallback?: ReactNode;
};

type ReceizMediaUploaderProps = Omit<ComponentPropsWithoutRef<"input">, "type" | "onChange"> & ReceizReactClientOptions & {
  uploadOptions?: ReceizMediaUploadOptions;
  onUploaded?: (response: JsonObject) => void;
};

type ReceizDomainConnectorProps = ReceizButtonProps & ReceizReactClientOptions & {
  host: string;
  onStatus?: (response: JsonObject) => void;
};

type ReceizTwinWriterProps = Omit<ComponentPropsWithoutRef<"button">, "onClick"> & ReceizReactClientOptions & {
  body: TwinPromotionApprovalInput;
  onSaved?: (response: JsonObject) => void;
  children?: ReactNode;
};

function useReceizClient(options: ReceizReactClientOptions = {}): ReceizClient {
  const { client, baseUrl, accessToken, fetchImpl } = options;
  return useMemo(
    () => client ?? createReceizClient(compactClientOptions({ baseUrl, accessToken, fetchImpl })),
    [client, baseUrl, accessToken, fetchImpl],
  );
}

function compactClientOptions(options: ReceizReactClientOptionsInput): ReceizClientOptions {
  const next: ReceizClientOptions = {};
  if (options.baseUrl !== undefined) next.baseUrl = options.baseUrl;
  if (options.accessToken !== undefined) next.accessToken = options.accessToken;
  if (options.fetchImpl !== undefined) next.fetchImpl = options.fetchImpl;
  return next;
}

function compactReactClientOptions(options: ReceizReactClientOptionsInput): ReceizReactClientOptions {
  const next: ReceizReactClientOptions = compactClientOptions(options);
  if (options.client !== undefined) next.client = options.client;
  return next;
}

function compactIdentityOptions(options: ReceizIdentityHookOptionsInput): ReceizIdentityHookOptions {
  const next: ReceizIdentityHookOptions = compactReactClientOptions(options);
  if (options.authorize !== undefined) next.authorize = options.authorize;
  if (options.logoutUrl !== undefined) next.logoutUrl = options.logoutUrl;
  return next;
}

function errorFromUnknown(error: unknown): Error {
  return error instanceof Error ? error : new Error(String(error));
}

function useMountedRef(): { current: boolean } {
  const mountedRef = useRef(true);
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);
  return mountedRef;
}

export function useReceizIdentity(options: ReceizIdentityHookOptions = {}): ReceizIdentityHook {
  const client = useReceizClient(options);
  const authorizeUrl = options.authorize ? client.identity.authorizeUrl(options.authorize) : null;
  const login = useCallback(() => {
    if (!authorizeUrl || typeof window === "undefined") return;
    window.location.assign(authorizeUrl);
  }, [authorizeUrl]);
  const logout = useCallback(() => {
    if (typeof window === "undefined") return;
    window.location.assign(options.logoutUrl ?? "/logout");
  }, [options.logoutUrl]);
  return { client, login, logout, authorizeUrl };
}

export function useReceizCheckout(options: ReceizReactClientOptions = {}): ReceizCheckoutHook {
  const client = useReceizClient(options);
  const mountedRef = useMountedRef();
  const [state, setState] = useState<ReceizAsyncState<ReceizOneClickCheckoutResponse>>({
    loading: false,
    error: null,
    data: null,
  });
  const checkout = useCallback(async (request: ReceizOneClickCheckoutRequest) => {
    setState((current) => ({ ...current, loading: true, error: null }));
    try {
      const response = await client.commerce.oneClickCheckout(request);
      if (mountedRef.current) setState({ loading: false, error: null, data: response });
      return response;
    } catch (error) {
      const nextError = errorFromUnknown(error);
      if (mountedRef.current) setState({ loading: false, error: nextError, data: null });
      throw nextError;
    }
  }, [client, mountedRef]);
  return { ...state, checkout };
}

export function useReceizAppState<TData extends JsonObject = JsonObject>(
  options: ReceizAppStateHookOptions<TData> = {},
): ReceizAppStateHook<TData> {
  const client = useReceizClient(options);
  const mountedRef = useMountedRef();
  const [state, setState] = useState<ReceizAsyncState<ReceizAppStateResolveResult<TData>>>({
    loading: false,
    error: null,
    data: options.initial ?? null,
  });
  const resolve = useCallback(async (input?: ReceizAppStateResolveInput) => {
    const target = input ?? options.resolve;
    if (!target) throw new Error("receiz_app_state_resolve_input_required");
    setState((current) => ({ ...current, loading: true, error: null }));
    try {
      const response = await client.appState.resolve<TData>(target);
      if (mountedRef.current) setState({ loading: false, error: null, data: response });
      return response;
    } catch (error) {
      const nextError = errorFromUnknown(error);
      if (mountedRef.current) setState({ loading: false, error: nextError, data: null });
      throw nextError;
    }
  }, [client, mountedRef, options.resolve]);
  const publish = useCallback(async (input: ReceizAppStatePublishInput) => {
    const response = await client.appState.publish(input);
    return response as unknown as JsonObject;
  }, [client]);

  useEffect(() => {
    if (options.autoResolve === false || !options.resolve || options.initial) return;
    let active = true;
    const target = options.resolve;
    queueMicrotask(() => {
      if (!active) return;
      void resolve(target);
    });
    return () => {
      active = false;
    };
  }, [options.autoResolve, options.initial, options.resolve, resolve]);

  return { ...state, resolve, publish };
}

export function useReceizMedia(options: ReceizReactClientOptions = {}): ReceizMediaHook {
  const client = useReceizClient(options);
  const mountedRef = useMountedRef();
  const [state, setState] = useState<ReceizAsyncState<JsonObject>>({
    loading: false,
    error: null,
    data: null,
  });
  const upload = useCallback(async (file: Blob, uploadOptions: ReceizMediaUploadOptions = {}) => {
    setState((current) => ({ ...current, loading: true, error: null }));
    try {
      const response = await client.media.upload(file, uploadOptions);
      const data = response as unknown as JsonObject;
      if (mountedRef.current) setState({ loading: false, error: null, data });
      return data;
    } catch (error) {
      const nextError = errorFromUnknown(error);
      if (mountedRef.current) setState({ loading: false, error: nextError, data: null });
      throw nextError;
    }
  }, [client, mountedRef]);
  return { ...state, upload };
}

export function ReceizIdentityButton(props: ReceizIdentityButtonProps): ReactElement {
  const { children, client, baseUrl, accessToken, fetchImpl, authorize, logoutUrl, ...buttonProps } = props;
  const identity = useReceizIdentity(compactIdentityOptions({ client, baseUrl, accessToken, fetchImpl, authorize, logoutUrl }));
  return createElement(
    "button",
    { ...buttonProps, type: buttonProps.type ?? "button", onClick: identity.login },
    children ?? "Continue with Receiz",
  );
}

export function ReceizCheckoutButton(props: ReceizCheckoutButtonProps): ReactElement {
  const { children, client, baseUrl, accessToken, fetchImpl, request, onCheckout, ...buttonProps } = props;
  const checkout = useReceizCheckout(compactReactClientOptions({ client, baseUrl, accessToken, fetchImpl }));
  const onClick = useCallback(async () => {
    const response = await checkout.checkout(request);
    onCheckout?.(response);
  }, [checkout, onCheckout, request]);
  return createElement(
    "button",
    { ...buttonProps, type: buttonProps.type ?? "button", disabled: buttonProps.disabled || checkout.loading, onClick },
    children ?? (checkout.loading ? "Opening..." : "Checkout with Receiz"),
  );
}

export function ReceizWalletBalance(props: ReceizWalletBalanceProps): ReactElement {
  const { client: providedClient, baseUrl, accessToken, fetchImpl, fallback = "Wallet unavailable" } = props;
  const client = useReceizClient(compactReactClientOptions({ client: providedClient, baseUrl, accessToken, fetchImpl }));
  const [balance, setBalance] = useState<string | null>(null);
  useEffect(() => {
    let active = true;
    void client.connect.wallet().then((wallet) => {
      if (!active) return;
      setBalance(typeof wallet.balanceUsdCents === "string" ? `$${(Number(wallet.balanceUsdCents) / 100).toFixed(2)}` : null);
    }).catch(() => {
      if (active) setBalance(null);
    });
    return () => {
      active = false;
    };
  }, [client]);
  return createElement("span", null, balance ?? fallback);
}

export function ReceizMediaUploader(props: ReceizMediaUploaderProps): ReactElement {
  const { client, baseUrl, accessToken, fetchImpl, uploadOptions, onUploaded, ...inputProps } = props;
  const media = useReceizMedia(compactReactClientOptions({ client, baseUrl, accessToken, fetchImpl }));
  const onChange = useCallback(async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.currentTarget.files?.[0];
    if (!file) return;
    const response = await media.upload(file, uploadOptions);
    onUploaded?.(response);
  }, [media, onUploaded, uploadOptions]);
  return createElement("input", { ...inputProps, type: "file", onChange });
}

export function ReceizDomainConnector(props: ReceizDomainConnectorProps): ReactElement {
  const { children, client: providedClient, baseUrl, accessToken, fetchImpl, host, onStatus, ...buttonProps } = props;
  const client = useReceizClient(compactReactClientOptions({ client: providedClient, baseUrl, accessToken, fetchImpl }));
  const onClick = useCallback(async () => {
    const response = await client.domains.status({ host });
    onStatus?.(response);
  }, [client, host, onStatus]);
  return createElement("button", { ...buttonProps, type: buttonProps.type ?? "button", onClick }, children ?? "Check Receiz Domain");
}

export function ReceizTwinWriter(props: ReceizTwinWriterProps): ReactElement {
  const { children, client: providedClient, baseUrl, accessToken, fetchImpl, body, onSaved, ...buttonProps } = props;
  const client = useReceizClient(compactReactClientOptions({ client: providedClient, baseUrl, accessToken, fetchImpl }));
  const onClick = useCallback(async () => {
    const response = await client.twin.approvePromotion(body);
    onSaved?.(response);
  }, [body, client, onSaved]);
  return createElement("button", { ...buttonProps, type: buttonProps.type ?? "button", onClick }, children ?? "Write Twin Proof");
}
