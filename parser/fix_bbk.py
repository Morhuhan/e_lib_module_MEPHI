#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
fix_bbk.py — нормализация кодов ББК.
"""

from typing import Dict, List, Tuple
import sys
import re
import psycopg2

# Регулярное выражение для разделения кодов ББК по внешним разделителям
_SPLIT_CODES_RE = re.compile(r'[;,]\s*|\s{2,}')
# Регулярное выражение для разделения субполей внутри строки
_SUBFIELD_SPLIT_RE = re.compile(r'[A-Z]')
# Регулярное выражение для удаления префиксов субполей (A, B, C и т.д.)
_SUBFIELD_PREFIX_RE = re.compile(r'^[A-Z]\s*')
# Регулярное выражение для удаления однобуквенных префиксов (A, B, G и т.д.) в начале
_PREFIX_RE = re.compile(r'^[A-Z]\s*')

def load_bbk_map(cur) -> Dict[str, int]:
    cur.execute("SELECT id, bbk_abb FROM public.bbk;")
    # ключи в UPPER для регистронезависимого поиска
    return {code.upper(): _id for _id, code in cur.fetchall()}

def filter_links(
    pairs: List[Tuple[int, str]], bbk_map: Dict[str, int]
) -> Tuple[List[Tuple[int, int]], int]:
    links, skipped = [], 0
    for book_id, code in pairs:
        bbk_id = bbk_map.get(code.upper())
        if bbk_id:
            links.append((book_id, bbk_id))
        else:
            skipped += 1
    return links, skipped

def collect(pairs: List[Tuple[str, str]]) -> List[str]:
    """
    Собирает и нормализует коды ББК из полей 606 и 610.
    Args:
        pairs: Список кортежей (тег, содержимое), где тег — '606' или '610'.
    Returns:
        Список нормализованных кодов ББК.
    """
    codes = []
    for tag, content in pairs:
        if tag not in ('606', '610'):
            continue
        # Разделяем содержимое на коды по внешним разделителям
        for code in _SPLIT_CODES_RE.split(content.strip()):
            code = code.strip()
            if not code:
                continue
            # Разделяем код на субполя (например, Техническая МеханикаBтеоретическая Механика)
            subfields = _SUBFIELD_SPLIT_RE.split(code)
            for subfield in subfields:
                subfield = subfield.strip()
                if not subfield:
                    continue
                # Удаляем префикс субполя (например, B)
                subfield = _SUBFIELD_PREFIX_RE.sub('', subfield).strip()
                # Удаляем однобуквенный префикс (например, A, G)
                subfield = _PREFIX_RE.sub('', subfield).strip()
                if not subfield:
                    continue
                # Удаляем скобки с содержимым, например, (ЕТГС)
                subfield = re.sub(r'\([^)]*\)', '', subfield).strip()
                # Приводим к формату Title Case
                subfield = subfield.title()
                if subfield:
                    codes.append(subfield)
    return codes

def _cli(dsn: str) -> None:
    with psycopg2.connect(dsn) as conn, conn.cursor() as cur:
        bbk_map = load_bbk_map(cur)
        cur.execute("SELECT book_id, bbk_code FROM public.book_bbk_raw;")
        raw_pairs = cur.fetchall()

        links, skipped = filter_links(raw_pairs, bbk_map)
        print(f"Всего пар RAW : {len(raw_pairs)}")
        print(f"Совпали       : {len(links)}")
        print(f"Пропущены     : {skipped}")

if __name__ == "__main__":
    if len(sys.argv) != 2:
        sys.exit("Использование: python fix_bbk.py \"<строка-DSN>\"")
    _cli(sys.argv[1])