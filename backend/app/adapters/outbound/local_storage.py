from pathlib import Path


class LocalDocumentStorage:
    def __init__(self, root: Path):
        self.root = root.resolve()

    def _path(self, object_key: str) -> Path:
        path = (self.root / object_key).resolve()
        if not path.is_relative_to(self.root) or path == self.root:
            raise ValueError("Invalid storage key")
        return path

    def save(self, object_key: str, content: bytes) -> None:
        path = self._path(object_key)
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_bytes(content)

    def read(self, object_key: str) -> bytes:
        return self._path(object_key).read_bytes()
