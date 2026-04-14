from fastapi import Depends, HTTPException
from fastapi.security import HTTPAuthorizationCredentials , HTTPBearer
from jose import jwt, JWTError

SECRET_KEY = "supersecretkey"
ALGORITHM = "HS256"
security = HTTPBearer()

def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    token = credentials.credentials
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id= payload.get("user_id")
        return user_id
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid token or expired token")         