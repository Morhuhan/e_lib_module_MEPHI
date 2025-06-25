#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
fix_authors.py – нормализация и разбор авторов
=============================================

Модуль предоставляет утилиты для работы с именами авторов из
MARC-полей #700 / #701 и произвольных списков авторов.

Функции
-------
parse_author_700_701(field_text: str) -> str
    Извлекает фамилию и инициалы из текста MARC-поля #700 / #701
    (подполя A – фамилия, B – инициалы) и возвращает строку
    &laquo;Фамилия И.О.&raquo;.

normalize_author(full: str) -> str
    Приводит строку &laquo;Фамилия И.О.&raquo; к каноническому виду:
        • убирает лишние пробелы;
        • гарантирует ровно один пробел между фамилией и инициалами;
        • после каждой буквы-инициалы добавляет точку (&laquo;С.А.&raquo; вместо &laquo;СА&raquo;);
        • убирает пробелы между однобуквенными инициалами;
        • возвращает пустую строку, если на входе пусто.

split_authors(raw: str) -> list[str]
    Разбивает строку вида &laquo;Иванов И.И.; Петров П.П.&raquo;
    на список индивидуально нормализованных авторов
    без точных дубликатов.
"""

from __future__ import annotations

import re
from typing import Dict, List

# ─────────────────────────── helpers ────────────────────────────
_SUBFIELD_SEP = "\x1f"          # разделитель подполя в ИРБИС-экспорте
_INITIAL_RE = re.compile(r"^[A-ZА-ЯЁ]$", re.IGNORECASE)   # однобуквенная инициала


def _parse_subfields(field_text: str) -> Dict[str, str]:
    """
    Преобразует строку MARC-поля вида
        '\x1fAИванов\x1fBИ.О.'
    в словарь {'A': 'Иванов', 'B': 'И.О.'}.

    В экспортах ИРБИС иногда вместо \x1f используют '^'.
    """
    text = field_text.replace("^", _SUBFIELD_SEP)
    parts = text.split(_SUBFIELD_SEP)
    subf: Dict[str, str] = {}
    for chunk in parts:
        chunk = chunk.strip()
        if chunk:
            subf[chunk[0]] = chunk[1:].strip()
    return subf


def _normalize_initials(text: str) -> str:
    """
    Приводит произвольную строку с инициалами к виду &laquo;И.О.&raquo;,
    корректно расставляя точки даже для формы &laquo;СА&raquo;.

    Если встречаются неожиданные символы (не буквы, пробелы или точки),
    возвращается исходная строка без изменений.
    """
    text = re.sub(r"\s+", "", text)             # убираем все пробелы
    if not text:
        return ""

    # допустимы только буквы и точки
    if re.search(r"[^A-Za-zА-Яа-яЁё.]", text):
        return text

    letters = re.findall(r"[A-Za-zА-Яа-яЁё]", text)
    if not letters:
        return text

    return ".".join(ch.upper() for ch in letters) + "."


# ─────────────────────────── public API ─────────────────────────
def parse_author_700_701(field_text: str) -> str:
    """
    &laquo;\x1fAИванов\x1fBИ.О.&raquo;      &rarr; &laquo;Иванов И.О.&raquo;
    &laquo;^AПетров^BП.П.&raquo;            &rarr; &laquo;Петров П.П.&raquo;
    Если фамилия или инициалы отсутствуют, возвращается то, что найдено.
    """
    subf = _parse_subfields(field_text)
    last_name = subf.get("A", "").strip()
    initials = _normalize_initials(subf.get("B", ""))
    return f"{last_name} {initials}".strip()


def normalize_author(full: str) -> str:
    """
    &laquo;Евтеев  Ю.И.&raquo;     &rarr; &laquo;Евтеев Ю.И.&raquo;
    &laquo;Чернышев А .А&raquo;    &rarr; &laquo;Чернышев А.А.&raquo;
    &laquo;Пукина А. С.&raquo;     &rarr; &laquo;Пукина А.С.&raquo;
    &laquo;Абаза С А&raquo;        &rarr; &laquo;Абаза С.А.&raquo;
    """
    # унифицируем пробелы и убираем узкие неразрывные
    full = full.replace("\u202f", " ")
    full = re.sub(r"\s+", " ", full).strip()

    if not full:
        return ""

    parts = full.split(" ", maxsplit=1)
    if len(parts) == 1:                         # только фамилия
        return parts[0]

    last_name, rest = parts
    initials = _normalize_initials(rest)
    return f"{last_name} {initials}".strip()


def split_authors(raw: str) -> List[str]:
    """
    &laquo;Иванов И.И.;  Петров П.П.&raquo; &rarr; ['Иванов И.И.', 'Петров П.П.']

    • Точка с запятой &laquo;;&raquo; – разделитель авторов.
    • Каждый автор нормализуется normalize_author().
    • Полные дубликаты удаляются, порядок сохраняется.
    """
    if not raw:
        return []

    out: List[str] = []
    for token in raw.split(";"):
        token = normalize_author(token)
        if token and token not in out:
            out.append(token)
    return out