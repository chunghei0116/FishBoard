# 3D 小島與 Fishboard 日誌整合

## 基礎版本

以 `2fb549650446b203cb2a05bfe970735ef2f919b8` 的內容、登入、資料模型及服務實作為基礎，只移植 `6cb72b3` 的遊戲場景、原創角色、移動與鏡頭。禁止將遊戲分支舊版 `app/collection.tsx`、FirebaseSession、API 或資料存取層覆蓋回來。

## 頁面與導航

- `/`：公開 3D 小島，使用同一個根層 FishLogProvider。
- `/journal`：原主頁的完整元件，保留水族箱、統計、跑馬燈及紀錄列表。
- 原有 `/collection`、`/species/[id]`、`/catches/[id]`、`/map`、`/add`、`/settings` 及 `/gear` 路由繼續運作。
- 水族箱、日誌、工具箱、地圖、小屋分別在全頁原生 dialog 開啟既有內容元件。保留原 Shell/provider/API，無 iframe 或第二份登入／資料 provider。
- 原有新增、編輯、刪除、圖片與像素魚元件保留；catch detail 返回及刪除成功後導向 `/journal#catch-log`。
- Popup 內攔截既有內容連結，表單透過 ContentNavigationContext 開啟詳情及返回。原網址不變，內部維護返回堆疊；返回小島連結會關閉 popup。獨立路由仍使用正常 Next.js navigation。
- `/#catch-log` 舊連結直接開啟日誌 popup。內容頁 sidebar/mobile nav 同時提供小島與日誌入口。
- 登入後等原有資料讀取完成才掛載新增等內容，避免以示範資料初始化真實表單。外層 dialog 先開啟，原有新增／編輯 dialog 隨後開啟，以保留原生焦點及 Escape 行為。路徑切換重建內容 Shell，確保新增成功後原表單卸載。
- 共用 loading provider 提供 busy 狀態，處理中鎖住關閉及 UI 導覽；成功儲存後的程式導覽仍可完成。CSS 控制背景滾動鎖，避免與原有表單的 body overflow 清理互相覆蓋。

## 遊戲

保留低面數釣手（1,552 triangles、約 225 KB）、待機／走路動畫、碰撞、尋路及近距離互動。手機保留搖桿、死區、力度控制、放手／取消／失焦歸零、啟動 2.2 倍近鏡及跟隨。桌面不顯示搖桿。初始日誌讀取及 popup 開啟期間暫停遊戲鏡頭與控制；關閉 popup 不重建 scene，保留人物及鏡頭狀態。

小島背景魚是裝飾；真實像素魚與漁獲繼續在原有日誌／圖鑑頁讀取。小島不生成或寫入任何魚獲資料。

## 驗證

跑完整 `npm test` 與 `npm run build:vercel`，另檢查站點導航、舊列表連結、catch detail 原相與操作、桌面／手機 shell、控制與角色資源。對照 `2fb5496` 的 API、登入、Firestore、AI、生圖裁切、Cloudinary、provider、新增表單、設定、地圖及主頁元件，確保服務實作保留。線上生圖需獨立的真實請求驗證；測試或 build 通過不代表生圖成功。
