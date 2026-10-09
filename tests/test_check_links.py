from __future__ import annotations

import tempfile
import unittest
from pathlib import Path

from scripts.check_links import validate


class LinkCheckerTests(unittest.TestCase):
    def setUp(self) -> None:
        self.temporary_directory = tempfile.TemporaryDirectory()
        self.root = Path(self.temporary_directory.name)
        (self.root / "dosyalar").mkdir()
        (self.root / "etkilesimli").mkdir()
        (self.root / "dosyalar" / "gecerli.pdf").write_bytes(b"%PDF-1.4\n")
        (self.root / "dosyalar" / "BuyukHarf.pdf").write_bytes(b"%PDF-1.4\n")
        (self.root / "etkilesimli" / "sunum.html").write_text(
            '<!doctype html><html><body id="sunum"></body></html>', encoding="utf-8"
        )

    def tearDown(self) -> None:
        self.temporary_directory.cleanup()

    def write_index(self, links: str) -> None:
        (self.root / "index.html").write_text(
            f'<!doctype html><html><body id="bolum">{links}</body></html>', encoding="utf-8"
        )

    def issue_kinds(self) -> list[str]:
        issues, _, _ = validate(self.root)
        return [issue.kind for issue in issues]

    def test_valid_pdf_link(self) -> None:
        self.write_index('<a href="dosyalar/gecerli.pdf">PDF</a>')
        self.assertEqual([], self.issue_kinds())

    def test_missing_pdf_link(self) -> None:
        self.write_index('<a href="dosyalar/eksik.pdf">PDF</a>')
        self.assertEqual(["MISSING_FILE"], self.issue_kinds())

    def test_case_mismatch(self) -> None:
        self.write_index('<a href="dosyalar/buyukharf.pdf">PDF</a>')
        self.assertEqual(["CASE_MISMATCH"], self.issue_kinds())

    def test_valid_interactive_html_link(self) -> None:
        self.write_index('<a href="etkilesimli/sunum.html">Sunum</a>')
        self.assertEqual([], self.issue_kinds())

    def test_external_youtube_link(self) -> None:
        self.write_index('<a href="https://www.youtube.com/watch?v=123">Video</a>')
        self.assertEqual([], self.issue_kinds())

    def test_page_anchor(self) -> None:
        self.write_index('<a href="#bolum">Bölüm</a>')
        self.assertEqual([], self.issue_kinds())

    def test_missing_page_anchor(self) -> None:
        self.write_index('<a href="#olmayan">Bölüm</a>')
        self.assertEqual(["MISSING_ANCHOR"], self.issue_kinds())

    def test_url_encoded_path_and_root_path(self) -> None:
        (self.root / "dosyalar" / "kodlu ad.pdf").write_bytes(b"%PDF-1.4\n")
        self.write_index('<a href="/dosyalar/kodlu%20ad.pdf?indir=1">PDF</a>')
        self.assertEqual([], self.issue_kinds())


if __name__ == "__main__":
    unittest.main()
