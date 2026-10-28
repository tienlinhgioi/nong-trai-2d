# 🌱 Nông Trại Nhỏ

Game web nông trại 2D tiếng Việt, có nhân vật di chuyển, trồng trọt, cửa hàng, túi đồ, đăng nhập email và bảng xếp hạng. Hỗ trợ bàn phím và cảm ứng.

## Công nghệ

- Frontend: TypeScript, React 19, Phaser 3, Vite.
- Backend: TypeScript, Cloudflare Worker; cùng origin với frontend.
- Database và Auth: Supabase PostgreSQL + email/mật khẩu.
- Test: Vitest, PostgreSQL nhúng PGlite, Playwright.

## Chạy trên máy

Yêu cầu Node.js 22 trở lên.

```sh
npm ci
npm run build
cp .env.example .dev.vars
# Điền SUPABASE_URL và SUPABASE_ANON_KEY vào .dev.vars.
npm run dev:api
```

Mở địa chỉ Wrangler in ra, mặc định http://localhost:8787. Để phát triển frontend có hot reload, mở terminal thứ hai chạy `npm run dev`, truy cập http://localhost:5173. Vite chuyển `/api` tới Wrangler. Không cấu hình Supabase vẫn chơi thử được; bản thử lưu riêng trong localStorage, không tham gia bảng xếp hạng.

## Cấu hình Supabase

Dự án được tạo cho game: `nong-trai-2d`, ref `thbuewtmnacjshbjiuaw`, vùng Singapore.

1. Chạy migration trong `supabase/migrations/` trên dự án trống bằng SQL Editor hoặc Supabase CLI đã link đúng project. Migration đầu đã được áp dụng cho dự án trên.
2. Trong Authentication → URL Configuration, thêm origin triển khai và `http://localhost:5173`, `http://localhost:8787` vào Redirect URLs; đặt Site URL theo origin dùng chính.
3. Bật Email/password và xác nhận email. Cấu hình SMTP riêng trước khi mở đăng ký rộng rãi để tránh giới hạn email mặc định của Supabase.
4. Đặt `SUPABASE_URL` và publishable key trong `SUPABASE_ANON_KEY` ở runtime backend. Không cần service-role key.

Frontend lấy public configuration qua `/api/config`. Backend xác minh token bằng `getUser`, dùng JWT của chính người chơi để gọi RPC. Các hàm giao dịch kiểm tra `auth.uid()` và chủ nông trại. RLS chỉ cho đọc nông trại của mình; trình duyệt không có quyền ghi trực tiếp vào bảng. RPC bảng xếp hạng chỉ trả tên và doanh thu, không trả email hay ID tài khoản.

## Cách chơi

- WASD / phím mũi tên: di chuyển; E / Space: tương tác với ô phía trước.
- Điện thoại: nút điều hướng và nút tương tác dưới bản đồ.
- Chọn hạt, đứng cạnh ô đất, nhấn E để gieo. Chọn bình tưới, nhấn E để tưới.
- Cây cần tưới đúng một lần. Thời gian lớn được tính ở database, vẫn tiếp tục khi thoát game.
- Nhấn E trước cây trưởng thành để thu hoạch. Đến cửa hàng góc trên phải, nhấn E để mua/bán.

| Cây | Giá hạt | Giá bán | Thời gian sau tưới |
| --- | ---: | ---: | ---: |
| Cà rốt | 5 xu | 10 xu | 1 phút |
| Ngô | 10 xu | 22 xu | 3 phút |
| Cà chua | 15 xu | 35 xu | 5 phút |

Người mới có 100 xu, 5 hạt cà rốt, 24 ô đất. Bảng xếp hạng top 20 tính tổng doanh thu bán nông sản. Chơi đơn, chưa có multiplayer.

## API

- `GET /api/config`: trạng thái cấu hình và publishable key.
- `GET /api/farm`: tải hoặc khởi tạo nông trại của tài khoản.
- `POST /api/actions`: `{ requestId: UUID, action: Action }`; hành động `plant`, `water`, `harvest`, `buy`, `sell`. Kiểu dữ liệu tại `shared/game.ts`.
- `GET /api/leaderboard`: top 20 doanh thu.

Các API game yêu cầu `Authorization: Bearer <Supabase access token>`. POST kiểm tra origin. Giá, số lượng và thời gian được kiểm tra lại ở database. Mỗi giao dịch khóa hàng nông trại, lưu mã yêu cầu để retry không tạo thưởng hoặc chi tiêu trùng. Chưa xác nhận được kết quả do mất mạng thì giao diện khóa thao tác mới và cho retry cùng mã.

## Kiểm tra

```sh
npm run typecheck
npm test
npm run build
```

Test database dùng PGlite với mock `auth.users` và `auth.uid()` cho môi trường local, thực thi migration SQL thật. GitHub Actions chạy typecheck, test và build. Kiểm thử trình duyệt được lưu trong `e2e/` khi có Chromium.

## Triển khai

`npm run build` tạo client tại `dist/client` và Worker tự chứa tại `dist/server/index.js`. `.openai/hosting.json` giữ định danh Sites. Để triển khai Cloudflare trực tiếp, cấu hình hai biến môi trường bằng dashboard hoặc `wrangler secret put`, sau đó chạy `npm run deploy` với tài khoản Cloudflare đã kết nối.

Không commit `.dev.vars`, `.env`, token hoặc secret. Với production có lượng truy cập lớn, bổ sung rate limit, chính sách lưu trữ/thu gọn action receipts và theo dõi lỗi API. Không xóa receipts tùy tiện vì ảnh hưởng bảo đảm idempotency.

## Tài nguyên

Bản đồ, nhà, cây, nhân vật được vẽ bằng Phaser Graphics riêng cho dự án. Không sử dụng sprite bên thứ ba. Font Be Vietnam Pro và Nunito qua Google Fonts (SIL Open Font License); có sans-serif dự phòng. Các biểu tượng dụng cụ dùng emoji hệ thống.
