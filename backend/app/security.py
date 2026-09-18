"""Hash de contraseñas para la tabla 'users'. Usa pbkdf2_hmac (stdlib, sin
dependencias nuevas): sal aleatoria por usuario + 200k iteraciones de SHA-256,
formato de almacenamiento 'salt_hex$hash_hex'."""
import hashlib
import hmac
import secrets

_ITERATIONS = 200_000


def hash_password(password: str) -> str:
    salt = secrets.token_hex(16)
    derived = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), bytes.fromhex(salt), _ITERATIONS)
    return f"{salt}${derived.hex()}"


def verify_password(password: str, password_hash: str) -> bool:
    try:
        salt, derived_hex = password_hash.split("$", 1)
    except ValueError:
        return False
    derived = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), bytes.fromhex(salt), _ITERATIONS)
    return hmac.compare_digest(derived.hex(), derived_hex)
