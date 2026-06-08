# React + TypeScript 編碼規範 V1（Claude Code 專用）

## 1. 組件職責

**每個組件只做一件事。** 若組件同時處理 UI 渲染、API 請求、複雜計算，必須拆分。

- 複雜邏輯抽進 Custom Hook，組件只呼叫 Hook 並渲染回傳值。
- Smart/Dumb 分類已過時，不使用此框架。現代等效做法：邏輯 → Hook，渲染 → 組件。

```tsx
// 禁止：邏輯與渲染混在組件內
const UserList = () => {
  const [users, setUsers] = useState<User[]>([]);
  useEffect(() => {
    fetch('/api/users').then(r => r.json()).then(setUsers);
  }, []);
  return <ul>{users.map(u => <li key={u.id}>{u.name}</li>)}</ul>;
};

// 正確：邏輯封裝於 Hook
const useUsers = () => {
  const [users, setUsers] = useState<User[]>([]);
  useEffect(() => {
    fetch('/api/users').then(r => r.json()).then(setUsers);
  }, []);
  return users;
};
const UserList = () => {
  const users = useUsers();
  return <ul>{users.map(u => <li key={u.id}>{u.name}</li>)}</ul>;
};
```

---

## 2. TypeScript 型別規則

### 禁止 `any`
使用 `unknown` 搭配 type guard 收窄型別。

```ts
// 禁止
function parse(raw: any) { return raw.value; }

// 正確
function parse(raw: unknown): string {
  if (typeof raw === 'object' && raw !== null && 'value' in raw && typeof (raw as Record<string, unknown>).value === 'string') {
    return (raw as { value: string }).value;
  }
  throw new Error('Invalid payload');
}
```

### 狀態用 Discriminated Union，禁止多個 boolean 旗標

```ts
// 禁止：isLoading + isError 可同時為 true，邏輯矛盾
interface FetchState { isLoading: boolean; isError: boolean; data?: User; }

// 正確：狀態唯一
type FetchState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'success'; data: User }
  | { status: 'error'; error: Error };
```

### Props 必須明確定義，只傳需要的欄位

```tsx
// 禁止：把整個物件傳入，建立不必要的耦合
const Avatar = ({ user }: { user: User }) => <img src={user.avatarUrl} />;

// 正確：只傳需要的欄位
const Avatar = ({ avatarUrl, alt }: { avatarUrl: string; alt: string }) => (
  <img src={avatarUrl} alt={alt} />
);
```

### 使用 `satisfies` 保留推導型別

```ts
// 比型別斷言更安全
const routeConfig = {
  home: '/',
  settings: '/settings',
} satisfies Record<string, string>;

// routeConfig.home 的型別是 '/'（字面量），而非寬鬆的 string
```

### Branded Types 防止原始型別混用

```ts
type UserId = string & { readonly _brand: 'UserId' };
type OrderId = string & { readonly _brand: 'OrderId' };

const toUserId = (id: string): UserId => id as UserId;

// 下面這行會在編譯期報錯，而非 runtime 靜默傳錯
function getUser(id: UserId) { /* ... */ }
getUser(toOrderId('123')); // ❌ 型別不相容
```

### Utility Types 保持 DRY

```ts
interface User { id: UserId; name: string; email: string; }

type CreateUserInput = Omit<User, 'id'>;
type UpdateUserInput = Partial<Omit<User, 'id'>>;
```

---

## 3. 非同步狀態管理

**優先使用 TanStack Query（`@tanstack/react-query`）**，不要自己用 `useEffect` + `useState` 管理 server state。

```tsx
// 禁止：手動管理 loading/error/data
const [data, setData] = useState<User | null>(null);
const [loading, setLoading] = useState(false);
useEffect(() => { setLoading(true); fetch(...).then(setData).finally(() => setLoading(false)); }, []);

// 正確：TanStack Query 處理所有 async 狀態
const { data, isPending, error } = useQuery({
  queryKey: ['user', userId],
  queryFn: () => fetchUser(userId),
});
```

---

## 4. 效能最佳化原則

**`useMemo` / `useCallback` 預設不加。** 僅在下列情況才加：

1. 依賴項是複雜計算（毫秒級可量測），且組件 re-render 頻繁。
2. 函數作為 prop 傳入被 `React.memo` 包裹的子組件。
3. 函數/值被用於 `useEffect`、`useQuery` 的 dependency array。

```tsx
// 禁止：無意義的 useCallback，只增加程式碼噪音
const handleClick = useCallback(() => setCount(c => c + 1), []);

// 正確：直接定義
const handleClick = () => setCount(c => c + 1);
```

---

## 5. `key` prop 規則

**禁止用陣列 index 作為 `key`**，除非列表是靜態且永不重排。

```tsx
// 禁止：增刪時 React 會錯誤複用 DOM 節點
items.map((item, i) => <Row key={i} {...item} />);

// 正確：使用穩定的業務 ID
items.map(item => <Row key={item.id} {...item} />);
```

---

## 6. 組件擴充性

繼承原生 HTML 屬性，避免重複宣告常見 prop：

```tsx
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant: 'primary' | 'secondary' | 'ghost';
  isLoading?: boolean;
}

const Button = ({ variant, isLoading, children, disabled, ...rest }: ButtonProps) => (
  <button
    className={`btn-${variant}`}
    disabled={disabled || isLoading}
    {...rest}
  >
    {isLoading ? <Spinner /> : children}
  </button>
);
```

---

## 7. 狀態 Colocation

**狀態放在需要它的最近共同祖先，不要預設提升到全域。**

```
單一組件用 → useState 在該組件內
兄弟組件共用 → useState 提升到共同父層
跨多層且頻繁存取 → Context 或 Zustand
Server state → TanStack Query（不放進 useState）
```

---

## 8. Context 使用規則

Context 是 DI 機制，用於注入穩定的服務（auth、theme、i18n），**不用於高頻更新的狀態**（會導致全樹 re-render）。

```tsx
// 正確：穩定的認證狀態
const AuthContext = createContext<AuthContextValue | null>(null);

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};
```

---

## 9. Error Boundary

**每個路由層級或獨立功能區塊必須有 Error Boundary**，防止單一組件錯誤崩潰整個應用。

```tsx
// 使用 react-error-boundary
import { ErrorBoundary } from 'react-error-boundary';

const MapPage = () => (
  <ErrorBoundary fallback={<MapErrorFallback />}>
    <MapView />
  </ErrorBoundary>
);
```

---

## 10. 錯誤處理

**不使用 untyped throw。** 非同步函數優先使用 Result 型別，避免 try/catch 散落各處。

```ts
type Result<T, E = Error> =
  | { data: T; error: null }
  | { data: null; error: E };

async function fetchUser(id: UserId): Promise<Result<User>> {
  try {
    const res = await api.get(`/users/${id}`);
    return { data: res.data, error: null };
  } catch (e) {
    return { data: null, error: e instanceof Error ? e : new Error(String(e)) };
  }
}

// 呼叫端強制處理錯誤
const { data, error } = await fetchUser(userId);
if (error) { /* 明確處理 */ return; }
// 此後 data 型別是 User，不含 null
```
