message="eyJhbGciOiJSUzI1NiIsImtpZCI6ImM3ZTA0NDY1NjQ5ZmZhNjA2NTU3NjUwYzdlNjVmMGE4N2FlMDBmZTgiLCJ0eXAiOiJKV1QifQ.eyJpc3MiOiJodHRwczovL2FjY291bnRzLmdvb2dsZS5jb20iLCJhenAiOiIzMjEyOTQ2MTk3NzYtcGtybnFkaThyYTZndnN1MmZxZjdrN2VidDE3Nmlvc28uYXBwcy5nb29nbGV1c2VyY29udGVudC5jb20iLCJhdWQiOiIzMjEyOTQ2MTk3NzYtcGtybnFkaThyYTZndnN1MmZxZjdrN2VidDE3Nmlvc28uYXBwcy5nb29nbGV1c2VyY29udGVudC5jb20iLCJzdWIiOiIxMTI5NTIzNjA2NzQyMDUxNjM0MzkiLCJub25jZSI6ImNhOTc4MTEyY2ExYmJkY2FmYWMyMzFiMzlhMjNkYzRkYTc4NmVmZjgxNDdjNGU3MmI5ODA3Nzg1YWZlZTQ4YmIiLCJuYmYiOjE3NDQ2NDMxNDQsImlhdCI6MTc0NDY0MzQ0NCwiZXhwIjoxNzQ0NjQ3MDQ0LCJqdGkiOiI2ZmY3YThhMjRhOTUwMTk3Y2EzOTBlOGM5NTgyZTQ2MzQwMjkyZjZhIn0.n7dc-8FjreyQ-vNzNCIKNxuWerQK9s5B39OGRRWGzflCjUTPFvRZurUsR0xPnLY0V4EwR1klcrvyamVlFRycy2t3Nia3-2uMtRfF4qzxcBNs6V5gf8fl0u5yhNC5Sx2Rry3ksSU4mgMIUlqNk04z9ZDqsEOSflgzMe2gR-RooySRAXNEQzeI6G1vsKNF15JE4wh31OC3HSRgo5QrUr6e26sqZLQnazj21Exh4qvRSJkd-WwnHmYqJXcJYKgobsstlpVdMUEk7e0-Uk-b59YMmCTbIAZ1HCNaqTQ3YdiMHgdVC-Ecmzp_F9kJwCj34LS9Xy-h-uygTIEJRq0RJ31JIQ"
message = bytearray(message, 'utf-8') # convert to bytearray
length = len(message) * 8 # len(message) is number of BYTES!!!
print(length)
message.append(0x80)
while (len(message) * 8 + 64) % 512 != 0:
    message.append(0x00)

message += length.to_bytes(8, 'big') # pad to 8 bytes or 64 bits
print([i for i in message]) # print the byte array as a list of integers
assert (len(message) * 8) % 512 == 0, "Padding did not complete properly!"

# Parsing
blocks = [] # contains 512-bit chunks of message
for i in range(0, len(message), 64): # 64 bytes is 512 bits
    blocks.append(message[i:i+64])
