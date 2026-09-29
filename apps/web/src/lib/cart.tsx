import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { ProductVO } from "@/api/mall";

/**
 * 购物车条目：纯前端态，不与 Java 后端模型对齐，故定义在本文件而非 types.ts。
 * 字段从 ProductVO 快照而来，加入购物车后即使商品信息变动也保留下单时的快照。
 */
export interface CartItem {
  productId: string;
  name: string;
  price: number;
  coverImage: string | null;
  stock: number;
  quantity: number;
}

interface CartContextValue {
  items: CartItem[];
  /** 加入购物车：同 productId 累加数量，上限为 stock */
  addItem: (p: ProductVO, qty?: number) => void;
  /** 修改数量：qty<=0 则移除该行 */
  updateQty: (id: string, qty: number) => void;
  removeItem: (id: string) => void;
  clear: () => void;
  /** 总件数（sum quantity） */
  totalCount: number;
  /** 总金额（sum price*quantity） */
  totalAmount: number;
  /** 购物车抽屉开闭：放 Context 便于 topbar / 抽屉 / 结算弹窗三方共享 */
  drawerOpen: boolean;
  setDrawerOpen: (v: boolean) => void;
}

const CartContext = createContext<CartContextValue | null>(null);

const STORAGE_KEY = "ai-mall:cart";

/** 从 localStorage 懒加载初始购物车，失败回退空数组 */
function loadInitial(): CartItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as CartItem[]) : [];
  } catch {
    return [];
  }
}

/**
 * 全局购物车状态：items 持久化到 localStorage（刷新/换标签不丢），
 * drawerOpen 仅内存态（刷新后默认关闭）。
 */
export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>(loadInitial);
  const [drawerOpen, setDrawerOpen] = useState(false);

  // items 变化即写回 localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch {
      /* 忽略写入失败（如隐私模式/配额满） */
    }
  }, [items]);

  const addItem = useCallback((p: ProductVO, qty = 1) => {
    setItems((prev) => {
      const idx = prev.findIndex((c) => c.productId === p.id);
      if (idx === -1) {
        return [
          ...prev,
          {
            productId: p.id,
            name: p.name,
            price: p.price,
            coverImage: p.coverImage,
            stock: p.stock,
            quantity: Math.min(qty, p.stock),
          },
        ];
      }
      const next = [...prev];
      const capped = Math.min(next[idx].quantity + qty, p.stock);
      next[idx] = { ...next[idx], quantity: capped, stock: p.stock };
      return next;
    });
  }, []);

  const updateQty = useCallback((id: string, qty: number) => {
    setItems((prev) => {
      if (qty <= 0) return prev.filter((c) => c.productId !== id);
      return prev.map((c) =>
        c.productId === id
          ? { ...c, quantity: Math.min(qty, c.stock) }
          : c,
      );
    });
  }, []);

  const removeItem = useCallback((id: string) => {
    setItems((prev) => prev.filter((c) => c.productId !== id));
  }, []);

  const clear = useCallback(() => setItems([]), []);

  const { totalCount, totalAmount } = useMemo(() => {
    return items.reduce(
      (acc, c) => {
        acc.totalCount += c.quantity;
        acc.totalAmount += c.price * c.quantity;
        return acc;
      },
      { totalCount: 0, totalAmount: 0 },
    );
  }, [items]);

  const value = useMemo<CartContextValue>(
    () => ({
      items,
      addItem,
      updateQty,
      removeItem,
      clear,
      totalCount,
      totalAmount,
      drawerOpen,
      setDrawerOpen,
    }),
    [
      items,
      addItem,
      updateQty,
      removeItem,
      clear,
      totalCount,
      totalAmount,
      drawerOpen,
    ],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartContextValue {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart 必须在 <CartProvider> 内使用");
  return ctx;
}
