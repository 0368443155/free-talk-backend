# Cách Test API Register/Login

## Cách 1: Dùng PowerShell (Windows)

### Register User

```powershell
# PowerShell
$body = @{
    email = "test@example.com"
    username = "testuser"
    password = "test123456"
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://localhost:3000/api/v1/auth/register" `
    -Method Post `
    -ContentType "application/json" `
    -Body $body
```

### Login

```powershell
$body = @{
    email = "test@example.com"
    password = "test123456"
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://localhost:3000/api/v1/auth/login" `
    -Method Post `
    -ContentType "application/json" `
    -Body $body
```

## Cách 2: Dùng curl (nếu đã cài)

### Register User

```bash
curl -X POST http://localhost:3000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "username": "testuser",
    "password": "test123456"
  }'
```

### Login

```bash
curl -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "test123456"
  }'
```

## Cách 3: Dùng Postman/Insomnia

1. **Method:** POST
2. **URL:** `http://localhost:3000/api/v1/auth/register`
3. **Headers:**
   - `Content-Type: application/json`
4. **Body (raw JSON):**
```json
{
  "email": "test@example.com",
  "username": "testuser",
  "password": "test123456"
}
```

## Cách 4: Dùng VS Code REST Client Extension

Tạo file `test-api.http`:

```http
### Register User
POST http://localhost:3000/api/v1/auth/register
Content-Type: application/json

{
  "email": "test@example.com",
  "username": "testuser",
  "password": "test123456"
}

### Login
POST http://localhost:3000/api/v1/auth/login
Content-Type: application/json

{
  "email": "test@example.com",
  "password": "test123456"
}
```

## Cách 5: Dùng Browser (chỉ GET requests)

Không thể dùng browser để POST, nhưng có thể test GET:

```
http://localhost:3000/api/v1/auth/me
```

## Expected Response

### Register Success

```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "uuid-here",
    "email": "test@example.com",
    "username": "testuser",
    "role": "student",
    "credit_balance": 0,
    "created_at": "2025-11-25T...",
    "updated_at": "2025-11-25T..."
  }
}
```

### Login Success

```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "uuid-here",
    "email": "test@example.com",
    "username": "testuser",
    "role": "student"
  }
}
```

