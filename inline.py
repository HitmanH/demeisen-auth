#!/usr/bin/env python3
"""Inline js/demeisen-auth.js (at a git ref) into a single-file web page, between the lines
<!-- demeisen-auth:begin --> and <!-- demeisen-auth:end -->. For apps deployed as one HTML file.
Usage: python3 inline.py <ref> <page.html>"""
import os, re, subprocess, sys
ref, page = sys.argv[1], sys.argv[2]
here = os.path.dirname(os.path.abspath(__file__))
js = subprocess.check_output(["git", "-C", here, "show", f"{ref}:js/demeisen-auth.js"], text=True)
rev = subprocess.check_output(["git", "-C", here, "rev-parse", "--short", ref], text=True).strip()
html = open(page, encoding="utf-8").read()
block = f"<!-- demeisen-auth:begin -->\n<!-- Demeisen Auth @ {rev}: do not edit here; run demeisen-auth/inline.py -->\n<script>\n{js.strip()}\n</script>\n<!-- demeisen-auth:end -->"
new, n = re.subn(r"<!-- demeisen-auth:begin -->[\s\S]*?<!-- demeisen-auth:end -->", lambda m: block, html)
if n != 1: sys.exit("markers not found (add <!-- demeisen-auth:begin --> and <!-- demeisen-auth:end --> to the page)")
open(page, "w", encoding="utf-8").write(new); print(f"Demeisen Auth {rev} inlined into {page}")
