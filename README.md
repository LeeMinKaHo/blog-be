<p align="center">
  <a href="http://nestjs.com/" target="blank"><img src="https://nestjs.com/img/logo-small.svg" width="200" alt="Nest Logo" /></a>
</p>

[circleci-image]: https://img.shields.io/circleci/build/github/nestjs/nest/master?token=abc123def456
[circleci-url]: https://circleci.com/gh/nestjs/nest

# Foxtek Blog Backend (NestJS)

Dự án Backend nền tảng cho hệ thống **Foxtek Blog**, được xây dựng mạnh mẽ và linh hoạt bằng **NestJS**. Nó cung cấp RESTful API hiệu suất cao và chuẩn hóa, xử lý dữ liệu cho frontend.

## 🚀 Công nghệ sử dụng

- **Framework:** [NestJS](https://nestjs.com/) (Express under the hood)
- **Ngôn ngữ:** TypeScript
- **Database:** PostgreSQL kết nối qua [TypeORM](https://typeorm.io/)
- **Caching:** Redis (`cache-manager`, `@nestjs/cache-manager`)
- **Authentication:** JWT (`@nestjs/jwt`), HttpOnly Cookies
- **Quản lý giới hạn truy cập:** `@nestjs/throttler`
- **Validation:** `class-validator`, `class-transformer`
- **Tài liệu API:** Swagger (`@nestjs/swagger`)

## ✨ Tính năng chính

- **User Authentication:**
  - Login / Register an toàn (Bcrypt hash).
  - Xác thực qua JWT sử dụng HttpOnly Cookies (chống XSS) kết hợp cùng Refresh Token (tuỳ chọn cấu hình).
  - Tích hợp Middleware tự động lấy thông tin CurrentUser qua custom decorator `@CurrentUser()`.
  
- **Blog Management:**
  - CRUD bài viết (Blogs), quản lý Danh mục (Categories).
  - Filter bài viết, search full-text cơ bản, phân trang (Pagination).
  - Tracking lượt xem và bài viết Trending sử dụng **Redis** cache.
  
- **Tương tác & Quản lý:**
  - Bình luận (Comments) và lồng ghép (Nested Comments).
  - Yêu thích / Lưu bài báo (`Seen`, `Saved`).
  - Ghi nhận Audit Log (CreatedBy, UpdatedBy) tự động bằng TypeORM Subscribers.
  
- **Bảo mật & Tối ưu:**
  - Rate Limiting để chống Spam API (Throttler).
  - Cấu hình Global Pipes, Filters và Interceptors để đồng bộ hóa Response/Error.

## 📂 Kiến trúc Module hiện tại

- `AuthModule`: Đăng nhập, đăng ký và bảo mật.
- `UsersModule`: Quản trị User profiles, User roles.
- `BlogModule`: Quản lý Blogs, Categories, Trending.
- `CommentModule`: Quản lý comment, like comment.
- `CacheModule`: Dịch vụ Caching.
- ...

## 💻 Hướng dẫn chạy dự án

### 1. Yêu cầu cài đặt
- **Node.js** (Phiên bản v18+)
- **PostgreSQL** Database.
- **Redis Server** (để xử lý Cache/Throttler).
- `pnpm` hoặc `npm`.

### 2. Cài đặt Dependencies

```bash
cd blog_be
npm install
```

### 3. Cấu hình Biến Môi trường (.env)

Tạo file `.env` ở thư mục gốc (tham khảo `.env.example` nếu có):

```env
# Database PostgreSQL
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=yourpassword
DB_NAME=blog_db

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379

# JWT
JWT_SECRET=super_secret_key_change_me
JWT_EXPIRATION=1d
```

### 4. Chạy môi trường Development

Dự án sẽ tự động đồng bộ (synchronize) schema TypeORM khi mode = dev:

```bash
# Xem log & auto reload
npm run start:dev
```

- **API Base:** `http://localhost:3000`
- **Swagger Docs:** `http://localhost:3000/api` (Tài liệu API tự dộng)

### 5. Production Build

```bash
npm run build
npm run start:prod
```

## 📝 Quy ước code cơ bản

- Các tính năng mới phải được tổ chức theo cấu trúc `Modules`.
- Sử dụng Custom Decorators (`@Public()`, `@CurrentUser()`) cho các endpoint.
- Pagination và Sort cần trả về định dạng Pagination chuẩn trong Global Interceptors.
- Phải thiết lập Validator DTO (Data Transfer Object) cho mọi request dùng `@Body`.

---
*Backend mạnh mẽ cho trải nghiệm Foxtek Blog mượt mà!*
