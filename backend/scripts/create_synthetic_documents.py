"""Generate a harmless PDF and PNG for upload testing; no patient data or OCR."""

import struct
import zlib
from pathlib import Path


def pdf_bytes() -> bytes:
    content = b"BT /F1 18 Tf 40 750 Td (SYNTHETIC - NOT CLINICAL) Tj ET"
    objects = [
        b"<< /Type /Catalog /Pages 2 0 R >>",
        b"<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
        b"<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>",
        b"<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
        f"<< /Length {len(content)} >>\nstream\n".encode() + content + b"\nendstream",
    ]
    result = b"%PDF-1.4\n"
    offsets = [0]
    for index, obj in enumerate(objects, 1):
        offsets.append(len(result))
        result += f"{index} 0 obj\n".encode() + obj + b"\nendobj\n"
    xref = len(result)
    result += f"xref\n0 {len(offsets)}\n0000000000 65535 f \n".encode()
    result += b"".join(f"{offset:010d} 00000 n \n".encode() for offset in offsets[1:])
    result += (
        f"trailer\n<< /Size {len(offsets)} /Root 1 0 R >>\nstartxref\n{xref}\n%%EOF\n".encode()
    )
    return result


def png_bytes() -> bytes:
    def chunk(kind, data):
        return (
            struct.pack(">I", len(data)) + kind + data + struct.pack(">I", zlib.crc32(kind + data))
        )

    return (
        b"\x89PNG\r\n\x1a\n"
        + chunk(b"IHDR", struct.pack(">IIBBBBB", 1, 1, 8, 2, 0, 0, 0))
        + chunk(b"tEXt", b"Description\0SYNTHETIC - NOT CLINICAL")
        + chunk(b"IDAT", zlib.compress(b"\0\xff\xff\xff"))
        + chunk(b"IEND", b"")
    )


if __name__ == "__main__":
    folder = Path("storage/synthetic")
    folder.mkdir(parents=True, exist_ok=True)
    (folder / "demo-synthetic.pdf").write_bytes(pdf_bytes())
    (folder / "demo-synthetic.png").write_bytes(png_bytes())
    print("Created storage/synthetic/demo-synthetic.pdf and demo-synthetic.png")
