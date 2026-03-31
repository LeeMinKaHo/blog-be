<p align="center">
  <a href="http://nestjs.com/" target="blank"><img src="https://nestjs.com/img/logo-small.svg" width="200" alt="Nest Logo" /></a>
</p>

[circleci-image]: https://img.shields.io/circleci/build/github/nestjs/nest/master?token=abc123def456
[circleci-url]: https://circleci.com/gh/nestjs/nest

# 🚀 Foxtek Blog Backend (NestJS)

Dự án Backend cho hệ thống **Foxtek Blog**, được xây dựng mạnh mẽ với **NestJS 11**. Hệ thống cung cấp RESTful API hiệu suất cao, tích hợp Real-time notifications và Queue processing.

---

## 🛠️ Công nghệ sử dụng

### Core Stack
- **Framework:** [NestJS 11](https://nestjs.com/)
- **Ngôn ngữ:** TypeScript
- **Database:** MySQL 8 tích hợp qua [TypeORM](https://typeorm.io/)
- **Caching & Queue:** Redis (`cache-manager`, `BullMQ`)
- **Real-time:** [Socket.io](https://socket.io/)

### Ecosystem & Tools
- **Authentication:** JWT, HttpOnly Cookies, Bcrypt
- **Background Jobs:** `@nestjs/bullmq` & [BullBoard](https://github.com/felixmosh/bull-board) (Monitoring UI)
- **Communications:** `@nestjs-modules/mailer` (Nodemailer, Handlebars templates)
- **Bảo mật:** `@nestjs/throttler` (Rate limiting), `cookie-parser`
- **Tài liệu API:** Swagger (`@nestjs/swagger`)
- **Validation:** `class-validator`, `class-transformer`

---

## ✨ Tính năng chính

### 🔐 Authentication & Authorization
- Đăng ký/Đăng nhập an toàn với mã hóa Bcrypt.
- Xác thực Stateless qua JWT lưu tại HttpOnly Cookies.
- Quản lý Profile, Avatar và phân quyền người dùng.

### 📝 Blog Management
- CRUD bài viết, quản lý Danh mục (Categories).
- Tìm kiếm Full-text, lọc bài viết theo tags/categories, phân trang.
- Tracking bài viết Trending và lượt xem thời gian thực qua Redis.

### 👥 Social Features
- **Hệ thống Follow:** Người dùng có thể theo dõi lẫn nhau.
- **Tương tác:** Bình luận (Nested comments), Like, Save bài viết.
- **Profile công khai:** Xem thông tin và bài viết của các tác giả khác.

### 🔔 Notifications & Real-time
- Thông báo thời gian thực qua **Socket.io** khi có người follow, comment hoặc bài viết mới.
- Xử lý gửi Email thông báo (OTP, Welcome) qua hàng đợi **BullMQ** để đảm bảo hiệu suất.

### ⚙️ System Excellence
- **Global Interceptors:** Chuẩn hóa định dạng Response trả về.
- **Global Filters:** Xử lý lỗi toàn cục chuyên nghiệp.
- **Audit Logs:** Tự động ghi nhận người tạo/cập nhật dữ liệu.
- **Monitoring:** Dashboard BullBoard để theo dõi trạng thái background jobs.

---

## 📂 Cấu trúc Module

- `AuthModule`: Quản lý định danh và bảo mật.
- `UsersModule`: Quản trị người dùng & Following system.
- `BlogModule`: Quản lý nội dung bài viết.
- `CommentModule`: Hệ thống thảo luận & tương tác.
- `NotificationsModule`: Xử lý Socket.io và logic thông báo.
- `MailModule`: Xử lý template và gửi mail qua queue.
- `CommonModule`: Chứa các utilities, decorators, interceptors dùng chung.

---

## 💻 Hướng dẫn cài đặt

### 1. Yêu cầu hệ thống
- **Node.js** (v20+ recommended)
- **MySQL 8**
- **Redis**
- **pnpm** (preferred) hoặc `npm`

### 2. Cài đặt & Chạy local

```bash
# Clone và cài đặt
cd blog_be
npm install

# Tạo file .env từ .env.example (nếu có) hoặc cấu hình theo yêu cầu
# Chạy ở chế độ phát triển
npm run start:dev
```

### 3. Docker (Khuyên dùng)
Dự án đã được container hóa hoàn toàn, chỉ cần một lệnh duy nhất:

```bash
docker-compose up --build
```
*Lệnh này sẽ khởi tạo đồng thời: MySQL, Redis, Backend và Frontend.*

---

## 📖 Tài liệu & Monitoring

- **Swagger UI:** `http://localhost:3000/api`
- **BullBoard UI:** `http://localhost:3000/admin/queues` (Theo dõi hàng đợi)

---

## 📜 Quy ước phát triển

- Sử dụng **DTO** cho mọi dữ liệu input.
- Áp dụng **Custom Decorators** (`@CurrentUser`, `@Public`) để code tường minh.
- Mọi logic background job phải được đẩy vào `BullMQ`.

---
*Backend engine powering the Foxtek Community.*

