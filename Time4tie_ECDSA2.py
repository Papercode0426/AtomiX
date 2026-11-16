import hashlib
import random
import time
from ecdsa.curves import SECP256k1

G = SECP256k1.generator
n = SECP256k1.order


def is_point(obj):
    """True for both Point and PointJacobi (any object with x()/y() methods)."""
    return (
        hasattr(obj, "x") and hasattr(obj, "y")
        and callable(getattr(obj, "x", None))
        and callable(getattr(obj, "y", None))
    )


def to_affine(P):
    """Return an affine Point (works for both Point and PointJacobi)."""
    if hasattr(P, "to_affine"):
        return P.to_affine()
    return P


def point_to_bytes(P):
    """Serialize a curve point as 64 bytes (x || y). Works for Jacobi too."""
    return P.x().to_bytes(32, "big") + P.y().to_bytes(32, "big")


def H(*args):
    """SHA256 over concatenated arguments, reduced mod n."""
    h = hashlib.sha256()
    for arg in args:
        if is_point(arg):
            h.update(point_to_bytes(arg))
        elif isinstance(arg, int):
            h.update(arg.to_bytes(32, "big"))
        elif isinstance(arg, bytes):
            h.update(arg)
        else:
            raise TypeError(f"Unsupported type: {type(arg)}")
    return int.from_bytes(h.digest(), "big") % n


def ecdsa_sign(x, m):
    """Custom ECDSA signing; returns (R, y, r, h, s, k)."""
    y = x * G
    while True:
        k = random.randrange(1, n)
        R = k * G
        r = R.x() % n
        if r == 0:
            continue
        h = H(R, y, m)
        s = (pow(k, -1, n) * (h + x * r)) % n
        if s == 0:
            continue
        return R, y, r, h, s, k


def zkp_generate(g0, g1, y0, y1, x):
    """ZKP for log_{g0}(y0) = log_{g1}(y1) = x. Returns (u, v)."""
    w = random.randrange(1, n)
    t0 = w * g0
    t1 = w * g1
    u = H(g0, g1, y0, y1, t0, t1)
    v = (w - u * x) % n
    return u, v


def zkp_verify(g0, g1, y0, y1, u, v):
    """Verify the ZKP (u, v)."""
    T0 = v * g0 + u * y0
    T1 = v * g1 + u * y1
    u_check = H(g0, g1, y0, y1, T0, T1)
    return u_check == u


def main():
    m0 = b"message0"
    m1 = b"message1"
    x0 = random.randrange(1, n)
    x1 = random.randrange(1, n)

    # Two ECDSA signatures
    R0, y0, r0, h0, s0, k0 = ecdsa_sign(x0, m0)
    R1, y1, r1, h1, s1, k1 = ecdsa_sign(x1, m1)

    # Merge signatures
    tau = (s0 + s1) % n
    c0 = h0 * G + r0 * y0
    c1 = tau * R1 + ((-h1) % n) * G + ((-r1) % n) * y1

    # ZKP witness
    x_zkp = (k1 * pow(k0, -1, n)) % n

    # Sanity checks (convert to affine first for reliable comparison)
    c0_aff = to_affine(c0)
    c1_aff = to_affine(c1)
    lhs_c = to_affine(x_zkp * c0_aff)
    assert c1_aff.x() == lhs_c.x() and c1_aff.y() == lhs_c.y(), "c1 != x*c0"

    R0_aff = to_affine(R0)
    R1_aff = to_affine(R1)
    lhs_r = to_affine(x_zkp * R0_aff)
    assert R1_aff.x() == lhs_r.x() and R1_aff.y() == lhs_r.y(), "R1 != x*R0"

    # ZKP inputs:  prove log_{c0}(c1) = log_{R0}(R1) = k1 * k0^{-1}
    g0, g1 = c0_aff, R0_aff
    y0_zkp, y1_zkp = c1_aff, R1_aff

    start = time.perf_counter()
    u, v = zkp_generate(g0, g1, y0_zkp, y1_zkp, x_zkp)
    gen_time = time.perf_counter() - start

    start = time.perf_counter()
    valid = zkp_verify(g0, g1, y0_zkp, y1_zkp, u, v)
    ver_time = time.perf_counter() - start

    print(f"ZKP generation time: {gen_time:.6f} seconds")
    print(f"ZKP verification time: {ver_time:.6f} seconds")
    print(f"Verification result: {valid}")


if __name__ == "__main__":
    main()