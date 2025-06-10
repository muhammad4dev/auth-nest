# Secure Nest.js Authentication API

This project provides a production-ready foundation for handling user authentication. It uses JSON Web Tokens (JWTs) stored in `HttpOnly` cookies and features a full suite of security best practices, including refresh token rotation and active session management.

The primary database ORM used is [MikroORM](https://mikro-orm.io/ "null") with a SQLite driver, making it easy to get started while being configurable for production databases like PostgreSQL or MySQL.

## ✨ Features

- **Secure User Registration & Login:** Passwords are never stored in plaintext, using strong hashing via `bcryptjs`.
- **JWT-Based Authentication:** Utilizes a secure two-token system:

  - **Short-Lived Access Tokens (15m):** Used for frequent API access, minimizing the risk of token theft.
  - **Long-Lived Refresh Tokens (7d):** Used securely and infrequently only to obtain new access tokens.

- **`HttpOnly` Cookie Storage:** Tokens are stored in secure `HttpOnly` cookies, which are inaccessible to client-side JavaScript, protecting them from XSS attacks.
- **Refresh Token Rotation:** Each time a refresh token is used, it is invalidated and a new one is issued. This prevents token replay attacks and helps detect potential token theft.
- **Strict Session Management:**

  - **Single Active Session:** A new login invalidates all previous sessions for that user, ensuring only the most recent login is active. This is a strong security default.
  - **Active Session Management:** Provides endpoints for users to view and manage all their active sessions (device, IP, last used) and revoke any they don't recognize.

- **Database Integration:** Uses **MikroORM** for elegant and powerful database interaction with a repository pattern.
- **Configuration Driven:** All sensitive information (`JWT_SECRET`, `DATABASE_URL`, etc.) and environment-specific settings are managed through a `.env` file.
- **Validation:** Employs DTOs (`Data Transfer Objects`) and `class-validator` for robust, type-safe request body validation.

## 🏛️ Architecture & Design Patterns

This project is built following modern software design principles to ensure it is scalable, maintainable, and testable.

- **Modular Architecture:** The entire authentication system is encapsulated within a self-contained `AuthModule`, making the codebase organized and easy to navigate.
- **Layered Architecture (Separation of Concerns):**

  - **Controllers:** Handle incoming HTTP requests and responses. They delegate business logic to services and are the entry point to the API.
  - **Services:** Contain the core business logic. They are responsible for tasks like creating users, generating tokens, and validating credentials.
  - **Repositories:** Abstract database communication via MikroORM's `EntityRepository`.

- **Dependency Injection (DI):** Leverages Nest.js's built-in DI container for loosely coupled and easily testable components.
- **Strategy Pattern:** Uses `passport-jwt` to create a `JwtStrategy` for validating tokens, making the authentication logic pluggable and easy to swap or extend.
- **Data Transfer Object (DTO) Pattern:** Employs `CreateUserDto` and `LoginUserDto` for type-safe and validated data transfer between the client and server.
- **Decorator Pattern:** Uses decorators (`@Controller`, `@Injectable`, `@UseGuards`, etc.) extensively to add functionality to classes and methods in a declarative way.

## 📁 Project Structure

```
src
├── auth
│   ├── decorators
│   ├── dto
│   ├── entities
│   ├── guards
│   ├── strategies
│   ├── auth.controller.ts
│   ├── auth.module.ts
│   └── auth.service.ts
├── config
├── app.module.ts
└── main.ts

```

## Endpoints

| Method   | Endpoint                  | Protection          | Description                                                         |
| -------- | ------------------------- | ------------------- | ------------------------------------------------------------------- |
| `POST`   | `/api/auth/register`      | Public              | Registers a new user.                                               |
| `POST`   | `/api/auth/login`         | Public              | Logs in a user, returning tokens as `HttpOnly` cookies.             |
| `POST`   | `/api/auth/logout`        | _JWT_               | Logs out the user by invalidating their current refresh token.      |
| `POST`   | `/api/auth/refresh-token` | **_Refresh Token_** | Issues a new access/refresh token. Requires a valid refresh cookie. |
| `GET`    | `/api/auth/me`            | _JWT_               | Retrieves the profile of the currently authenticated user.          |
| `GET`    | `/api/auth/sessions`      | _JWT_               | Retrieves a list of all active sessions for the current user.       |
| `DELETE` | `/api/auth/sessions/:id`  | _JWT_               | Revokes a specific session by its ID.                               |

## 🚀 Getting Started

Follow these instructions to get a copy of the project up and running on your local machine.

### Prerequisites

- [Node.js](https://nodejs.org/ "null") (v16 or later recommended)
- [npm](https://www.npmjs.com/ "null") or [yarn](https://yarnpkg.com/ "null")

### 1. Installation

Clone the repository and install the dependencies.

```
# Clone the repository
git clone <your-repository-url>
cd <repository-folder>

# Install dependencies
npm install

```

### 2. Environment Configuration

The application requires a `.env` file in the root of the project. You can create one by copying the example file.

```
cp .env.example .env
```

Now, open the `.env` file and set your variables. **It is critical to generate strong, unique secrets.**

```
# .env

# --- Server Config ---
PORT=5000
NODE_ENV=development # or production
CLIENT_URL=http://localhost:3000 # Your React/Vue/etc. frontend URL

# --- JWT Secrets ---
# Generate strong random strings for these (e.g., using `openssl rand -hex 32` in your terminal)
JWT_ACCESS_SECRET=your_super_strong_jwt_access_secret
JWT_REFRESH_SECRET=your_super_strong_jwt_refresh_secret

```

### 3. Database Setup

This project uses SQLite, so no external database server is required.

**For Development:** When you first run the application, MikroORM will automatically create the `database.sqlite` file and generate the necessary tables based on your entities.

**For Production:** In a production environment, you should use migrations to manage database schema changes safely.

1.  **Create a new migration:**

    ```
    npx mikro-orm migration:create
    ```

2.  **Apply all pending migrations:**

    ```
    npx mikro-orm migration:up
    ```

### 4. Running the Application

- **Development Mode (with hot-reloading):**

  ```
  npm run start:dev
  ```

  The server will be available at `http://localhost:5000`.

- **Production Mode:** First, build the application:

  ```
  npm run build
  ```

  Then, start the optimized server:

  ```
  npm run start:prod
  ```

## 📝 Frontend Integration Notes

If you are building a frontend client for this API, remember these key points:

- **CORS:** Ensure your frontend URL is correctly set in the `CLIENT_URL` variable in the `.env` file.
- **Cookies:** Your HTTP client (e.g., Axios, fetch) **must** be configured to send credentials with requests. This enables the browser to automatically handle the `HttpOnly` cookies.

  - **For Axios:** `axios.defaults.withCredentials = true;`
  - **For Fetch API:** `fetch(url, { credentials: 'include' });`

## 💡 Next Steps

- **Add Rate Limiting:** Implement a rate limiter (e.g., `nestjs-rate-limiter`) on sensitive endpoints like `/login` and `/register` to prevent brute-force attacks.
- **Implement Email Verification:** Add a flow where users must verify their email address after registration.
- **Add "Forgot Password" Flow:** Implement a secure password reset mechanism using signed URLs or one-time codes sent via email.
- **Switch to a Production Database:** Update the `mikro-orm.config.ts` to use PostgreSQL or MySQL for production deployments.
