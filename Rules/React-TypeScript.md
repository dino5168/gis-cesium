React TypeScript 設計原則
# 單一功能原則 (Single Responsibility Principle)
一個組件或一個Hook應該只做好一件事。

- **React 實踐：** 不要寫一個上千行的 `HugeComponent`。將 UI 渲染、狀態管理、資料獲取（Data Fetching）拆分開來。
- **TypeScript 輔助：** 如果一個組件的 Props 型別定義（Interface）密密麻麻包含了幾十個不相關的屬性，通常就代表這個組件承載了太多責任，應該進行拆分。
# 邏輯與 UI 分離 (Separation of Concerns)
將「業務邏輯（怎麼運作）」與「展示 UI（長什麼樣子）」分開。
- **Smart (Container) vs. Dumb (Presentational) 組件：**
       - **Smart 組件：** 負責處理 API 請求、狀態管理、useEffect 等。
       - **Dumb 組件：** 只接收 Props，單純負責渲染畫面，沒有副作用（Side Effects）。
       - 
- **Custom Hooks：** 現代 React 更傾向將複雜邏輯抽離到自定義的 Hook 中（例如 `useUserData`），組件內部只需呼叫 Hook 並渲染 UI。

# 型別安全與防禦性程式設計 (Type Safety)

充分利用 TypeScript 的靜態檢查，把錯誤封鎖在編譯階段。

- **明確的 Props 定義：** 永遠為組件的 Props 定義嚴格的型別或介面。
    
- **善用聯合型別 (Union Types) 代替 String/Boolean：**
    
    TypeScript
    
    ```
    // 💡 差的作法：用兩個 boolean 控制狀態，容易出現矛盾（例如同時為 true）
    interface StatusProps {
      isLoading: boolean;
      isError: boolean;
    }
    
    //  好的作法：用聯合型別限制狀態，狀態絕對唯一
    type Status = 'idle' | 'loading' | 'success' | 'error';
    interface StatusProps {
      status: Status;
    }
    ```
    
- **嚴格禁止 `any`：** 使用 `any` 等同於放棄 TypeScript。如果遇到不確定的型別，應使用 `unknown` 並搭配型別守衛（Type Guards）進行限縮。

# 依賴注入與控制反轉 (IoC / Dependency Injection)

組件不應該硬編碼（Hardcode）外部依賴，而是透過 Props 或 Context 注入。

- **React 實踐：**
    
    - **Children Prop：** 利用 `children` 將子組件傳入，讓父組件決定結構（即組件複合 Component Composition），避免深層的 Props Drilling。
        
    - **Render Props / Slot 模式：** 允許外部傳入一個回傳 JSX 的函式，來決定某個區塊的渲染邏輯。
        

#  領域驅動的資料結構 (Domain-Driven Types)

在 TypeScript 中，型別的設計應該貼近業務邏輯，並保持「單一數據源（Single Source of Truth）」。

- **利用 Utility Types 保持 DRY (Don't Repeat Yourself)：** 不要重複定義相似的型別。善用 TypeScript 內建的工具：
    
    TypeScript
    
    ```
    interface User {
      id: string;
      name: string;
      email: string;
      age: number;
    }
    
    // 建立新用戶時不需要 id
    type CreateUserInput = Omit<User, 'id'>;
    
    // 更新用戶時所有欄位都是可選的
    type UpdateUserInput = Partial<Omit<User, 'id'>>;
    ```
    
# 元件設計的 SOLID 原則延伸
經典的物件導向 SOLID 原則，在 React + TS 中同樣適用：
- **開閉原則 (Open/Closed Principle)：** 組件應該「對擴充開放，對修改封閉」。透過擴充原生 HTML 屬性來實現：
    
    TypeScript
    
    ```
    // 這個按鈕組件支援所有原生 button 的屬性，不需要一個個手動定義
    interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
      variant: 'primary' | 'secondary';
    }
    
    const Button = ({ variant, children, ...rest }: ButtonProps) => {
      return <button className={`btn-${variant}`} {...rest}>{children}</button>;
    }
    ```
    
- **介面隔離原則 (Interface Segregation Principle)：** 組件不應該依賴它不需要的 Props。
    
    TypeScript
    
    ```
    // 💡 差的作法：組件只需要名字，卻把整個巨大的 user 物件傳進去
    const UserAvatar = ({ user }: { user: User }) => <img src={user.avatarUrl} />;
    
    //  好的作法：只傳入需要的資料，提高組件的複用性與解耦
    const UserAvatar = ({ avatarUrl }: { avatarUrl: string }) => <img src={avatarUrl} />;
    ```
