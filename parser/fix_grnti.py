#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
fix_grnti.py — нормализация кодов ГРНТИ и сопоставление их со справочником
public.grnti.

Обновление 2025-06-19 (v2.0)
───────────────────────────
• Функциональность совпадает с fix_udc.py: возвращаются только валидные
  (book_id, grnti_id) для вставки в book_grnti, плюс счётчик пропусков.
• Поведение модуля не изменилось, поэтому его публичный API остался
  тем же — parse_irbis_file.py остаётся совместимым.

Схема работы:
1. _normalize_code()  — приводит сырые значения из #964 к формату XX.YY.ZZ.
2. load_grnti_map()   — загружает справочник public.grnti в память.
3. filter_links()     — фильтрует (book_id, raw_code), возвращая
                        a) links  — совпавшие пары для book_grnti
                        b) skipped — сколько строк не сопоставилось.
"""

from __future__ import annotations
from typing import Dict, List, Tuple
import re
import sys
import psycopg2


# ────────────────────────────────
# 1. Нормализация кода
# ────────────────────────────────
_CLEAN_RE = re.compile(r"[^0-9.]")           # всё, кроме цифр и точек


def _normalize_code(code: str) -> str:
    """
    Приводит строку к формату **XX.YY.ZZ** (2-значные сегменты,
    недостающие части заполняются &laquo;00&raquo;).

    >>> _normalize_code('^a06.81')
    '06.81.00'
    >>> _normalize_code('6.81')
    '06.81.00'
    >>> _normalize_code('06.81.01')
    '06.81.01'
    """
    code = _CLEAN_RE.sub("", code.strip())
    if not code:
        return "00.00.00"

    parts = code.split(".")
    while len(parts) < 3:
        parts.append("00")

    parts = [
        p.zfill(2) if p.isdigit() and p != "00" else p
        for p in parts[:3]
    ]
    return ".".join(parts)


# ────────────────────────────────
# 2. Загрузка справочника
# ────────────────────────────────
def load_grnti_map(cur) -> Dict[str, int]:
    """
    Возвращает словарь {нормализованный_код: id} для таблицы public.grnti.
    При дублировании кода берётся первый встретившийся id.
    """
    cur.execute("SELECT id, grnti_code FROM public.grnti;")
    mapping: Dict[str, int] = {}
    for _id, raw_code in cur.fetchall():
        norm = _normalize_code(raw_code)
        mapping.setdefault(norm, _id)
    return mapping


# ────────────────────────────────
# 3. Фильтрация и сопоставление
# ────────────────────────────────
def filter_links(
    pairs: List[Tuple[int, str]],
    grnti_map: Dict[str, int],
) -> Tuple[List[Tuple[int, int]], int]:
    """
    • pairs      — список (book_id, raw_code) из экспорта
    • grnti_map  — результат load_grnti_map()

    Возвращает:
        links    — валидные (book_id, grnti_id) для вставки в book_grnti
        skipped  — количество строк, код которых не найден
    """
    links: List[Tuple[int, int]] = []
    skipped = 0

    for book_id, raw_code in pairs:
        norm = _normalize_code(raw_code)
        grnti_id = grnti_map.get(norm)
        if grnti_id is not None:
            links.append((book_id, grnti_id))
        else:
            skipped += 1

    return links, skipped


# ────────────────────────────────
# 4. CLI-режим (статистика)
# ────────────────────────────────
def _cli(dsn: str) -> None:
    with psycopg2.connect(dsn) as conn, conn.cursor() as cur:
        grnti_map = load_grnti_map(cur)
        cur.execute("SELECT book_id, grnti_code FROM public.book_grnti_raw;")
        raw_pairs = cur.fetchall()

        links, skipped = filter_links(raw_pairs, grnti_map)

        print("Статистика проверки GRNTI:")
        print(f"  Всего строк         : {len(raw_pairs)}")
        print(f"  Найдено соответствий: {len(links)}")
        print(f"  Пропущено (битые)   : {skipped}")


# ────────────────────────────────
# 5. Точка входа
# ────────────────────────────────
if __name__ == "__main__":
    if len(sys.argv) != 2:
        sys.exit("Использование: python fix_grnti.py \"<строка-DSN>\"")
    _cli(sys.argv[1])