from ecpy.curves import Curve
from ecpy.keys import ECPublicKey, ECPrivateKey
from sha3 import keccak_256

private_key = 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80

cv = Curve.get_curve('secp256k1')
pv_key = ECPrivateKey(private_key, cv)
pu_key = pv_key.get_public_key()

concat_x_y = pu_key.W.x.to_bytes(32, byteorder='big') + pu_key.W.y.to_bytes(32, byteorder='big')
eth_addr = '0x' + keccak_256(concat_x_y).digest()[-20:].hex()

# Gen ephemeral keypair 
print(private_key)
print('private key: ', hex(private_key))
print('public key: ', concat_x_y.hex())
print('eth_address: ', eth_addr)
##############################################################################################################################
import base64
a="eyJpc3MiOiJodHRwczovL2FjY291bnRzLmdvb2dsZS5jb20iLCJhenAiOiIzMjEyOTQ2MTk3NzYtcGtybnFkaThyYTZndnN1MmZxZjdrN2VidDE3Nmlvc28uYXBwcy5nb29nbGV1c2VyY29udGVudC5jb20iLCJhdWQiOiIzMjEyOTQ2MTk3NzYtcGtybnFkaThyYTZndnN1MmZxZjdrN2VidDE3Nmlvc28uYXBwcy5nb29nbGV1c2VyY29udGVudC5jb20iLCJzdWIiOiIxMTI5NTIzNjA2NzQyMDUxNjM0MzkiLCJub25jZSI6ImNhOTc4MTEyY2ExYmJkY2FmYWMyMzFiMzlhMjNkYzRkYTc4NmVmZjgxNDdjNGU3MmI5ODA3Nzg1YWZlZTQ4YmIiLCJuYmYiOjE3NDU2MDY3NTgsImlhdCI6MTc0NTYwNzA1OCwiZXhwIjoxNzQ1NjEwNjU4LCJqdGkiOiIzYmE4ZmQ2MTc1MzhjOWEwMmNkZmFjMGE2NTkyNjUxOGVkZjZjYzFkIn0=="
a=base64.b64decode(a)
print(a.index(b"\"nonce"))
print(a[229:])
print(len("ca978112ca1bbdcafac231b39a23dc4da786eff8147c4e72b9807785afee48bb"))
##############################################################################################################################
import base64
from Crypto.Util.number import long_to_bytes, bytes_to_long
# eyJhbGciOiJSUzI1NiIsImtpZCI6ImM3ZTA0NDY1NjQ5ZmZhNjA2NTU3NjUwYzdlNjVmMGE4N2FlMDBmZTgiLCJ0eXAiOiJKV1QifQ.eyJpc3MiOiJodHRwczovL2FjY291bnRzLmdvb2dsZS5jb20iLCJhenAiOiIzMjEyOTQ2MTk3NzYtcGtybnFkaThyYTZndnN1MmZxZjdrN2VidDE3Nmlvc28uYXBwcy5nb29nbGV1c2VyY29udGVudC5jb20iLCJhdWQiOiIzMjEyOTQ2MTk3NzYtcGtybnFkaThyYTZndnN1MmZxZjdrN2VidDE3Nmlvc28uYXBwcy5nb29nbGV1c2VyY29udGVudC5jb20iLCJzdWIiOiIxMTI5NTIzNjA2NzQyMDUxNjM0MzkiLCJub25jZSI6ImNhOTc4MTEyY2ExYmJkY2FmYWMyMzFiMzlhMjNkYzRkYTc4NmVmZjgxNDdjNGU3MmI5ODA3Nzg1YWZlZTQ4YmIiLCJuYmYiOjE3NDQ2NDMxNDQsImlhdCI6MTc0NDY0MzQ0NCwiZXhwIjoxNzQ0NjQ3MDQ0LCJqdGkiOiI2ZmY3YThhMjRhOTUwMTk3Y2EzOTBlOGM5NTgyZTQ2MzQwMjkyZjZhIn0.n7dc-8FjreyQ-vNzNCIKNxuWerQK9s5B39OGRRWGzflCjUTPFvRZurUsR0xPnLY0V4EwR1klcrvyamVlFRycy2t3Nia3-2uMtRfF4qzxcBNs6V5gf8fl0u5yhNC5Sx2Rry3ksSU4mgMIUlqNk04z9ZDqsEOSflgzMe2gR-RooySRAXNEQzeI6G1vsKNF15JE4wh31OC3HSRgo5QrUr6e26sqZLQnazj21Exh4qvRSJkd-WwnHmYqJXcJYKgobsstlpVdMUEk7e0-Uk-b59YMmCTbIAZ1HCNaqTQ3YdiMHgdVC-Ecmzp_F9kJwCj34LS9Xy-h-uygTIEJRq0RJ31JIQ
sig = b'P8TEBqbqOvztZ0wXY3h9jmGzJSzJ95fr-D23uURK-R3IOcXbllw-v9ub7kqkNqQTL-kV102HOdGNB-iU-yqUu2VLtU4ab2i6u4kh3Ey4bt8Uv72hS5ssxZhkRtxwrqSH6dh3Bl9VfX51Wg64EOy3FaP3i-WaWZIiWPXJ8e6gIcnChiMomBcMY3urp_5V_ce_f2HU7JjNkeQZxX3SbEw8EYksMsEbgL_Sk_ozdDF5uRQ5grwqH3eBVYTaKF2e6K_SPCOZOHXn4B8wbHYOj9YUQRsoqdBtH8cndZ58DQg6nM0lnIVt68ZS-1YF_9wqskuPm_ISaFwoNlnp-5Jiag5Zkw=='
sig = bytes_to_long(base64.urlsafe_b64decode(sig))
print(sig.bit_length())
s=[]
for i in range(32):
    s.append((sig>>(i*64)) % 2**64)
print([str(i) for i in s])

# kid 23f7a3583796f97129e5418f9b2136fcc0a96462
pubmod=b'jb7Wtq9aDMpiXvHGCB5nrfAS2UutDEkSbK16aDtDhbYJhDWhd7vqWhFbnP0C_XkSxsqWJoku69y49EzgabEiUMf0q3X5N0pNvV64krviH2m9uLnyGP5GMdwZpjTXARK9usGgYZGuWhjfgTTvooKDUdqVQYvbrmXlblkM6xjbA8GnShSaOZ4AtMJCjWnaN_UaMD_vAXvOYj4SaefDMSlSoiI46yipFdggfoIV8RDg1jeffyre_8DwOWsGz7b2yQrL7grhYCvoiPrybKmViXqu-17LTIgBw6TDk8EzKdKzm33_LvxU7AKs3XWW_NvZ4WCPwp4gr7uw6RAkdDX_ZAn0TQ=='
pubmod = bytes_to_long(base64.urlsafe_b64decode(pubmod))
print(pubmod.bit_length())
s=[]
for i in range(32):
    s.append((pubmod>>(i*64)) % 2**64)
print([str(i) for i in s])
