"use client";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { request, initializeSession, clearSession } from "@/lib/api";
import type { Product, Session } from "@/lib/types";
type Context = {
  session: Session | null;
  products: Product[];
  store: string;
  setStore: (id: string) => void;
  cart: Record<string, number>;
  add: (p: Product) => void;
  quantity: (id: string, n: number) => void;
  clearCart: () => void;
  refresh: () => Promise<void>;
  reset: () => Promise<void>;
  notify: (message: string) => void;
  loading: boolean;
  error: string;
  act: <T>(path: string, body: unknown, method?: string) => Promise<T>;
};
const DemoContext = createContext<Context | null>(null);
export function Provider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null),
    [products, setProducts] = useState<Product[]>([]),
    [store, setStoreState] = useState("centro"),
    [cart, setCart] = useState<Record<string, number>>({}),
    [loading, setLoading] = useState(true),
    [error, setError] = useState(""),
    [toast, setToast] = useState("");
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const notify = useCallback((message: string) => {
    setToast(message);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(""), 4000);
  }, []);
  useEffect(() => {
    let active = true;
    initializeSession()
      .then((s) => {
        if (!active) return;
        setSession(s);
        try {
          const data = JSON.parse(
            localStorage.getItem("vf-cart-" + s.id) || "{}",
          );
          if (data && typeof data === "object")
            setCart(
              Object.fromEntries(
                Object.entries(data).filter(
                  ([, v]) =>
                    Number.isInteger(v) && Number(v) > 0 && Number(v) <= 100,
                ),
              ) as Record<string, number>,
            );
        } catch {}
      })
      .catch((e) => {
        if (active) {
          setError(e.message);
          setLoading(false);
        }
      });
    return () => {
      active = false;
      if (toastTimer.current) clearTimeout(toastTimer.current);
    };
  }, []);
  const refresh = useCallback(async () => {
    if (!session) return;
    const items = await request<Product[]>("/products?store=" + store);
    setProducts(items);
  }, [session, store]);
  useEffect(() => {
    if (!session) return;
    let active = true;
    setLoading(true);
    request<Product[]>("/products?store=" + store)
      .then((p) => {
        if (active) {
          setProducts(p);
          setError("");
        }
      })
      .catch((e) => {
        if (active) setError(e.message);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [session, store]);
  useEffect(() => {
    if (session)
      localStorage.setItem("vf-cart-" + session.id, JSON.stringify(cart));
  }, [cart, session]);
  const quantity = (id: string, n: number) =>
    setCart((c) => {
      const copy = { ...c };
      if (n <= 0) delete copy[id];
      else copy[id] = Math.min(100, n);
      return copy;
    });
  const add = (p: Product) => {
    if ((cart[p.id] || 0) >= p.available) {
      notify("Quantidade máxima disponível nesta unidade.");
      return;
    }
    quantity(p.id, (cart[p.id] || 0) + 1);
    notify(p.name + " adicionado ao carrinho");
  };
  const setStore = (id: string) => {
    setStoreState(id);
    notify("Unidade alterada. A disponibilidade será atualizada.");
  };
  const act = async <T,>(
    path: string,
    body: unknown,
    method = "POST",
  ): Promise<T> => {
    if (!session) throw new Error("Aguarde a sessão.");
    return request<T>(
      path,
      { method, body: JSON.stringify(body) },
      session.csrfToken,
    );
  };
  const reset = async () => {
    setLoading(true);
    try {
      const s = await request<Session>("/session", { method: "POST" });
      clearSession();
      setSession(s);
      setCart({});
      setError("");
      notify("Uma nova demonstração foi iniciada.");
    } catch (e) {
      setError((e as Error).message);
      setLoading(false);
    }
  };
  return (
    <DemoContext.Provider
      value={{
        session,
        products,
        store,
        setStore,
        cart,
        add,
        quantity,
        clearCart: () => setCart({}),
        refresh,
        reset,
        notify,
        loading,
        error,
        act,
      }}
    >
      {children}
      {toast && (
        <div className="toast" role="status">
          <span className="toast-dot" />
          {toast}
        </div>
      )}
    </DemoContext.Provider>
  );
}
export function useDemo() {
  const context = useContext(DemoContext);
  if (!context) throw new Error("Provider ausente");
  return context;
}
